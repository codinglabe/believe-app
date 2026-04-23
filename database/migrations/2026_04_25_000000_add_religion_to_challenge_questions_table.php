<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('challenge_questions', function (Blueprint $table) {
            $table->string('religion', 64)->nullable()->after('category');
            $table->index(['category', 'religion']);
        });
    }

    public function down(): void
    {
        Schema::table('challenge_questions', function (Blueprint $table) {
            $table->dropIndex(['category', 'religion']);
            $table->dropColumn('religion');
        });
    }
};
