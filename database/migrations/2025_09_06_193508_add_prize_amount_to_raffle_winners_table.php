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
        Schema::table('raffle_winners', function (Blueprint $table) {
            $table->decimal('prize_amount', 10, 2)->default(0)->after('prize_description');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('raffle_winners', function (Blueprint $table) {
            $table->dropColumn('prize_amount');
        });
    }
};
