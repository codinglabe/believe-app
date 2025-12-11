<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add 'transfer_out' and 'transfer_in' to the type enum
        DB::statement("
            ALTER TABLE transactions 
            MODIFY COLUMN type ENUM(
                'deposit', 
                'withdrawal', 
                'purchase', 
                'refund', 
                'commission',
                'transfer_out',
                'transfer_in'
            ) NOT NULL DEFAULT 'purchase'
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to original enum values
        DB::statement("
            ALTER TABLE transactions 
            MODIFY COLUMN type ENUM(
                'deposit', 
                'withdrawal', 
                'purchase', 
                'refund', 
                'commission'
            ) NOT NULL DEFAULT 'purchase'
        ");
    }
};
