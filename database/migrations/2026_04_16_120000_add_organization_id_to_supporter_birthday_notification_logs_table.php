<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // follower_id FK uses the old composite unique as its index; add a dedicated index first.
        Schema::table('supporter_birthday_notification_logs', function (Blueprint $table) {
            $table->index('follower_id', 'sbnl_follower_id_idx');
        });

        Schema::table('supporter_birthday_notification_logs', function (Blueprint $table) {
            $table->dropUnique('supporter_bday_notify_unique');
        });

        Schema::table('supporter_birthday_notification_logs', function (Blueprint $table) {
            $table->foreignId('organization_id')
                ->nullable()
                ->after('follower_id')
                ->constrained('organizations')
                ->cascadeOnDelete();
        });

        Schema::table('supporter_birthday_notification_logs', function (Blueprint $table) {
            $table->unique(
                ['follower_id', 'celebrant_id', 'organization_id', 'year'],
                'supporter_bday_org_notify_unique'
            );
        });

        Schema::table('supporter_birthday_notification_logs', function (Blueprint $table) {
            $table->dropIndex('sbnl_follower_id_idx');
        });
    }

    public function down(): void
    {
        Schema::table('supporter_birthday_notification_logs', function (Blueprint $table) {
            $table->index('follower_id', 'sbnl_follower_id_idx');
        });

        Schema::table('supporter_birthday_notification_logs', function (Blueprint $table) {
            $table->dropUnique('supporter_bday_org_notify_unique');
        });

        Schema::table('supporter_birthday_notification_logs', function (Blueprint $table) {
            $table->dropForeign(['organization_id']);
            $table->dropColumn('organization_id');
        });

        Schema::table('supporter_birthday_notification_logs', function (Blueprint $table) {
            $table->unique(['follower_id', 'celebrant_id', 'year'], 'supporter_bday_notify_unique');
        });

        Schema::table('supporter_birthday_notification_logs', function (Blueprint $table) {
            $table->dropIndex('sbnl_follower_id_idx');
        });
    }
};
