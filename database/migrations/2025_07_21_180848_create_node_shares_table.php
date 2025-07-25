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
        Schema::create('node_shares', function (Blueprint $table) {
            $table->id();
            $table->foreignId('node_boss_id')->nullable()->constrained()->onDelete('cascade');
            $table->uuid('node_id');
            $table->decimal("cost", 10, 2);
            $table->decimal("sold", 10, 2);
            $table->decimal("remaining", 10, 2);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('node_shares');
    }
};
