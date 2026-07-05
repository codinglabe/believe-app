<?php

use App\Models\AdminSetting;
use App\Services\BrpParticipationSettingsService;
use App\Support\BrpParticipationModule;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $legacyMap = [
            'course' => BrpParticipationModule::COURSE_PURCHASE,
            'event' => null,
        ];

        foreach ($legacyMap as $legacy => $target) {
            if ($target === null) {
                $this->copyLegacySettings('event', BrpParticipationModule::EVENT_REGISTRATION_PAID);
                $this->copyLegacySettings('event', BrpParticipationModule::EVENT_ATTENDANCE_FREE);

                continue;
            }

            $this->copyLegacySettings($legacy, $target);
        }

        foreach (BrpParticipationModule::all() as $module) {
            if (AdminSetting::where('key', BrpParticipationSettingsService::settingKeyFree($module))->doesntExist()) {
                AdminSetting::set(
                    BrpParticipationSettingsService::settingKeyFree($module),
                    BrpParticipationSettingsService::DEFAULT_FREE_AWARD,
                    'float',
                );
            }

            if (AdminSetting::where('key', BrpParticipationSettingsService::settingKeyPrime($module))->doesntExist()) {
                AdminSetting::set(
                    BrpParticipationSettingsService::settingKeyPrime($module),
                    BrpParticipationSettingsService::DEFAULT_PRIME_AWARD,
                    'float',
                );
            }

            if (AdminSetting::where('key', BrpParticipationSettingsService::settingKeyEnabled($module))->doesntExist()) {
                AdminSetting::set(
                    BrpParticipationSettingsService::settingKeyEnabled($module),
                    BrpParticipationSettingsService::DEFAULT_ENABLED,
                    'boolean',
                );
            }

            if (AdminSetting::where('key', BrpParticipationSettingsService::settingKeyMoneyMoves($module))->doesntExist()) {
                AdminSetting::set(
                    BrpParticipationSettingsService::settingKeyMoneyMoves($module),
                    BrpParticipationModule::defaultMoneyMovesFor($module),
                    'boolean',
                );
            }
        }
    }

    public function down(): void
    {
        foreach (BrpParticipationModule::all() as $module) {
            foreach ([
                BrpParticipationSettingsService::settingKeyFree($module),
                BrpParticipationSettingsService::settingKeyPrime($module),
                BrpParticipationSettingsService::settingKeyEnabled($module),
                BrpParticipationSettingsService::settingKeyMoneyMoves($module),
            ] as $key) {
                AdminSetting::where('key', $key)->delete();
            }
        }
    }

    private function copyLegacySettings(string $legacyModule, string $newModule): void
    {
        $pairs = [
            ["brp_participation_{$legacyModule}_free_award", BrpParticipationSettingsService::settingKeyFree($newModule)],
            ["brp_participation_{$legacyModule}_prime_award", BrpParticipationSettingsService::settingKeyPrime($newModule)],
            ["brp_participation_{$legacyModule}_enabled", BrpParticipationSettingsService::settingKeyEnabled($newModule)],
        ];

        foreach ($pairs as [$from, $to]) {
            if (AdminSetting::where('key', $to)->exists()) {
                continue;
            }

            $legacy = AdminSetting::where('key', $from)->first();
            if ($legacy === null) {
                continue;
            }

            AdminSetting::set($to, AdminSetting::get($from), $legacy->type);
        }
    }
};
