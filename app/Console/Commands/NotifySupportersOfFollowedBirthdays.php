<?php

namespace App\Console\Commands;

use App\Models\Organization;
use App\Models\SupporterBirthdayNotificationLog;
use App\Models\User;
use App\Models\UserFavoriteOrganization;
use App\Notifications\SupporterBirthdayNotification;
use App\Services\FirebaseService;
use App\Services\TimezoneService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class NotifySupportersOfFollowedBirthdays extends Command
{
    protected $signature = 'supporters:notify-birthdays
                            {--dry-run : Show counts only, do not notify}
                            {--force : Ignore the celebrant local send-hour window (for testing)}';

    protected $description = 'Notify each nonprofit (owner + board) when a supporter who favorites that org has a birthday today (celebrant local date + hour)';

    private function celebrantTimezone(User $user): string
    {
        return TimezoneService::forUser($user);
    }

    /**
     * Profile DOB is stored as Y-m-d with a fixed year (see UserProfileController); only month/day matter.
     */
    private function isBirthdayTodayForUser(User $user): bool
    {
        if ($user->dob === null || $user->dob === '') {
            return false;
        }

        $today = now($this->celebrantTimezone($user));
        $dob = Carbon::parse($user->dob);

        return (int) $dob->month === (int) $today->month
            && (int) $dob->day === (int) $today->day;
    }

    private function isInSendWindowForUser(User $user, bool $force): bool
    {
        if ($force) {
            return true;
        }

        $sendHour = (int) config('supporter_birthday.send_hour_local', 8);
        $localNow = now($this->celebrantTimezone($user));

        return (int) $localNow->hour === $sendHour;
    }

    /**
     * Registered nonprofits the celebrant favorites (follows).
     *
     * @return \Illuminate\Support\Collection<int, int>
     */
    private function celebrantFavoriteOrganizationIds(User $celebrant): \Illuminate\Support\Collection
    {
        return UserFavoriteOrganization::query()
            ->where('user_id', $celebrant->id)
            ->whereNotNull('organization_id')
            ->pluck('organization_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->filter(fn (int $id) => $id > 0)
            ->values();
    }

    public function handle(): int
    {
        if (! config('supporter_birthday.enabled', true)) {
            $this->warn('Supporter birthday notifications are disabled (SUPPORTER_BIRTHDAY_NOTIFICATIONS_ENABLED=false).');

            return self::SUCCESS;
        }

        $appTz = config('app.timezone', 'UTC');
        $sendHourLocal = (int) config('supporter_birthday.send_hour_local', 8);
        $dryRun = (bool) $this->option('dry-run');
        $force = (bool) $this->option('force');

        $candidates = User::query()
            ->where('role', 'user')
            ->whereNotNull('dob')
            ->get(['id', 'name', 'slug', 'image', 'dob', 'role', 'timezone']);

        $birthdayToday = $candidates->filter(fn (User $u) => $this->isBirthdayTodayForUser($u))->values();
        $celebrants = $birthdayToday
            ->filter(fn (User $u) => $this->isInSendWindowForUser($u, $force))
            ->values();

        $this->line('App timezone: '.$appTz);
        $this->line('Send hour (celebrant local): '.$sendHourLocal.':00');
        $this->line('Supporters with DOB set: '.$candidates->count());
        $this->line('Whose birthday is <fg=cyan>today</> (by their timezone): '.$birthdayToday->count());
        if (! $force && $birthdayToday->count() > $celebrants->count()) {
            $this->line('Waiting for local send hour: '.($birthdayToday->count() - $celebrants->count()));
        }
        $this->line('Ready to notify orgs for: '.$celebrants->count());

        $firebase = app(FirebaseService::class);
        $sent = 0;
        $skippedAlready = 0;
        $skippedMissingUser = 0;
        $edges = 0;

        foreach ($celebrants as $celebrant) {
            $year = (int) now($this->celebrantTimezone($celebrant))->year;
            $orgIds = $this->celebrantFavoriteOrganizationIds($celebrant);

            if ($orgIds->isEmpty()) {
                $this->warn("User #{$celebrant->id} ({$celebrant->name}) has a birthday today but <fg=red>favorites no registered nonprofits</>; no org notifications.");
            }

            $organizations = Organization::query()
                ->whereIn('id', $orgIds->all())
                ->get()
                ->keyBy('id');

            foreach ($orgIds as $organizationId) {
                $organization = $organizations->get($organizationId);
                if (! $organization) {
                    continue;
                }

                $recipientIds = $organization->supporterBirthdayNotifyUserIds();

                if ($recipientIds->isEmpty()) {
                    $this->warn("Organization #{$organizationId} ({$organization->name}) has no owner/board user_id; skipped for celebrant #{$celebrant->id}.");

                    continue;
                }

                foreach ($recipientIds as $recipientId) {
                    if ($recipientId === (int) $celebrant->id) {
                        continue;
                    }

                    $already = SupporterBirthdayNotificationLog::query()
                        ->where('follower_id', $recipientId)
                        ->where('celebrant_id', $celebrant->id)
                        ->where('organization_id', $organizationId)
                        ->where('year', $year)
                        ->exists();

                    if ($already) {
                        $skippedAlready++;

                        continue;
                    }

                    $recipient = User::query()->find($recipientId);
                    if (! $recipient) {
                        $skippedMissingUser++;

                        continue;
                    }

                    $edges++;

                    if ($dryRun) {
                        $this->line("[dry-run] Would notify user #{$recipientId} (org #{$organizationId}) about celebrant #{$celebrant->id}");

                        continue;
                    }

                    try {
                        $recipient->notify(new SupporterBirthdayNotification($celebrant, $organization));
                    } catch (\Throwable $e) {
                        Log::error('Birthday notification failed', [
                            'recipient_id' => $recipientId,
                            'organization_id' => $organizationId,
                            'celebrant_id' => $celebrant->id,
                            'error' => $e->getMessage(),
                        ]);

                        continue;
                    }

                    $first = explode(' ', trim($celebrant->name ?? 'Someone'))[0];
                    $title = "🎂 {$first}'s birthday today!";
                    $body = 'A supporter who follows your nonprofit has a birthday — send Believe Points as a gift.';
                    $giftUrl = route('supporters.gift', ['recipient' => $celebrant->id], true);

                    $firebase->sendToUser($recipientId, $title, $body, [
                        'type' => 'supporter_birthday',
                        'celebrant_id' => (string) $celebrant->id,
                        'organization_id' => (string) $organizationId,
                        'click_action' => $giftUrl,
                        'url' => $giftUrl,
                    ]);

                    SupporterBirthdayNotificationLog::create([
                        'follower_id' => $recipientId,
                        'organization_id' => $organizationId,
                        'celebrant_id' => $celebrant->id,
                        'year' => $year,
                    ]);

                    $sent++;
                }
            }
        }

        if ($skippedAlready > 0) {
            $this->line("Skipped (already notified this year for this org): {$skippedAlready}");
        }
        if ($skippedMissingUser > 0) {
            $this->line("Skipped (recipient user record missing): {$skippedMissingUser}");
        }

        $this->info('Recipient edges (org staff × birthday): '.$edges);
        if ($dryRun) {
            $this->warn('Dry run: no notifications or pushes were sent.');
        } else {
            $this->info('Birthday notifications sent: '.$sent);
        }

        if ($celebrants->isNotEmpty() && $edges === 0 && ! $dryRun) {
            $this->newLine();
            $this->comment(
                'Recipients are the primary nonprofit owner and board members (user accounts) for each organization '
                .'the birthday supporter favorites. The supporter must follow at least one registered nonprofit with a linked owner/board user.'
            );
        }

        if ($birthdayToday->isEmpty()) {
            $this->newLine();
            $this->comment(
                'No birthday today: supporter profile DOB is month/day only (MM/DD on /profile/edit). '
                .'It must match today\'s calendar month and day in that supporter\'s timezone.'
            );
        } elseif ($celebrants->isEmpty() && ! $force) {
            $this->newLine();
            $this->comment(
                "Supporters have a birthday today but local send hour ({$sendHourLocal}:00) has not arrived yet in their timezone. "
                .'Use --force to test immediately.'
            );
        }

        return self::SUCCESS;
    }
}
