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
        if (!Schema::hasColumn('users', 'default_organization_id')) {
            return;
        }
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['default_organization_id']);
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('default_organization_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('default_organization_id')
                ->nullable()
                ->after('zipcode')
                ->constrained('organizations')
                ->nullOnDelete();
        });
    }
};
