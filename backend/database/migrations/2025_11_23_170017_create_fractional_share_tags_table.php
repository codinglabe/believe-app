<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('fractional_share_tags')) {
            return;
        }

        Schema::create('fractional_share_tags', function (Blueprint $table) {
            $table->id();
            $table->foreignId('offering_id')->constrained('fractional_offerings')->cascadeOnDelete();
            $table->string('tag_number')->unique()->index(); // e.g., #1001, #1002
            $table->unsignedBigInteger('tokens_filled')->default(0); // tokens currently in this share
            $table->unsignedBigInteger('tokens_per_share'); // total tokens needed to complete this share
            $table->boolean('is_complete')->default(false)->index(); // true when share is fully sold
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fractional_share_tags');
    }
};
