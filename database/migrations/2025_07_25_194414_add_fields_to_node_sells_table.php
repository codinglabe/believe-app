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
        Schema::table('node_sells', function (Blueprint $table) {
            $table->foreignId('node_referral_id')->nullable()->after('node_boss_id')->constrained()->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('node_sells', function (Blueprint $table) {
            $table->dropForeign(['node_referral_id']);
            $table->dropColumn('node_referral_id');
        });
    }
};
