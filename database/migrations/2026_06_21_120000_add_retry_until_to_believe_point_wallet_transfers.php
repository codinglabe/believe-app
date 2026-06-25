<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('believe_point_wallet_transfers', function (Blueprint $table) {
            $table->timestamp('retry_until')->nullable()->after('completed_at');
        });
    }

    public function down(): void
    {
        Schema::table('believe_point_wallet_transfers', function (Blueprint $table) {
            $table->dropColumn('retry_until');
        });
    }
};
