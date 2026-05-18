<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('level_up_tracks', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 64)->unique();
            $table->string('name');
            $table->string('status', 32)->default('coming_soon'); // active | coming_soon
            $table->json('subject_categories');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        $now = now();
        DB::table('level_up_tracks')->insert([
            [
                'slug' => 'faith_level_up',
                'name' => 'Faith Level Up',
                'status' => 'active',
                'subject_categories' => json_encode(['Faith']),
                'sort_order' => 10,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'career_level_up',
                'name' => 'Career Level Up',
                'status' => 'coming_soon',
                'subject_categories' => json_encode([]),
                'sort_order' => 20,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'finance_level_up',
                'name' => 'Finance Level Up',
                'status' => 'coming_soon',
                'subject_categories' => json_encode([]),
                'sort_order' => 30,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'knowledge_level_up',
                'name' => 'Knowledge Level Up',
                'status' => 'coming_soon',
                'subject_categories' => json_encode([]),
                'sort_order' => 40,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'life_level_up',
                'name' => 'Life Level Up',
                'status' => 'coming_soon',
                'subject_categories' => json_encode([]),
                'sort_order' => 50,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'service_level_up',
                'name' => 'Service Level Up',
                'status' => 'coming_soon',
                'subject_categories' => json_encode([]),
                'sort_order' => 60,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('level_up_tracks');
    }
};
