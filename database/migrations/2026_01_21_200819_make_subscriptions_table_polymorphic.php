<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            // Add user_type column for polymorphic relationship
            $table->string('user_type')->nullable()->after('user_id');
            
            // Update index to include user_type
            $table->dropIndex(['user_id', 'stripe_status']);
            $table->index(['user_id', 'user_type', 'stripe_status'], 'subscriptions_user_type_status_index');
        });

        // Update existing records to set user_type
        DB::table('subscriptions')
            ->whereNull('user_type')
            ->update(['user_type' => 'App\Models\User']);

        // Make user_type not nullable after setting defaults
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->string('user_type')->nullable(false)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropIndex('subscriptions_user_type_status_index');
            $table->dropColumn('user_type');
            $table->index(['user_id', 'stripe_status']);
        });
    }
};
