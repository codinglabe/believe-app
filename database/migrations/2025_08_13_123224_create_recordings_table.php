<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('recordings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meeting_id')->constrained()->onDelete('cascade');
            $table->foreignId('instructor_id')->constrained('users')->onDelete('cascade');
            $table->string('filename');
            $table->string('original_filename');
            $table->string('file_path')->nullable();
            $table->string('dropbox_path')->nullable();
            $table->bigInteger('file_size')->default(0);
            $table->integer('duration_seconds')->default(0);
            $table->string('mime_type')->nullable();
            $table->enum('status', ['processing', 'uploading', 'completed', 'failed'])->default('processing');
            $table->integer('upload_progress')->default(0);
            $table->timestamp('started_at');
            $table->timestamp('ended_at');
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['meeting_id', 'status']);
            $table->index(['instructor_id', 'created_at']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('recordings');
    }
};
