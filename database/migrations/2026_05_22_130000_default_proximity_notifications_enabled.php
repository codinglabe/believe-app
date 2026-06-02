<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // No-op: 2026_05_22_120000 adds proximity_notifications_enabled with default(true).
        // A full UPDATE users was redundant and locked large tables for minutes during deploy.
        if (! Schema::hasColumn('users', 'proximity_notifications_enabled')) {
            return;
        }
    }

    public function down(): void
    {
        //
    }
};
