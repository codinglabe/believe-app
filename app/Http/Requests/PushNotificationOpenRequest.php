<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PushNotificationOpenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'notification_log_id' => ['required', 'integer', 'exists:push_notification_logs,id'],
            'recipient_id' => ['required', 'integer', 'exists:push_notification_recipients,id'],
        ];
    }
}
