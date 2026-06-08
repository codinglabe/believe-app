<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('unity_calls', function (Blueprint $table) {
            $table->dropForeign(['user_livestream_id']);
            $table->unsignedBigInteger('user_livestream_id')->nullable()->change();
            $table->foreign('user_livestream_id')
                ->references('id')
                ->on('user_livestreams')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('unity_calls', function (Blueprint $table) {
            $table->dropForeign(['user_livestream_id']);
            $table->unsignedBigInteger('user_livestream_id')->nullable(false)->change();
            $table->foreign('user_livestream_id')
                ->references('id')
                ->on('user_livestreams')
                ->cascadeOnDelete();
        });
    }
};
