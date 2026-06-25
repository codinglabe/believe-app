<?php

namespace App\Support;

use App\Models\Transaction;
use App\Services\StripeConfigService;
use Illuminate\Support\Facades\Log;
use Stripe\Exception\InvalidRequestException;
use Stripe\StripeClient;

/**
 * Resolve whether a Stripe object id was created in live or test mode.
 *
 * Modern PaymentIntent ids (pi_3…) do not embed the mode — use {@see livemode} from the
 * Stripe API or persist {@code meta.stripe_livemode} when recording ledger rows.
 */
final class StripeReferenceMode
{
    public const MODE_LIVE = 'live';

    public const MODE_TEST = 'test';

    public const MODE_LOCAL = 'local';

    public const MODE_UNKNOWN = 'unknown';

    /** @var array<string, bool|null> */
    private static array $apiCache = [];

    /** @var list<string> */
    private const TEST_PREFIXES = [
        'cs_test_',
        'pi_test_',
        'ch_test_',
        'in_test_',
        'sub_test_',
        'cus_test_',
        'seti_test_',
        'src_test_',
        'tmr_test_',
        'price_test_',
        'prod_test_',
        'WELCOME-cs_test_',
    ];

    /** @var list<string> */
    private const LIVE_PREFIXES = [
        'cs_live_',
        'pi_live_',
        'ch_live_',
        'in_live_',
        'sub_live_',
        'cus_live_',
        'price_live_',
        'prod_live_',
        'WELCOME-cs_live_',
    ];

    /** @var list<string> */
    private const LOCAL_PREFIXES = [
        'local_wallet_',
        'local_wallet_plan_',
        'local_wallet_product_',
        'TXN-',
    ];

    /**
     * @return self::MODE_*|null null when the value is empty / not a Stripe id
     */
    public static function modeFromId(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        $value = trim($value);

        foreach (self::LOCAL_PREFIXES as $prefix) {
            if (str_starts_with($value, $prefix)) {
                return self::MODE_LOCAL;
            }
        }

        foreach (self::TEST_PREFIXES as $prefix) {
            if (str_starts_with($value, $prefix)) {
                return self::MODE_TEST;
            }
        }

        foreach (self::LIVE_PREFIXES as $prefix) {
            if (str_starts_with($value, $prefix)) {
                return self::MODE_LIVE;
            }
        }

        if (preg_match('/_(test)_/i', $value)) {
            return self::MODE_TEST;
        }

        if (preg_match('/_(live)_/i', $value)) {
            return self::MODE_LIVE;
        }

        if (self::looksLikeStripeObjectId($value)) {
            return self::MODE_UNKNOWN;
        }

        return null;
    }

    /**
     * @return bool|null true = live, false = test, null = unknown / non-Stripe
     */
    public static function resolveLivemode(?string $reference, ?array $meta = null): ?bool
    {
        if (is_array($meta) && array_key_exists('stripe_livemode', $meta)) {
            return (bool) $meta['stripe_livemode'];
        }

        if ($reference === null || trim($reference) === '') {
            return null;
        }

        $reference = trim($reference);
        $fromPrefix = self::modeFromId($reference);

        return match ($fromPrefix) {
            self::MODE_LIVE => true,
            self::MODE_TEST, self::MODE_LOCAL => false,
            self::MODE_UNKNOWN => self::resolveLivemodeViaStripeApi($reference),
            default => null,
        };
    }

    public static function isConfidentlyTest(?string $reference, ?array $meta = null): bool
    {
        $livemode = self::resolveLivemode($reference, $meta);

        return $livemode === false;
    }

    public static function isConfidentlyLive(?string $reference, ?array $meta = null): bool
    {
        $livemode = self::resolveLivemode($reference, $meta);

        return $livemode === true;
    }

    /**
     * @return list<string>
     */
    public static function collectReferences(?string $transactionId, ?array $meta): array
    {
        $refs = [];

        if (is_string($transactionId) && trim($transactionId) !== '') {
            $refs[] = trim($transactionId);
        }

        if (! is_array($meta)) {
            return array_values(array_unique($refs));
        }

        foreach ([
            'stripe_session_id',
            'stripe_payment_intent',
            'stripe_payment_intent_id',
            'stripe_subscription_id',
            'payment_intent',
            'original_payment_intent',
        ] as $key) {
            $value = $meta[$key] ?? null;
            if (is_string($value) && trim($value) !== '') {
                $refs[] = trim($value);
            }
        }

        return array_values(array_unique($refs));
    }

    /**
     * @return self::MODE_*
     */
    public static function modeForTransaction(Transaction $transaction, bool $allowApiLookup = true): string
    {
        $meta = is_array($transaction->meta) ? $transaction->meta : [];

        if (array_key_exists('stripe_livemode', $meta)) {
            return $meta['stripe_livemode'] ? self::MODE_LIVE : self::MODE_TEST;
        }

        $resolved = null;
        foreach (self::collectReferences($transaction->transaction_id, $meta) as $reference) {
            $fromPrefix = self::modeFromId($reference);
            if ($fromPrefix === self::MODE_LIVE) {
                return self::MODE_LIVE;
            }
            if ($fromPrefix === self::MODE_TEST || $fromPrefix === self::MODE_LOCAL) {
                $resolved = self::MODE_TEST;

                continue;
            }

            if ($fromPrefix === self::MODE_UNKNOWN && $allowApiLookup) {
                $livemode = self::resolveLivemodeViaStripeApi($reference);
                if ($livemode === true) {
                    return self::MODE_LIVE;
                }
                if ($livemode === false) {
                    $resolved = self::MODE_TEST;
                }
            }
        }

        return $resolved ?? self::MODE_UNKNOWN;
    }

