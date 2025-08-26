<?php

namespace App\Console\Commands;

use App\Models\IrsBmfRecord;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use League\Csv\Reader;
use League\Csv\Statement;
use Throwable;

class ImportIrsBmf extends Command
{
    protected $signature = 'irs:bmf:import {--resume : Resume from last saved offset} {--chunk=500 : Chunk size for processing} {--update-only : Only update existing records, do not insert new ones}';

    protected $description = 'Stream-import IRS Exempt Organization Business Master File (EO BMF) safely with resume. Use --update-only for monthly updates.';

    private array $sources = [
        'https://www.irs.gov/pub/irs-soi/eo1.csv',
        'https://www.irs.gov/pub/irs-soi/eo2.csv',
        'https://www.irs.gov/pub/irs-soi/eo3.csv',
        'https://www.irs.gov/pub/irs-soi/eo4.csv',
    ];

    public function handle(): int
    {
        $this->info('Starting IRS BMF import');
        
        $updateOnly = $this->option('update-only');
        if ($updateOnly) {
            $this->info('Running in UPDATE-ONLY mode - will not insert new records');
        }
        
        // Set memory limit higher for large imports
        ini_set('memory_limit', '512M');
        
        $chunkSize = (int)$this->option('chunk');
        $this->info("Using chunk size: {$chunkSize}");

        $state = $this->loadState();
        $resume = (bool)$this->option('resume');

        foreach ($this->sources as $index => $url) {
            if ($resume && $index < ($state['source_index'] ?? 0)) {
                $this->line("Skipping already completed source: {$url}");
                continue;
            }

            $this->importSource($url, $index, $state, $chunkSize, $updateOnly);
            $state['source_index'] = $index + 1;
            $state['row_offset'] = 0;
            $this->saveState($state);
            
            // Force garbage collection between sources
            gc_collect_cycles();
        }

        $this->info('IRS BMF import completed successfully');
        return self::SUCCESS;
    }

    private function importSource(string $url, int $sourceIndex, array &$state, int $chunkSize, bool $updateOnly): void
    {
        $this->info("Downloading: {$url}");
        $tempPath = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'irs_bmf_' . md5($url) . '.csv';
        
        // Stream download to avoid memory issues
        $stream = fopen($url, 'r');
        if ($stream === false) {
            throw new \RuntimeException("Failed to open source URL: {$url}");
        }
        $out = fopen($tempPath, 'w');
        stream_copy_to_stream($stream, $out);
        fclose($stream);
        fclose($out);

        $csv = Reader::createFromPath($tempPath, 'r');
        $csv->setHeaderOffset(0);

        $stmt = (new Statement());
        $records = $stmt->process($csv);

        $chunk = [];
        $processed = 0;
        $resumeOffset = $state['row_offset'] ?? 0;

        foreach ($records as $i => $record) {
            if ($resumeOffset && $i < $resumeOffset) {
                continue;
            }

            $chunk[] = $this->mapRecord($record);

            if (count($chunk) >= $chunkSize) {
                $this->upsertChunk($chunk, $updateOnly);
                $processed += count($chunk);
                $state['row_offset'] = $i + 1;
                $this->saveState($state);
                $this->line("Processed {$processed} rows from source {$sourceIndex}+1");
                $chunk = [];
                
                // Force garbage collection every few chunks
                if ($processed % ($chunkSize * 10) === 0) {
                    gc_collect_cycles();
                }
            }
        }

        if (!empty($chunk)) {
            $this->upsertChunk($chunk, $updateOnly);
            $processed += count($chunk);
            $this->line("Processed {$processed} rows from source {$sourceIndex}+1");
        }

        @unlink($tempPath);
    }

