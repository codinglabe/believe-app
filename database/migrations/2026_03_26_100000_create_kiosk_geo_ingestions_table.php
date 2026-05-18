<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('kiosk_geo_ingestions')) {
            return;
        }

        Schema::create('kiosk_geo_ingestions', function (Blueprint $table) {
            $table->id();
            $table->string('state_abbr', 2)->index();
            $table->string('normalized_city', 128)->index();
            $table->string('zip_normalized', 16)->default('')->index();
            $table->string('status', 32)->default('pending')->index();
            $table->unsignedInteger('provider_count')->default(0);
            $table->text('error_message')->nullable();
            $table->timestamp('last_ingested_at')->nullable();
            $table->timestamps();

            $table->unique(['state_abbr', 'normalized_city', 'zip_normalized'], 'kiosk_geo_ingestions_geo_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kiosk_geo_ingestions');
    }
};