    public static function isConfidentlyTestTransaction(Transaction $transaction, bool $allowApiLookup = true): bool
    {
        return self::modeForTransaction($transaction, $allowApiLookup) === self::MODE_TEST;
    }

    public static function isConfidentlyLiveTransaction(Transaction $transaction, bool $allowApiLookup = true): bool
    {
        return self::modeForTransaction($transaction, $allowApiLookup) === self::MODE_LIVE;
    }

    public static function hasAmbiguousStripeReference(Transaction $transaction): bool
    {
        $meta = is_array($transaction->meta) ? $transaction->meta : [];

        foreach (self::collectReferences($transaction->transaction_id, $meta) as $reference) {
            if (self::modeFromId($reference) === self::MODE_UNKNOWN) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $meta
     * @return array<string, mixed>
     */
    public static function withStoredLivemodeFromStripeObject(array $meta, ?object $stripeObject): array
    {
        if ($stripeObject !== null && isset($stripeObject->livemode)) {
            $meta['stripe_livemode'] = (bool) $stripeObject->livemode;

            return $meta;
        }

        $sessionId = null;
        if ($stripeObject !== null && is_string($stripeObject->id ?? null) && str_starts_with($stripeObject->id, 'cs_')) {
            $sessionId = $stripeObject->id;
        }

        $paymentIntentId = null;
        if ($stripeObject !== null && is_string($stripeObject->payment_intent ?? null)) {
            $paymentIntentId = $stripeObject->payment_intent;
        }

        return self::withStoredLivemode(
            $meta,
            $sessionId ?? (is_string($meta['stripe_session_id'] ?? null) ? $meta['stripe_session_id'] : null),
            $paymentIntentId ?? (is_string($meta['stripe_payment_intent'] ?? null) ? $meta['stripe_payment_intent'] : null),
        );
    }

    /**
     * @param  array<string, mixed>  $meta
     * @return array<string, mixed>
     */
    public static function withStoredLivemode(array $meta, ?string $sessionId = null, ?string $paymentIntentId = null): array
    {
        if (array_key_exists('stripe_livemode', $meta)) {
            return $meta;
        }

        foreach (array_filter([$sessionId, $paymentIntentId]) as $reference) {
            $livemode = self::resolveLivemode($reference);
            if ($livemode !== null) {
                $meta['stripe_livemode'] = $livemode;

                return $meta;
            }
        }

        return $meta;
    }

    private static function looksLikeStripeObjectId(string $value): bool
    {
        return (bool) preg_match('/^(pi|cs|ch|in|sub|cus|seti|src|tmr|price|prod)_/', $value);
    }

    private static function resolveLivemodeViaStripeApi(string $id): ?bool
    {
        if (array_key_exists($id, self::$apiCache)) {
            return self::$apiCache[$id];
        }

        foreach (['live', 'test'] as $environment) {
            $credentials = StripeConfigService::getCredentials($environment);
            $secretKey = trim((string) ($credentials['secret_key'] ?? ''));

            if ($secretKey === '') {
                continue;
            }

            try {
                $client = new StripeClient(['api_key' => $secretKey]);
                $object = self::retrieveStripeObject($client, $id);

                if ($object !== null) {
                    $livemode = (bool) ($object->livemode ?? StripeConfigService::isLiveEnvironment($environment));
                    self::$apiCache[$id] = $livemode;

                    return $livemode;
                }
            } catch (InvalidRequestException $e) {
                if (! self::isMissingResourceError($e)) {
                    Log::warning('StripeReferenceMode: lookup failed', [
                        'id' => $id,
                        'environment' => $environment,
                        'error' => $e->getMessage(),
                    ]);
                }
            } catch (\Throwable $e) {
                Log::warning('StripeReferenceMode: lookup failed', [
                    'id' => $id,
                    'environment' => $environment,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        self::$apiCache[$id] = null;

        return null;
    }

    private static function retrieveStripeObject(StripeClient $client, string $id): ?object
    {
        return match (true) {
            str_starts_with($id, 'pi_') => $client->paymentIntents->retrieve($id),
            str_starts_with($id, 'cs_') => $client->checkout->sessions->retrieve($id),
            str_starts_with($id, 'ch_') => $client->charges->retrieve($id),
            str_starts_with($id, 'in_') => $client->invoices->retrieve($id),
            str_starts_with($id, 'sub_') => $client->subscriptions->retrieve($id),
            str_starts_with($id, 'cus_') => $client->customers->retrieve($id),
            default => null,
        };
    }

    private static function isMissingResourceError(InvalidRequestException $exception): bool
    {
        $message = strtolower($exception->getMessage());

        return str_contains($message, 'no such')
            || str_contains($message, 'resource_missing')
            || str_contains($message, 'does not exist');
    }
}
