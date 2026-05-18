<?php

namespace App\Console\Commands;

use App\Models\Organization;
use App\Models\UploadedFile;
use App\Models\User;
use App\Services\EINLookupService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Add an organization by EIN only. Fetches data the same way as irs:bmf:import:
 * downloads from IRS BMF CSV URLs (eo1-eo4), finds the row for this EIN, inserts
 * into excel_data, then creates Organization from that data. Uses only IRS import data.
 */
class AddOrganizationFromIrsEin extends Command
{
    protected $signature = 'organization:add-from-irs-ein {ein : The 9-digit EIN}';

    protected $description = 'Add organization by EIN: fetch from IRS BMF (same as irs:bmf:import), insert into excel_data, then create org.';

    private array $sources = [
        'https://www.irs.gov/pub/irs-soi/eo1.csv',
        'https://www.irs.gov/pub/irs-soi/eo2.csv',
        'https://www.irs.gov/pub/irs-soi/eo3.csv',
        'https://www.irs.gov/pub/irs-soi/eo4.csv',
    ];

    public function handle(EINLookupService $einLookupService): int
    {
        $ein = preg_replace('/[^0-9]/', '', $this->argument('ein'));
        if (strlen($ein) !== 9) {
            $this->error('EIN must be exactly 9 digits.');
            return self::FAILURE;
        }

        if (Organization::where('ein', $ein)->exists()) {
            $this->error("Organization with EIN {$ein} already exists.");
            return self::FAILURE;
        }

        // 1) Ensure EIN exists in excel_data (same source as irs:bmf:import)
        $orgData = $einLookupService->lookupEIN($ein);
        if (! $orgData || empty($orgData['name'])) {
            $this->info("EIN {$ein} not in excel_data. Fetching from IRS BMF (same as irs:bmf:import)...");
            $fetched = $this->fetchEinFromIrsBmfAndInsert($ein);
            if (! $fetched) {
                $this->error("EIN {$ein} not found in any IRS BMF CSV (eo1–eo4). Cannot add.");
                return self::FAILURE;
            }
            $orgData = $einLookupService->lookupEIN($ein);
            if (! $orgData || empty($orgData['name'])) {
                $this->error("Failed to read EIN {$ein} from excel_data after insert.");
                return self::FAILURE;
            }
        }

        $this->info("Found in IRS import: {$orgData['name']} (EIN {$ein})");

        DB::beginTransaction();
        try {
            $slug = Str::slug($orgData['name']) . '-' . substr($ein, -4);
            $counter = 0;
            while (User::where('slug', $slug)->exists()) {
                $counter++;
                $slug = Str::slug($orgData['name']) . '-' . substr($ein, -4) . '-' . $counter;
            }
            $placeholderEmail = 'ein-' . $ein . '@irs-import.placeholder';
            if (User::where('email', $placeholderEmail)->exists()) {
                $placeholderEmail = 'ein-' . $ein . '-' . time() . '@irs-import.placeholder';
            }

            $user = User::create([
                'name' => $orgData['name'],
                'slug' => $slug,
                'email' => $placeholderEmail,
                'password' => Hash::make(Str::random(32)),
                'role' => 'organization_pending',
                'organization_role' => 'admin',
            ]);
            $user->assignRole('organization_pending');

            $organization = Organization::create([
                'user_id' => $user->id,
                'ein' => $ein,
                'name' => $orgData['name'],
                'ico' => $orgData['ico'] ?? null,
                'street' => $orgData['street'] ?? '',
                'city' => $orgData['city'] ?? '',
                'state' => $orgData['state'] ?? '',
                'zip' => $orgData['zip'] ?? '',
                'classification' => $orgData['classification'] ?? null,
                'ruling' => $orgData['ruling'] ?? null,
                'deductibility' => $orgData['deductibility'] ?? null,
                'organization' => $orgData['organization'] ?? null,
                'status' => $orgData['status'] ?? 'Active',
                'tax_period' => $orgData['tax_period'] ?? null,
                'filing_req' => $orgData['filing_req'] ?? null,
                'ntee_code' => $orgData['ntee_code'] ?? null,
                'email' => $placeholderEmail,
                'phone' => '000-000-0000',
                'contact_name' => 'To be completed',
                'contact_title' => 'To be completed',
                'website' => null,
                'description' => 'Added from IRS import. To be completed.',
                'mission' => 'Added from IRS import. To be completed.',
                'registration_status' => 'pending',
                'has_edited_irs_data' => false,
                'original_irs_data' => $orgData,
                'verification_source' => 'IRS import (excel_data)',
                'claim_verification_metadata' => [
                    'added_via' => 'organization:add-from-irs-ein',
                    'ein' => $ein,
                    'added_at' => now()->toIso8601String(),
                ],
            ]);

            DB::commit();
            $this->info("Organization created: ID {$organization->id}, EIN {$ein}, Name: {$organization->name}");
            $this->warn("Placeholder user: {$user->email} (update contact/email/description/mission later).");
            return self::SUCCESS;
        } catch (\Throwable $e) {
            DB::rollBack();
            $this->error($e->getMessage());
            return self::FAILURE;
        }
    }

