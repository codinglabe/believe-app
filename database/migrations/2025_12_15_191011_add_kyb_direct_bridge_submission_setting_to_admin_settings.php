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
        // Insert default KYB direct Bridge submission setting (default: false = approval mode)
        // Use updateOrCreate logic to avoid duplicates if setting already exists
        $existing = DB::table('admin_settings')->where('key', 'kyb_direct_bridge_submission')->first();
        
        if (!$existing) {
            DB::table('admin_settings')->insert([
                'key' => 'kyb_direct_bridge_submission',
                'value' => 'false', // Default to approval mode (requires admin approval)
                'type' => 'boolean',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove the setting when rolling back
        DB::table('admin_settings')->where('key', 'kyb_direct_bridge_submission')->delete();
    }
};
