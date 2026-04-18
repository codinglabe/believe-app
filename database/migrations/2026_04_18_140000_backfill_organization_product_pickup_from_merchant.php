<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('organization_products') || ! Schema::hasTable('marketplace_products')) {
            return;
        }
        if (! Schema::hasColumn('organization_products', 'pickup_available')) {
            return;
        }

        DB::table('organization_products as op')
            ->join('marketplace_products as mp', 'mp.id', '=', 'op.marketplace_product_id')
            ->where('mp.pickup_available', true)
            ->whereIn('mp.product_type', ['physical', 'service', 'media'])
            ->update(['op.pickup_available' => true]);
    }

    public function down(): void
    {
        // Non-reversible data migration
    }
};
