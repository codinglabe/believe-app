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
        if (Schema::hasTable('fractional_listings')) {
            return;
        }

        Schema::create('fractional_listings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('livestock_animal_id')->constrained('livestock_animals')->onDelete('cascade');
            $table->foreignId('livestock_user_id')->constrained('livestock_users')->onDelete('cascade');
            $table->foreignId('fractional_asset_id')->nullable()->constrained('fractional_assets')->onDelete('set null');
            $table->enum('status', ['pending', 'active', 'sold_out', 'cancelled'])->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('livestock_animal_id');
            $table->index('livestock_user_id');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fractional_listings');
    }
};
