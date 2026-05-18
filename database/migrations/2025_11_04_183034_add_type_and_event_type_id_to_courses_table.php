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
        Schema::table('courses', function (Blueprint $table) {
            $table->enum('type', ['course', 'event'])->default('course')->after('topic_id');
            $table->foreignId('event_type_id')->nullable()->after('type')->constrained('event_types')->onDelete('set null');
            
            // Add index for type
            $table->index(['type', 'organization_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropForeign(['event_type_id']);
            $table->dropIndex(['type', 'organization_id']);
            $table->dropColumn(['type', 'event_type_id']);
        });
    }
};
