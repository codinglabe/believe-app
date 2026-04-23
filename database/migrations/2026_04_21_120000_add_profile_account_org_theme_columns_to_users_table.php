<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('account_visibility', 20)->default('public')->after('religion');
            $table->string('messaging_policy', 40)->default('everyone')->after('account_visibility');
            $table->foreignId('primary_organization_id')->nullable()->after('messaging_policy')->constrained('organizations')->nullOnDelete();
            $table->json('secondary_organization_ids')->nullable()->after('primary_organization_id');
            $table->string('preferred_theme', 16)->nullable()->after('secondary_organization_ids');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['primary_organization_id']);
            $table->dropColumn([
                'account_visibility',
                'messaging_policy',
                'primary_organization_id',
                'secondary_organization_ids',
                'preferred_theme',
            ]);
        });
    }
};
