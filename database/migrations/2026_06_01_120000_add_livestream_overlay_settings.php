<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            if (! Schema::hasColumn('organizations', 'livestream_overlay_settings')) {
                $table->json('livestream_overlay_settings')->nullable()->after('registered_user_image');
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'livestream_overlay_settings')) {
                $table->json('livestream_overlay_settings')->nullable()->after('registered_user_image');
            }
        });
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            if (Schema::hasColumn('organizations', 'livestream_overlay_settings')) {
                $table->dropColumn('livestream_overlay_settings');
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'livestream_overlay_settings')) {
                $table->dropColumn('livestream_overlay_settings');
            }
        });
    }
};
