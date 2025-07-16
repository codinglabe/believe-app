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
        Schema::create('job_posts', function (Blueprint $table) {
            $table->id();
            // Relationships
            $table->foreign('position_id')->references('id')->on('job_positions')->onDelete('cascade');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');

            $table->string('title')->nullable(); // Can override position title
            $table->text('description')->nullable();
            $table->text('requirements')->nullable();
            $table->decimal('pay_rate', 8, 2)->nullable();
            $table->char('currency', 3)->nullable();
            $table->enum('type', ['volunteer', 'paid', 'internship', 'medicaid']);

            // Location info
            $table->enum('location_type', ['onsite', 'remote', 'hybrid']);
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('country')->nullable();

            // Timing
            $table->smallInteger('time_commitment_min_hours')->nullable();
            $table->date('application_deadline')->nullable();
            $table->date('date_posted')->nullable();

            // Status
            $table->enum('status', ['draft', 'open', 'closed', 'filled'])->default('draft');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_posts');
    }
};
