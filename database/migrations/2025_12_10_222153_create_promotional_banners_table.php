<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('promotional_banners', function (Blueprint $table) {
            $table->id();
            $table->string('title')->nullable();
            $table->enum('type', ['image', 'text'])->default('text');
            $table->string('image_url')->nullable();
            $table->text('text_content')->nullable();
            $table->text('external_link')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('display_order')->default(0);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->string('background_color')->nullable();
            $table->string('text_color')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
            $table->softDeletes();
            
            $table->index('is_active');
            $table->index('display_order');
            $table->index(['starts_at', 'ends_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('promotional_banners');
    }
};
