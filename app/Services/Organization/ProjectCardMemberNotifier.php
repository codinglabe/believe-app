<?php

namespace App\Services\Organization;

use App\Enums\PushNotificationModule;
use App\Jobs\SendProjectCardMemberAssignedEmail;
use App\Models\ProjectBoard;
use App\Models\ProjectCard;
use App\Models\User;
use App\Notifications\ProjectCardMemberAssignedNotification;
use App\Services\FirebaseService;
use App\Support\UserEmailCredits;
use Illuminate\Support\Facades\Log;

class ProjectCardMemberNotifier
{
    public function __construct(
        private readonly FirebaseService $firebaseService,
    ) {}

    /**
     * Notify users who were newly added to a card (not removals / existing members).
     * Email uses the organization owner's email credit balance (1 credit per mail).
     *
     * @param  list<int>  $newlyAddedUserIds
     */
    public function notifyNewlyAssigned(
        ProjectBoard $board,
        ProjectCard $card,
        User $assignedBy,
        array $newlyAddedUserIds,
    ): void {
        $ids = array_values(array_unique(array_filter(array_map('intval', $newlyAddedUserIds))));
        $ids = array_values(array_filter($ids, fn (int $id) => $id !== (int) $assignedBy->id));

        if ($ids === []) {
            return;
        }

        $board->loadMissing('organization.user');
        $billingUser = $board->organization?->user;

        $users = User::query()->whereIn('id', $ids)->get();
        $cardUrl = route('org.projects.show', [
            'board' => $board->id,
            'card' => $card->id,
        ]);

        $emailsQueued = 0;
        $emailsLeft = $billingUser ? UserEmailCredits::remaining($billingUser) : 0;

        foreach ($users as $user) {
            $this->notifyOne(
                $user,
                $board,
                $card,
                $assignedBy,
                $cardUrl,
                $billingUser,
                $emailsLeft,
                $emailsQueued,
            );
        }
    }

    private function notifyOne(
        User $user,
        ProjectBoard $board,
        ProjectCard $card,
        User $assignedBy,
        string $cardUrl,
        ?User $billingUser,
        int $emailsLeft,
        int &$emailsQueued,
    ): void {
        $title = 'Added to a project card';
        $body = "{$assignedBy->name} added you to \"{$card->title}\" on {$board->name}.";

        try {
            $user->notify(new ProjectCardMemberAssignedNotification(
                $card,
                $board,
                $assignedBy,
                $cardUrl,
            ));
        } catch (\Throwable $e) {
            Log::warning('Project card member in-app notification failed', [
                'card_id' => $card->id,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }

        $pushData = $this->firebaseService->stringifyFcmData([
            'type' => 'project_card_member_assigned',
            'title' => $title,
            'body' => $body,
            'url' => $cardUrl,
            'click_action' => $cardUrl,
            'board_id' => (string) $board->id,
            'card_id' => (string) $card->id,
            'source_type' => 'project_card',
            'source_id' => (string) $card->id,
            'module_name' => PushNotificationModule::Projects->value,
            'module_record_id' => $card->id,
            'created_by' => $assignedBy->id,
            'deep_link' => parse_url($cardUrl, PHP_URL_PATH) ?: $cardUrl,
        ]);

        try {
            $this->firebaseService->sendToUser($user->id, $title, $body, $pushData);
        } catch (\Throwable $e) {
            Log::warning('Project card member push notification failed', [
                'card_id' => $card->id,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }

        if (! $user->email) {
            return;
        }

        if (! $billingUser || $emailsQueued >= $emailsLeft) {
            Log::info('Project card member email not queued: insufficient organization email credits', [
                'card_id' => $card->id,
                'user_id' => $user->id,
                'billing_user_id' => $billingUser?->id,
                'emails_left' => $emailsLeft,
                'emails_queued' => $emailsQueued,
            ]);

            return;
        }

        SendProjectCardMemberAssignedEmail::dispatch(
            $card->id,
            $board->id,
            $user->id,
            $assignedBy->id,
            $billingUser->id,
        );
        $emailsQueued++;
    }
}
