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
        Schema::table('newsletter_emails', function (Blueprint $table) {
            // Drop the foreign key constraint first
            $table->dropForeign(['newsletter_recipient_id']);
            
            // Make the column nullable
            $table->foreignId('newsletter_recipient_id')->nullable()->change();
            
            // Re-add the foreign key constraint with nullable support
            $table->foreign('newsletter_recipient_id')
                  ->references('id')
                  ->on('newsletter_recipients')
                  ->onDelete('cascade');
        });
        
        // Add metadata column if it doesn't exist
        if (!Schema::hasColumn('newsletter_emails', 'metadata')) {
            Schema::table('newsletter_emails', function (Blueprint $table) {
                $table->json('metadata')->nullable()->after('tracking_data');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('newsletter_emails', function (Blueprint $table) {
            // Drop the foreign key constraint
            $table->dropForeign(['newsletter_recipient_id']);
            
            // Make the column NOT NULL again
            $table->foreignId('newsletter_recipient_id')->nullable(false)->change();
            
            // Re-add the foreign key constraint
            $table->foreign('newsletter_recipient_id')
                  ->references('id')
                  ->on('newsletter_recipients')
                  ->onDelete('cascade');
        });
        
        // Remove metadata column if it exists
        if (Schema::hasColumn('newsletter_emails', 'metadata')) {
            Schema::table('newsletter_emails', function (Blueprint $table) {
                $table->dropColumn('metadata');
            });
        }
    }
};
