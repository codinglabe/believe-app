<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Update ENUM values in the transactions table
        DB::statement("
            ALTER TABLE transactions 
            MODIFY COLUMN status ENUM(
                'pending', 
                'completed', 
                'failed', 
                'cancelled', 
                'withdrawal', 
                'refund', 
                'deposit', 
                'rejected'
            ) NOT NULL DEFAULT 'pending'
        ");
    }

    public function down(): void
    {
        // Revert ENUM to previous version (update according to your original values)
        DB::statement("
            ALTER TABLE transactions 
            MODIFY COLUMN status ENUM('pending', 'completed', 'failed', 'cancelled') 
            NOT NULL DEFAULT 'pending'
        ");
    }
};
