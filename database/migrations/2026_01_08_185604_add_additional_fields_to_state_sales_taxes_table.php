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
            $table->string('rate_mode', 50)->nullable()->after('base_sales_tax_rate')->comment('STATE BASE ONLY or NO STATE TAX');
            $table->string('certificate_type_allowed', 100)->nullable()->after('requires_exemption_certificate')->comment('NONPROFIT_EXEMPTION|RESALE, RESALE, or NONE');
            $table->string('site_to_apply_for_certificate', 500)->nullable()->after('certificate_type_allowed')->comment('URL to apply for exemption certificate');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('state_sales_taxes', function (Blueprint $table) {
            $table->dropColumn([
                'rate_mode',
                'certificate_type_allowed',
                'site_to_apply_for_certificate'
            ]);
        });
    }
};
