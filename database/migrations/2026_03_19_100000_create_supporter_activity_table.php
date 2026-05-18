<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('supporter_activity', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supporter_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('event_type', 64);
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->timestamp('created_at');

            $table->index(['organization_id', 'created_at']);
            $table->index(['organization_id', 'supporter_id']);
            $table->unique(['event_type', 'reference_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supporter_activity');
    }
};
