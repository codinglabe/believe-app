<?php

namespace App\Console\Commands;

use App\Models\SupporterBirthdayNotificationLog;
use App\Models\User;
use App\Models\UserFollow;
use App\Notifications\SupporterBirthdayNotification;
use App\Services\FirebaseService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class NotifySupportersOfFollowedBirthdays extends Command
{
    protected $signature = 'supporters:notify-birthdays';

    protected $description = 'Notify followers when someone they follow has a birthday today';

    public function handle(): int
    {
        $tz = config('app.timezone', 'UTC');
        $today = now($tz);
        $year = (int) $today->year;

        $celebrants = User::query()
            ->where('role', 'user')
            ->whereNotNull('dob')
            ->whereMonth('dob', $today->month)
            ->whereDay('dob', $today->day)
            ->get(['id', 'name', 'slug', 'image', 'dob', 'role']);

        $firebase = app(FirebaseService::class);
        $sent = 0;

        foreach ($celebrants as $celebrant) {
            $followRows = UserFollow::query()
                ->where('following_id', $celebrant->id)
                ->get(['follower_id']);

            foreach ($followRows as $row) {
                $followerId = (int) $row->follower_id;
                if ($followerId === $celebrant->id) {
                    continue;
                }

                $already = SupporterBirthdayNotificationLog::query()
                    ->where('follower_id', $followerId)
                    ->where('celebrant_id', $celebrant->id)
                    ->where('year', $year)
                    ->exists();

                if ($already) {
                    continue;
                }

                $follower = User::query()->find($followerId);
                if (! $follower || $follower->role !== 'user') {
                    continue;
                }

                try {
                    $follower->notify(new SupporterBirthdayNotification($celebrant));
                } catch (\Throwable $e) {
                    Log::error('Birthday notification failed', [
                        'follower_id' => $followerId,
                        'celebrant_id' => $celebrant->id,
                        'error' => $e->getMessage(),
                    ]);

                    continue;
                }

                $first = explode(' ', trim($celebrant->name ?? 'Someone'))[0];
                $title = "🎂 {$first}'s birthday today!";
                $body = 'Celebrate and send Believe Points as a gift.';
                $giftUrl = route('supporters.birthday-gift', ['celebrant' => $celebrant->id], true);

                $firebase->sendToUser($followerId, $title, $body, [
                    'type' => 'supporter_birthday',
                    'celebrant_id' => (string) $celebrant->id,
                    'click_action' => $giftUrl,
                    'url' => $giftUrl,
                ]);

                SupporterBirthdayNotificationLog::create([
                    'follower_id' => $followerId,
                    'celebrant_id' => $celebrant->id,
                    'year' => $year,
                ]);

                $sent++;
            }
        }

        $this->info("Birthday notifications queued/sent: {$sent}");

        return self::SUCCESS;
    }
}
