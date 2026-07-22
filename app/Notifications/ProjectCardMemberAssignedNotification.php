<?php

namespace App\Notifications;

use App\Models\ProjectBoard;
use App\Models\ProjectCard;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class ProjectCardMemberAssignedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public ProjectCard $card,
        public ProjectBoard $board,
        public User $assignedBy,
        public string $cardUrl,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toDatabase($notifiable));
    }

    public function toDatabase(object $notifiable): array
    {
        $title = 'Added to a project card';
        $body = "{$this->assignedBy->name} added you to \"{$this->card->title}\" on {$this->board->name}.";

        return [
            'type' => 'project_card_member_assigned',
            'title' => $title,
            'body' => $body,
            'message' => $body,
            'url' => $this->cardUrl,
            'click_action' => $this->cardUrl,
            'meta' => [
                'board_id' => $this->board->id,
                'board_name' => $this->board->name,
                'card_id' => $this->card->id,
                'card_title' => $this->card->title,
                'assigned_by_id' => $this->assignedBy->id,
                'assigned_by_name' => $this->assignedBy->name,
            ],
        ];
    }
}
