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
        if (Schema::hasTable('ownership_history')) {
            return;
        }

        Schema::create('ownership_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('animal_id')->constrained('livestock_animals')->onDelete('cascade');
            $table->foreignId('previous_owner_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('new_owner_id')->constrained('users')->onDelete('restrict');
            $table->date('transfer_date');
            $table->enum('method', ['sale', 'gift', 'admin_transfer', 'inheritance'])->default('sale');
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->index('animal_id');
            $table->index('previous_owner_id');
            $table->index('new_owner_id');
            $table->index('transfer_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ownership_history');
    }
};
