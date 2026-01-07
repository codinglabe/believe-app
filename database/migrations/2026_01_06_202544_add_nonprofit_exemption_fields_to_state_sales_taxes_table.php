<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('state_sales_taxes', function (Blueprint $table) {
            $table->enum('sales_tax_status', [
                'exempt',
                'exempt_limited',
                'non_exempt',
                'no_state_sales_tax',
                'refund_based'
            ])->nullable()->after('base_sales_tax_rate')->comment('Nonprofit sales tax exemption status');

            $table->enum('services_vs_goods', [
                'tangible_goods_only',
                'both_taxable',
                'n_a'
            ])->nullable()->after('sales_tax_status')->comment('What is typically taxed');

            $table->enum('charitable_vs_resale', [
                'charitable_only',
                'n_a'
            ])->nullable()->after('services_vs_goods')->comment('Charitable vs resale treatment');

            $table->boolean('requires_exemption_certificate')->default(false)->after('charitable_vs_resale')->comment('Whether valid exemption certificate is required');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('state_sales_taxes', function (Blueprint $table) {
            $table->dropColumn([
                'sales_tax_status',
                'services_vs_goods',
                'charitable_vs_resale',
                'requires_exemption_certificate'
            ]);
        });
    }
};
