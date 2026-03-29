<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('primary_action_category_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('primary_action_category_id')
                ->constrained('primary_action_categories')
                ->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'primary_action_category_id'], 'pac_user_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('primary_action_category_user');
    }
};
