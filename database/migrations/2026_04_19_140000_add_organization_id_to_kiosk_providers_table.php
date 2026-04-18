<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('kiosk_providers')) {
            return;
        }

        Schema::table('kiosk_providers', function (Blueprint $table) {
            if (! Schema::hasColumn('kiosk_providers', 'organization_id')) {
                $table->foreignId('organization_id')->nullable()->after('id')->constrained()->nullOnDelete();
            }
        });

        try {
            Schema::table('kiosk_providers', function (Blueprint $table) {
                $table->dropUnique('kiosk_providers_dedupe_unique');
            });
        } catch (\Throwable) {
            try {
                Schema::table('kiosk_providers', function (Blueprint $table) {
                    $table->dropUnique([
                        'state_abbr',
                        'normalized_city',
                        'zip_normalized',
                        'category_slug',
                        'subcategory_slug',
                        'provider_slug',
                    ]);
                });
            } catch (\Throwable) {
                //
            }
        }

        try {
            Schema::table('kiosk_providers', function (Blueprint $table) {
                $table->index(
                    ['organization_id', 'state_abbr', 'normalized_city', 'zip_normalized'],
                    'kiosk_providers_org_geo_idx'
                );
            });
        } catch (\Throwable) {
            //
        }

        try {
            Schema::table('kiosk_providers', function (Blueprint $table) {
                $table->index(
                    ['state_abbr', 'normalized_city', 'zip_normalized', 'category_slug', 'subcategory_slug', 'provider_slug'],
                    'kiosk_providers_dedupe_lookup_idx'
                );
            });
        } catch (\Throwable) {
            //
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('kiosk_providers')) {
            return;
        }

        try {
            Schema::table('kiosk_providers', function (Blueprint $table) {
                $table->dropIndex('kiosk_providers_org_geo_idx');
            });
        } catch (\Throwable) {
            //
        }

        try {
            Schema::table('kiosk_providers', function (Blueprint $table) {
                $table->dropIndex('kiosk_providers_dedupe_lookup_idx');
            });
        } catch (\Throwable) {
            //
        }

        Schema::table('kiosk_providers', function (Blueprint $table) {
            $table->unique(
                ['state_abbr', 'normalized_city', 'zip_normalized', 'category_slug', 'subcategory_slug', 'provider_slug'],
                'kiosk_providers_dedupe_unique'
            );
        });

        if (Schema::hasColumn('kiosk_providers', 'organization_id')) {
            Schema::table('kiosk_providers', function (Blueprint $table) {
                $table->dropForeign(['organization_id']);
            });
            Schema::table('kiosk_providers', function (Blueprint $table) {
                $table->dropColumn('organization_id');
            });
        }
    }
};
