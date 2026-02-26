<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Add 'meeting_live' status: Draft → Meeting Live → Stream Live → Ended.
     */
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE org_livestreams MODIFY COLUMN status ENUM('draft','scheduled','meeting_live','live','ended','cancelled') NOT NULL DEFAULT 'draft'");
        } else {
            Schema::table('org_livestreams', function (Blueprint $table) {
                $table->string('status', 32)->default('draft')->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE org_livestreams MODIFY COLUMN status ENUM('draft','scheduled','live','ended','cancelled') NOT NULL DEFAULT 'draft'");
        }
    }
};
