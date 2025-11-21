<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'wallet_access_token')) {
                $table->text('wallet_access_token')->nullable();
    }
            if (!Schema::hasColumn('users', 'wallet_encrypted_token')) {
                $table->text('wallet_encrypted_token')->nullable();
            }
            if (!Schema::hasColumn('users', 'wallet_user_id')) {
                $table->unsignedBigInteger('wallet_user_id')->nullable();
            }
            if (!Schema::hasColumn('users', 'wallet_token_expires_at')) {
                $table->timestamp('wallet_token_expires_at')->nullable();
            }
            if (!Schema::hasColumn('users', 'wallet_connected_at')) {
                $table->timestamp('wallet_connected_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'wallet_access_token')) {
                $table->dropColumn('wallet_access_token');
            }
            if (Schema::hasColumn('users', 'wallet_encrypted_token')) {
                $table->dropColumn('wallet_encrypted_token');
            }
            if (Schema::hasColumn('users', 'wallet_user_id')) {
                $table->dropColumn('wallet_user_id');
            }
            if (Schema::hasColumn('users', 'wallet_token_expires_at')) {
                $table->dropColumn('wallet_token_expires_at');
            }
            if (Schema::hasColumn('users', 'wallet_connected_at')) {
                $table->dropColumn('wallet_connected_at');
            }
        });
    }
};
