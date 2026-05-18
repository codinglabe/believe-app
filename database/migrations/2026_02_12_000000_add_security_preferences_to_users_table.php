<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('two_fa_enabled')->default(false)->after('email_verified_at');
            $table->boolean('biometric_enabled')->default(false)->after('two_fa_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['two_fa_enabled', 'biometric_enabled']);
        });
    }
};
