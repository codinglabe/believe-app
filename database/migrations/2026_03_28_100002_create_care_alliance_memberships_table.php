<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('care_alliance_memberships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('care_alliance_id')->constrained('care_alliances')->cascadeOnDelete();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('status', 32)->default('pending'); // pending | active | declined | removed
            $table->timestamp('invited_at')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();

            $table->unique(['care_alliance_id', 'organization_id'], 'ca_org_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('care_alliance_memberships');
    }
};
