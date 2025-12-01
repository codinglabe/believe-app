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
        Schema::table('orders', function (Blueprint $table) {
            $table->decimal("subtotal", 12, 2)->default(0)->after("reference_number");
            $table->decimal("platform_fee", 12, 2)->default(0)->after("tax_amount");
            $table->decimal("donation_amount", 12, 2)->default(0)->after("platform_fee");
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn("platform_fee");
            $table->dropColumn("donation_amount");
            $table->dropColumn("subtotal");
        });
    }
};
