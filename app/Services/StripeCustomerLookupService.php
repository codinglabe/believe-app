<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Stripe\StripeClient;

class StripeCustomerLookupService
{
    /**
     * Find an existing Stripe customer for this email / billable entity on the current Stripe account.
     * Does not create anything — callers should only create when this returns null.
     *
     * Prefers: metadata user_id + user_type match → metadata user_id → oldest customer with same email.
     */
    public static function findExistingCustomerId(
        StripeClient $stripe,
        string $email,
        int $userId,
        string $userType
    ): ?string {
        $normalizedEmail = strtolower(trim($email));
        if ($normalizedEmail === '') {
            return null;
        }

        $candidates = self::collectByEmailList($stripe, $email, $normalizedEmail);

        if ($candidates === []) {
            $candidates = self::searchByEmailQuery($stripe, $normalizedEmail);
        }

        if ($candidates === []) {
            $candidates = self::searchByMetadata($stripe, $userId, $userType);
        }

        if ($candidates === []) {
            return null;
        }

        return self::pickBestCustomerId($candidates, $userId, $userType);
    }

    /**
     * @param  array<int, \Stripe\Customer>  $candidates
     */
    private static function pickBestCustomerId(array $candidates, int $userId, string $userType): string
    {
        foreach ($candidates as $c) {
            if (($c->metadata['user_id'] ?? null) === (string) $userId
                && ($c->metadata['user_type'] ?? null) === $userType) {
                return $c->id;
            }
        }

        foreach ($candidates as $c) {
            if (($c->metadata['user_id'] ?? null) === (string) $userId) {
                return $c->id;
            }
        }

        usort($candidates, fn ($a, $b) => $a->created <=> $b->created);

        return $candidates[0]->id;
    }

    /**
     * @return array<int, \Stripe\Customer>
     */
    private static function collectByEmailList(StripeClient $stripe, string $email, string $normalizedEmail): array
    {
        $out = [];

        try {
            foreach ($stripe->customers->all(['email' => $email, 'limit' => 100])->autoPagingIterator() as $c) {
                if ($c->deleted) {
                    continue;
                }
                if (strtolower(trim((string) ($c->email ?? ''))) !== $normalizedEmail) {
                    continue;
                }
                $out[] = $c;
                if (count($out) >= 100) {
                    break;
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Stripe list customers by email failed', [
                'email' => $email,
                'error' => $e->getMessage(),
            ]);
        }

        return $out;
    }

    /**
     * @return array<int, \Stripe\Customer>
     */
    private static function searchByEmailQuery(StripeClient $stripe, string $normalizedEmail): array
    {
        try {
            $escaped = str_replace(['\\', "'"], ['\\\\', "\\'"], $normalizedEmail);
            $result = $stripe->customers->search([
                'query' => "email:'{$escaped}'",
                'limit' => 20,
            ]);
            $out = [];
            foreach ($result->data as $c) {
                if ($c->deleted) {
                    continue;
                }
                if (strtolower(trim((string) ($c->email ?? ''))) === $normalizedEmail) {
                    $out[] = $c;
                }
            }

            return $out;
        } catch (\Throwable $e) {
            Log::debug('Stripe customer search by email skipped', ['error' => $e->getMessage()]);

            return [];
        }
    }

    /**
     * @return array<int, \Stripe\Customer>
     */
    private static function searchByMetadata(StripeClient $stripe, int $userId, string $userType): array
    {
        $queries = [
            "metadata['user_id']:'{$userId}' AND metadata['user_type']:'".self::escapeSearchValue($userType)."'",
            "metadata['user_id']:'{$userId}'",
        ];

        foreach ($queries as $query) {
            try {
                $result = $stripe->customers->search([
                    'query' => $query,
                    'limit' => 10,
                ]);
                $out = [];
                foreach ($result->data as $c) {
                    if ($c->deleted) {
                        continue;
                    }
                    $out[] = $c;
                }
                if ($out !== []) {
                    return $out;
                }
            } catch (\Throwable $e) {
                Log::debug('Stripe customer search by metadata skipped', [
                    'query' => $query,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return [];
    }

    private static function escapeSearchValue(string $value): string
    {
        return str_replace(['\\', "'"], ['\\\\', "\\'"], $value);
    }
}
