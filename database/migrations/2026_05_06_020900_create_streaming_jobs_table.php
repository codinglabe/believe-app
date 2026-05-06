<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('streaming_jobs', function (Blueprint $table) {
            $table->id();
            $table->string('livestream_kind', 20);
            $table->unsignedBigInteger('livestream_id');
            $table->string('meeting_id', 100);
            $table->string('organization_id', 100);
            $table->text('source_url');
            $table->text('destination_url');
            $table->string('callback_url', 1024);
            $table->unsignedInteger('max_duration_minutes')->default(120);
            $table->string('status', 30)->default('queued');
            $table->string('provider_message_id', 255)->nullable();
            $table->unsignedInteger('duration_minutes')->nullable();
            $table->text('failure_reason')->nullable();
            $table->timestamp('accounted_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['livestream_kind', 'livestream_id'], 'str_jobs_ls_idx');
            $table->index(['organization_id', 'created_at'], 'str_jobs_org_created_idx');
            $table->index('status', 'str_jobs_status_idx');
            $table->index('meeting_id', 'str_jobs_meeting_idx');
            $table->unique('provider_message_id', 'str_jobs_provider_msg_uidx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('streaming_jobs');
    }
};
