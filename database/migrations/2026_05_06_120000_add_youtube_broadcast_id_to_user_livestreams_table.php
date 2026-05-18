<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_livestreams', function (Blueprint $table) {
            $table->string('youtube_broadcast_id', 128)->nullable()->after('youtube_stream_key');
        });
    }

    public function down(): void
    {
        Schema::table('user_livestreams', function (Blueprint $table) {
            $table->dropColumn('youtube_broadcast_id');
        });
    }
};
