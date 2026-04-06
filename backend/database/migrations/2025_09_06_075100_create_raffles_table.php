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
        Schema::create('raffles', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description');
            $table->decimal('ticket_price', 10, 2);
            $table->integer('total_tickets');
            $table->integer('sold_tickets')->default(0);
            $table->datetime('draw_date');
            $table->enum('status', ['active', 'completed', 'cancelled'])->default('active');
            $table->string('image')->nullable();
            $table->json('prizes')->nullable(); // JSON array of prizes
            $table->integer('winners_count')->default(3);
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('raffles');
    }
};

