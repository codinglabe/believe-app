<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('excel_data', function (Blueprint $table) {
            $table->string('ein', 20)->nullable()->virtualAs('JSON_UNQUOTE(JSON_EXTRACT(row_data, \'$[0]\'))')->after("row_data");

            // Add index for better query performance
            $table->index('ein');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('excel_data', function (Blueprint $table) {
            $table->dropIndex(['ein']); // Drop index first
            $table->dropColumn('ein');
        });
    }
};
