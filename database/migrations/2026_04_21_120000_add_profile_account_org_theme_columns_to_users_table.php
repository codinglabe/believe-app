<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'account_visibility')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('account_visibility', 20)->default('public')->after('religion');
            });
        }

        if (! Schema::hasColumn('users', 'messaging_policy')) {
            Schema::table('users', function (Blueprint $table) {
                $after = Schema::hasColumn('users', 'account_visibility') ? 'account_visibility' : 'religion';
                $table->string('messaging_policy', 40)->default('everyone')->after($after);
            });
        }

        if (! Schema::hasColumn('users', 'primary_organization_id')) {
            Schema::table('users', function (Blueprint $table) {
                $after = Schema::hasColumn('users', 'messaging_policy')
                    ? 'messaging_policy'
                    : (Schema::hasColumn('users', 'account_visibility') ? 'account_visibility' : 'religion');
                $table->foreignId('primary_organization_id')->nullable()->after($after)->constrained('organizations')->nullOnDelete();
            });
        }

        if (! Schema::hasColumn('users', 'secondary_organization_ids')) {
            Schema::table('users', function (Blueprint $table) {
                $after = Schema::hasColumn('users', 'primary_organization_id')
                    ? 'primary_organization_id'
                    : (Schema::hasColumn('users', 'messaging_policy') ? 'messaging_policy' : 'religion');
                $table->json('secondary_organization_ids')->nullable()->after($after);
            });
        }

        if (! Schema::hasColumn('users', 'preferred_theme')) {
            Schema::table('users', function (Blueprint $table) {
                $after = Schema::hasColumn('users', 'secondary_organization_ids')
                    ? 'secondary_organization_ids'
                    : (Schema::hasColumn('users', 'primary_organization_id') ? 'primary_organization_id' : 'religion');
                $table->string('preferred_theme', 16)->nullable()->after($after);
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'preferred_theme')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('preferred_theme');
            });
        }

        if (Schema::hasColumn('users', 'secondary_organization_ids')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('secondary_organization_ids');
            });
        }

        if (Schema::hasColumn('users', 'primary_organization_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropForeign(['primary_organization_id']);
            });
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('primary_organization_id');
            });
        }

        if (Schema::hasColumn('users', 'messaging_policy')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('messaging_policy');
            });
        }

        if (Schema::hasColumn('users', 'account_visibility')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('account_visibility');
            });
        }
    }
};
