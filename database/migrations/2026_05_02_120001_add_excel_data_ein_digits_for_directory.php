<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Split from fulltext migration: large tables can drop the client connection
     * after long DDL; running ein_digits in its own migration allows a fresh run.
     */
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            Schema::getConnection()->reconnect();

            if (! Schema::hasColumn('excel_data', 'ein_digits')) {
                DB::statement('
                    ALTER TABLE excel_data
                    ADD COLUMN ein_digits VARCHAR(9)
                    GENERATED ALWAYS AS (SUBSTRING(REGEXP_REPLACE(COALESCE(`ein`, \'\'), \'[^0-9]\', \'\'), 1, 9)) STORED
                ');
            }

            if (! $this->mysqlIndexExists('excel_data', 'idx_excel_status_ein_digits')) {
                Schema::table('excel_data', function (Blueprint $table) {
                    $table->index(['status', 'ein_digits'], 'idx_excel_status_ein_digits');
                });
            }

            return;
        }

        if ($driver === 'pgsql') {
            Schema::getConnection()->reconnect();

            if (! Schema::hasColumn('excel_data', 'ein_digits')) {
                DB::statement("
                    ALTER TABLE excel_data
                    ADD COLUMN ein_digits varchar(9)
                    GENERATED ALWAYS AS (substring(regexp_replace(coalesce(ein::text, ''), '[^0-9]', '', 'g') from 1 for 9)) STORED
                ");
            }

            if (! $this->postgresIndexExists('idx_excel_status_ein_digits')) {
                Schema::table('excel_data', function (Blueprint $table) {
                    $table->index(['status', 'ein_digits'], 'idx_excel_status_ein_digits');
                });
            }
        }
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if (! in_array($driver, ['mysql', 'mariadb', 'pgsql'], true)) {
            return;
        }

        $hasCompositeIndex = in_array($driver, ['mysql', 'mariadb'], true)
            ? $this->mysqlIndexExists('excel_data', 'idx_excel_status_ein_digits')
            : $this->postgresIndexExists('idx_excel_status_ein_digits');

        if ($hasCompositeIndex) {
            Schema::table('excel_data', function (Blueprint $table) {
                $table->dropIndex('idx_excel_status_ein_digits');
            });
        }

        if (Schema::hasColumn('excel_data', 'ein_digits')) {
            Schema::table('excel_data', function (Blueprint $table) {
                $table->dropColumn('ein_digits');
            });
        }
    }

    private function mysqlIndexExists(string $table, string $indexName): bool
    {
        $database = Schema::getConnection()->getDatabaseName();

        return DB::table('information_schema.statistics')
            ->where('table_schema', $database)
            ->where('table_name', $table)
            ->where('index_name', $indexName)
            ->exists();
    }

    private function postgresIndexExists(string $indexName): bool
    {
        return DB::selectOne(
            'select 1 from pg_indexes where schemaname = current_schema() and indexname = ? limit 1',
            [$indexName]
        ) !== null;
    }
};
