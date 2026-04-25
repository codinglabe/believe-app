<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chat_topics', function (Blueprint $table) {
            $table->foreignId('primary_action_category_id')
                ->nullable()
                ->after('id')
                ->constrained('primary_action_categories')
                ->cascadeOnDelete();
            $table->unique('primary_action_category_id');
        });
    }

    public function down(): void
    {
        Schema::table('chat_topics', function (Blueprint $table) {
            $table->dropUnique(['primary_action_category_id']);
            $table->dropConstrainedForeignId('primary_action_category_id');
        });
    }
};
