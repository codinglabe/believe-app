<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('streaming_jobs', function (Blueprint $table) {
            $table->string('ecs_task_arn', 512)->nullable()->after('provider_message_id');
            $table->string('ecs_last_status', 64)->nullable()->after('ecs_task_arn');
            $table->timestamp('ecs_checked_at')->nullable()->after('ecs_last_status');

            $table->index('ecs_task_arn', 'str_jobs_ecs_task_arn_idx');
        });
    }

    public function down(): void
    {
        Schema::table('streaming_jobs', function (Blueprint $table) {
            $table->dropIndex('str_jobs_ecs_task_arn_idx');
            $table->dropColumn(['ecs_task_arn', 'ecs_last_status', 'ecs_checked_at']);
        });
    }
};
