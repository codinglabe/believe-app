<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The original `transactions.type` ENUM could not store product-specific strings (e.g. newsletter_pro_targeting_lifetime),
     * so MySQL coerced them to `purchase`. Use a VARCHAR so the real product line is persisted.
     */
    public function up(): void
    {
        if (! Schema::hasTable('transactions')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql' || $driver === 'mariadb') {
            DB::statement('ALTER TABLE transactions MODIFY COLUMN type VARCHAR(80) NOT NULL DEFAULT \'purchase\'');
        } elseif ($driver === 'pgsql') {
            DB::statement('ALTER TABLE transactions ALTER COLUMN type TYPE VARCHAR(80)');
        }
        // sqlite: migrations typically create string columns already; skip if not enum.
    }

    public function down(): void
    {
        if (! Schema::hasTable('transactions')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql' || $driver === 'mariadb') {
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
    }
};
