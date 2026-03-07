<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->text('dropbox_refresh_token')->nullable()->after('wallet_token_expires_at');
            $table->text('dropbox_access_token')->nullable()->after('dropbox_refresh_token');
            $table->timestamp('dropbox_token_expires_at')->nullable()->after('dropbox_access_token');
            $table->string('dropbox_folder_name', 255)->nullable()->after('dropbox_token_expires_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'dropbox_refresh_token',
                'dropbox_access_token',
                'dropbox_token_expires_at',
                'dropbox_folder_name',
            ]);
        });
    }
};
