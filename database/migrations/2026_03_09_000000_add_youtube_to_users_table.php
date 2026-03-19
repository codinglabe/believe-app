<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Add YouTube channel integration for supporters (user role).
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('youtube_channel_url', 500)->nullable()->after('zipcode');
            $table->text('youtube_access_token')->nullable()->after('youtube_channel_url');
            $table->text('youtube_refresh_token')->nullable()->after('youtube_access_token');
            $table->timestamp('youtube_token_expires_at')->nullable()->after('youtube_refresh_token');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'youtube_channel_url',
                'youtube_access_token',
                'youtube_refresh_token',
                'youtube_token_expires_at',
            ]);
        });
    }
};
