<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Public streams appear on Unity Live index; private streams only viewable via direct link (director shares link).
     */
    public function up(): void
    {
        Schema::table('org_livestreams', function (Blueprint $table) {
            $table->boolean('is_public')->default(true)->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('org_livestreams', function (Blueprint $table) {
            $table->dropColumn('is_public');
        });
    }
};
