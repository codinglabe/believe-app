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
        Schema::table('fractional_listings', function (Blueprint $table) {
            $table->string('country_code', 2)->nullable()->after('livestock_user_id');
            $table->string('tag_number')->unique()->nullable()->after('country_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('fractional_listings', function (Blueprint $table) {
            $table->dropColumn(['country_code', 'tag_number']);
        });
    }
};
