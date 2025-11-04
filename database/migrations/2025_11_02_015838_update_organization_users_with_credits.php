<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Give 50000 credits to all existing organization users who don't have credits set
        DB::table('users')
            ->where('role', 'organization')
            ->where(function ($query) {
                $query->whereNull('credits')
                    ->orWhere('credits', 0);
            })
            ->update(['credits' => 50000]);

        // Ensure non-organization users have 0 credits
        DB::table('users')
            ->where('role', '!=', 'organization')
            ->whereNotNull('role')
            ->where(function ($query) {
                $query->whereNull('credits')
                    ->orWhere('credits', '>', 0);
            })
            ->update(['credits' => 0]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration is not reversible as we don't know the original state
    }
};
