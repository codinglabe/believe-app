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
        if (Schema::hasTable('livestock_listings')) {
            return;
        }

        Schema::create('livestock_listings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('animal_id')->constrained('livestock_animals')->onDelete('cascade');
            $table->foreignId('livestock_user_id')->constrained('livestock_users')->onDelete('cascade');
            $table->string('title');
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2);
            $table->string('currency', 3)->default('USD');
            $table->enum('status', ['active', 'sold', 'removed', 'pending'])->default('pending');
            $table->timestamp('listed_at')->nullable();
            $table->timestamp('sold_at')->nullable();
            $table->timestamps();
            
            $table->index('animal_id');
            $table->index('livestock_user_id');
            $table->index('status');
            $table->index('listed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('livestock_listings');
    }
};
