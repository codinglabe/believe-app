<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('care_alliance_invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('care_alliance_id')->constrained('care_alliances')->cascadeOnDelete();
            $table->foreignId('invited_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('token', 64)->unique();
            $table->string('email', 190)->nullable()->index();
            $table->foreignId('organization_id')->nullable()->constrained('organizations')->nullOnDelete();
            $table->string('status', 32)->default('pending'); // pending | accepted | declined | expired
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('care_alliance_invitations');
    }
};
