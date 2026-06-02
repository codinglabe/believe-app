<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'enrollment_notifications_via')) {
                $table->string('enrollment_notifications_via', 32)->default('push_email')->after('preferred_theme');
            }
            if (! Schema::hasColumn('users', 'enrollment_reminders_via')) {
                $table->string('enrollment_reminders_via', 32)->default('push')->after('enrollment_notifications_via');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'enrollment_reminders_via')) {
                $table->dropColumn('enrollment_reminders_via');
            }
            if (Schema::hasColumn('users', 'enrollment_notifications_via')) {
                $table->dropColumn('enrollment_notifications_via');
            }
        });
    }
};
