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
        if (!Schema::hasColumn('events', 'user_id')) {
            Schema::table('events', function (Blueprint $table) {
                $table->foreignId('user_id')->nullable()->after('organization_id')->constrained('users')->onDelete('cascade');
            });
        }

        if (Schema::hasColumn('events', 'organization_id')) {
            \Illuminate\Support\Facades\DB::statement('ALTER TABLE events MODIFY organization_id BIGINT UNSIGNED NULL');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            if (Schema::hasColumn('events', 'user_id')) {
                $table->dropForeign(['user_id']);
            }
        });

        if (Schema::hasColumn('events', 'organization_id')) {
            \Illuminate\Support\Facades\DB::statement('ALTER TABLE events MODIFY organization_id BIGINT UNSIGNED NOT NULL');
        }
    }
};
