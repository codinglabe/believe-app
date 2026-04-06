<?php

namespace App\Notifications;

use App\Models\Organization;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class BoardMemberInvitation extends Notification implements ShouldQueue
{
    use Queueable;

    public $organization;
    public $password;

    public function __construct(Organization $organization, $password)
    {
        $this->organization = $organization;
        $this->password = $password;
    }

    public function via($notifiable)
    {
        return ['mail'];
    }

    public function toMail($notifiable)
    {
        return (new MailMessage)
            ->subject('Invitation to Join Board of Directors')
            ->line('You have been invited to join the Board of Directors for ' . $this->organization->name)
            ->line('Your login credentials:')
            ->line('Email: ' . $notifiable->email)
            ->line('Password: ' . $this->password)
            ->action('Login to Platform', url('/login'))
            ->line('Please change your password after first login.');
    }
}
