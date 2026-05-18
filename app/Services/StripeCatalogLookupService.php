<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Stripe\StripeClient;

/**
 * Reuse existing Stripe Products and Prices on this account before creating duplicates.
 * Subscription billing uses Prices; we match amount, currency, and recurring interval (or one-time).
 */
class StripeCatalogLookupService
{
    public const SOURCE_PLATFORM_PLAN = 'platform_plan';

    public const SOURCE_MERCHANT_PLAN = 'merchant_plan';

    public const SOURCE_WALLET_PLAN = 'wallet_plan';

    public const SOURCE_DONATION = 'donation';

    /**
     * Find a product by metadata (strongest), Stripe Search by name, or paginated list match.
     *
     * @param  string|null  $planId  Local DB id as string (e.g. platform plan id, wallet plan id)
     */
    public static function findExistingProductId(
        StripeClient $stripe,
        string $exactName,
        ?string $source = null,
        ?string $planId = null
    ): ?string {
        if ($planId !== null && $source !== null) {
            $byMeta = self::searchProductByPlanMetadata($stripe, $planId, $source);
            if ($byMeta !== null) {
                return $byMeta;
            }
        }

        if ($exactName !== '') {
            $bySearch = self::searchProductsByNameStripeSearch($stripe, $exactName, $planId, $source);
            if ($bySearch !== null) {
                return $bySearch;
            }
        }

        return self::findProductByNamePaginated($stripe, $exactName, $planId, $source);
    }

    /**
     * Find a price on this product: same unit amount, currency, one-time vs recurring, and interval when recurring.
     * Uses auto-pagination so we do not miss matches beyond the first 100 prices.
     */
    public static function findExistingPriceId(
        StripeClient $stripe,
        string $productId,
        int $unitAmountCents,
        string $currency,
        bool $isOneTime,
        ?string $recurringInterval
    ): ?string {
        $currency = strtolower($currency);

        try {
            foreach ($stripe->prices->all([
                'product' => $productId,
                'limit' => 100,
                'active' => true,
            ])->autoPagingIterator() as $price) {
                if (! $price->active) {
                    continue;
                }
                if (strtolower((string) $price->currency) !== $currency) {
                    continue;
                }
                if ((int) $price->unit_amount !== $unitAmountCents) {
                    continue;
                }

                if ($isOneTime) {
                    if ($price->recurring === null) {
                        return $price->id;
                    }

                    continue;
                }

                if ($price->recurring === null) {
                    continue;
                }

                if ($recurringInterval !== null && $price->recurring->interval === $recurringInterval) {
                    return $price->id;
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Stripe price list pagination failed', [
                'product' => $productId,
                'error' => $e->getMessage(),
            ]);
        }

        return null;
    }

    private static function searchProductByPlanMetadata(StripeClient $stripe, string $planId, string $source): ?string
    {
        try {
            $q = sprintf(
                "metadata['plan_id']:'%s' AND metadata['source']:'%s'",
                self::escapeSearchToken($planId),
                self::escapeSearchToken($source)
            );
            $result = $stripe->products->search(['query' => $q, 'limit' => 10]);
            foreach ($result->data as $p) {
                if (! ($p->deleted ?? false)) {
                    return $p->id;
                }
            }
        } catch (\Throwable $e) {
            Log::debug('Stripe product metadata search skipped', ['error' => $e->getMessage()]);
        }

        return null;
    }

    /**
     * @return array<int, \Stripe\Product>
     */
    private static function collectProductsByExactName(StripeClient $stripe, string $exactName): array
    {
        $out = [];
        try {
            foreach ($stripe->products->all(['limit' => 100])->autoPagingIterator() as $p) {
                if ($p->deleted ?? false) {
                    continue;
                }
                if ($p->name === $exactName) {
                    $out[] = $p;
                }
                if (count($out) >= 200) {
                    break;
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Stripe product list pagination failed', ['error' => $e->getMessage()]);
        }

        return $out;
    }

    private static function searchProductsByNameStripeSearch(
        StripeClient $stripe,
        string $exactName,
        ?string $planId,
        ?string $source
    ): ?string {
        try {
            $escaped = str_replace(['\\', "'"], ['\\\\', "\\'"], $exactName);
            $result = $stripe->products->search([
                'query' => "name:'{$escaped}'",
                'limit' => 20,
            ]);
            $candidates = [];
            foreach ($result->data as $p) {
                if ($p->deleted ?? false) {
                    continue;
                }
                if ($p->name === $exactName) {
                    $candidates[] = $p;
                }
            }

            return self::pickBestProductId($candidates, $planId, $source);
        } catch (\Throwable $e) {
            Log::debug('Stripe product name search skipped', ['error' => $e->getMessage()]);
        }

        return null;
    }

    private static function findProductByNamePaginated(
        StripeClient $stripe,
        string $exactName,
        ?string $planId,
        ?string $source
    ): ?string {
        $candidates = self::collectProductsByExactName($stripe, $exactName);

        return self::pickBestProductId($candidates, $planId, $source);
    }

    /**
     * @param  array<int, \Stripe\Product>  $candidates
     */
    private static function pickBestProductId(array $candidates, ?string $planId, ?string $source): ?string
    {
        if ($candidates === []) {
            return null;
        }

        if ($planId !== null && $source !== null) {
            foreach ($candidates as $p) {
                if (($p->metadata['plan_id'] ?? null) === $planId
                    && ($p->metadata['source'] ?? null) === $source) {
                    return $p->id;
                }
            }
        }

        usort($candidates, fn ($a, $b) => $a->created <=> $b->created);

        return $candidates[0]->id;
    }

    private static function escapeSearchToken(string $value): string
    {
        return str_replace(['\\', "'"], ['\\\\', "\\'"], $value);
    }
}
