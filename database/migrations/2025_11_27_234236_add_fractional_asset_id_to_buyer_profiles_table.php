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
        Schema::table('buyer_profiles', function (Blueprint $table) {
            $table->foreignId('fractional_asset_id')->nullable()->after('livestock_user_id')->constrained('fractional_assets')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('buyer_profiles', function (Blueprint $table) {
            $table->dropForeign(['fractional_asset_id']);
            $table->dropColumn('fractional_asset_id');
        });
    }
};
