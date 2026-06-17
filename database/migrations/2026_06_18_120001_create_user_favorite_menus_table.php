<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_favorite_menus', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('menu_key');
            $table->unsignedTinyInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->string('placement', 32)->default('quick');
            $table->unsignedTinyInteger('bottom_nav_slot')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'menu_key', 'placement']);
            $table->unique(['user_id', 'bottom_nav_slot']);
            $table->foreign('menu_key')->references('menu_key')->on('menu_items')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_favorite_menus');
    }
};
