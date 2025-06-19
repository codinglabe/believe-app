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
            $table->string('upload_id')->unique()->nullable()->after('id');
            $table->integer('total_chunks')->default(0)->after('processed_rows');
            $table->json('uploaded_chunks_list')->nullable()->after('processed_chunks');

            $table->index('upload_id');
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
