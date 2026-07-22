<?php

namespace App\Jobs;

use App\Mail\ProjectCardMemberAssignedMail;
use App\Models\ProjectBoard;
use App\Models\ProjectCard;
use App\Models\User;
use App\Support\UserEmailCredits;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendProjectCardMemberAssignedEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 60;

    public function __construct(
        public int $cardId,
        public int $boardId,
        public int $recipientUserId,
        public int $assignedByUserId,
        public int $billingUserId,
    ) {}

    public function handle(): void
    {
        $recipient = User::query()->find($this->recipientUserId);
        if (! $recipient || ! $recipient->email) {
            Log::warning('Project card member email job skipped: recipient missing email', [
                'card_id' => $this->cardId,
                'user_id' => $this->recipientUserId,
            ]);

            return;
        }

        $card = ProjectCard::query()->find($this->cardId);
        $board = ProjectBoard::query()->find($this->boardId);
        $assignedBy = User::query()->find($this->assignedByUserId);

        if (! $card || ! $board || ! $assignedBy) {
            Log::warning('Project card member email job skipped: missing models', [
                'card_id' => $this->cardId,
                'board_id' => $this->boardId,
                'assigned_by' => $this->assignedByUserId,
                'user_id' => $this->recipientUserId,
            ]);

            return;
        }

        if (! $card->members()->where('users.id', $recipient->id)->exists()) {
            Log::info('Project card member email job skipped: user no longer on card', [
                'card_id' => $card->id,
                'user_id' => $recipient->id,
            ]);

            return;
        }

        $cardUrl = route('org.projects.show', [
            'board' => $board->id,
            'card' => $card->id,
        ]);

        DB::transaction(function () use ($recipient, $card, $board, $assignedBy, $cardUrl) {
            $billingUser = User::query()->lockForUpdate()->find($this->billingUserId);
            if (! $billingUser || ! UserEmailCredits::canSend($billingUser)) {
                Log::info('Project card member email skipped: no organization email credits', [
                    'card_id' => $card->id,
                    'user_id' => $recipient->id,
                    'billing_user_id' => $this->billingUserId,
                    'emails_left' => $billingUser ? UserEmailCredits::remaining($billingUser) : 0,
                ]);

                return;
            }

            Mail::to($recipient->email)->send(new ProjectCardMemberAssignedMail(
                recipientName: $recipient->name,
                assignedByName: $assignedBy->name,
                cardTitle: $card->title,
                boardName: $board->name,
                cardUrl: $cardUrl,
            ));

            UserEmailCredits::consume($billingUser);
        });
    }
}
