<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
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
            $table->foreignId('organization_cause_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['course_id', 'organization_cause_id'], 'course_org_cause_unique');
        });

        Schema::create('fundme_campaign_organization_cause', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fundme_campaign_id')->constrained('fundme_campaigns')->cascadeOnDelete();
            $table->foreignId('organization_cause_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['fundme_campaign_id', 'organization_cause_id'], 'fundme_campaign_org_cause_unique');
        });

        Schema::create('job_post_organization_cause', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('organization_cause_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['job_post_id', 'organization_cause_id'], 'job_post_org_cause_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_post_organization_cause');
        Schema::dropIfExists('fundme_campaign_organization_cause');
        Schema::dropIfExists('course_organization_cause');
        Schema::dropIfExists('organization_causes');
    }
};
