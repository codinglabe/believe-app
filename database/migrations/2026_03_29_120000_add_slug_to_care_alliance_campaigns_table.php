<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('care_alliance_campaigns', function (Blueprint $table) {
            $table->string('slug', 160)->nullable()->after('name');
        });

        $rows = DB::table('care_alliance_campaigns')->orderBy('id')->get();

        foreach ($rows as $row) {
            $name = (string) ($row->name ?? '');
            $base = Str::slug($name);
            if ($base === '') {
                $base = 'campaign';
            }
            $slug = $base;
            $n = 0;
            while (DB::table('care_alliance_campaigns')
                ->where('care_alliance_id', $row->care_alliance_id)
                ->where('slug', $slug)
                ->where('id', '!=', $row->id)
                ->exists()) {
                $n++;
                $slug = $base.'-'.$n;
            }
            DB::table('care_alliance_campaigns')->where('id', $row->id)->update(['slug' => $slug]);
        }

        Schema::table('care_alliance_campaigns', function (Blueprint $table) {
            $table->string('slug', 160)->nullable(false)->change();
            $table->unique(['care_alliance_id', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::table('care_alliance_campaigns', function (Blueprint $table) {
            $table->dropUnique(['care_alliance_id', 'slug']);
        });
        Schema::table('care_alliance_campaigns', function (Blueprint $table) {
            $table->dropColumn('slug');
        });
    }
};
