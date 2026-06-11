<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('push_notification_recipients', function (Blueprint $table) {
            $table->unsignedTinyInteger('attempt_count')->default(0)->after('failure_reason');
            $table->string('firebase_error_code', 128)->nullable()->after('attempt_count');
        });
    }

    public function down(): void
    {
        Schema::table('push_notification_recipients', function (Blueprint $table) {
            $table->dropColumn(['attempt_count', 'firebase_error_code']);
        });
    }
};
