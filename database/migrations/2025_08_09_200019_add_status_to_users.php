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
            //             'is_verified' => true,
            // 'verification_status' => 'verified',
            // 'ownership_verified_at' => now()
            $table->boolean('is_verified')->after('email_verified_at')->default(false);
            $table->date('ownership_verified_at')->nullable()->after('is_verified');
            $table->enum('verification_status', ['verified', 'unverified', 'approved', 'decliend', 'accept', 'reject', 'fraud'])
            ->after('ownership_verified_at')->default('unverified');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                "is_verified",
                "ownership_verified_at",
                "verification_status"
            ]);
        });
    }
};
