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
            $table->string('type', 32)->default('learning')->change();
        });

        DB::table('courses')->where('type', 'course')->update(['type' => 'learning']);
        DB::table('courses')->where('type', 'event')->update(['type' => 'events']);
    }

    public function down(): void
    {
        DB::table('courses')->where('type', 'learning')->update(['type' => 'course']);
        DB::table('courses')->where('type', 'events')->update(['type' => 'event']);
        DB::table('courses')->whereIn('type', ['companion', 'earning'])->update(['type' => 'course']);

        Schema::table('courses', function (Blueprint $table) {
            $table->enum('type', ['course', 'event'])->default('course')->change();
        });
    }
};
