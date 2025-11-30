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
        Schema::table('livestock_animals', function (Blueprint $table) {
            $table->string('original_ear_tag')->nullable()->after('ear_tag');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('livestock_animals', function (Blueprint $table) {
            $table->dropColumn('original_ear_tag');
        });
    }
};
