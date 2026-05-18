<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_favorite_organizations', function (Blueprint $table) {
            $table->foreignId('care_alliance_id')
                ->nullable()
                ->after('excel_data_id')
                ->constrained('care_alliances')
                ->nullOnDelete();
            $table->index(['user_id', 'care_alliance_id']);
        });
    }

    public function down(): void
    {
        Schema::table('user_favorite_organizations', function (Blueprint $table) {
            $table->dropForeign(['care_alliance_id']);
            $table->dropIndex(['user_id', 'care_alliance_id']);
            $table->dropColumn('care_alliance_id');
        });
    }
};
