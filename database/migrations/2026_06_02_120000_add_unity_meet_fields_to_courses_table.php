<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->string('host_meeting_link')->nullable()->after('meeting_link');
            $table->string('unity_meet_livestream_kind', 32)->nullable()->after('host_meeting_link');
            $table->unsignedBigInteger('unity_meet_livestream_id')->nullable()->after('unity_meet_livestream_kind');
        });
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropColumn([
                'host_meeting_link',
                'unity_meet_livestream_kind',
                'unity_meet_livestream_id',
            ]);
        });
    }
};
