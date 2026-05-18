<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('streaming_jobs', function (Blueprint $table) {
            $table->timestamp('last_heartbeat_at')->nullable()->after('completed_at');
            $table->timestamp('live_at')->nullable()->after('last_heartbeat_at');
        });
    }

    public function down(): void
    {
        Schema::table('streaming_jobs', function (Blueprint $table) {
            $table->dropColumn(['last_heartbeat_at', 'live_at']);
        });
    }
};
