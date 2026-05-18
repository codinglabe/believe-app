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
            if (! Schema::hasColumn('users', 'primary_organization_id')) {
                $table->foreignId('primary_organization_id')
                    ->nullable()
                    ->after('zipcode')
                    ->constrained('organizations')
                    ->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasColumn('users', 'primary_organization_id')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['primary_organization_id']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('primary_organization_id');
        });
    }
};
