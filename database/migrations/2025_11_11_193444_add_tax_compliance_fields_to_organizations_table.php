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
        Schema::table('organizations', function (Blueprint $table) {
            $table->string('tax_compliance_status')->default('unknown')->after('tax_period');
            $table->timestamp('tax_compliance_checked_at')->nullable()->after('tax_compliance_status');
            $table->json('tax_compliance_meta')->nullable()->after('tax_compliance_checked_at');
            $table->boolean('is_compliance_locked')->default(false)->after('tax_compliance_meta');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn([
                'tax_compliance_status',
                'tax_compliance_checked_at',
                'tax_compliance_meta',
                'is_compliance_locked',
            ]);
        });
    }
};
