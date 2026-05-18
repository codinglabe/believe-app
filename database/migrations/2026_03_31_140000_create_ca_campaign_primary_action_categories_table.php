<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ca_campaign_primary_action_categories', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('care_alliance_campaign_id');
            $table->unsignedBigInteger('primary_action_category_id');
            $table->timestamps();

            $table->unique(
                ['care_alliance_campaign_id', 'primary_action_category_id'],
                'ca_camp_pac_unique'
            );

            $table->foreign('care_alliance_campaign_id', 'ca_camp_pac_camp_fk')
                ->references('id')
                ->on('care_alliance_campaigns')
                ->cascadeOnDelete();

            $table->foreign('primary_action_category_id', 'ca_camp_pac_cat_fk')
                ->references('id')
                ->on('primary_action_categories')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ca_campaign_primary_action_categories');
    }
};
