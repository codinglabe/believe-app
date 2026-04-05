<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('job_post_organization_cause');
        Schema::dropIfExists('fundme_campaign_organization_cause');
        Schema::dropIfExists('course_organization_cause');
        Schema::dropIfExists('organization_causes');

        // Remove partial table from a failed run (long table name caused MySQL FK name limit errors).
        Schema::dropIfExists('course_primary_action_category');

        Schema::create('course_pac', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->foreignId('primary_action_category_id')
                ->constrained('primary_action_categories')
                ->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['course_id', 'primary_action_category_id'], 'course_pac_unique');
        });

        Schema::create('fundme_campaign_pac', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fundme_campaign_id')->constrained('fundme_campaigns')->cascadeOnDelete();
            $table->foreignId('primary_action_category_id')
                ->constrained('primary_action_categories')
                ->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['fundme_campaign_id', 'primary_action_category_id'], 'fundme_camp_pac_unique');
        });

        Schema::create('job_post_pac', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('primary_action_category_id')
                ->constrained('primary_action_categories')
                ->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['job_post_id', 'primary_action_category_id'], 'job_post_pac_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_post_pac');
        Schema::dropIfExists('fundme_campaign_pac');
        Schema::dropIfExists('course_pac');

        Schema::create('organization_causes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            $table->timestamps();

            $table->unique(['organization_id', 'name']);
        });

        Schema::create('course_organization_cause', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->foreignId('organization_cause_id')->constrained('organization_causes')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['course_id', 'organization_cause_id'], 'course_org_cause_unique');
        });

        Schema::create('fundme_campaign_organization_cause', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fundme_campaign_id')->constrained('fundme_campaigns')->cascadeOnDelete();
            $table->foreignId('organization_cause_id')->constrained('organization_causes')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['fundme_campaign_id', 'organization_cause_id'], 'fundme_campaign_org_cause_unique');
        });

        Schema::create('job_post_organization_cause', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('organization_cause_id')->constrained('organization_causes')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['job_post_id', 'organization_cause_id'], 'job_post_org_cause_unique');
        });
    }
};
