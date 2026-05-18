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
        Schema::create('gigs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('category_id')->constrained('service_categories')->onDelete('cascade');
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('description');
            $table->text('full_description')->nullable();
            $table->decimal('price', 10, 2)->default(0);
            $table->string('delivery_time')->default('3 days');
            $table->decimal('rating', 3, 2)->default(0);
            $table->unsignedInteger('reviews_count')->default(0);
            $table->unsignedInteger('orders_count')->default(0);
            $table->json('tags')->nullable();
            $table->enum('status', ['draft', 'active', 'paused', 'suspended'])->default('draft');
            $table->boolean('is_featured')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'is_featured']);
            $table->index(['category_id', 'status']);
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('gigs');
    }
};
