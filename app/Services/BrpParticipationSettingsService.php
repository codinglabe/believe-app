<?php

namespace App\Services;

use App\Models\AdminSetting;
use App\Models\User;
use App\Support\BrpParticipationModule;
use App\Support\SupporterSubscriptionService;

/**
 * Admin-configurable flat BRP participation awards per module and membership tier.
 */
final class BrpParticipationSettingsService
{
    public const DEFAULT_FREE_AWARD = 1.0;

    public const DEFAULT_PRIME_AWARD = 2.0;

    public const DEFAULT_ENABLED = true;

    public static function settingKeyFree(string $module): string
    {
        return "brp_participation_{$module}_free_award";
    }

    public static function settingKeyPrime(string $module): string
    {
        return "brp_participation_{$module}_prime_award";
    }

    public static function settingKeyEnabled(string $module): string
    {
        return "brp_participation_{$module}_enabled";
    }

    public static function settingKeyMoneyMoves(string $module): string
    {
        return "brp_participation_{$module}_money_moves";
    }

    public static function isEnabled(string $module): bool
    {
        return (bool) AdminSetting::get(
            self::settingKeyEnabled($module),
            self::DEFAULT_ENABLED,
        );
    }

    public static function moneyMoves(string $module): bool
    {
        $key = self::settingKeyMoneyMoves($module);
        if (AdminSetting::where('key', $key)->exists()) {
            return (bool) AdminSetting::get($key, BrpParticipationModule::defaultMoneyMovesFor($module));
        }

        return BrpParticipationModule::defaultMoneyMovesFor($module);
    }

    public static function freeAward(string $module): float
    {
        $default = self::defaultFreeAward($module);

        return max(0, (float) AdminSetting::get(self::settingKeyFree($module), $default));
    }

    public static function primeAward(string $module): float
    {
        $default = self::defaultPrimeAward($module);

        return max(0, (float) AdminSetting::get(self::settingKeyPrime($module), $default));
    }

    /**
     * Flat BRP for a user on a participation module, based on Free vs Prime tier.
     */
    public static function awardForUser(?User $user, string $module): float
    {
        if (! self::isEnabled($module)) {
            return 0.0;
        }

        if ($user === null) {
            return self::freeAward($module);
        }

        if ($user->hasNonprofitDashboardRole()) {
            return self::primeAward($module);
        }

        return SupporterSubscriptionService::currentTierSlug($user) === SupporterSubscriptionService::SLUG_PRIME
            ? self::primeAward($module)
            : self::freeAward($module);
    }

    /**
     * @return array<string, mixed>
     */
    public static function modulePayload(string $module): array
    {
        $moneyMoves = self::moneyMoves($module);

        return [
            'module' => $module,
            'label' => BrpParticipationModule::label($module),
            'rule' => BrpParticipationModule::rules()[$module] ?? '',
            'enabled' => self::isEnabled($module),
            'free_award' => self::freeAward($module),
            'prime_award' => self::primeAward($module),
            'money_moves' => $moneyMoves,
            'category' => BrpParticipationModule::categoryFor($module, $moneyMoves),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function adminModulesPayload(): array
    {
        return array_map(
            static fn (string $module) => self::modulePayload($module),
            BrpParticipationModule::all(),
        );
    }

    /**
     * @return array<string, mixed>
     */
    public static function frontendPayload(?User $user = null): array
    {
        $modules = [];
        foreach (BrpParticipationModule::all() as $module) {
            $modules[$module] = array_merge(
                self::modulePayload($module),
                ['award' => self::awardForUser($user, $module)],
            );
        }

        return [
            'modules' => $modules,
            'min_bp_purchase' => (float) AdminSetting::get('believe_points_min_purchase', 10.00),
        ];
    }

    public static function setModuleSettings(
        string $module,
        bool $enabled,
        float $freeAward,
        float $primeAward,
        ?bool $moneyMoves = null,
    ): void {
        AdminSetting::set(self::settingKeyEnabled($module), $enabled, 'boolean');
        AdminSetting::set(self::settingKeyFree($module), $freeAward, 'float');
        AdminSetting::set(self::settingKeyPrime($module), $primeAward, 'float');
        if ($moneyMoves !== null) {
            AdminSetting::set(self::settingKeyMoneyMoves($module), $moneyMoves, 'boolean');
        }
    }

    private static function defaultFreeAward(string $module): float
    {
        if ($module === BrpParticipationModule::BP_PURCHASE) {
            $legacy = AdminSetting::get('bp_purchase_free_brp_award');
            if ($legacy !== null) {
                return (float) $legacy;
            }
        }

        foreach (self::legacySettingKeys($module, 'free') as $legacyKey) {
            $legacy = AdminSetting::get($legacyKey);
            if ($legacy !== null) {
                return (float) $legacy;
            }
        }

        return self::DEFAULT_FREE_AWARD;
    }

    private static function defaultPrimeAward(string $module): float
    {
        if ($module === BrpParticipationModule::BP_PURCHASE) {
            $legacy = AdminSetting::get('bp_purchase_prime_brp_award');
            if ($legacy !== null) {
                return (float) $legacy;
            }
        }

        foreach (self::legacySettingKeys($module, 'prime') as $legacyKey) {
            $legacy = AdminSetting::get($legacyKey);
            if ($legacy !== null) {
                return (float) $legacy;
            }
        }

        return self::DEFAULT_PRIME_AWARD;
    }

    /**
     * @return list<string>
     */
    private static function legacySettingKeys(string $module, string $tier): array
    {
        $suffix = $tier === 'prime' ? 'prime_award' : 'free_award';

        return match ($module) {
            BrpParticipationModule::COURSE_PURCHASE => ["brp_participation_course_{$suffix}"],
            BrpParticipationModule::EVENT_REGISTRATION_PAID,
            BrpParticipationModule::EVENT_ATTENDANCE_FREE => ["brp_participation_event_{$suffix}"],
            default => [],
        };
    }
}
