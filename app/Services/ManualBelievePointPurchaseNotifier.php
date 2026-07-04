<?php

namespace App\Services;

use App\Enums\PushNotificationModule;
use App\Models\BelievePointPurchase;
use App\Models\User;
use App\Notifications\ManualBelievePointPurchaseApprovedNotification;
use App\Notifications\ManualBelievePointPurchaseRejectedNotification;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ManualBelievePointPurchaseNotifier
{
    public function __construct(
        private readonly FirebaseService $firebaseService,
    ) {}

    public function notifyApproved(BelievePointPurchase $purchase): void
    {
        if ($purchase->status !== 'completed') {
            return;
        }

        $purchaseId = $purchase->id;

        DB::afterCommit(function () use ($purchaseId): void {
            $cacheKey = 'manual_bp_purchase_approved_notify:'.$purchaseId;
            if (! Cache::add($cacheKey, 1, now()->addDays(30))) {
                return;
            }

            $purchase = BelievePointPurchase::query()->with('user')->find($purchaseId);
            if ($purchase === null || $purchase->status !== 'completed') {
                Cache::forget($cacheKey);

                return;
            }

            $this->notifyUserApproved($purchase);
        });
    }

    public function notifyRejected(BelievePointPurchase $purchase, ?string $reviewNotes = null): void
    {
        if ($purchase->status !== 'failed') {
            return;
        }

        $purchaseId = $purchase->id;

        DB::afterCommit(function () use ($purchaseId, $reviewNotes): void {
            $cacheKey = 'manual_bp_purchase_rejected_notify:'.$purchaseId;
            if (! Cache::add($cacheKey, 1, now()->addDays(30))) {
                return;
            }

            $purchase = BelievePointPurchase::query()->with('user')->find($purchaseId);
            if ($purchase === null || $purchase->status !== 'failed') {
                Cache::forget($cacheKey);

                return;
            }

            $this->notifyUserRejected($purchase, $reviewNotes);
        });
    }

    private function notifyUserApproved(BelievePointPurchase $purchase): void
    {
        $user = $purchase->user;
        if (! $user instanceof User) {
            return;
        }

        $believePointsUrl = route('believe-points.index');
        $amountLabel = '$'.number_format((float) $purchase->amount, 2);
        $pointsLabel = number_format((float) $purchase->points, 0);

        $title = 'Believe Points purchase approved';
        $body = "Your {$amountLabel} manual payment was verified. {$pointsLabel} Believe Points have been added to your account.";

        try {
            $user->notify(new ManualBelievePointPurchaseApprovedNotification($purchase, $believePointsUrl));
        } catch (\Throwable $e) {
            Log::warning('Manual Believe Points purchase approved in-app notification failed', [
                'purchase_id' => $purchase->id,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }

        $this->sendPush(
            $user->id,
            $title,
            $body,
            $believePointsUrl,
            $purchase,
            'manual_believe_points_purchase_approved',
            $user->id,
        );
    }

    private function notifyUserRejected(BelievePointPurchase $purchase, ?string $reviewNotes): void
    {
        $user = $purchase->user;
        if (! $user instanceof User) {
            return;
        }

        $believePointsUrl = route('believe-points.index');
        $amountLabel = '$'.number_format((float) $purchase->amount, 2);

        $title = 'Believe Points purchase not verified';
        $body = "Your {$amountLabel} manual Believe Points payment could not be verified.";

        try {
            $user->notify(new ManualBelievePointPurchaseRejectedNotification(
                $purchase,
                $believePointsUrl,
                $reviewNotes,
            ));
        } catch (\Throwable $e) {
            Log::warning('Manual Believe Points purchase rejected in-app notification failed', [
                'purchase_id' => $purchase->id,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }

        $this->sendPush(
            $user->id,
            $title,
            $body,
            $believePointsUrl,
            $purchase,
            'manual_believe_points_purchase_rejected',
            $user->id,
        );
    }

    private function sendPush(
        int $userId,
        string $title,
        string $body,
        string $url,
        BelievePointPurchase $purchase,
        string $type,
        ?int $createdBy,
    ): void {
        $pushData = $this->firebaseService->stringifyFcmData([
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'url' => $url,
            'click_action' => $url,
            'believe_point_purchase_id' => (string) $purchase->id,
            'source_type' => 'believe_points_purchase',
            'source_id' => (string) $purchase->id,
            'module_name' => PushNotificationModule::WalletRewards->value,
            'module_record_id' => $purchase->id,
            'created_by' => $createdBy,
            'deep_link' => parse_url($url, PHP_URL_PATH) ?: $url,
        ]);

        try {
            $this->firebaseService->sendToUser($userId, $title, $body, $pushData);
        } catch (\Throwable $e) {
            Log::warning('Manual Believe Points purchase push notification failed', [
                'purchase_id' => $purchase->id,
                'user_id' => $userId,
                'type' => $type,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
