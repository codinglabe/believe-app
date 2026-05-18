<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('kiosk_services')) {
            Schema::drop('kiosk_services');
        }

        if (Schema::hasTable('kiosk_service_requests')
            && Schema::hasColumn('kiosk_service_requests', 'approved_service_id')
            && ! Schema::hasColumn('kiosk_service_requests', 'approved_kiosk_provider_id')) {
            Schema::table('kiosk_service_requests', function (Blueprint $table) {
                $table->unsignedBigInteger('approved_kiosk_provider_id')->nullable()->index();
            });
            DB::statement('UPDATE kiosk_service_requests SET approved_kiosk_provider_id = approved_service_id WHERE approved_service_id IS NOT NULL');
            Schema::table('kiosk_service_requests', function (Blueprint $table) {
                $table->dropColumn('approved_service_id');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('kiosk_service_requests')
            && Schema::hasColumn('kiosk_service_requests', 'approved_kiosk_provider_id')
            && ! Schema::hasColumn('kiosk_service_requests', 'approved_service_id')) {
            Schema::table('kiosk_service_requests', function (Blueprint $table) {
                $table->unsignedBigInteger('approved_service_id')->nullable()->index();
            });
            DB::statement('UPDATE kiosk_service_requests SET approved_service_id = approved_kiosk_provider_id WHERE approved_kiosk_provider_id IS NOT NULL');
            Schema::table('kiosk_service_requests', function (Blueprint $table) {
                $table->dropColumn('approved_kiosk_provider_id');
            });
        }
    }
};
