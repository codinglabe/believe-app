<?php

use App\Support\SessionDurationMinutes;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->unsignedSmallInteger('session_duration_minutes')
                ->default(SessionDurationMinutes::default())
                ->after('end_date');
        });

        Schema::table('courses', function (Blueprint $table) {
            $table->dropColumn('duration');
        });
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->string('duration')->default('1_session');
        });

        Schema::table('courses', function (Blueprint $table) {
            $table->dropColumn('session_duration_minutes');
        });
    }
};
