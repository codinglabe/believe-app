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
        Schema::table('service_chats', function (Blueprint $table) {
            // Drop the foreign key constraint first (before dropping unique index)
            $table->dropForeign(['gig_id']);

            // Drop the unique constraint that includes gig_id
            $table->dropUnique(['gig_id', 'buyer_id', 'seller_id']);

            // Drop the gig_id column
            $table->dropColumn('gig_id');

            // Add new unique constraint for buyer_id and seller_id only
            $table->unique(['buyer_id', 'seller_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('service_chats', function (Blueprint $table) {
            // Drop the unique constraint
            $table->dropUnique(['buyer_id', 'seller_id']);

            // Add gig_id column back
            $table->foreignId('gig_id')->after('id')->constrained('gigs')->onDelete('cascade');

            // Add back the original unique constraint
            $table->unique(['gig_id', 'buyer_id', 'seller_id']);
        });
    }
};
