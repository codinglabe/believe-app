<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'sms_auto_recharge_threshold')) {
                $table->unsignedInteger('sms_auto_recharge_threshold')->nullable()->after('sms_auto_recharge_enabled');
            }
            if (! Schema::hasColumn('users', 'sms_auto_recharge_package_id')) {
                $table->foreignId('sms_auto_recharge_package_id')->nullable()->after('sms_auto_recharge_threshold')->constrained('sms_packages')->nullOnDelete();
            }
            if (! Schema::hasColumn('users', 'sms_auto_recharge_pm_id')) {
                $table->string('sms_auto_recharge_pm_id')->nullable()->after('sms_auto_recharge_package_id');
            }
            if (! Schema::hasColumn('users', 'sms_auto_recharge_card_brand')) {
                $table->string('sms_auto_recharge_card_brand', 32)->nullable()->after('sms_auto_recharge_pm_id');
            }
            if (! Schema::hasColumn('users', 'sms_auto_recharge_card_last4')) {
                $table->string('sms_auto_recharge_card_last4', 4)->nullable()->after('sms_auto_recharge_card_brand');
            }
            if (! Schema::hasColumn('users', 'sms_auto_recharge_agreed_at')) {
                $table->timestamp('sms_auto_recharge_agreed_at')->nullable()->after('sms_auto_recharge_card_last4');
            }
            if (! Schema::hasColumn('users', 'sms_last_auto_recharge_at')) {
                $table->timestamp('sms_last_auto_recharge_at')->nullable()->after('sms_auto_recharge_agreed_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'sms_last_auto_recharge_at')) {
                $table->dropColumn('sms_last_auto_recharge_at');
            }
            if (Schema::hasColumn('users', 'sms_auto_recharge_agreed_at')) {
                $table->dropColumn('sms_auto_recharge_agreed_at');
            }
            if (Schema::hasColumn('users', 'sms_auto_recharge_card_last4')) {
                $table->dropColumn('sms_auto_recharge_card_last4');
            }
            if (Schema::hasColumn('users', 'sms_auto_recharge_card_brand')) {
                $table->dropColumn('sms_auto_recharge_card_brand');
            }
            if (Schema::hasColumn('users', 'sms_auto_recharge_pm_id')) {
                $table->dropColumn('sms_auto_recharge_pm_id');
            }
            if (Schema::hasColumn('users', 'sms_auto_recharge_package_id')) {
                $table->dropConstrainedForeignId('sms_auto_recharge_package_id');
            }
            if (Schema::hasColumn('users', 'sms_auto_recharge_threshold')) {
                $table->dropColumn('sms_auto_recharge_threshold');
            }
        });
    }
};
