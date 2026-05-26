<?php

namespace App\Jobs;

use App\Mail\UnityMeetInvitationMail;
use App\Models\User;
use App\Models\UserLivestream;
use App\Support\LivestreamParticipantEmails;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendUnityMeetInvitationEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;

    public $timeout = 120;

    public function __construct(
        public int $livestreamId,
        public string $recipientEmail,
        public int $billingUserId,
    ) {}

    public function handle(): void
    {
        $email = strtolower(trim($this->recipientEmail));
        if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            Log::warning('Unity Meet invitation job skipped: invalid email', [
                'livestream_id' => $this->livestreamId,
                'email' => $this->recipientEmail,
            ]);

            return;
        }

        $livestream = UserLivestream::query()
            ->with('user:id,name')
            ->find($this->livestreamId);

        if (! $livestream) {
            Log::warning('Unity Meet invitation job skipped: livestream not found', [
                'livestream_id' => $this->livestreamId,
                'email' => $email,
            ]);

            return;
        }

        if (in_array($livestream->status, ['cancelled', 'ended'], true)) {
            Log::info('Unity Meet invitation job skipped: meeting no longer active', [
                'livestream_id' => $livestream->id,
                'status' => $livestream->status,
                'email' => $email,
            ]);

            return;
        }

        $settings = is_array($livestream->settings) ? $livestream->settings : [];
        $participantEmails = LivestreamParticipantEmails::fromSettings($settings);

        if (! in_array($email, $participantEmails, true)) {
            Log::info('Unity Meet invitation job skipped: email no longer invited', [
                'livestream_id' => $livestream->id,
                'email' => $email,
            ]);

            return;
        }

        $billingUser = User::query()->find($this->billingUserId);
        if (! $billingUser) {
            Log::warning('Unity Meet invitation job skipped: billing user not found', [
                'livestream_id' => $livestream->id,
                'billing_user_id' => $this->billingUserId,
                'email' => $email,
            ]);

            return;
        }

        $hostName = trim((string) ($settings['display_name'] ?? $livestream->user?->name ?? 'Your host'));
        $joinUrl = url('/livestreams/join/'.$livestream->room_name);
        $scheduledAtFormatted = $livestream->scheduled_at
            ? $livestream->scheduled_at->timezone(config('app.timezone'))->format('l, F j, Y \a\t g:i A T')
            : 'Join when ready';
        $requiresPasscode = $livestream->requiresPasscode();
        $passcode = $requiresPasscode ? $livestream->getDecryptedPassword() : null;

        try {
            Mail::to($email)->send(new UnityMeetInvitationMail(
                recipientEmail: $email,
                hostName: $hostName,
                meetingTitle: $livestream->title,
                scheduledAtFormatted: $scheduledAtFormatted,
                joinUrl: $joinUrl,
                meetingId: $livestream->room_name,
                requiresPasscode: $requiresPasscode,
                passcode: $passcode !== '' ? $passcode : null,
            ));

            Log::info('Unity Meet invitation email sent', [
                'livestream_id' => $livestream->id,
                'email' => $email,
                'billing_user_id' => $billingUser->id,
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to send Unity Meet invitation email', [
                'livestream_id' => $livestream->id,
                'email' => $email,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
