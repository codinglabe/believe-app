<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('event_types')
            ->where('category', 'Companion · 55+ Companion')
            ->update(['category' => 'Companion · Senior Adults']);
    }

    public function down(): void
    {
        DB::table('event_types')
            ->where('category', 'Companion · Senior Adults')
            ->whereIn('name', [
                'Senior Conversations',
                'Daily Companionship',
                'Memory Sharing',
                'Retirement Life',
                'Health Talk (Non-medical)',
                'Faith for Seniors',
            ])
            ->update(['category' => 'Companion · 55+ Companion']);
    }
};
