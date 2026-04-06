<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_livestreams', function (Blueprint $table) {
            $table->text('youtube_stream_key')->nullable()->after('room_password');
        });
    }

    public function down(): void
    {
        Schema::table('user_livestreams', function (Blueprint $table) {
            $table->dropColumn('youtube_stream_key');
        });
    }
};
