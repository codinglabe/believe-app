<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('kiosk_providers')) {
            return;
        }

        Schema::create('kiosk_providers', function (Blueprint $table) {
            $table->id();
            $table->string('state_abbr', 2)->index();
            $table->string('normalized_city', 128)->index();
            $table->string('zip_normalized', 16)->default('')->index();
            $table->string('category_slug', 64)->index();
            $table->string('subcategory_slug', 128)->default('');
            $table->string('provider_slug', 64);
            $table->string('name');
            $table->string('website', 500)->nullable();
            $table->string('payment_url', 500)->nullable();
            $table->string('login_url', 500)->nullable();
            $table->boolean('account_link_supported')->default(false);
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->foreign('category_slug')->references('slug')->on('kiosk_categories')->cascadeOnDelete();

            $table->unique(
                ['state_abbr', 'normalized_city', 'zip_normalized', 'category_slug', 'subcategory_slug', 'provider_slug'],
                'kiosk_providers_dedupe_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kiosk_providers');
    }
};
