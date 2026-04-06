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
        if (Schema::hasTable('breeding_events')) {
            return;
        }

        Schema::create('breeding_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('male_id')->constrained('livestock_animals')->onDelete('restrict');
            $table->foreignId('female_id')->constrained('livestock_animals')->onDelete('restrict');
            $table->enum('breeding_method', ['natural', 'artificial', 'ai'])->default('natural');
            $table->decimal('stud_fee', 10, 2)->nullable();
            $table->date('breeding_date');
            $table->date('expected_kidding_date')->nullable();
            $table->date('actual_kidding_date')->nullable();
            $table->integer('number_of_kids')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->index('male_id');
            $table->index('female_id');
            $table->index('breeding_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('breeding_events');
    }
};
