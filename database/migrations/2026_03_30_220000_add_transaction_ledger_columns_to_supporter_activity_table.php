<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $add = [
            'submodule_type' => fn (Blueprint $t) => $t->string('submodule_type', 128)->nullable(),
            'page_name' => fn (Blueprint $t) => $t->string('page_name', 255)->nullable(),
            'route_name' => fn (Blueprint $t) => $t->string('route_name', 255)->nullable(),
            'action_type' => fn (Blueprint $t) => $t->string('action_type', 128)->nullable(),
            'interest_category_id' => fn (Blueprint $t) => $t->unsignedBigInteger('interest_category_id')->nullable(),
            'interest_category_name' => fn (Blueprint $t) => $t->string('interest_category_name', 255)->nullable(),
            'target_entity_type' => fn (Blueprint $t) => $t->string('target_entity_type', 64)->nullable(),
            'target_entity_id' => fn (Blueprint $t) => $t->unsignedBigInteger('target_entity_id')->nullable(),
            'target_entity_title' => fn (Blueprint $t) => $t->string('target_entity_title', 512)->nullable(),
            'search_term' => fn (Blueprint $t) => $t->string('search_term', 512)->nullable(),
            'filter_json' => fn (Blueprint $t) => $t->json('filter_json')->nullable(),
            'referrer_url' => fn (Blueprint $t) => $t->text('referrer_url')->nullable(),
            'entry_source' => fn (Blueprint $t) => $t->string('entry_source', 128)->nullable(),
            'dwell_seconds' => fn (Blueprint $t) => $t->unsignedInteger('dwell_seconds')->nullable(),
            'transaction_reference' => fn (Blueprint $t) => $t->string('transaction_reference', 191)->nullable(),
            'outcome_type' => fn (Blueprint $t) => $t->string('outcome_type', 64)->nullable(),
            'metadata_json' => fn (Blueprint $t) => $t->json('metadata_json')->nullable(),
            'updated_at' => fn (Blueprint $t) => $t->timestamp('updated_at')->nullable(),
        ];

        foreach ($add as $name => $fn) {
            if (! Schema::hasColumn('supporter_activity', $name)) {
                Schema::table('supporter_activity', function (Blueprint $table) use ($fn) {
                    $fn($table);
                });
            }
        }
    }

    public function down(): void
    {
        $names = [
            'submodule_type', 'page_name', 'route_name', 'action_type', 'interest_category_id',
            'interest_category_name', 'target_entity_type', 'target_entity_id', 'target_entity_title',
            'search_term', 'filter_json', 'referrer_url', 'entry_source', 'dwell_seconds',
            'transaction_reference', 'outcome_type', 'metadata_json', 'updated_at',
        ];

        $drop = array_values(array_filter($names, fn ($n) => Schema::hasColumn('supporter_activity', $n)));

        if ($drop !== []) {
            Schema::table('supporter_activity', function (Blueprint $table) use ($drop) {
                $table->dropColumn($drop);
            });
        }
    }
};
