<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('recording_youtube_uploads', function (Blueprint $table) {
            $table->string('progress_stage', 32)->nullable()->after('status');
            $table->unsignedTinyInteger('progress_percent')->default(0)->after('progress_stage');
        });
    }

    public function down(): void
    {
        Schema::table('recording_youtube_uploads', function (Blueprint $table) {
            $table->dropColumn(['progress_stage', 'progress_percent']);
        });
    }
};
