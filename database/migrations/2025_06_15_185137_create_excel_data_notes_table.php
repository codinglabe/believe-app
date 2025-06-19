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
        Schema::create('excel_data_notes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('excel_data_id');
            $table->text('note');

            $table->foreign('excel_data_id')->references('id')->on('excel_data')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('excel_data_notes');
    }
};
