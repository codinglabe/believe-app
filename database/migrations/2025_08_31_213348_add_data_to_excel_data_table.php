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
        Schema::table('excel_data', function (Blueprint $table) {

            // Add generated columns for JSON fields and index them
            $table->string('name_virtual')->virtualAs("JSON_UNQUOTE(JSON_EXTRACT(row_data, '$[1]'))")->nullable();
            $table->string('state_virtual')->virtualAs("JSON_UNQUOTE(JSON_EXTRACT(row_data, '$[5]'))")->nullable();
            $table->string('city_virtual')->virtualAs("JSON_UNQUOTE(JSON_EXTRACT(row_data, '$[4]'))")->nullable();
            $table->string('zip_virtual')->virtualAs("JSON_UNQUOTE(JSON_EXTRACT(row_data, '$[6]'))")->nullable();
            $table->string('ntee_code_virtual')->virtualAs("JSON_UNQUOTE(JSON_EXTRACT(row_data, '$[26]'))")->nullable();
            $table->string('sort_name_virtual')->virtualAs("JSON_UNQUOTE(JSON_EXTRACT(row_data, '$[27]'))")->nullable();

            $table->index('name_virtual');
            $table->index('state_virtual');
            $table->index('city_virtual');
            $table->index('zip_virtual');
            $table->index('ntee_code_virtual');
            $table->index('sort_name_virtual');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('excel_data', function (Blueprint $table) {

            $table->dropColumn([
                'name_virtual',
                'state_virtual',
                'city_virtual',
                'zip_virtual',
                'ntee_code_virtual',
                'sort_name_virtual'
            ]);
        });
    }
};
