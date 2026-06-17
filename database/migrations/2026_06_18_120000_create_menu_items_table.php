<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('menu_items', function (Blueprint $table) {
            $table->id();
            $table->string('menu_key')->unique();
            $table->string('title');
            $table->string('category', 64);
            $table->string('route_name')->nullable();
            $table->string('href')->nullable();
            $table->string('icon', 64)->default('Circle');
            $table->string('active_path_prefix')->nullable();
            $table->boolean('default_enabled')->default(false);
            $table->boolean('supporter_visible')->default(true);
            $table->boolean('org_visible')->default(true);
            $table->boolean('admin_visible')->default(true);
            $table->boolean('requires_auth')->default(false);
            $table->boolean('bottom_nav_eligible')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->json('interest_tags')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('menu_items');
    }
};
