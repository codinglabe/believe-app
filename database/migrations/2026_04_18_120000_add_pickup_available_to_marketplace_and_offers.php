<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('marketplace_products') && ! Schema::hasColumn('marketplace_products', 'pickup_available')) {
            Schema::table('marketplace_products', function (Blueprint $table) {
                $table->boolean('pickup_available')->default(false)->after('status');
            });
        }

        if (Schema::hasTable('merchant_hub_offers') && ! Schema::hasColumn('merchant_hub_offers', 'pickup_available')) {
            Schema::table('merchant_hub_offers', function (Blueprint $table) {
                $table->boolean('pickup_available')->default(false)->after('status');
            });
        }

        if (Schema::hasTable('organization_products') && ! Schema::hasColumn('organization_products', 'pickup_available')) {
            Schema::table('organization_products', function (Blueprint $table) {
                $table->boolean('pickup_available')->default(false)->after('status');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('marketplace_products', 'pickup_available')) {
            Schema::table('marketplace_products', function (Blueprint $table) {
                $table->dropColumn('pickup_available');
            });
        }
        if (Schema::hasColumn('merchant_hub_offers', 'pickup_available')) {
            Schema::table('merchant_hub_offers', function (Blueprint $table) {
                $table->dropColumn('pickup_available');
            });
        }
        if (Schema::hasColumn('organization_products', 'pickup_available')) {
            Schema::table('organization_products', function (Blueprint $table) {
                $table->dropColumn('pickup_available');
            });
        }
    }
};
