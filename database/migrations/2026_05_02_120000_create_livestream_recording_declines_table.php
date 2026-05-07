<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('livestream_recording_declines', function (Blueprint $table) {
            $table->id();
            $table->string('livestream_kind', 32);
            $table->unsignedBigInteger('livestream_id');
            $table->string('guest_label', 255)->nullable();
            $table->timestamps();

            // MySQL 64-char identifier limit — default auto-generated composite index names are too long on this table.
            $table->index(['livestream_kind', 'livestream_id'], 'ls_rec_decl_kind_id_idx');
            $table->index('created_at', 'ls_rec_decl_created_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('livestream_recording_declines');
    }
};
