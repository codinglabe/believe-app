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
        Schema::table('compliance_applications', function (Blueprint $table) {
            if (!Schema::hasColumn('compliance_applications', 'assistance_types')) {
                $table->json('assistance_types')->after('stripe_payment_intent');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('compliance_applications', function (Blueprint $table) {
            if (Schema::hasColumn('compliance_applications', 'assistance_types')) {
                $table->dropColumn('assistance_types');
            }
        });
    }
};
