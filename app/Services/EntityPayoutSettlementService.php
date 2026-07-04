<?php

namespace App\Services;

use App\Contracts\HasPreferredPayoutMethod;
use App\Enums\PreferredPayoutMethod;
use App\Models\EntityPayout;
use App\Models\Merchant;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Cashier;

class EntityPayoutSettlementService
{
    /**
     * @param  array<string, mixed>  $metadata
     */
    public static function settle(
        Organization|Merchant $entity,
        float $amount,
        string $module,
        ?Model $reference = null,
        array $metadata = [],
    ): EntityPayout {
        if ($amount <= 0) {
            throw new \InvalidArgumentException('Settlement amount must be greater than zero.');
        }

        $method = $entity->getPreferredPayoutMethod();
        if ($method === null) {
            throw new \RuntimeException('No preferred payout method is configured for this account.');
        }

        if (! $entity->isPayoutReady()) {
            throw new \RuntimeException('Payout method is not fully configured for this account.');
        }

        return match ($method) {
            PreferredPayoutMethod::Stripe => self::settleViaStripe($entity, $amount, $module, $reference, $metadata),
            PreferredPayoutMethod::PayPal => self::settleViaPayPal($entity, $amount, $module, $reference, $metadata),
        };
    }

    /**
     * @param  array<string, mixed>  $metadata
     */
    private static function settleViaPayPal(
        Organization|Merchant $entity,
        float $amount,
        string $module,
        ?Model $reference,
        array $metadata,
    ): EntityPayout {
        $payout = self::createPendingRecord($entity, PreferredPayoutMethod::PayPal, $amount, $module, $reference, $metadata);

        try {
            $note = sprintf(
                'BIU %s payout for %s',
                $module,
                $entity->payoutDisplayName(),
            );

            $result = PayPalPayoutEntityService::sendPayout(
                $entity,
                $amount,
                $note,
                'entity_payout_'.$payout->id,
            );

            $payout->forceFill([
                'status' => 'processing',
                'external_batch_id' => $result['batch_id'],
                'processed_at' => now(),
                'notes' => 'PayPal batch status: '.$result['status'],
            ])->save();

            return $payout->fresh();
        } catch (\Throwable $e) {
            Log::error('Entity PayPal settlement failed', [
                'entity_payout_id' => $payout->id,
                'error' => $e->getMessage(),
            ]);

            $payout->forceFill([
                'status' => 'failed',
                'notes' => $e->getMessage(),
            ])->save();

            throw $e;
        }
    }

    /**
     * Stripe Connect transfers funds to the connected Express account.
     *
     * @param  array<string, mixed>  $metadata
     */
    private static function settleViaStripe(
        Organization|Merchant $entity,
        float $amount,
        string $module,
        ?Model $reference,
        array $metadata,
    ): EntityPayout {
        $accountId = (string) $entity->stripe_connect_account_id;
        if ($accountId === '') {
            throw new \RuntimeException('Stripe Connect account is not configured.');
        }

        if (! StripeConnectOrganizationService::configureStripe()) {
            throw new \RuntimeException('Stripe credentials are not configured.');
        }

        $payout = self::createPendingRecord($entity, PreferredPayoutMethod::Stripe, $amount, $module, $reference, $metadata);

        try {
            $amountCents = (int) round($amount * 100);
            $transfer = Cashier::stripe()->transfers->create([
                'amount' => $amountCents,
                'currency' => 'usd',
                'destination' => $accountId,
                'description' => sprintf('BIU %s payout — %s', $module, $entity->payoutDisplayName()),
                'metadata' => array_merge($metadata, [
                    'entity_payout_id' => (string) $payout->id,
                    'module' => $module,
                ]),
            ]);

            $payout->forceFill([
                'status' => 'completed',
                'external_batch_id' => (string) $transfer->id,
                'processed_at' => now(),
            ])->save();

            return $payout->fresh();
        } catch (\Throwable $e) {
            Log::error('Entity Stripe settlement failed', [
                'entity_payout_id' => $payout->id,
                'error' => $e->getMessage(),
            ]);

            $payout->forceFill([
                'status' => 'failed',
                'notes' => $e->getMessage(),
            ])->save();

            throw $e;
        }
    }

    /**
     * @param  array<string, mixed>  $metadata
     */
    private static function createPendingRecord(
        Organization|Merchant $entity,
        PreferredPayoutMethod $method,
        float $amount,
        string $module,
        ?Model $reference,
        array $metadata,
    ): EntityPayout {
        return DB::transaction(function () use ($entity, $method, $amount, $module, $reference, $metadata) {
            return EntityPayout::query()->create([
                'payable_type' => $entity->getMorphClass(),
                'payable_id' => $entity->getKey(),
                'payout_method' => $method->value,
                'amount' => round($amount, 2),
                'currency' => 'USD',
                'status' => 'pending',
                'reference_type' => $reference?->getMorphClass(),
                'reference_id' => $reference?->getKey(),
                'module' => $module,
                'metadata' => $metadata,
            ]);
        });
    }

    /**
     * @return array<string, mixed>
     */
    public static function readinessPayload(HasPreferredPayoutMethod&Model $entity): array
    {
        $preferred = $entity->getPreferredPayoutMethod();

        return [
            'preferred_payout_method' => $preferred?->value,
            'preferred_payout_method_label' => $preferred?->label(),
            'stripe' => [
                'connected' => filled($entity->stripe_connect_account_id ?? null),
                'charges_enabled' => (bool) ($entity->stripe_connect_charges_enabled ?? false),
                'payouts_enabled' => (bool) ($entity->stripe_connect_payouts_enabled ?? false),
                'ready' => $entity->isStripePayoutReady(),
            ],
            'paypal' => PayPalPayoutEntityService::statusPayload($entity),
            'payout_ready' => $entity->isPayoutReady(),
        ];
    }
}
