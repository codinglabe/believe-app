<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Legacy name from failed attempt (MySQL 64-char identifier limit on auto FK names).
        Schema::dropIfExists('care_alliance_primary_action_category');

        Schema::create('ca_primary_action_categories', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('care_alliance_id');
            $table->unsignedBigInteger('primary_action_category_id');
            $table->timestamps();

            $table->unique(['care_alliance_id', 'primary_action_category_id'], 'ca_pac_unique');

            $table->foreign('care_alliance_id', 'ca_pac_alliance_fk')
                ->references('id')->on('care_alliances')->cascadeOnDelete();
            $table->foreign('primary_action_category_id', 'ca_pac_cat_fk')
                ->references('id')->on('primary_action_categories')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ca_primary_action_categories');
        // No-op if only legacy table ever existed.
        Schema::dropIfExists('care_alliance_primary_action_category');
    }
};
