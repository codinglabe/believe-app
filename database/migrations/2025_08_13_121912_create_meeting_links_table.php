<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('meeting_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meeting_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->text('token');
            $table->enum('role', ['host', 'student'])->default('student');
            $table->timestamp('expires_at');
            $table->boolean('is_active')->default(true);
            $table->integer('access_count')->default(0);
            $table->timestamp('last_accessed_at')->nullable();
            $table->ipAddress('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();

            $table->unique(['meeting_id', 'user_id', 'role']);
            $table->index(['meeting_id', 'role']);
            $table->index(['expires_at', 'is_active']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('meeting_links');
    }
};
