<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('level_up_tracks', function (Blueprint $table) {
            $table->foreignId('hub_category_id')->nullable()->after('subject_categories')->constrained('challenge_hub_categories')->nullOnDelete();
            $table->string('quiz_subcategory', 128)->nullable()->after('hub_category_id');
        });
    }

    public function down(): void
    {
        Schema::table('level_up_tracks', function (Blueprint $table) {
            $table->dropConstrainedForeignId('hub_category_id');
            $table->dropColumn('quiz_subcategory');
        });
    }
};