    /**
     * Download IRS BMF CSVs (same URLs as irs:bmf:import), find row for EIN, insert into excel_data.
     * Streams CSV line-by-line to avoid loading full file into memory.
     */
    private function fetchEinFromIrsBmfAndInsert(string $ein): bool
    {
        foreach ($this->sources as $url) {
            $this->line("  Checking " . basename($url) . "...");
            $result = $this->streamCsvAndFindEin($url, $ein);
            if ($result !== null) {
                [$header, $rowData] = $result;
                return $this->insertRowIntoExcelData($header, $rowData, $ein);
            }
        }
        return false;
    }

    /**
     * Stream CSV from URL; return [header, rowData] when EIN found, null otherwise.
     */
    private function streamCsvAndFindEin(string $url, string $ein): ?array
    {
        $tmpFile = tempnam(sys_get_temp_dir(), 'irs_bmf_');
        if ($tmpFile === false) {
            return null;
        }
        try {
            $client = Http::timeout(300)
                ->withHeaders(['User-Agent' => 'Mozilla/5.0 (compatible; BelieveWallet/1.0)']);
            if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                $client = $client->withOptions(['verify' => false]);
            }
            $response = $client->withOptions(['sink' => $tmpFile])->get($url);
            if (! $response->successful()) {
                return null;
            }
            $handle = fopen($tmpFile, 'r');
            if ($handle === false) {
                return null;
            }
            $headerLine = fgets($handle);
            if ($headerLine === false) {
                fclose($handle);
                return null;
            }
            $header = str_getcsv($headerLine);
            $einIndex = array_search('EIN', $header);
            if ($einIndex === false) {
                fclose($handle);
                return null;
            }
            while (($line = fgets($handle)) !== false) {
                $rowData = str_getcsv($line);
                if (count($rowData) !== count($header)) {
                    continue;
                }
                $rowEin = isset($rowData[$einIndex]) ? preg_replace('/[^0-9]/', '', (string) $rowData[$einIndex]) : '';
                if ($rowEin === $ein) {
                    fclose($handle);
                    return [$header, $rowData];
                }
            }
            fclose($handle);
            return null;
        } catch (\Throwable $e) {
            $this->warn("  Download/stream failed: " . $e->getMessage());
            return null;
        } finally {
            if (file_exists($tmpFile)) {
                @unlink($tmpFile);
            }
        }
    }

    /**
     * Insert one row into excel_data the same way ProcessIrsBmfSource does (same file_id/header row pattern).
     */
    private function insertRowIntoExcelData(array $header, array $rowData, string $ein): bool
    {
        $uploadedFile = UploadedFile::firstOrCreate(
            ['original_name' => 'IRS_BMF_Single_EIN'],
            [
                'file_name' => 'irs_bmf_single_ein.csv',
                'file_type' => 'text/csv',
                'file_extension' => 'csv',
                'file_size' => '0',
                'status' => 'completed',
            ]
        );
        $fileId = $uploadedFile->id;

        $hasHeader = DB::table('excel_data')
            ->where('file_id', $fileId)
            ->where('ein', 'EIN')
            ->exists();

        if (! $hasHeader) {
            DB::table('excel_data')->insert([
                'file_id' => $fileId,
                'row_data' => json_encode($header),
                'ein' => 'EIN',
                'status' => 'complete',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $existing = DB::table('excel_data')
            ->where('ein', $ein)
            ->where('ein', '!=', 'EIN')
            ->first();

        if ($existing) {
            DB::table('excel_data')
                ->where('id', $existing->id)
                ->update([
                    'row_data' => json_encode($rowData),
                    'updated_at' => now(),
                ]);
        } else {
            DB::table('excel_data')->insert([
                'file_id' => $fileId,
                'row_data' => json_encode($rowData),
                'ein' => $ein,
                'status' => 'complete',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $this->info("  Inserted/updated EIN {$ein} in excel_data (same as irs:bmf:import).");
        return true;
    }
}
