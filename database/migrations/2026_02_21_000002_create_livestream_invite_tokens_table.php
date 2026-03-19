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
        Schema::create('livestream_invite_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_livestream_id')->constrained('org_livestreams')->onDelete('cascade');
            $table->string('token', 64)->unique();
            $table->timestamps();

            $table->index('organization_livestream_id');
            $table->index('token');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('livestream_invite_tokens');
    }
};
