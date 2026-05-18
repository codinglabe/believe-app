<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'account_visibility')) {
                $table->string('account_visibility', 32)->default('public')->after('primary_organization_id');
            }
            if (! Schema::hasColumn('users', 'message_audience')) {
                $table->string('message_audience', 32)->default('everyone')->after('account_visibility');
            }
            if (! Schema::hasColumn('users', 'appearance_preference')) {
                $table->string('appearance_preference', 16)->nullable()->after('message_audience');
            }
            if (! Schema::hasColumn('users', 'secondary_organization_ids')) {
                $table->json('secondary_organization_ids')->nullable()->after('appearance_preference');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            foreach (['secondary_organization_ids', 'appearance_preference', 'message_audience', 'account_visibility'] as $col) {
                if (Schema::hasColumn('users', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
