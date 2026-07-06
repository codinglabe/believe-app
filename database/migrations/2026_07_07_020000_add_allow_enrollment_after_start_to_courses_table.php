<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->boolean('allow_enrollment_after_start')
                ->default(false)
                ->after('enrollment_billing_cycle');
        });

        DB::table('courses')
            ->whereIn('type', ['companion', 'events'])
            ->update(['allow_enrollment_after_start' => true]);
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropColumn('allow_enrollment_after_start');
        });
    }
};