    private function mapRecord(array $r): array
    {
        // Map IRS columns as per IRS documentation
        return [
            'ein' => $r['EIN'] ?? null,
            'name' => $r['NAME'] ?? null,
            'ico' => $r['ICO'] ?? null,
            'street' => $r['STREET'] ?? null,
            'city' => $r['CITY'] ?? null,
            'state' => $r['STATE'] ?? null,
            'zip' => $r['ZIP'] ?? null,
            'group' => $r['GROUP'] ?? null,
            'subsection' => $r['SUBSECTION'] ?? null,
            'affiliation' => $r['AFFILIATION'] ?? null,
            'classification' => $r['CLASSIFICATION'] ?? null,
            'ruling' => $r['RULING'] ?? null,
            'deductibility' => $r['DEDUCTIBILITY'] ?? null,
            'foundation' => $r['FOUNDATION'] ?? null,
            'activity' => $r['ACTIVITY'] ?? null,
            'organization' => $r['ORGANIZATION'] ?? null,
            'status' => $r['STATUS'] ?? null,
            'tax_period' => $r['TAX_PERIOD'] ?? null,
            'asset_cd' => $r['ASSET_CD'] ?? null,
            'income_cd' => $r['INCOME_CD'] ?? null,
            'revenue_amt' => $r['REVENUE_AMT'] ?? null,
            'ntee_cd' => $r['NTEE_CD'] ?? null,
            'sort_name' => $r['SORT_NAME'] ?? null,
            'raw' => json_encode($r), // Convert array to JSON string
        ];
    }

    private function upsertChunk(array $rows, bool $updateOnly = false): void
    {
        try {
            if ($updateOnly) {
                // In update-only mode, only update existing records
                $this->updateChunk($rows);
            } else {
                // Normal mode: insert new records or update existing ones
                DB::table('irs_bmf_records')->upsert($rows, ['ein'], [
                    'name','ico','street','city','state','zip','group','subsection','affiliation','classification','ruling','deductibility','foundation','activity','organization','status','tax_period','asset_cd','income_cd','revenue_amt','ntee_cd','sort_name','raw','updated_at'
                ]);
            }
        } catch (Throwable $e) {
            $this->error("Error processing chunk: " . $e->getMessage());
            // Fallback to individual processing for debugging
            foreach ($rows as $row) {
                try {
                    if ($updateOnly) {
                        // Only update if record exists
                        $exists = DB::table('irs_bmf_records')->where('ein', $row['ein'])->exists();
                        if ($exists) {
                            DB::table('irs_bmf_records')
                                ->where('ein', $row['ein'])
                                ->update($row);
                        }
                    } else {
                        DB::table('irs_bmf_records')->updateOrInsert(
                            ['ein' => $row['ein']],
                            $row
                        );
                    }
                } catch (Throwable $insertError) {
                    $this->error("Failed to process EIN {$row['ein']}: " . $insertError->getMessage());
                }
            }
        }
    }

    private function updateChunk(array $rows): void
    {
        // Get all EINs from the chunk
        $eins = array_column($rows, 'ein');
        
        // Find existing records
        $existingRecords = DB::table('irs_bmf_records')
            ->whereIn('ein', $eins)
            ->pluck('ein')
            ->toArray();
        
        // Only update existing records
        $rowsToUpdate = array_filter($rows, function($row) use ($existingRecords) {
            return in_array($row['ein'], $existingRecords);
        });
        
        if (empty($rowsToUpdate)) {
            $this->line("No existing records found to update in this chunk");
            return;
        }
        
        // Update existing records in batches
        foreach (array_chunk($rowsToUpdate, 100) as $batch) {
            foreach ($batch as $row) {
                DB::table('irs_bmf_records')
                    ->where('ein', $row['ein'])
                    ->update($row);
            }
        }
        
        $this->line("Updated " . count($rowsToUpdate) . " existing records in this chunk");
    }

    private function statePath(): string
    {
        return storage_path('app/irs_bmf_import_state.json');
    }

    private function loadState(): array
    {
        $path = $this->statePath();
        if (!file_exists($path)) {
            return ['source_index' => 0, 'row_offset' => 0];
        }
        $json = file_get_contents($path);
        $data = json_decode($json, true);
        return is_array($data) ? $data : ['source_index' => 0, 'row_offset' => 0];
    }

    private function saveState(array $state): void
    {
        file_put_contents($this->statePath(), json_encode($state));
    }
}
