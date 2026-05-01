<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Directory performance for large excel_data:
     * - MySQL cannot FULLTEXT index VIRTUAL generated columns; we add one STORED concatenated column for FTS.
     * - ein_digits lives in a separate migration so long FULLTEXT DDL does not share one migrate process with a second ALTER.
     */
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            // MariaDB/MySQL: omit "NULL" before GENERATED (MariaDB 10.x rejects TEXT NULL GENERATED...).
            if (! Schema::hasColumn('excel_data', 'org_directory_fts')) {
                DB::statement('
                    ALTER TABLE excel_data
                    ADD COLUMN org_directory_fts TEXT
                    GENERATED ALWAYS AS (
                        CONCAT_WS(\' \',
                            NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(row_data, \'$[1]\'))), \'\'),
                            NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(row_data, \'$[27]\'))), \'\'),
                            NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(row_data, \'$[4]\'))), \'\'),
                            NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(row_data, \'$[5]\'))), \'\'),
                            NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(row_data, \'$[6]\'))), \'\')
                        )
                    ) STORED
                ');
            }

            Schema::getConnection()->reconnect();

            if (! $this->mysqlIndexExists('excel_data', 'excel_data_org_directory_fts')) {
                Schema::table('excel_data', function (Blueprint $table) {
                    $table->fullText(['org_directory_fts'], 'excel_data_org_directory_fts');
                });
            }

            return;
        }

        if ($driver === 'pgsql') {
            if (! Schema::hasColumn('excel_data', 'org_directory_fts')) {
                DB::statement("
                    ALTER TABLE excel_data
                    ADD COLUMN org_directory_fts text NULL
                    GENERATED ALWAYS AS (
                        concat_ws(' ',
                            nullif(trim(coalesce(row_data->>1, '')), ''),
                            nullif(trim(coalesce(row_data->>27, '')), ''),
                            nullif(trim(coalesce(row_data->>4, '')), ''),
                            nullif(trim(coalesce(row_data->>5, '')), ''),
                            nullif(trim(coalesce(row_data->>6, '')), '')
                        )
                    ) STORED
                ");
            }

            Schema::getConnection()->reconnect();

            if (! $this->postgresIndexExists('excel_data_org_directory_fts')) {
                Schema::table('excel_data', function (Blueprint $table) {
                    $table->fullText(['org_directory_fts'], 'excel_data_org_directory_fts');
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

        Schema::table('excel_data', function (Blueprint $table) {
            $table->dropFullText('excel_data_org_directory_fts');
        });

        Schema::table('excel_data', function (Blueprint $table) {
            $table->dropColumn('org_directory_fts');
        });
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
