<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PushNotificationOpenRequest;
use App\Models\PushNotificationRecipient;
use App\Services\PushNotificationLogger;
use Illuminate\Http\JsonResponse;

class PushNotificationOpenController extends Controller
{
    public function __construct(
        private readonly PushNotificationLogger $logger,
    ) {}

    public function store(PushNotificationOpenRequest $request): JsonResponse
    {
        $recipient = PushNotificationRecipient::query()
            ->where('id', $request->integer('recipient_id'))
            ->where('push_notification_log_id', $request->integer('notification_log_id'))
            ->firstOrFail();

        // Only the recipient user (or platform admin) may record an open.
        $user = $request->user();
        if ($recipient->recipient_user_id !== null
            && (int) $recipient->recipient_user_id !== (int) $user->id
            && ! ($user->hasRole('admin') || $user->role === 'admin')) {
            abort(403);
        }

        $log = $this->logger->logOpened($recipient);

        return response()->json([
            'success' => true,
            'opened_count' => $log->opened_count,
        ]);
    }
}
