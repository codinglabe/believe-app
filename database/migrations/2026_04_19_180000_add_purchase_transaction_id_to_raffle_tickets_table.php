<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('raffle_tickets', function (Blueprint $table) {
            $table->foreignId('purchase_transaction_id')
                ->nullable()
                ->after('user_id')
                ->constrained('transactions')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('raffle_tickets', function (Blueprint $table) {
            $table->dropForeign(['purchase_transaction_id']);
        });
    }
};
