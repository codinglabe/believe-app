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
        // Modify newsletter_templates table to allow NULL organization_id
        Schema::table('newsletter_templates', function (Blueprint $table) {
            $table->dropForeign(['organization_id']);
            $table->foreignId('organization_id')->nullable()->change();
        });

        // Modify newsletters table to allow NULL organization_id
        Schema::table('newsletters', function (Blueprint $table) {
            $table->dropForeign(['organization_id']);
            $table->foreignId('organization_id')->nullable()->change();
        });

        // Modify newsletter_recipients table to allow NULL organization_id
        Schema::table('newsletter_recipients', function (Blueprint $table) {
            $table->dropForeign(['organization_id']);
            $table->foreignId('organization_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert newsletter_templates table to require organization_id
        Schema::table('newsletter_templates', function (Blueprint $table) {
            $table->foreignId('organization_id')->nullable(false)->change();
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
        });

        // Revert newsletters table to require organization_id
        Schema::table('newsletters', function (Blueprint $table) {
            $table->foreignId('organization_id')->nullable(false)->change();
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
        });

        // Revert newsletter_recipients table to require organization_id
        Schema::table('newsletter_recipients', function (Blueprint $table) {
            $table->foreignId('organization_id')->nullable(false)->change();
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
        });
    }
};
