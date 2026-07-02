<?php

namespace App\Services;

use App\Contracts\HasPreferredPayoutMethod;
use App\Enums\PreferredPayoutMethod;
use App\Models\PaymentMethod;
use App\Support\PayPalClientBuilder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;

class PayPalPayoutEntityService
{
    public static function isPlatformConfigured(): bool
    {
        return PaymentMethod::getConfig('paypal') !== null;
    }

    /**
     * @param  Model&HasPreferredPayoutMethod  $entity
     */
    public static function connectPayPalEmail(Model $entity, string $email): void
    {
        $normalized = strtolower(trim($email));
        if ($normalized === '') {
            throw new \InvalidArgumentException('PayPal email is required.');
        }

        $entity->forceFill([
            'paypal_payout_email' => $normalized,
            'paypal_payouts_enabled' => true,
            'paypal_payout_connected_at' => now(),
        ])->save();
    }

    /**
     * @param  Model&HasPreferredPayoutMethod  $entity
     */
    public static function disconnectPayPal(Model $entity): void
    {
        $entity->forceFill([
            'paypal_payout_email' => null,
            'paypal_payouts_enabled' => false,
            'paypal_payout_connected_at' => null,
        ])->save();
    }

    /**
     * Execute a PayPal Payouts API transfer to the entity's connected PayPal email.
     *
     * @param  Model&HasPreferredPayoutMethod  $entity
     * @return array{batch_id: string, status: string}
     */
    public static function sendPayout(
        Model $entity,
        float $amount,
        string $note,
        string $senderItemId,
    ): array {
        if (! $entity->isPayPalPayoutReady()) {
            throw new \RuntimeException('PayPal payout is not configured for this account.');
        }

        $paypalConfig = PaymentMethod::getConfig('paypal');
        if ($paypalConfig === null) {
            throw new \RuntimeException('PayPal is not configured for this application.');
        }

        if ($amount <= 0) {
            throw new \InvalidArgumentException('Payout amount must be greater than zero.');
        }

        $provider = PayPalClientBuilder::make($paypalConfig);
        $email = (string) $entity->paypal_payout_email;

        $payouts = [
            'sender_batch_header' => [
                'sender_batch_id' => 'BIU_Payout_'.class_basename($entity).'_'.$entity->getKey().'_'.uniqid(),
                'email_subject' => 'Your payout from Believe In Unity',
                'email_message' => 'You have received a payout from Believe In Unity.',
            ],
            'items' => [
                [
                    'recipient_type' => 'EMAIL',
                    'receiver' => $email,
                    'amount' => [
                        'value' => number_format($amount, 2, '.', ''),
                        'currency' => 'USD',
                    ],
                    'note' => mb_substr($note, 0, 250),
                    'sender_item_id' => mb_substr($senderItemId, 0, 64),
                ],
            ],
        ];

        $response = $provider->createPayout($payouts);

        if (! isset($response['batch_header']['payout_batch_id'])) {
            Log::error('PayPal entity payout failed', [
                'entity_type' => $entity->getMorphClass(),
                'entity_id' => $entity->getKey(),
                'response' => $response,
            ]);

            throw new \RuntimeException('PayPal payout failed: '.($response['message'] ?? 'Unknown error'));
        }

        return [
            'batch_id' => (string) $response['batch_header']['payout_batch_id'],
            'status' => (string) ($response['batch_header']['batch_status'] ?? 'PENDING'),
        ];
    }

    /**
     * @param  Model&HasPreferredPayoutMethod  $entity
     * @return array<string, mixed>
     */
    public static function statusPayload(Model $entity): array
    {
        return [
            'connected' => filled($entity->paypal_payout_email),
            'payouts_enabled' => (bool) $entity->paypal_payouts_enabled,
            'email' => $entity->paypal_payout_email,
            'connected_at' => $entity->paypal_payout_connected_at?->toIso8601String(),
        ];
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function availableMethodsForOrganization(): array
    {
        return [
            ['value' => PreferredPayoutMethod::Stripe->value, 'label' => PreferredPayoutMethod::Stripe->label()],
            ['value' => PreferredPayoutMethod::PayPal->value, 'label' => PreferredPayoutMethod::PayPal->label()],
        ];
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function availableMethodsForMerchant(): array
    {
        return self::availableMethodsForOrganization();
    }
}
