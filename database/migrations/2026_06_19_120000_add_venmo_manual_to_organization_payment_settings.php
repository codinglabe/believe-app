<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organization_payment_settings', function (Blueprint $table) {
            if (! Schema::hasColumn('organization_payment_settings', 'venmo_manual_enabled')) {
                $table->boolean('venmo_manual_enabled')->default(false)->after('stripe_venmo_enabled');
            }
            if (! Schema::hasColumn('organization_payment_settings', 'venmo_username')) {
                $table->string('venmo_username', 100)->nullable()->after('venmo_manual_enabled');
            }
        });
    }

    public function down(): void
    {
        Schema::table('organization_payment_settings', function (Blueprint $table) {
            foreach (['venmo_manual_enabled', 'venmo_username'] as $col) {
                if (Schema::hasColumn('organization_payment_settings', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
