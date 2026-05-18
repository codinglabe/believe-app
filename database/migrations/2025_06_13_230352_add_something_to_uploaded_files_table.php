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
            $table->ulid('file_id')->unique()->nullable()->after('id');
            $table->enum('status', ['processing', 'completed', 'failed'])->default('processing')->after("processed_chunks");
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('uploaded_files', function (Blueprint $table) {
            $table->dropColumn('file_id');
            $table->dropColumn('status');
        });
    }
};
