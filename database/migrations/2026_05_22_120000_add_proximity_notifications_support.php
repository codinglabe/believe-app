<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // users: small table — safe to extend for proximity prefs + last reported location.
        // excel_data (~2M rows): NEVER ALTER here — coords go in geocode_cache only (see ProximityNotificationService).
        // organizations: coords also via geocode_cache to avoid deploy-time ALTER on large tables.

        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'proximity_notifications_enabled')) {
                $table->boolean('proximity_notifications_enabled')->default(true);
            }
            if (! Schema::hasColumn('users', 'last_latitude')) {
                $table->decimal('last_latitude', 10, 7)->nullable();
            }
            if (! Schema::hasColumn('users', 'last_longitude')) {
                $table->decimal('last_longitude', 11, 7)->nullable();
            }
            if (! Schema::hasColumn('users', 'last_location_reported_at')) {
                $table->timestamp('last_location_reported_at')->nullable();
            }
        });

        if (! Schema::hasTable('geocode_cache')) {
            Schema::create('geocode_cache', function (Blueprint $table) {
                $table->id();
                $table->string('address_hash', 64)->unique();
                $table->text('address_query');
                $table->decimal('latitude', 10, 7);
                $table->decimal('longitude', 10, 7);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('proximity_notification_logs')) {
            Schema::create('proximity_notification_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('target_type', 32);
                $table->unsignedBigInteger('target_id');
                $table->timestamp('notified_at');
                $table->timestamps();

                $table->index(['user_id', 'target_type', 'target_id', 'notified_at'], 'proximity_logs_user_target_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('proximity_notification_logs');
        Schema::dropIfExists('geocode_cache');

        Schema::table('users', function (Blueprint $table) {
            foreach (['last_location_reported_at', 'last_longitude', 'last_latitude', 'proximity_notifications_enabled'] as $col) {
                if (Schema::hasColumn('users', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
