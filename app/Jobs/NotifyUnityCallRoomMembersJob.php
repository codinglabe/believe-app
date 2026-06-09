<?php

namespace App\Jobs;

use App\Jobs\Concerns\UsesPushNotificationQueue;
use App\Models\UnityCall;
use App\Models\User;
use App\Services\UnityCallNotifier;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class NotifyUnityCallRoomMembersJob implements ShouldQueue
{
    use Queueable, UsesPushNotificationQueue;

    public function __construct(
        public int $callId,
        public int $callerId,
    ) {
        $this->configurePushNotificationQueue();
    }

    public function handle(UnityCallNotifier $notifier): void
    {
        $call = UnityCall::query()
            ->with(['chatRoom', 'caller'])
            ->find($this->callId);

        if (! $call || ! $call->chatRoom || ! $call->caller || $call->chatRoom->type === 'direct') {
            return;
        }

        $caller = $call->caller;

        DB::table('chat_room_members')
            ->where('chat_room_id', $call->chat_room_id)
            ->where('user_id', '!=', $this->callerId)
            ->orderBy('user_id')
            ->chunkById(200, function ($rows) use ($notifier, $call, $caller) {
                foreach ($rows as $row) {
                    try {
                        $callee = User::query()->find($row->user_id);
                        if ($callee) {
                            $notifier->notifyIncoming($call, $caller, $callee);
                        }
                    } catch (\Throwable $e) {
                        Log::warning('unity_call.room_notify_member_failed', [
                            'call_id' => $call->id,
                            'user_id' => $row->user_id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            }, 'user_id');
    }
}
