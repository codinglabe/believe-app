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
        if (Schema::hasTable('livestock_animals')) {
            return;
        }

        Schema::create('livestock_animals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('livestock_user_id')->constrained('livestock_users')->onDelete('cascade');
            $table->foreignId('current_owner_livestock_user_id')->nullable()->constrained('livestock_users')->onDelete('restrict');
            $table->enum('species', ['goat', 'sheep', 'cow', 'chicken', 'pig'])->default('goat');
            $table->string('breed');
            $table->enum('sex', ['male', 'female'])->default('male');
            $table->string('ear_tag')->unique()->nullable();
            $table->date('date_of_birth')->nullable();
            $table->integer('age_months')->nullable();
            $table->decimal('weight_kg', 8, 2)->nullable();
            $table->string('color_markings')->nullable();
            $table->string('location')->nullable();
            $table->enum('health_status', ['excellent', 'good', 'fair', 'poor'])->default('good');
            $table->enum('fertility_status', ['fertile', 'infertile', 'unknown'])->default('unknown');
            $table->decimal('original_purchase_price', 10, 2)->nullable();
            $table->decimal('current_market_value', 10, 2)->nullable();
            $table->enum('status', ['available', 'sold', 'off_farm', 'deceased'])->default('available');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('livestock_user_id');
            $table->index('current_owner_livestock_user_id');
            $table->index('species');
            $table->index('status');
            $table->index('ear_tag');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('livestock_animals');
    }
};
