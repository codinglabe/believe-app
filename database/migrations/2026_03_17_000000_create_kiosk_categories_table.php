<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('kiosk_categories')) {
            Schema::create('kiosk_categories', function (Blueprint $table) {
                $table->id();
                $table->string('slug', 64)->unique();
                $table->string('title');
                $table->string('keywords')->nullable();
                $table->unsignedSmallInteger('sort_order')->default(0);
                $table->timestamps();
            });
            return;
        }

        // Table exists (e.g. created earlier with fewer columns): add missing columns
        Schema::table('kiosk_categories', function (Blueprint $table) {
            if (! Schema::hasColumn('kiosk_categories', 'title')) {
                $table->string('title')->after('slug');
            }
            if (! Schema::hasColumn('kiosk_categories', 'keywords')) {
                $table->string('keywords')->nullable()->after('title');
            }
            if (! Schema::hasColumn('kiosk_categories', 'sort_order')) {
                $table->unsignedSmallInteger('sort_order')->default(0)->after('keywords');
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kiosk_categories');
    }
};
