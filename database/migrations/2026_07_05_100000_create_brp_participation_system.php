<?php

use App\Models\AdminSetting;
use App\Services\BrpParticipationSettingsService;
use App\Support\BrpParticipationModule;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('brp_participation_awards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('module', 64);
            $table->string('reference_type', 128)->default('default');
            $table->unsignedBigInteger('reference_id');
            $table->decimal('points_awarded', 12, 2);
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(['module', 'reference_type', 'reference_id'], 'brp_part_awards_mod_ref_uniq');
            $table->index(['user_id', 'module']);
        });

        if (! Schema::hasColumn('organizations', 'referrer_user_id')) {
            Schema::table('organizations', function (Blueprint $table) {
                $table->foreignId('referrer_user_id')->nullable()->after('user_id')->constrained('users')->nullOnDelete();
            });
        }

        if (! Schema::hasColumn('merchants', 'referrer_user_id')) {
            Schema::table('merchants', function (Blueprint $table) {
                $table->foreignId('referrer_user_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
            });
        }

        foreach (BrpParticipationModule::all() as $module) {
            $freeDefault = BrpParticipationSettingsService::DEFAULT_FREE_AWARD;
            $primeDefault = BrpParticipationSettingsService::DEFAULT_PRIME_AWARD;

            if ($module === BrpParticipationModule::BP_PURCHASE) {
                $legacyFree = AdminSetting::get('bp_purchase_free_brp_award');
                $legacyPrime = AdminSetting::get('bp_purchase_prime_brp_award');
                if ($legacyFree !== null) {
                    $freeDefault = (float) $legacyFree;
                }
                if ($legacyPrime !== null) {
                    $primeDefault = (float) $legacyPrime;
                }
            }

            if (AdminSetting::where('key', BrpParticipationSettingsService::settingKeyFree($module))->doesntExist()) {
                AdminSetting::set(
                    BrpParticipationSettingsService::settingKeyFree($module),
                    $freeDefault,
                    'float',
                );
            }

            if (AdminSetting::where('key', BrpParticipationSettingsService::settingKeyPrime($module))->doesntExist()) {
                AdminSetting::set(
                    BrpParticipationSettingsService::settingKeyPrime($module),
                    $primeDefault,
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
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('merchants', 'referrer_user_id')) {
            Schema::table('merchants', function (Blueprint $table) {
                $table->dropConstrainedForeignId('referrer_user_id');
            });
        }

        if (Schema::hasColumn('organizations', 'referrer_user_id')) {
            Schema::table('organizations', function (Blueprint $table) {
                $table->dropConstrainedForeignId('referrer_user_id');
            });
        }

        Schema::dropIfExists('brp_participation_awards');
    }
};
