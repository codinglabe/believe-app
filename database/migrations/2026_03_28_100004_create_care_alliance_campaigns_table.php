<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('care_alliance_campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('care_alliance_id')->constrained('care_alliances')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('alliance_fee_bps_override')->nullable()->comment('Override default alliance fee for this campaign');
            $table->string('status', 32)->default('draft'); // draft | active | closed
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('care_alliance_campaigns');
    }
};
