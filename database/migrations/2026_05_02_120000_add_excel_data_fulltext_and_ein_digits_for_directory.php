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
     * - Generated ein_digits + index speeds joined/not_joined EXISTS filters.
     */
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            // MariaDB/MySQL: omit "NULL" before GENERATED (MariaDB 10.x rejects TEXT NULL GENERATED...).
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

            Schema::table('excel_data', function (Blueprint $table) {
                $table->fullText(['org_directory_fts'], 'excel_data_org_directory_fts');
            });

            DB::statement('
                ALTER TABLE excel_data
                ADD COLUMN ein_digits VARCHAR(9)
                GENERATED ALWAYS AS (SUBSTRING(REGEXP_REPLACE(COALESCE(`ein`, \'\'), \'[^0-9]\', \'\'), 1, 9)) STORED
            ');

            Schema::table('excel_data', function (Blueprint $table) {
                $table->index(['status', 'ein_digits'], 'idx_excel_status_ein_digits');
            });

            return;
        }

        if ($driver === 'pgsql') {
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

            Schema::table('excel_data', function (Blueprint $table) {
                $table->fullText(['org_directory_fts'], 'excel_data_org_directory_fts');
            });

            DB::statement("
                ALTER TABLE excel_data
                ADD COLUMN ein_digits varchar(9)
                GENERATED ALWAYS AS (substring(regexp_replace(coalesce(ein::text, ''), '[^0-9]', '', 'g') from 1 for 9)) STORED
            ");

            Schema::table('excel_data', function (Blueprint $table) {
                $table->index(['status', 'ein_digits'], 'idx_excel_status_ein_digits');
            });
        }
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if (! in_array($driver, ['mysql', 'mariadb', 'pgsql'], true)) {
            return;
        }

        Schema::table('excel_data', function (Blueprint $table) {
            $table->dropIndex('idx_excel_status_ein_digits');
        });

        Schema::table('excel_data', function (Blueprint $table) {
            $table->dropColumn('ein_digits');
        });

        Schema::table('excel_data', function (Blueprint $table) {
            $table->dropFullText('excel_data_org_directory_fts');
        });

        Schema::table('excel_data', function (Blueprint $table) {
            $table->dropColumn('org_directory_fts');
        });
    }
};
