<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PushNotificationLog;
use App\Models\UserPushToken;
use App\Services\DeviceTokenService;
use App\Services\FirebaseService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PushNotificationsController extends Controller
{
    /**
     * FCM overview: devices, stats, and delivery logs. Admin only.
     */
    public function index(Request $request): Response
    {
        $stats = [
            'total_devices' => UserPushToken::count(),
            'active_devices' => UserPushToken::where('is_active', true)->where('status', UserPushToken::STATUS_ACTIVE)->count(),
            'invalid_devices' => UserPushToken::where('status', UserPushToken::STATUS_INVALID)->count(),
            'total_sent' => PushNotificationLog::where('status', PushNotificationLog::STATUS_SENT)->count(),
            'total_failed' => PushNotificationLog::where('status', PushNotificationLog::STATUS_FAILED)->count(),
        ];

        $devicesQuery = UserPushToken::with('user:id,name,email,slug')
            ->orderByDesc('last_used_at');

        if ($request->filled('status') && $request->status !== 'all') {
            $devicesQuery->where('status', $request->status);
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $devicesQuery->where(function ($q) use ($search) {
                $q->where('device_name', 'like', "%{$search}%")
                    ->orWhere('browser', 'like', "%{$search}%")
                    ->orWhere('push_token', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        $devices = $devicesQuery->paginate(20)->withQueryString();

        $recentLogs = PushNotificationLog::with('user:id,name,email')
            ->orderByDesc('sent_at')
            ->limit(50)
            ->get();

        return Inertia::render('admin/push-notifications/index', [
            'stats' => $stats,
            'devices' => $devices,
            'recentLogs' => $recentLogs,
            'filters' => $request->only(['status', 'search']),
        ]);
    }

    /**
     * Send a test notification to a device. Admin only.
     */
    public function sendTest(Request $request)
    {
        $request->validate([
            'user_push_token_id' => 'required|exists:user_push_tokens,id',
        ]);

        $record = UserPushToken::with('user')->findOrFail($request->user_push_token_id);
        if (!$record->isActive()) {
            return back()->with('error', 'Device is not active or token is invalid.');
        }

        $firebase = app(FirebaseService::class);
        $data = ['source_type' => 'admin_test', 'source_id' => null];
        $results = $firebase->sendToUser($record->user_id, 'Test from Admin', 'This is a test push notification.', $data);
        $success = !empty($results) && collect($results)->contains(fn ($r) => $r['success'] ?? false);

        if ($success) {
            return back()->with('success', 'Test notification sent.');
        }

        return back()->with('error', 'Failed to send test notification. Check device token status.');
    }

    /**
     * Mark device as needing re-register (client will get new token on next visit).
     */
    public function requestReregister(Request $request)
    {
        $request->validate([
            'user_push_token_id' => 'required|exists:user_push_tokens,id',
        ]);

        $record = UserPushToken::findOrFail($request->user_push_token_id);
        $record->update(['needs_reregister' => true]);

        return back()->with('success', 'Device will be prompted to re-register on next visit.');
    }

    /**
     * Mark token as invalid so we stop sending to it.
     */
    public function invalidateToken(Request $request)
    {
        $request->validate([
            'user_push_token_id' => 'required|exists:user_push_tokens,id',
        ]);

        $record = UserPushToken::findOrFail($request->user_push_token_id);
        $record->update(['status' => UserPushToken::STATUS_INVALID]);

        return back()->with('success', 'Token marked invalid. No further notifications will be sent.');
    }
}
