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
        Schema::table('uploaded_files', function (Blueprint $table) {
            $table->integer('total_rows')->default(0)->after('file_extension');
            $table->integer('processed_rows')->default(0)->after('total_rows');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('uploaded_files', function (Blueprint $table) {
            //
        });
    }
};
