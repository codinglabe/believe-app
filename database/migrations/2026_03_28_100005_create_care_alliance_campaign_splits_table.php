<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('care_alliance_campaign_splits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('care_alliance_campaign_id')->constrained('care_alliance_campaigns')->cascadeOnDelete();
            $table->foreignId('organization_id')->nullable()->constrained('organizations')->cascadeOnDelete();
            $table->boolean('is_alliance_fee')->default(false);
            $table->unsignedSmallInteger('percent_bps')->comment('0-10000 = 0-100%');
            $table->timestamps();

            $table->index(['care_alliance_campaign_id', 'organization_id'], 'cac_split_org_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('care_alliance_campaign_splits');
    }
};
