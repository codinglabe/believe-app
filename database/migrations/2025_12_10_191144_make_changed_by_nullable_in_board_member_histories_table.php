<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('board_member_histories', function (Blueprint $table) {
            // Drop the foreign key constraint first
            $table->dropForeign(['changed_by']);
        });

        // Use raw SQL to modify the column to be nullable
        DB::statement('ALTER TABLE board_member_histories MODIFY changed_by BIGINT UNSIGNED NULL');

        Schema::table('board_member_histories', function (Blueprint $table) {
            // Re-add foreign key constraint
            $table->foreign('changed_by')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('board_member_histories', function (Blueprint $table) {
            // Drop foreign key
            $table->dropForeign(['changed_by']);
        });

        // Use raw SQL to modify the column to be non-nullable
        DB::statement('ALTER TABLE board_member_histories MODIFY changed_by BIGINT UNSIGNED NOT NULL');

        Schema::table('board_member_histories', function (Blueprint $table) {
            // Re-add foreign key constraint
            $table->foreign('changed_by')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');
        });
    }
};
