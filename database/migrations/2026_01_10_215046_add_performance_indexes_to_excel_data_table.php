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
        Schema::table('excel_data', function (Blueprint $table) {
            // Composite indexes for common query patterns
            // These indexes will significantly speed up filtered queries
            
            // Index for status + state filtering (very common)
            $table->index(['status', 'state_virtual'], 'idx_status_state');
            
            // Index for status + city filtering
            $table->index(['status', 'city_virtual'], 'idx_status_city');
            
            // Index for status + state + city (combined location filter)
            $table->index(['status', 'state_virtual', 'city_virtual'], 'idx_status_state_city');
            
            // Index for status + ntee_code (category filtering)
            $table->index(['status', 'ntee_code_virtual'], 'idx_status_ntee');
            
            // Index for status + name searches
            $table->index(['status', 'name_virtual'], 'idx_status_name');
            
            // Index for status + sort_name searches
            $table->index(['status', 'sort_name_virtual'], 'idx_status_sort_name');
            
            // Index for status + ein (for excluding headers)
            $table->index(['status', 'ein'], 'idx_status_ein');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('excel_data', function (Blueprint $table) {
            $table->dropIndex('idx_status_state');
            $table->dropIndex('idx_status_city');
            $table->dropIndex('idx_status_state_city');
            $table->dropIndex('idx_status_ntee');
            $table->dropIndex('idx_status_name');
            $table->dropIndex('idx_status_sort_name');
            $table->dropIndex('idx_status_ein');
        });
    }
};
