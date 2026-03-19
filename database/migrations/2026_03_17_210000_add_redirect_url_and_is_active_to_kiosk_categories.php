<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kiosk_categories', function (Blueprint $table) {
            if (! Schema::hasColumn('kiosk_categories', 'redirect_url')) {
                $table->string('redirect_url', 500)->nullable()->after('keywords');
            }
            if (! Schema::hasColumn('kiosk_categories', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('sort_order');
            }
        });
    }

    public function down(): void
    {
        Schema::table('kiosk_categories', function (Blueprint $table) {
            if (Schema::hasColumn('kiosk_categories', 'redirect_url')) {
                $table->dropColumn('redirect_url');
            }
            if (Schema::hasColumn('kiosk_categories', 'is_active')) {
                $table->dropColumn('is_active');
            }
        });
    }
};
