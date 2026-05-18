<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('raffle_tickets', function (Blueprint $table) {
            $table->timestamp('purchased_at')->nullable()->after('status');
        });

        if (Schema::hasColumn('raffle_tickets', 'purchased_at')) {
            DB::table('raffle_tickets')->whereNull('purchased_at')->update([
                'purchased_at' => DB::raw('created_at'),
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('raffle_tickets', function (Blueprint $table) {
            $table->dropColumn('purchased_at');
        });
    }
};
