<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('excel_data', function (Blueprint $table) {
            // First remove the index if exists
            $table->dropIndex(['ein']);

            // Remove the generated column
            $table->dropColumn('ein');
        });

        // Add a regular column instead
        Schema::table('excel_data', function (Blueprint $table) {
            $table->string('ein', 20)->nullable()->after('row_data');
            $table->index('ein');
        });
    }

    public function down(): void
    {
        Schema::table('excel_data', function (Blueprint $table) {
            $table->dropIndex(['ein']);
            $table->dropColumn('ein');
        });

        // Recreate the generated column (if needed)
        Schema::table('excel_data', function (Blueprint $table) {
            $table->string('ein', 20)->nullable()->virtualAs('JSON_UNQUOTE(JSON_EXTRACT(row_data, \'$[0]\'))')->after('row_data');
            $table->index('ein');
        });
    }
};
