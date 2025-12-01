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
        // Update seller_profiles table
        if (Schema::hasTable('seller_profiles')) {
            Schema::table('seller_profiles', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
            });
            Schema::table('seller_profiles', function (Blueprint $table) {
                $table->renameColumn('user_id', 'livestock_user_id');
            });
            Schema::table('seller_profiles', function (Blueprint $table) {
                $table->foreign('livestock_user_id')->references('id')->on('livestock_users')->onDelete('cascade');
            });
        }

        // Update livestock_animals table
        if (Schema::hasTable('livestock_animals')) {
            Schema::table('livestock_animals', function (Blueprint $table) {
                $table->dropForeign(['seller_id']);
                $table->dropForeign(['current_owner_id']);
            });
            Schema::table('livestock_animals', function (Blueprint $table) {
                $table->renameColumn('seller_id', 'livestock_user_id');
                $table->renameColumn('current_owner_id', 'current_owner_livestock_user_id');
            });
            Schema::table('livestock_animals', function (Blueprint $table) {
                $table->foreign('livestock_user_id')->references('id')->on('livestock_users')->onDelete('cascade');
                $table->foreign('current_owner_livestock_user_id')->references('id')->on('livestock_users')->onDelete('restrict');
            });
        }

        // Update livestock_listings table
        if (Schema::hasTable('livestock_listings')) {
            Schema::table('livestock_listings', function (Blueprint $table) {
                $table->dropForeign(['seller_id']);
            });
            Schema::table('livestock_listings', function (Blueprint $table) {
                $table->renameColumn('seller_id', 'livestock_user_id');
            });
            Schema::table('livestock_listings', function (Blueprint $table) {
                $table->foreign('livestock_user_id')->references('id')->on('livestock_users')->onDelete('cascade');
            });
        }

        // Update livestock_payouts table
        if (Schema::hasTable('livestock_payouts')) {
            Schema::table('livestock_payouts', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
            });
            Schema::table('livestock_payouts', function (Blueprint $table) {
                $table->renameColumn('user_id', 'livestock_user_id');
            });
            Schema::table('livestock_payouts', function (Blueprint $table) {
                $table->foreign('livestock_user_id')->references('id')->on('livestock_users')->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert livestock_payouts
        if (Schema::hasTable('livestock_payouts')) {
            Schema::table('livestock_payouts', function (Blueprint $table) {
                $table->dropForeign(['livestock_user_id']);
                $table->renameColumn('livestock_user_id', 'user_id');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            });
        }

        // Revert livestock_listings
        if (Schema::hasTable('livestock_listings')) {
            Schema::table('livestock_listings', function (Blueprint $table) {
                $table->dropForeign(['livestock_user_id']);
                $table->renameColumn('livestock_user_id', 'seller_id');
                $table->foreign('seller_id')->references('id')->on('users')->onDelete('cascade');
            });
        }

        // Revert livestock_animals
        if (Schema::hasTable('livestock_animals')) {
            Schema::table('livestock_animals', function (Blueprint $table) {
                $table->dropForeign(['livestock_user_id']);
                $table->dropForeign(['current_owner_livestock_user_id']);
                $table->renameColumn('livestock_user_id', 'seller_id');
                $table->renameColumn('current_owner_livestock_user_id', 'current_owner_id');
                $table->foreign('seller_id')->references('id')->on('users')->onDelete('cascade');
                $table->foreign('current_owner_id')->references('id')->on('users')->onDelete('restrict');
            });
        }

        // Revert seller_profiles
        if (Schema::hasTable('seller_profiles')) {
            Schema::table('seller_profiles', function (Blueprint $table) {
                $table->dropForeign(['livestock_user_id']);
                $table->renameColumn('livestock_user_id', 'user_id');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            });
        }
    }
};
