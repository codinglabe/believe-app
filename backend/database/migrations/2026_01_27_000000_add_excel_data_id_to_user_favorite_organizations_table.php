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
        Schema::table('user_favorite_organizations', function (Blueprint $table) {
            // Add excel_data_id to support following unregistered organizations
            $table->unsignedBigInteger('excel_data_id')->nullable()->after('organization_id');
            $table->foreign('excel_data_id')->references('id')->on('excel_data')->onDelete('cascade');
            $table->index('excel_data_id');
            
            // Make organization_id nullable to support unregistered organizations
            $table->unsignedBigInteger('organization_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_favorite_organizations', function (Blueprint $table) {
            $table->dropForeign(['excel_data_id']);
            $table->dropIndex(['excel_data_id']);
            $table->dropColumn('excel_data_id');
            
            // Restore organization_id to not nullable (if needed)
            $table->unsignedBigInteger('organization_id')->nullable(false)->change();
        });
    }
};
