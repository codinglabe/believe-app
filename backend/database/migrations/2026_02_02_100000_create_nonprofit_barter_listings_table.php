<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Nonprofit-to-nonprofit barter: listings offered by a nonprofit.
     */
    public function up(): void
    {
        Schema::create('nonprofit_barter_listings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('nonprofit_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->unsignedInteger('points_value')->default(0)->comment('Believe Points value for settlement delta');
            $table->boolean('barter_allowed')->default(true);
            $table->json('requested_services')->nullable()->comment('Categories or tags for filtering');
            $table->string('status', 20)->default('active')->comment('active|paused|completed');
            $table->timestamps();

            $table->index(['nonprofit_id', 'status']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('nonprofit_barter_listings');
    }
};
