<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('newsletters', function (Blueprint $table) {
            $table->string('target_type', 32)->default('all')->change();
        });
    }

    public function down(): void
    {
        Schema::table('newsletters', function (Blueprint $table) {
            $table->enum('target_type', ['all', 'users', 'organizations', 'specific'])->default('all')->change();
        });
    }
};
