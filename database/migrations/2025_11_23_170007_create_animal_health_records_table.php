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
        Schema::create('animal_health_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('animal_id')->constrained('livestock_animals')->onDelete('cascade');
            $table->enum('record_type', ['vaccination', 'treatment', 'checkup', 'surgery', 'other'])->default('checkup');
            $table->text('description');
            $table->string('medication')->nullable();
            $table->string('vet_name')->nullable();
            $table->date('record_date');
            $table->json('document_files')->nullable(); // Array of file URLs
            $table->timestamps();
            
            $table->index('animal_id');
            $table->index('record_date');
            $table->index('record_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('animal_health_records');
    }
};
