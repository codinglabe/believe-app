<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('interest_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('icon')->nullable();
            $table->string('color', 20)->nullable()->default('#3B82F6');
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // Pivot: organizations <-> interest_categories
        Schema::create('interest_category_organization', function (Blueprint $table) {
            $table->id();
            $table->foreignId('interest_category_id')->constrained()->cascadeOnDelete();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['interest_category_id', 'organization_id'], 'ico_ic_org_unique');
        });

        // Pivot: events <-> interest_categories
        Schema::create('event_interest_category', function (Blueprint $table) {
            $table->id();
            $table->foreignId('interest_category_id')->constrained()->cascadeOnDelete();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['interest_category_id', 'event_id'], 'eic_ic_ev_unique');
        });

        // Pivot: courses <-> interest_categories
        Schema::create('course_interest_category', function (Blueprint $table) {
            $table->id();
            $table->foreignId('interest_category_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['interest_category_id', 'course_id'], 'cic_ic_co_unique');
        });

        // Pivot: job_posts (volunteer opportunities) <-> interest_categories
        Schema::create('interest_category_job_post', function (Blueprint $table) {
            $table->id();
            $table->foreignId('interest_category_id')->constrained()->cascadeOnDelete();
            $table->foreignId('job_post_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['interest_category_id', 'job_post_id'], 'icjp_ic_jp_unique');
        });

        // User interest category preferences
        Schema::create('interest_category_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('interest_category_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['interest_category_id', 'user_id'], 'icu_ic_u_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('interest_category_user');
        Schema::dropIfExists('interest_category_job_post');
        Schema::dropIfExists('course_interest_category');
        Schema::dropIfExists('event_interest_category');
        Schema::dropIfExists('interest_category_organization');
        Schema::dropIfExists('interest_categories');
    }
};
