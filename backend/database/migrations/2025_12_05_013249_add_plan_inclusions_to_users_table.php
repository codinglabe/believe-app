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
        Schema::table('users', function (Blueprint $table) {
            // Plan inclusions
            $table->unsignedBigInteger('emails_included')->default(0)->after('credits');
            $table->unsignedBigInteger('emails_used')->default(0)->after('emails_included');
            $table->unsignedBigInteger('ai_tokens_included')->default(0)->after('emails_used');
            $table->unsignedBigInteger('ai_tokens_used')->default(0)->after('ai_tokens_included');
            
            // Store plan details as JSON for future reference
            $table->json('current_plan_details')->nullable()->after('ai_tokens_used');
            $table->foreignId('current_plan_id')->nullable()->after('current_plan_details');
            
            // Index for queries
            $table->index('current_plan_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['current_plan_id']);
            $table->dropColumn([
                'emails_included',
                'emails_used',
                'ai_tokens_included',
                'ai_tokens_used',
                'current_plan_details',
                'current_plan_id',
            ]);
        });
    }
};
