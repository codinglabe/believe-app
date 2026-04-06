<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kiosk_services', function (Blueprint $table) {
            $table->id();
            $table->string('market_code', 64)->nullable()->index();
            $table->string('state', 64)->nullable()->index();
            $table->string('parish', 128)->nullable();
            $table->string('city', 128)->nullable()->index();
            $table->string('category_slug', 64)->index();
            $table->string('subcategory', 128)->nullable();
            $table->string('service_slug', 128)->index();
            $table->string('display_name');
            $table->string('url', 500)->nullable();
            $table->string('launch_type', 32)->nullable(); // web_portal, internal_app, internal_integration
            $table->string('jurisdiction_level', 32)->nullable();
            $table->unsignedTinyInteger('jurisdiction_rank')->default(7);
            $table->unsignedSmallInteger('category_sort')->default(0);
            $table->unsignedSmallInteger('item_sort_within_category')->default(0);
            $table->boolean('is_active')->default(true);
            $table->boolean('allow_webview')->default(true);
            $table->boolean('enable_redirect_tracking')->default(false);
            $table->string('internal_product', 64)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kiosk_services');
    }
};
