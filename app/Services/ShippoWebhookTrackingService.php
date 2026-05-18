<?php

namespace App\Services;

use App\Models\Order;
use App\Models\ShippoShipment;
use App\Models\ShippoWebhookEvent;
use Illuminate\Support\Facades\DB;

class ShippoWebhookTrackingService
{
    /**
     * Map Shippo tracking statuses to internal order shipping_status values.
     *
     * Requirement mapping:
     * - PRE_TRANSIT => label_created
     * - TRANSIT => shipped
     * - DELIVERED => completed
     */
    private function mapShippoToInternalShippingStatus(?string $shippoStatus): ?string
    {
        $s = strtoupper(trim((string) $shippoStatus));

        return match ($s) {
            'PRE_TRANSIT' => 'label_created',
            'TRANSIT' => 'shipped',
            'DELIVERED' => 'completed',
            default => null,
        };
    }

    private function rankInternalStatus(?string $status): int
    {
        return match ($status) {
            'label_created' => 1,
            'shipped' => 2,
            'completed' => 3,
            default => 0,
        };
    }

    /**
     * Handle Shippo "track_updated" webhook.
     *
     * @return array{success:bool, ignored?:bool, duplicate?:bool, tracking_number?:string, internal_status?:string}
     */
    public function handleTrackUpdated(array $payload, string $rawPayloadHash): array
    {
        $eventType = (string) ($payload['event'] ?? '');
        if ($eventType !== 'track_updated') {
            return ['success' => true, 'ignored' => true];
        }

        $data = $payload['data'] ?? [];
        $trackingNumber = (string) ($data['tracking_number'] ?? '');

        // Shippo docs: data.tracking_status.status (PRE_TRANSIT/TRANSIT/DELIVERED)
        $shippoStatus = $data['tracking_status']['status'] ?? $data['tracking_status']['tracking_status'] ?? null;
        $internalStatus = $this->mapShippoToInternalShippingStatus($shippoStatus);

        if ($trackingNumber === '' || $internalStatus === null) {
            // Still record the webhook to avoid repeated noisy retries (idempotent).
            $this->recordWebhookEvent($rawPayloadHash, $eventType, $payload, 'ignored');

            return ['success' => true, 'ignored' => true];
        }

        return DB::transaction(function () use ($rawPayloadHash, $eventType, $payload, $trackingNumber, $internalStatus) {
            $eventRow = ShippoWebhookEvent::where('payload_hash', $rawPayloadHash)->first();

            if ($eventRow && ! empty($eventRow->processed_at)) {
                return ['success' => true, 'duplicate' => true, 'tracking_number' => $trackingNumber];
            }

            // Upsert event row for idempotency + retries
            if (! $eventRow) {
                $eventRow = $this->recordWebhookEvent($rawPayloadHash, $eventType, $payload, 'processing');
            }

            $shipment = ShippoShipment::where('tracking_number', $trackingNumber)
                ->where('product_type', 'manual')
                ->first();

            // Fallback: update order directly if shipment record missing, but only for manual orders.
            $order = null;
            if ($shipment) {
                $order = $shipment->order;
            } else {
                $order = Order::where('tracking_number', $trackingNumber)
                    ->whereNull('printify_order_id')
                    ->first();
            }

            if (! $order) {
                $eventRow->update([
                    'processing_result' => 'ignored',
                    'processed_at' => now(),
                ]);

                return ['success' => true, 'ignored' => true, 'tracking_number' => $trackingNumber];
            }

            $currentInternal = $shipment?->status ?? $order->shipping_status;

            $newRank = $this->rankInternalStatus($internalStatus);
            $oldRank = $this->rankInternalStatus($currentInternal);

            if ($newRank > $oldRank) {
                if ($shipment) {
                    $shipment->update(['status' => $internalStatus]);
                }

                $order->update(['shipping_status' => $internalStatus]);
            }

            $eventRow->update([
                'processing_result' => 'processed',
                'processed_at' => now(),
                'error_message' => null,
            ]);

            return [
                'success' => true,
                'tracking_number' => $trackingNumber,
                'internal_status' => $internalStatus,
            ];
        });
    }

    private function recordWebhookEvent(string $rawPayloadHash, string $eventType, array $payload, string $result): ShippoWebhookEvent
    {
        $processedAt = $result === 'ignored' ? now() : null;
        $eventRow = ShippoWebhookEvent::firstOrCreate(
            ['payload_hash' => $rawPayloadHash],
            [
                'event_type' => $eventType,
                'processing_result' => $result,
                'payload_json' => $payload,
                'received_at' => now(),
                'processed_at' => $processedAt,
                'error_message' => null,
            ]
        );

        // If row existed, don't clobber processed_at (idempotency/retry safe).
        if (empty($eventRow->processed_at)) {
            $eventRow->update([
                'event_type' => $eventType,
                'processing_result' => $result,
                'payload_json' => $payload,
                'processed_at' => $processedAt,
                'error_message' => null,
            ]);
        }

        return $eventRow;
    }
}
