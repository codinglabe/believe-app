<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('believe_point_processing_lots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('believe_point_purchase_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->timestamp('released_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'released_at'], 'bp_proc_lots_user_released_idx');
            $table->index(['believe_point_purchase_id', 'released_at'], 'bp_proc_lots_purchase_released_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('believe_point_processing_lots');
    }
};
