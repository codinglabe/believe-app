<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('level_up_challenge_entries', function (Blueprint $table) {
            $table->string('slug', 64)->nullable()->after('title');
        });

        $rows = DB::table('level_up_challenge_entries')->orderBy('id')->get(['id']);
        foreach ($rows as $row) {
            DB::table('level_up_challenge_entries')
                ->where('id', $row->id)
                ->update(['slug' => 'entry-'.$row->id]);
        }

        Schema::table('level_up_challenge_entries', function (Blueprint $table) {
            $table->unique(['level_up_track_id', 'slug'], 'level_up_challenge_entries_track_slug_uq');
        });
    }

    public function down(): void
    {
        Schema::table('level_up_challenge_entries', function (Blueprint $table) {
            $table->dropUnique('level_up_challenge_entries_track_slug_uq');
            $table->dropColumn('slug');
        });
    }
};
