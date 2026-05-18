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
        if (Schema::hasTable('meetings')) {
            return;
        }

        Schema::create('meetings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('status')->default('scheduled'); // scheduled, active, completed, cancelled
            $table->string('meeting_id')->nullable(); // external meeting id (e.g. video provider)
            $table->foreignId('course_id')->nullable()->constrained('courses')->onDelete('set null');
            $table->timestamps();

            $table->index('user_id');
            $table->index('status');
            $table->index('course_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('meetings');
    }
};
