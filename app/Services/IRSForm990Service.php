<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\Form990Filing;
use App\Models\IrsBoardMember;
use App\Models\BoardMember;
use GuzzleHttp\Client as GuzzleClient;
use GuzzleHttp\RequestOptions;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class IRSForm990Service
{
    /**
     * IRS Form 990 XML data URL
     * Note: IRS provides bulk data downloads. You may need to download and process XML files.
     * For now, we'll create a structure that can work with IRS XML files.
     */
    private const IRS_DATA_BASE_URL = 'https://www.irs.gov/pub/irs-soi/';

    /**
     * Default tax year for IRS data lookups (previous year; current year bulk XML is not yet available).
     */
    public static function defaultTaxYearForIrsData(): string
    {
        return (string) (Carbon::now()->year - 1);
    }

    /**
     * Check Form 990 filing status for an organization by EIN
     *
     * @param string $ein
     * @param string|null $taxYear
     * @return array|null
     */
    public function checkFilingStatus(string $ein, ?string $taxYear = null): ?array
    {
        try {
            $cleanEIN = preg_replace('/[^0-9]/', '', $ein);

            if (!$taxYear) {
                $taxYear = static::defaultTaxYearForIrsData();
            }

            // In a real implementation, you would:
            // 1. Download IRS XML files (they're available as bulk downloads)
            // 2. Parse the XML files
            // 3. Search for the EIN
            // 4. Extract filing information
            
            // For now, we'll create a method that can be extended to fetch from:
            // - IRS.gov bulk data downloads
            // - IRS API (if available)
            // - Local XML file cache
            
            return $this->fetchFromLocalCache($cleanEIN, $taxYear);
            
        } catch (\Exception $e) {
            Log::error("IRS Form 990 check failed for EIN {$ein}: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Fetch from local cache (XML files downloaded from IRS)
     * This method should be implemented to parse IRS XML files
     */
    private function fetchFromLocalCache(string $ein, string $taxYear): ?array
    {
        $xmlPath = storage_path("app/irs-data/{$taxYear}/form990.xml");

        if (!file_exists($xmlPath)) {
            // Try previous year (IRS bulk data for current year is usually not available yet)
            $prevYear = (string) (Carbon::now()->year - 1);
            if ($taxYear !== $prevYear) {
                $altPath = storage_path("app/irs-data/{$prevYear}/form990.xml");
                if (file_exists($altPath)) {
                    return $this->parseIRSXML($altPath, $ein);
                }
            }
            Log::debug("IRS XML file not found for year {$taxYear}. Run: php artisan irs:sync-board-members --year=" . static::defaultTaxYearForIrsData());
            return null;
        }

        return $this->parseIRSXML($xmlPath, $ein);
    }

    /**
     * Parse IRS XML file and extract filing information
     */
    private function parseIRSXML(string $xmlPath, string $ein): ?array
    {
        try {
            $xml = simplexml_load_file($xmlPath);
            
            if (!$xml) {
                return null;
            }

            // IRS XML structure varies, but typically contains:
            // - EIN
            // - Tax Year
            // - Form Type (990, 990-EZ, 990-PF)
            // - Filing Date
            
            // Search for organization by EIN
            // This is a simplified example - actual IRS XML structure may differ
            foreach ($xml->Return as $return) {
                $returnEIN = (string) $return->EIN;
                $cleanReturnEIN = preg_replace('/[^0-9]/', '', $returnEIN);
                
                if ($cleanReturnEIN === $ein) {
                    $taxYear = (string) ($return->TaxYr ?? $return->tax_year ?? '');
                    if ($taxYear === '') {
                        $taxYear = (string) Carbon::now()->year;
                    }

                    // Extract board members from this return
                    $this->extractAndStoreBoardMembers($cleanReturnEIN, $return, $taxYear);

                    $filingDate = $this->parseDate((string) ($return->FiledDt ?? $return->filing_date ?? ''));
                    $formType = (string) ($return->FormType ?? $return->form_type ?? '990');
                    if ($formType === '') {
                        $formType = '990';
                    }

                    return [
                        'ein' => $cleanReturnEIN,
                        'tax_year' => $taxYear,
                        'form_type' => $formType,
                        'filing_date' => $filingDate,
                        'is_filed' => true,
                        'irs_data' => json_decode(json_encode($return), true),
                        'meta' => [
                            'source' => 'irs_xml',
                            'parsed_at' => now()->toIso8601String(),
                        ],
                    ];
                }
            }

            return null;
            
        } catch (\Exception $e) {
            Log::error("Error parsing IRS XML: " . $e->getMessage());
            return null;
        }
    }

    /**
     * SSL options for IRS HTTP requests (fixes cURL 60 "unable to get local issuer certificate" on Windows/local).
     */
    private function getIrsHttpSslOptions(): array
    {
        $cafile = config('services.irs.cafile');
        if ($cafile && is_file($cafile)) {
            return ['verify' => $cafile];
        }
        $verify = config('services.irs.ssl_verify', true);
        return ['verify' => $verify];
    }

    /**
     * Stream-download an IRS file to disk (avoids loading large ZIP into memory).
     */
    private function downloadIrsFileToPath(string $url, string $path, int $timeout): bool
    {
        $retries = config('services.irs.download_retries', 3);
        $options = array_merge($this->getIrsHttpSslOptions(), [
            RequestOptions::SINK => $path,
            RequestOptions::TIMEOUT => $timeout,
            RequestOptions::CONNECT_TIMEOUT => 30,
            RequestOptions::HEADERS => [
                'User-Agent' => 'Mozilla/5.0 (compatible; IRS-990-Sync/1.0; +https://www.irs.gov/charities-non-profits/form-990-series-downloads)',
                'Accept' => 'application/zip,*/*',
            ],
        ]);
        $lastException = null;
        for ($attempt = 1; $attempt <= $retries; $attempt++) {
            try {
                if (file_exists($path)) {
                    @unlink($path);
                }
                $client = new GuzzleClient();
                $response = $client->request('GET', $url, $options);
                if ($response->getStatusCode() >= 200 && $response->getStatusCode() < 300
                    && file_exists($path) && filesize($path) > 0) {
                    return true;
                }
            } catch (\Throwable $e) {
                $lastException = $e;
                Log::debug("IRS download attempt {$attempt}/{$retries}: " . $e->getMessage());
                if (file_exists($path)) {
                    @unlink($path);
                }
                if ($attempt < $retries) {
                    usleep(5000 * 1000); // 5s between retries
                }
            }
        }
        if ($lastException) {
            Log::warning("IRS download failed after {$retries} attempts: " . $lastException->getMessage());
        }
        return false;
    }

    /**
     * Public wrapper for queue command: get list of ZIP filenames for a year.
     */
    public function getXmlZipFileNamesForYearPublic(string $taxYear): array
    {
        return $this->getXmlZipFileNamesForYear($taxYear);
    }

    /**
     * Get list of Form 990 e-file XML ZIP filenames for a year (XML only; officers data is only in XML).
     * Tries IRS index CSV first; falls back to known TEOS_XML naming.
     */
    private function getXmlZipFileNamesForYear(string $taxYear): array
    {
        $indexUrl = "https://apps.irs.gov/pub/epostcard/990/xml/{$taxYear}/index_{$taxYear}.csv";
        try {
            $response = Http::timeout(120)
                ->retry(2, 2000, null, false)
                ->withOptions($this->getIrsHttpSslOptions())
                ->withHeaders(['User-Agent' => 'Mozilla/5.0 (compatible; IRS-990-Sync/1.0)'])
                ->get($indexUrl);
            if ($response->successful()) {
                $names = [];
                $content = $response->body();
                foreach (preg_split('/\r?\n/', $content) as $line) {
                    if (preg_match('/\b(' . preg_quote($taxYear, '/') . '_TEOS_XML_[^"\'\\s]+\\.zip)\b/i', $line, $m)) {
                        $names[] = $m[1];
                    }
                }
                if (!empty($names)) {
                    return array_values(array_unique($names));
                }
            }
        } catch (\Throwable $e) {
            Log::debug("IRS index CSV not used for {$taxYear}: " . $e->getMessage());
        }

        // Fallback: known TEOS XML ZIP naming (XML only, no PDF)
        $zipFileNames = [];
        for ($month = 1; $month <= 12; $month++) {
            $monthStr = str_pad($month, 2, '0', STR_PAD_LEFT);
            $zipFileNames[] = "{$taxYear}_TEOS_XML_{$monthStr}A.zip";
        }
        if (in_array($taxYear, ['2025', '2024'])) {
            $zipFileNames[] = "{$taxYear}_TEOS_XML_11B.zip";
            $zipFileNames[] = "{$taxYear}_TEOS_XML_11C.zip";
            $zipFileNames[] = "{$taxYear}_TEOS_XML_11D.zip";
        }
        return $zipFileNames;
    }

    /**
     * Download IRS Form 990 e-file XML only (officers/officer data exists only in XML per IRS).
     * Source: https://www.irs.gov/charities-non-profits/form-990-series-downloads
     * URL pattern: https://apps.irs.gov/pub/epostcard/990/xml/{year}/{year}_TEOS_XML_01A.zip etc.
     *
     * @param string $taxYear
     * @param callable|null $progressCallback Optional callback for progress (e.g. for CLI): function(string $message): void
     * @return bool
     */
    public function downloadIRSData(string $taxYear, ?callable $progressCallback = null): bool
    {
        $progress = function (string $message) use ($progressCallback): void {
            Log::info($message);
            if (is_callable($progressCallback)) {
                $progressCallback($message);
            }
        };

        try {
            $storageDir = storage_path("app/irs-data/{$taxYear}");
            $zipDir = storage_path("app/irs-data/{$taxYear}/zips");

            if (!is_dir($storageDir)) {
                mkdir($storageDir, 0755, true);
            }
            if (!is_dir($zipDir)) {
                mkdir($zipDir, 0755, true);
            }

            $baseUrl = "https://apps.irs.gov/pub/epostcard/990/xml/{$taxYear}";
            $downloadedCount = 0;
            $extractedCount = 0;

            $zipFileNames = $this->getXmlZipFileNamesForYear($taxYear);
            $total = count($zipFileNames);
            $httpTimeout = config('services.irs.download_timeout', 900);
            $httpRetries = config('services.irs.download_retries', 3);

            foreach ($zipFileNames as $index => $zipFileName) {
                $num = $index + 1;
                $zipUrl = "{$baseUrl}/{$zipFileName}";
                $zipPath = "{$zipDir}/{$zipFileName}";

                try {
                    $progress("Downloading ({$num}/{$total}): {$zipFileName} …");
                    if (!$this->downloadIrsFileToPath($zipUrl, $zipPath, $httpTimeout)) {
                        Log::debug("File not found or failed: {$zipFileName}");
                        continue;
                    }
                    $fileSize = filesize($zipPath);
                    if ($fileSize < 1000) {
                        $head = file_get_contents($zipPath, false, null, 0, 500);
                        if (stripos($head, '<!DOCTYPE') !== false || str_starts_with($head, '%PDF-')) {
                            Log::debug("Skipping {$zipFileName}: not a ZIP (HTML/PDF)");
                            @unlink($zipPath);
                            continue;
                        }
                    } elseif (file_get_contents($zipPath, false, null, 0, 5) === '%PDF-') {
                        Log::debug("Skipping {$zipFileName}: PDF not wanted (officers data is XML only)");
                        @unlink($zipPath);
                        continue;
                    }
                    $sizeMb = round($fileSize / 1024 / 1024, 1);
                    $progress("Downloaded ({$num}/{$total}): {$zipFileName} ({$sizeMb} MB)");
                    $downloadedCount++;
                    if ($this->extractAndProcessZipFile($zipPath, $storageDir, $taxYear)) {
                        $extractedCount++;
                        $progress("  → Processed and cleaned up {$zipFileName}");
                    }
                    if (file_exists($zipPath)) {
                        unlink($zipPath);
                    }
                } catch (\Throwable $e) {
                    Log::warning("Error processing {$zipFileName}: " . $e->getMessage());
                    if (file_exists($zipPath)) {
                        @unlink($zipPath);
                    }
                }
            }

            // Also try alternative naming for older years (XML only; officers data only in XML)
            if ($downloadedCount === 0 && in_array($taxYear, ['2020', '2019', '2021', '2022'])) {
                $alternativeFiles = [
                    "{$taxYear}_TEOS_XML_CT1.zip",
                    "download990xml_{$taxYear}_1.zip",
                    "download990xml_{$taxYear}_2.zip",
                    "download990xml_{$taxYear}_3.zip",
                    "download990xml_{$taxYear}_4.zip",
                    "download990xml_{$taxYear}_5.zip",
                    "download990xml_{$taxYear}_6.zip",
                    "download990xml_{$taxYear}_7.zip",
                    "download990xml_{$taxYear}_8.zip",
                ];

                foreach ($alternativeFiles as $fileName) {
                    $zipUrl = "{$baseUrl}/{$fileName}";
                    $zipPath = "{$zipDir}/{$fileName}";

                    try {
                        Log::info("Trying alternative file: {$zipUrl}");
                        if ($this->downloadIrsFileToPath($zipUrl, $zipPath, 600)) {
                            $downloadedCount++;
                            if ($this->extractAndProcessZipFile($zipPath, $storageDir, $taxYear)) {
                                $extractedCount++;
                            }
                            if (file_exists($zipPath)) {
                                unlink($zipPath);
                            }
                        }
                    } catch (\Exception $e) {
                        if (file_exists($zipPath)) {
                            @unlink($zipPath);
                        }
                    }
                }
            }

            if ($downloadedCount > 0) {
                Log::info("Successfully downloaded {$downloadedCount} ZIP file(s) and extracted {$extractedCount} for year {$taxYear}");
                return true;
            } else {
                Log::warning("No ZIP files found for year {$taxYear}");
                Log::info("Please check: https://www.irs.gov/charities-non-profits/form-990-series-downloads");
                return false;
            }
            
        } catch (\Exception $e) {
            Log::error("Failed to download IRS data for year {$taxYear}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Process a single ZIP by filename (download + extract + DB). Used by queue jobs.
     * Returns summary for logging.
     */
    public function processSingleZipByFilename(string $taxYear, string $zipFileName): array
    {
        $result = ['success' => false, 'downloaded' => false, 'processed' => false, 'message' => ''];
        $storageDir = storage_path("app/irs-data/{$taxYear}");
        $zipDir = storage_path("app/irs-data/{$taxYear}/zips");

        if (!is_dir($storageDir)) {
            mkdir($storageDir, 0755, true);
        }
        if (!is_dir($zipDir)) {
            mkdir($zipDir, 0755, true);
        }

        $baseUrl = "https://apps.irs.gov/pub/epostcard/990/xml/{$taxYear}";
        $zipUrl = "{$baseUrl}/{$zipFileName}";
        $zipPath = "{$zipDir}/{$zipFileName}";
        $httpTimeout = config('services.irs.download_timeout', 900);

        try {
            if (!file_exists($zipPath) && !$this->downloadIrsFileToPath($zipUrl, $zipPath, $httpTimeout)) {
                $result['message'] = "Download failed: {$zipFileName}";
                return $result;
            }
            $result['downloaded'] = true;

            if (filesize($zipPath) < 1000) {
                $head = file_get_contents($zipPath, false, null, 0, 500);
                if (stripos($head, '<!DOCTYPE') !== false || str_starts_with($head, '%PDF-')) {
                    @unlink($zipPath);
                    $result['message'] = "Skipped (not ZIP): {$zipFileName}";
                    return $result;
                }
            } elseif (file_get_contents($zipPath, false, null, 0, 5) === '%PDF-') {
                @unlink($zipPath);
                $result['message'] = "Skipped (PDF): {$zipFileName}";
                return $result;
            }

            $result['processed'] = $this->extractAndProcessZipFile($zipPath, $storageDir, $taxYear);
            if (file_exists($zipPath)) {
                unlink($zipPath);
            }
            $result['success'] = true;
            $result['message'] = $zipFileName . ($result['processed'] ? ' processed' : ' extracted (no data)');
            return $result;
        } catch (\Throwable $e) {
            if (file_exists($zipPath)) {
                @unlink($zipPath);
            }
            $result['message'] = $zipFileName . ': ' . $e->getMessage();
            Log::error("ProcessIrsZipJob failed: " . $result['message']);
            return $result;
        }
    }

    /**
     * Extract ZIP file, process XML files immediately, then delete them
     * This processes one ZIP at a time to keep memory usage low
     * 
     * @param string $zipPath
     * @param string $extractTo
     * @param string $taxYear
     * @return bool
     */
    private function extractAndProcessZipFile(string $zipPath, string $extractTo, string $taxYear): bool
    {
        try {
            if (!file_exists($zipPath)) {
                return false;
            }

            Log::info("  Opening ZIP for extraction: " . basename($zipPath));

            $zip = new \ZipArchive();
            if ($zip->open($zipPath) !== true) {
                Log::error("Failed to open ZIP file: {$zipPath}");
                return false;
            }

            $numFiles = $zip->numFiles;
            Log::info("  ZIP has {$numFiles} entries, extracting XMLs one-by-one (stream to disk, low memory)");

            $processedCount = 0;
            $xmlCount = 0;
            $zipBase = basename($zipPath, '.zip');

            for ($i = 0; $i < $numFiles; $i++) {
                $filename = $zip->getNameIndex($i);
                if (pathinfo($filename, PATHINFO_EXTENSION) !== 'xml') {
                    continue;
                }
                // Stream ZIP entry to file (do not load entire XML into memory — critical for low-memory servers)
                $stream = $zip->getStream($filename);
                if ($stream === false) {
                    continue;
                }
                $xmlFileName = "form990_{$zipBase}_{$i}.xml";
                $xmlPath = "{$extractTo}/{$xmlFileName}";
                $out = fopen($xmlPath, 'wb');
                if ($out === false) {
                    fclose($stream);
                    continue;
                }
                while (!feof($stream)) {
                    fwrite($out, fread($stream, 65536));
                }
                fclose($out);
                fclose($stream);

                $xmlCount++;
                try {
                    $fileResults = $this->processSingleXMLFile($xmlPath, $taxYear);
                    $processedCount += $fileResults['organizations_processed'];
                    Log::info("  Processed {$xmlFileName}: {$fileResults['organizations_processed']} orgs, {$fileResults['board_members_found']} board members");
                } catch (\Throwable $e) {
                    Log::error("  Error processing {$xmlFileName}: " . $e->getMessage());
                }
                if (file_exists($xmlPath)) {
                    @unlink($xmlPath);
                }
            }

            $zip->close();

            if ($xmlCount === 0) {
                Log::warning("No XML files found in ZIP: {$zipPath}");
                return false;
            }

            Log::info("  ✓ Completed processing ZIP: {$xmlCount} XML file(s), {$processedCount} organizations processed");
            return true;

        } catch (\Throwable $e) {
            Log::error("Error extracting/processing ZIP file {$zipPath}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Process a single XML file and extract board members
     * 
     * @param string $xmlPath
     * @param string $taxYear
     * @return array
     */
    private function processSingleXMLFile(string $xmlPath, string $taxYear): array
    {
        $results = [
            'organizations_processed' => 0,
            'board_members_found' => 0,
            'board_members_created' => 0,
            'board_members_updated' => 0,
            'board_members_inactivated' => 0,
            'errors' => 0,
        ];

        try {
            if (!Schema::hasTable('irs_board_members')) {
                return $results;
            }

            // Load XML with error handling
            libxml_use_internal_errors(true);
            $xml = simplexml_load_file($xmlPath);
            
            if (!$xml) {
                $errors = libxml_get_errors();
                $errorMsg = !empty($errors) ? $errors[0]->message : 'Unknown error';
                Log::warning("Failed to load XML: {$errorMsg}");
                libxml_clear_errors();
                return $results;
            }

            // Register namespaces - IRS uses default namespace
            $namespaces = $xml->getNamespaces(true);
            $defaultNs = $namespaces[''] ?? 'http://www.irs.gov/efile';
            $xml->registerXPathNamespace('irs', $defaultNs);

            // Try different ways to find Return elements
            $returns = [];
            
            // Method 1: Direct access (with namespace)
            if (isset($xml->Return)) {
                $returns = [$xml->Return];
                Log::debug("Found Return via direct access");
            }
            // Method 2: XPath with namespace
            elseif (!empty($xml->xpath('//irs:Return'))) {
                $returns = $xml->xpath('//irs:Return');
                Log::debug("Found Return via XPath with namespace");
            }
            // Method 3: XPath without namespace
            elseif (!empty($xml->xpath('//Return'))) {
                $returns = $xml->xpath('//Return');
                Log::debug("Found Return via XPath without namespace");
            }
            // Method 4: Check for ReturnData wrapper
            elseif (isset($xml->ReturnData)) {
                if (isset($xml->ReturnData->Return)) {
                    $returns = [$xml->ReturnData->Return];
                    Log::debug("Found Return via ReturnData wrapper");
                }
            }

            if (empty($returns)) {
                return $results;
            }

            // Process all returns
            $returnsArray = is_array($returns) ? $returns : [$returns];
            
            foreach ($returnsArray as $return) {
                try {
                    // Get EIN - try multiple paths based on actual IRS structure
                    $returnEIN = null;
                    if (isset($return->ReturnHeader->Filer->EIN)) {
                        $returnEIN = (string) $return->ReturnHeader->Filer->EIN;
                    } elseif (isset($return->ReturnHeader) && isset($return->ReturnHeader->Filer) && isset($return->ReturnHeader->Filer->EIN)) {
                        $returnEIN = (string) $return->ReturnHeader->Filer->EIN;
                    } elseif (isset($return->EIN)) {
                        $returnEIN = (string) $return->EIN;
                    } elseif (isset($return->Filer->EIN)) {
                        $returnEIN = (string) $return->Filer->EIN;
                    }
                    
                    $cleanReturnEIN = $returnEIN ? preg_replace('/[^0-9]/', '', $returnEIN) : '';
                    
                    if (empty($cleanReturnEIN)) {
                        Log::debug("Skipping return - no EIN found");
                        continue;
                    }

                    // Get tax year
                    $returnTaxYear = null;
                    if (isset($return->ReturnHeader->TaxYr)) {
                        $returnTaxYear = (string) $return->ReturnHeader->TaxYr;
                    } elseif (isset($return->TaxYr)) {
                        $returnTaxYear = (string) $return->TaxYr;
                    }
                    $returnTaxYear = $returnTaxYear ?: $taxYear;
                    
                    Log::info("Processing EIN: {$cleanReturnEIN}, Tax Year: {$returnTaxYear}");
                    
                    // Extract board members
                    $memberStats = $this->extractAndStoreBoardMembersBulk($cleanReturnEIN, $return, $returnTaxYear);
                    
                    $results['organizations_processed']++;
                    $results['board_members_found'] += $memberStats['found'];
                    $results['board_members_created'] += $memberStats['created'];
                    $results['board_members_updated'] += $memberStats['updated'];
                    $results['board_members_inactivated'] += $memberStats['inactivated'];
                    
                } catch (\Exception $e) {
                    Log::error("Error processing return: " . $e->getMessage());
                    $results['errors']++;
                }
            }

        } catch (\Exception $e) {
            Log::error("Error processing XML file {$xmlPath}: " . $e->getMessage());
            $results['errors']++;
        }

        return $results;
    }

    /**
     * Process entire IRS XML file and extract board members for ALL organizations
     * This processes existing XML files (if download was skipped)
     * 
     * @param string $taxYear
     * @return array Statistics about the processing
     */
    public function processBulkIRSBoardMembers(string $taxYear): array
    {
        $results = [
            'organizations_processed' => 0,
            'board_members_found' => 0,
            'board_members_created' => 0,
            'board_members_updated' => 0,
            'board_members_inactivated' => 0,
            'errors' => 0,
        ];

        try {
            if (!Schema::hasTable('irs_board_members')) {
                Log::warning('irs_board_members table does not exist. Please run migrations.');
                return $results;
            }

            $dataDir = storage_path("app/irs-data/{$taxYear}");
            
            if (!is_dir($dataDir)) {
                Log::error("IRS data directory not found for year {$taxYear}. Please download first.");
                return $results;
            }

            // Find all XML files in the directory (exclude zips folder)
            $xmlFiles = array_filter(glob("{$dataDir}/*.xml"), function($file) {
                return strpos($file, 'zips') === false;
            });
            
            if (empty($xmlFiles)) {
                Log::info("No XML files found in {$dataDir}. Processing will happen during download.");
                return $results;
            }

            Log::info("=== Processing existing XML files for year {$taxYear} ===");
            Log::info("Found " . count($xmlFiles) . " XML file(s) to process");

            // Process each XML file and delete after processing
            foreach ($xmlFiles as $xmlPath) {
                try {
                    $fileName = basename($xmlPath);
                    Log::info("Processing: {$fileName}");
                    
                    $fileResults = $this->processSingleXMLFile($xmlPath, $taxYear);
                    
                    $results['organizations_processed'] += $fileResults['organizations_processed'];
                    $results['board_members_found'] += $fileResults['board_members_found'];
                    $results['board_members_created'] += $fileResults['board_members_created'];
                    $results['board_members_updated'] += $fileResults['board_members_updated'];
                    $results['board_members_inactivated'] += $fileResults['board_members_inactivated'];
                    $results['errors'] += $fileResults['errors'];
                    
                    Log::info("✓ {$fileName}: {$fileResults['organizations_processed']} orgs, {$fileResults['board_members_found']} board members");
                    
                    // Delete XML file after processing
                    if (file_exists($xmlPath) && unlink($xmlPath)) {
                        Log::info("  Deleted: {$fileName}");
                    }
                    
                } catch (\Exception $e) {
                    Log::error("Error processing {$xmlPath}: " . $e->getMessage());
                    $results['errors']++;
                }
            }

            Log::info("Bulk processing completed. Processed {$results['organizations_processed']} organizations, found {$results['board_members_found']} board members.");

        } catch (\Exception $e) {
            Log::error("Error processing bulk IRS board members for year {$taxYear}: " . $e->getMessage());
            $results['errors']++;
        }

        return $results;
    }

    /**
     * Extract and store board members for a single organization (bulk processing version)
     * Saves all board members regardless of organization database matching
     * Returns statistics instead of void
     * 
     * @param string $ein
     * @param \SimpleXMLElement $return
     * @param string|null $taxYear
     * @return array
     */
    private function extractAndStoreBoardMembersBulk(string $ein, $return, ?string $taxYear = null): array
    {
        $stats = [
            'found' => 0,
            'created' => 0,
            'updated' => 0,
            'inactivated' => 0,
        ];

        try {
            if (!Schema::hasTable('irs_board_members')) {
                Log::warning("irs_board_members table does not exist");
                return $stats;
            }

            // First try XPath extraction (more reliable for XML)
            $boardMembers = $this->extractBoardMembersFromXML($return);
            
            Log::debug("  XPath extraction found " . count($boardMembers) . " board members for EIN {$ein}");
            
            // If XPath didn't work, try array-based extraction
            if (empty($boardMembers)) {
                $returnArray = json_decode(json_encode($return), true);
                
                $members = null;
                
                // Try to find board members in different form types
                if (isset($returnArray['ReturnData']['IRS990']['Form990PartVIISectionAGrp'])) {
                    $members = $returnArray['ReturnData']['IRS990']['Form990PartVIISectionAGrp'];
                    Log::debug("  Found members in IRS990->Form990PartVIISectionAGrp");
                } elseif (isset($returnArray['ReturnData']['IRS990EZ']['Form990EZPartVIISectionAGrp'])) {
                    $members = $returnArray['ReturnData']['IRS990EZ']['Form990EZPartVIISectionAGrp'];
                    Log::debug("  Found members in IRS990EZ->Form990EZPartVIISectionAGrp");
                } elseif (isset($returnArray['ReturnData']['IRS990PF']['Form990PFPartVIISectionAGrp'])) {
                    $members = $returnArray['ReturnData']['IRS990PF']['Form990PFPartVIISectionAGrp'];
                    Log::debug("  Found members in IRS990PF->Form990PFPartVIISectionAGrp");
                }
                
                if ($members) {
                    $boardMembers = $this->normalizeBoardMemberArray($members);
                    Log::debug("  Array extraction found " . count($boardMembers) . " board members");
                }
            }

            if (empty($boardMembers)) {
                Log::debug("  No board members found for EIN {$ein}");
                return $stats;
            }

            $stats['found'] = count($boardMembers);
            Log::info("  Extracting {$stats['found']} board members for EIN {$ein}");

            // Get current active board members for this EIN and tax year (for comparison only)
            $currentActiveMembers = IrsBoardMember::forEin($ein)
                ->forTaxYear($taxYear)
                ->active()
                ->get()
                ->keyBy(function ($member) {
                    return strtolower(trim($member->name)) . '|' . strtolower(trim($member->position ?? ''));
                });

            // Process each board member from IRS data - save all of them
            foreach ($boardMembers as $memberData) {
                $name = trim($memberData['name'] ?? '');
                $position = trim($memberData['position'] ?? '');
                
                if (empty($name)) {
                    continue;
                }

                $memberKey = strtolower($name) . '|' . strtolower($position);
                
                // Check if this member already exists for this EIN and tax year
                $existingMember = IrsBoardMember::forEin($ein)
                    ->where('name', $name)
                    ->where('position', $position)
                    ->where('tax_year', $taxYear)
                    ->first();

                if ($existingMember) {
                    // Update existing member - mark as active if they were inactive
                    if ($existingMember->status !== 'active') {
                        $existingMember->reactivate();
                    }
                    
                    // Update IRS data
                    $existingMember->update([
                        'irs_data' => $memberData['irs_data'] ?? null,
                        'appointed_date' => $memberData['appointed_date'] ?? $existingMember->appointed_date,
                        'term_end_date' => $memberData['term_end_date'] ?? $existingMember->term_end_date,
                    ]);
                    
                    $stats['updated']++;
                } else {
                    // Create new board member - save regardless of organization database
                    try {
                        $newMember = IrsBoardMember::create([
                            'ein' => $ein,
                            'name' => $name,
                            'position' => $position ?: null,
                            'status' => 'active',
                            'tax_year' => $taxYear,
                            'appointed_date' => $memberData['appointed_date'] ?? null,
                            'term_end_date' => $memberData['term_end_date'] ?? null,
                            'irs_data' => $memberData['irs_data'] ?? null,
                        ]);
                        
                        $stats['created']++;
                        Log::info("    ✓ CREATED IRS Board Member: ID={$newMember->id}, Name='{$name}', Position='{$position}', TaxYear='{$taxYear}', EIN='{$ein}'");
                    } catch (\Exception $e) {
                        Log::error("    ✗ Failed to create board member {$name} for EIN {$ein}: " . $e->getMessage());
                        Log::error("    Error details: " . $e->getTraceAsString());
                    }
                }

                // Remove from current active list (so we know who's still active)
                $currentActiveMembers->forget($memberKey);
            }

            // Mark members not found in current filing as inactive (but don't delete)
            foreach ($currentActiveMembers as $inactiveMember) {
                if ($inactiveMember->status === 'active') {
                    $inactiveMember->markAsInactive('Not found in latest IRS filing for tax year ' . $taxYear);
                    $stats['inactivated']++;
                }
            }

            // After storing IRS board members, verify organization's board members against IRS data
            $this->verifyOrganizationBoardMembers($ein, $taxYear);

        } catch (\Exception $e) {
            Log::error("Error extracting board members for EIN {$ein}: " . $e->getMessage());
        }

        return $stats;
    }

    /**
     * Calculate due date for Form 990 based on tax year end
     */
    public function calculateDueDate(string $taxYear, ?string $taxYearEnd = null): ?Carbon
    {
        // Form 990 is typically due 4.5 months after tax year end
        // If tax year end is not provided, assume calendar year (Dec 31)
        
        if ($taxYearEnd) {
            $yearEnd = Carbon::parse($taxYearEnd);
        } else {
            $yearEnd = Carbon::createFromDate($taxYear, 12, 31);
        }
        
        // Due date is 4.5 months after year end (typically May 15 for calendar year)
        return $yearEnd->copy()->addMonths(4)->addDays(15);
    }

    /**
     * Parse date string from IRS format
     */
    private function parseDate(?string $dateString): ?string
    {
        if (!$dateString) {
            return null;
        }

        try {
            // IRS dates are typically in YYYYMMDD format
            if (preg_match('/^(\d{4})(\d{2})(\d{2})$/', $dateString, $matches)) {
                return "{$matches[1]}-{$matches[2]}-{$matches[3]}";
            }
            
            // Try other common formats
            $date = Carbon::parse($dateString);
            return $date->format('Y-m-d');
            
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Check all active organizations for Form 990 filings
     */
    public function checkAllOrganizations(?string $taxYear = null): array
    {
        $results = [
            'checked' => 0,
            'found' => 0,
            'missing' => 0,
            'errors' => 0,
        ];

        // Check if organizations table exists
        if (!Schema::hasTable('organizations')) {
            Log::error('organizations table does not exist. Cannot check Form 990 filings.');
            return $results;
        }

        // Check if form_990_filings table exists
        if (!Schema::hasTable('form_990_filings')) {
            Log::error('form_990_filings table does not exist. Please run migrations.');
            return $results;
        }

        try {
            $organizations = Organization::where('status', 'Active')
                ->whereNotNull('ein')
                ->get();
        } catch (\Exception $e) {
            Log::error('Error fetching organizations: ' . $e->getMessage());
            return $results;
        }

        foreach ($organizations as $organization) {
            try {
                $results['checked']++;
                
                $filingData = $this->checkFilingStatus($organization->ein, $taxYear);
                
                if ($filingData) {
                    $this->updateFilingRecord($organization, $filingData);
                    $results['found']++;
                } else {
                    // No filing found - create or update missing record
                    $this->createMissingFilingRecord($organization, $taxYear);
                    $results['missing']++;
                }
                
            } catch (\Exception $e) {
                Log::error("Error checking organization {$organization->id}: " . $e->getMessage());
                $results['errors']++;
            }
        }

        return $results;
    }

    /**
     * Update or create filing record
     */
    private function updateFilingRecord(Organization $organization, array $filingData): void
    {
        try {
            if (!Schema::hasTable('form_990_filings')) {
                Log::warning('form_990_filings table does not exist. Please run migrations.');
                return;
            }

            $taxYear = isset($filingData['tax_year']) ? (string) $filingData['tax_year'] : (string) Carbon::now()->year;
            $filingDate = isset($filingData['filing_date']) ? $filingData['filing_date'] : null;
            if ($filingDate && is_string($filingDate)) {
                $filingDate = \Carbon\Carbon::parse($filingDate)->format('Y-m-d');
            }
            $dueDate = null;
            if (isset($filingData['due_date'])) {
                $dueDate = $filingData['due_date'];
                if (is_string($dueDate)) {
                    $dueDate = \Carbon\Carbon::parse($dueDate)->format('Y-m-d');
                }
            } else {
                $dueDate = $this->calculateDueDate($taxYear);
            }

            Form990Filing::updateOrCreate(
                [
                    'organization_id' => $organization->id,
                    'tax_year' => $taxYear,
                ],
                [
                    'form_type' => $filingData['form_type'] ?? $organization->filing_req ?? '990',
                    'filing_date' => $filingDate,
                    'is_filed' => $filingData['is_filed'] ?? true,
                    'due_date' => $dueDate,
                    'extended_due_date' => $filingData['extended_due_date'] ?? null,
                    'is_extended' => $filingData['is_extended'] ?? false,
                    'last_checked_at' => now(),
                    'irs_data' => $filingData['irs_data'] ?? null,
                    'meta' => array_merge(
                        is_array($filingData['meta'] ?? null) ? $filingData['meta'] : [],
                        [
                            'source' => 'irs_check',
                            'last_checked_at' => now()->toIso8601String(),
                        ]
                    ),
                ]
            );
        } catch (\Exception $e) {
            Log::error("Error updating filing record for organization {$organization->id}: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Create missing filing record
     */
    private function createMissingFilingRecord(Organization $organization, ?string $taxYear): void
    {
        try {
            if (!Schema::hasTable('form_990_filings')) {
                Log::warning('form_990_filings table does not exist. Please run migrations.');
                return;
            }

            if (!$taxYear) {
                $taxYear = (string) Carbon::now()->year;
            }

            $dueDate = $this->calculateDueDate($taxYear);

            Form990Filing::updateOrCreate(
                [
                    'organization_id' => $organization->id,
                    'tax_year' => $taxYear,
                ],
                [
                    'form_type' => $organization->filing_req ?? '990',
                    'filing_date' => null,
                    'is_filed' => false,
                    'due_date' => $dueDate,
                    'extended_due_date' => null,
                    'is_extended' => false,
                    'last_checked_at' => now(),
                    'irs_data' => null,
                    'meta' => [
                        'source' => 'irs_check',
                        'reason' => 'no_filing_found',
                        'checked_at' => now()->toIso8601String(),
                    ],
                ]
            );
        } catch (\Exception $e) {
            Log::error("Error creating missing filing record for organization {$organization->id}: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Extract and store board members from IRS XML return data
     * 
     * @param string $ein
     * @param \SimpleXMLElement $return
     * @param string|null $taxYear
     * @return void
     */
    public function extractAndStoreBoardMembers(string $ein, $return, ?string $taxYear = null): void
    {
        try {
            if (!Schema::hasTable('irs_board_members')) {
                Log::warning('irs_board_members table does not exist. Please run migrations.');
                return;
            }

            // First try XPath extraction (more reliable for XML)
            $boardMembers = $this->extractBoardMembersFromXML($return);
            
            // If XPath didn't work, try array-based extraction
            if (empty($boardMembers)) {
                $returnArray = json_decode(json_encode($return), true);
                
                // IRS Form 990 structure varies, but board members are typically in:
                // - ReturnData/IRS990/Form990PartVIISectionAGrp (Form 990)
                // - ReturnData/IRS990EZ/Form990EZPartVIISectionAGrp (Form 990-EZ)
                // - ReturnData/IRS990PF/Form990PFPartVIISectionAGrp (Form 990-PF)
                
                $members = null;
                
                // Try to find board members in different form types
                if (isset($returnArray['ReturnData']['IRS990']['Form990PartVIISectionAGrp'])) {
                    $members = $returnArray['ReturnData']['IRS990']['Form990PartVIISectionAGrp'];
                } elseif (isset($returnArray['ReturnData']['IRS990EZ']['Form990EZPartVIISectionAGrp'])) {
                    $members = $returnArray['ReturnData']['IRS990EZ']['Form990EZPartVIISectionAGrp'];
                } elseif (isset($returnArray['ReturnData']['IRS990PF']['Form990PFPartVIISectionAGrp'])) {
                    $members = $returnArray['ReturnData']['IRS990PF']['Form990PFPartVIISectionAGrp'];
                }
                
                if ($members) {
                    $boardMembers = $this->normalizeBoardMemberArray($members);
                }
            }

            if (empty($boardMembers)) {
                Log::info("No board members found in IRS XML for EIN: {$ein}");
                return;
            }

            Log::info("Found " . count($boardMembers) . " board members for EIN: {$ein}");

            // Get current active board members for this EIN and tax year
            $currentActiveMembers = IrsBoardMember::forEin($ein)
                ->forTaxYear($taxYear)
                ->active()
                ->get()
                ->keyBy(function ($member) {
                    return strtolower(trim($member->name)) . '|' . strtolower(trim($member->position ?? ''));
                });

            // Process each board member from IRS data
            foreach ($boardMembers as $memberData) {
                $name = trim($memberData['name'] ?? '');
                $position = trim($memberData['position'] ?? '');
                
                if (empty($name)) {
                    continue;
                }

                $memberKey = strtolower($name) . '|' . strtolower($position);
                
                // Check if this member already exists
                $existingMember = IrsBoardMember::forEin($ein)
                    ->where('name', $name)
                    ->where('position', $position)
                    ->where('tax_year', $taxYear)
                    ->first();

                if ($existingMember) {
                    // Update existing member - mark as active if they were inactive
                    if ($existingMember->status !== 'active') {
                        $existingMember->reactivate();
                    }
                    
                    // Update IRS data
                    $existingMember->update([
                        'irs_data' => $memberData['irs_data'] ?? null,
                        'appointed_date' => $memberData['appointed_date'] ?? $existingMember->appointed_date,
                        'term_end_date' => $memberData['term_end_date'] ?? $existingMember->term_end_date,
                    ]);
                } else {
                    // Create new board member
                    IrsBoardMember::create([
                        'ein' => $ein,
                        'name' => $name,
                        'position' => $position ?: null,
                        'status' => 'active',
                        'tax_year' => $taxYear,
                        'appointed_date' => $memberData['appointed_date'] ?? null,
                        'term_end_date' => $memberData['term_end_date'] ?? null,
                        'irs_data' => $memberData['irs_data'] ?? null,
                    ]);
                }

                // Remove from current active list (so we know who's still active)
                $currentActiveMembers->forget($memberKey);
            }

            // Mark members not found in current filing as inactive (but don't delete)
            foreach ($currentActiveMembers as $inactiveMember) {
                if ($inactiveMember->status === 'active') {
                    $inactiveMember->markAsInactive('Not found in latest IRS filing for tax year ' . $taxYear);
                    Log::info("Marked board member as inactive: {$inactiveMember->name} (EIN: {$ein})");
                }
            }

        } catch (\Exception $e) {
            Log::error("Error extracting board members for EIN {$ein}: " . $e->getMessage());
        }
    }

    /**
     * Normalize board member array (handle both single and multiple members)
     */
    private function normalizeBoardMemberArray($members): array
    {
        if (empty($members)) {
            return [];
        }

        $normalized = [];
        
        // Handle numeric array (multiple members)
        if (isset($members[0])) {
            foreach ($members as $member) {
                $normalized[] = $this->extractMemberData($member);
            }
        } else {
            // Single member
            $normalized[] = $this->extractMemberData($members);
        }

        return array_filter($normalized, function($member) {
            return !empty($member['name']);
        });
    }

    /**
     * Extract member data from array structure
     */
    private function extractMemberData($member): array
    {
        if (!is_array($member)) {
            return [];
        }

        $name = '';
        $position = '';
        $appointedDate = null;
        $termEndDate = null;

        // Try different field names for name
        $nameFields = ['PersonNm', 'Name', 'PersonName', 'OfficerNm', 'DirectorNm'];
        foreach ($nameFields as $field) {
            if (isset($member[$field])) {
                $name = is_array($member[$field]) ? ($member[$field]['@value'] ?? '') : (string) $member[$field];
                break;
            }
        }

        // Try different field names for position/title
        $positionFields = ['Title', 'Position', 'TitleTxt', 'OfficerTitle', 'DirectorTitle'];
        foreach ($positionFields as $field) {
            if (isset($member[$field])) {
                $position = is_array($member[$field]) ? ($member[$field]['@value'] ?? '') : (string) $member[$field];
                break;
            }
        }

        // Try to extract dates
        if (isset($member['AppointedDt'])) {
            $appointedDate = $this->parseDate((string) $member['AppointedDt']);
        }
        if (isset($member['TermEndDt'])) {
            $termEndDate = $this->parseDate((string) $member['TermEndDt']);
        }

        return [
            'name' => trim($name),
            'position' => trim($position),
            'appointed_date' => $appointedDate,
            'term_end_date' => $termEndDate,
            'irs_data' => $member,
        ];
    }

    /**
     * Extract board members using XPath (alternative method)
     * Based on actual IRS XML structure: ReturnData > IRS990 > Form990PartVIISectionAGrp
     */
    private function extractBoardMembersFromXML($return): array
    {
        $members = [];
        
        try {
            // Register namespaces
            $namespaces = $return->getNamespaces(true);
            $defaultNs = $namespaces[''] ?? 'http://www.irs.gov/efile';
            $return->registerXPathNamespace('irs', $defaultNs);

            // Try different paths based on actual IRS structure
            $found = null;
            
            // Method 1: Direct path - ReturnData > IRS990 > Form990PartVIISectionAGrp
            if (isset($return->ReturnData->IRS990->Form990PartVIISectionAGrp)) {
                $found = $return->ReturnData->IRS990->Form990PartVIISectionAGrp;
                Log::debug("    Found via: ReturnData->IRS990->Form990PartVIISectionAGrp");
            }
            // Method 2: ReturnData > IRS990EZ > Form990EZPartVIISectionAGrp
            elseif (isset($return->ReturnData->IRS990EZ->Form990EZPartVIISectionAGrp)) {
                $found = $return->ReturnData->IRS990EZ->Form990EZPartVIISectionAGrp;
                Log::debug("    Found via: ReturnData->IRS990EZ->Form990EZPartVIISectionAGrp");
            }
            // Method 3: ReturnData > IRS990PF > Form990PFPartVIISectionAGrp
            elseif (isset($return->ReturnData->IRS990PF->Form990PFPartVIISectionAGrp)) {
                $found = $return->ReturnData->IRS990PF->Form990PFPartVIISectionAGrp;
                Log::debug("    Found via: ReturnData->IRS990PF->Form990PFPartVIISectionAGrp");
            }
            // Method 4: XPath search
            else {
                $xpaths = [
                    './/irs:Form990PartVIISectionAGrp',
                    './/irs:Form990EZPartVIISectionAGrp',
                    './/irs:Form990PFPartVIISectionAGrp',
                    './/Form990PartVIISectionAGrp',
                    './/Form990EZPartVIISectionAGrp',
                    './/Form990PFPartVIISectionAGrp',
                    '//irs:ReturnData//irs:IRS990//irs:Form990PartVIISectionAGrp',
                    '//ReturnData//IRS990//Form990PartVIISectionAGrp',
                ];
                
                foreach ($xpaths as $xpath) {
                    try {
                        $found = $return->xpath($xpath);
                        if ($found && count($found) > 0) {
                            Log::debug("    Found via XPath: {$xpath}");
                            break;
                        }
                    } catch (\Exception $e) {
                        continue;
                    }
                }
            }

            if (empty($found)) {
                Log::debug("    No board members found in this return");
                return $members;
            }

            // Normalize to array
            $foundArray = is_array($found) ? $found : [$found];
            
            Log::info("    Found " . count($foundArray) . " board member record(s)");
            
            foreach ($foundArray as $member) {
                // Get name - IRS uses PersonNm
                $name = '';
                if (isset($member->PersonNm)) {
                    $name = (string) $member->PersonNm;
                } elseif (isset($member->Name)) {
                    $name = (string) $member->Name;
                } elseif (isset($member->PersonName)) {
                    $name = (string) $member->PersonName;
                }
                
                // Get position/title - IRS uses TitleTxt
                $position = '';
                if (isset($member->TitleTxt)) {
                    $position = (string) $member->TitleTxt;
                } elseif (isset($member->Title)) {
                    $position = (string) $member->Title;
                } elseif (isset($member->Position)) {
                    $position = (string) $member->Position;
                }
                
                if (!empty($name)) {
                    // IRS XML doesn't always have dates, so these may be null
                    $appointedDate = isset($member->AppointedDt) ? $this->parseDate((string) $member->AppointedDt) : null;
                    $termEndDate = isset($member->TermEndDt) ? $this->parseDate((string) $member->TermEndDt) : null;
                    
                    $members[] = [
                        'name' => trim($name),
                        'position' => trim($position),
                        'appointed_date' => $appointedDate,
                        'term_end_date' => $termEndDate,
                        'irs_data' => json_decode(json_encode($member), true),
                    ];
                    
                    Log::debug("      - {$name} ({$position})");
                }
            }
            
        } catch (\Exception $e) {
            Log::warning("XPath extraction failed: " . $e->getMessage());
            Log::warning("Stack trace: " . $e->getTraceAsString());
        }

        return $members;
    }

    /**
     * Sync board members for a specific organization
     * 
     * @param string $ein
     * @param string|null $taxYear
     * @return array
     */
    public function syncBoardMembersForOrganization(string $ein, ?string $taxYear = null): array
    {
        $results = [
            'processed' => 0,
            'created' => 0,
            'updated' => 0,
            'inactivated' => 0,
            'errors' => 0,
        ];

        try {
            if (!Schema::hasTable('irs_board_members')) {
                Log::warning('irs_board_members table does not exist. Please run migrations.');
                return $results;
            }

            if (!$taxYear) {
                $taxYear = static::defaultTaxYearForIrsData();
            }

            $cleanEIN = preg_replace('/[^0-9]/', '', $ein);

            // Get counts before sync
            $beforeActiveCount = IrsBoardMember::forEin($cleanEIN)
                ->forTaxYear($taxYear)
                ->active()
                ->count();

            // Search for this EIN in XML files and extract board members
            $dataDir = storage_path("app/irs-data/{$taxYear}");
            $xmlFiles = [];
            
            if (is_dir($dataDir)) {
                $xmlFiles = array_filter(glob("{$dataDir}/*.xml"), function($file) {
                    return strpos($file, 'zips') === false;
                });
            }

            if (empty($xmlFiles)) {
                Log::warning("No XML files found for year {$taxYear}. Cannot sync board members for EIN {$ein}");
                return $results;
            }

            // Search through XML files for this specific EIN
            $found = false;
            foreach ($xmlFiles as $xmlPath) {
                try {
                    $xml = @simplexml_load_file($xmlPath);
                    
                    if (!$xml) {
                        continue;
                    }

                    // Search for the EIN in this XML file
                    foreach ($xml->xpath('//Return') as $return) {
                        $returnEIN = (string) ($return->ReturnHeader->Filer->EIN ?? $return->EIN ?? '');
                        $cleanReturnEIN = preg_replace('/[^0-9]/', '', $returnEIN);
                        
                        if ($cleanReturnEIN === $cleanEIN) {
                            Log::info("Found EIN {$ein} in XML file: " . basename($xmlPath));
                
                            // Extract tax year from return
                            $returnTaxYear = (string) ($return->ReturnHeader->TaxYear ?? $return->TaxYr ?? $taxYear);
                            
                            // Extract and store board members
                            $memberStats = $this->extractAndStoreBoardMembersBulk($cleanEIN, $return, $returnTaxYear);
                            
                            $results['processed'] = 1;
                            $results['created'] = $memberStats['created'];
                            $results['updated'] = $memberStats['updated'];
                            $results['inactivated'] = $memberStats['inactivated'];
                            
                            $found = true;
                            break 2; // Break out of both loops
                        }
                    }
                } catch (\Exception $e) {
                    Log::error("Error processing XML file {$xmlPath} for EIN {$ein}: " . $e->getMessage());
                    continue;
                }
            }

            if (!$found) {
                Log::warning("EIN {$ein} not found in any XML files for tax year {$taxYear}");
                $results['errors']++;
            }

        } catch (\Exception $e) {
            Log::error("Error syncing board members for EIN {$ein}: " . $e->getMessage());
            $results['errors']++;
        }

        return $results;
    }

    /**
     * Check and update expired board member terms
     * This should be run periodically (e.g., via cron)
     */
    public function updateExpiredBoardMemberTerms(): int
    {
        $expiredCount = 0;

        try {
            $expiredMembers = IrsBoardMember::where('status', 'active')
                ->whereNotNull('term_end_date')
                ->where('term_end_date', '<', now())
                ->get();

            foreach ($expiredMembers as $member) {
                $member->markAsExpired();
                $expiredCount++;
                Log::info("Marked board member as expired: {$member->name} (EIN: {$member->ein}, Term ended: {$member->term_end_date})");
            }

        } catch (\Exception $e) {
            Log::error("Error updating expired board member terms: " . $e->getMessage());
        }

        return $expiredCount;
    }

    /**
     * Verify board members for a specific organization by EIN
     * This is called after IRS board members are synced for that EIN
     * 
     * @param string $ein Organization EIN
     * @param string|null $taxYear Tax year to verify against
     * @return void
     */
    private function verifyOrganizationBoardMembers(string $ein, ?string $taxYear = null): void
    {
        try {
            if (!$taxYear) {
                $taxYear = static::defaultTaxYearForIrsData();
            }

            // Normalize EIN (remove dashes and spaces)
            $cleanEIN = preg_replace('/[^0-9]/', '', $ein);
            
            // Find organization by EIN
            $organization = Organization::whereRaw("REPLACE(REPLACE(ein, '-', ''), ' ', '') = ?", [$cleanEIN])
                ->first();

            if (!$organization) {
                Log::debug("Organization not found for EIN: {$ein} (clean: {$cleanEIN}) - skipping verification");
                return;
            }

            Log::info("=== Verifying board members for organization: {$organization->name} (EIN: {$ein}) ===");
            Log::info("Clean EIN: {$cleanEIN} - Fetching IRS board members by EIN only (no tax year filter)");

            // Get ALL active IRS board members for this EIN ONLY (no tax year filter)
            $irsBoardMembers = IrsBoardMember::where('ein', $cleanEIN)
                ->where('status', 'active')
                ->get();

            // Log IRS board members found (all tax years)
            Log::info("Active IRS board members for EIN {$cleanEIN} (all tax years): " . $irsBoardMembers->count());
            foreach ($irsBoardMembers as $irsMember) {
                Log::info("  IRS Active Member: Name='{$irsMember->name}', Position='{$irsMember->position}', Status='{$irsMember->status}', TaxYear='{$irsMember->tax_year}'");
            }

            if ($irsBoardMembers->isEmpty()) {
                Log::warning("No ACTIVE IRS board members found for EIN {$ein} (all tax years) - marking all as not_found");
                
                // Check if there are any inactive IRS members
                $allIrsForEin = IrsBoardMember::forEin($cleanEIN)->get();
                if ($allIrsForEin->isNotEmpty()) {
                    Log::info("However, found " . $allIrsForEin->count() . " IRS board members in database for EIN {$cleanEIN} (all tax years and statuses):");
                    foreach ($allIrsForEin as $irsMember) {
                        Log::info("  IRS Record: Name='{$irsMember->name}', Position='{$irsMember->position}', Status='{$irsMember->status}', TaxYear='{$irsMember->tax_year}', Created='{$irsMember->created_at}'");
                    }
                } else {
                    Log::warning("No IRS board members found in database at all for EIN {$cleanEIN}");
                }
                
                // Get organization's board members to show what we have
                $boardMembers = $organization->boardMembers()->with('user')->get();
                Log::info("Organization has " . $boardMembers->count() . " board members in database:");
                foreach ($boardMembers as $bm) {
                    Log::info("  DB Member: Name='{$bm->user->name}', Position='{$bm->position}', Current Status='{$bm->verification_status}', Active='{$bm->is_active}'");
                }
                
                // Mark all board members as not found and deactivate
                $organization->boardMembers()->each(function ($boardMember) {
                    $boardMember->update([
                        'verification_status' => 'not_found',
                        'is_active' => false, // Deactivate when no IRS data
                        'verified_at' => now(),
                        'verification_notes' => "No active IRS board members found in database (checked all tax years)",
                    ]);
                });
                return;
            }

            // Get organization's board members
            $boardMembers = $organization->boardMembers()->with('user')->get();
            
            Log::info("Organization has " . $boardMembers->count() . " board members in database:");
            foreach ($boardMembers as $bm) {
                Log::info("  DB Member: Name='{$bm->user->name}', Position='{$bm->position}', Current Status='{$bm->verification_status}', Active='{$bm->is_active}'");
            }

            Log::info("Starting name comparison (exact match, case-insensitive, ALL tax years):");
            foreach ($boardMembers as $boardMember) {
                $userName = $boardMember->user->name ?? '';
                $userPosition = $boardMember->position ?? '';
                
                Log::info("Checking board member: '{$userName}' (Position: '{$userPosition}')");
                
                // Check if name matches exactly (case-insensitive) - check ALL tax years
                $nameMatch = false;
                $matchedIrsMember = null;
                $userNameLower = strtolower(trim($userName));
                
                Log::info("  Comparing: '{$userNameLower}' against IRS members (all tax years)...");
                
                foreach ($irsBoardMembers as $irsMember) {
                    $irsNameLower = strtolower(trim($irsMember->name));
                    Log::info("    vs IRS (TaxYear={$irsMember->tax_year}): '{$irsNameLower}' (Position: '{$irsMember->position}')");
                    
                    if ($userNameLower === $irsNameLower) {
                        $nameMatch = true;
                        $matchedIrsMember = $irsMember;
                        Log::info("    ✓ MATCH FOUND! User name '{$userNameLower}' matches IRS name '{$irsNameLower}' (TaxYear: {$irsMember->tax_year})");
                        break;
                    }
                }
                
                if ($nameMatch && $matchedIrsMember) {
                    // Verified - name matches exactly, ensure member is active
                    $oldStatus = $boardMember->verification_status;
                    $oldActive = $boardMember->is_active;
                    $matchedTaxYear = $matchedIrsMember->tax_year;
                    
                    // Always update verification status when match is found - use direct property assignment to ensure it saves
                    $boardMember->verification_status = 'verified';
                    $boardMember->is_active = true;
                    $boardMember->verified_at = now();
                    $boardMember->verification_notes = "Verified against IRS Form 990. Name matched in IRS data (Tax Year: {$matchedTaxYear}).";
                    $saved = $boardMember->save();
                    
                    Log::info("  ✓ VERIFIED and ACTIVATED: '{$userName}' - Status changed from '{$oldStatus}'/'{$oldActive}' to 'verified'/true (matched in tax year {$matchedTaxYear})");
                    Log::info("  ✓ Save result: " . ($saved ? 'SUCCESS' : 'FAILED'));
                    
                    // Reload from database to verify update persisted
                    $boardMember->refresh();
                    Log::info("  ✓ Current verification_status after save: '{$boardMember->verification_status}', is_active: " . ($boardMember->is_active ? 'true' : 'false'));
                    
                    // Double check by querying database directly
                    $dbCheck = DB::table('board_members')->where('id', $boardMember->id)->first();
                    if ($dbCheck) {
                        Log::info("  ✓ Database check - verification_status: '{$dbCheck->verification_status}', is_active: " . ($dbCheck->is_active ? '1' : '0'));
                    }
                } else {
                    // Not found in IRS data
                    Log::info("  ✗ NO MATCH: '{$userName}' not found in IRS data (checked all tax years)");
                    
                    $oldStatus = $boardMember->verification_status;
                    $oldActive = $boardMember->is_active;
                    
                    $boardMember->update([
                        'verification_status' => 'not_found',
                        'verified_at' => now(),
                        'verification_notes' => "Not found in IRS Form 990 data. Name does not match any active board members in IRS filing (checked all tax years).",
                    ]);
                    
                    // Deactivate not found members
                    if ($boardMember->is_active) {
                        $boardMember->update(['is_active' => false]);
                        Log::info("  ✗ DEACTIVATED: '{$userName}' - Status changed from '{$oldStatus}'/true to 'not_found'/false");
                    } else {
                        Log::info("  ✗ NOT FOUND (already inactive): '{$userName}' - Status: '{$oldStatus}'/false");
                    }
                }
            }

            Log::info("Completed verification for organization: {$organization->name} (EIN: {$ein})");

        } catch (\Exception $e) {
            Log::error("Error verifying board members for EIN {$ein}: " . $e->getMessage());
            Log::error("Stack trace: " . $e->getTraceAsString());
        }
    }

    /**
     * Verify board members against IRS data (batch verification for all organizations)
     * Compares board_members table with irs_board_members table
     * Updates verification status and deactivates mismatched members
     * 
     * @param string|null $ein If provided, only verify for this organization
     * @param string|null $taxYear Tax year to verify against (default: current year)
     * @return array Statistics about verification
     */
    public function verifyBoardMembersAgainstIRS(?string $ein = null, ?string $taxYear = null): array
    {
        $stats = [
            'verified' => 0,
            'not_found' => 0,
            'deactivated' => 0,
        ];

        try {
            if (!$taxYear) {
                $taxYear = static::defaultTaxYearForIrsData();
            }

            // Get all organizations to verify
            $organizations = Organization::whereNotNull('ein')
                ->when($ein, function ($query) use ($ein) {
                    $cleanEIN = preg_replace('/[^0-9]/', '', $ein);
                    // Use normalized lookup to match EINs with or without dashes
                    return $query->whereRaw("REPLACE(REPLACE(ein, '-', ''), ' ', '') = ?", [$cleanEIN]);
                })
                ->get();

            foreach ($organizations as $organization) {
                $cleanEIN = preg_replace('/[^0-9]/', '', $organization->ein);
                
                Log::info("=== Verifying organization: {$organization->name} (EIN: {$cleanEIN}) ===");
                Log::info("Tax Year: {$taxYear}, Clean EIN: {$cleanEIN}");
                
                // Get ALL IRS board members for this EIN (any tax year) to see what we have
                $allIrsMembers = IrsBoardMember::forEin($cleanEIN)->get();
                Log::info("Total IRS board members in database for EIN {$cleanEIN} (all tax years): " . $allIrsMembers->count());
                foreach ($allIrsMembers as $irsMember) {
                    Log::info("  IRS DB Record: ID={$irsMember->id}, Name='{$irsMember->name}', Position='{$irsMember->position}', Status='{$irsMember->status}', TaxYear='{$irsMember->tax_year}', Created='{$irsMember->created_at}'");
                }
                
                // Get IRS board members for this organization for the SPECIFIC tax year
                // Only use IRS data that was synced for this exact tax year
                // Fetch IRS board members by EIN ONLY (no tax year filter)
                $irsBoardMembers = IrsBoardMember::where('ein', $cleanEIN)
                    ->where('status', 'active')
                    ->get();

                // Log IRS board members found (by EIN only, all tax years)
                Log::info("Active IRS board members for EIN {$cleanEIN} (by EIN only): " . $irsBoardMembers->count());
                foreach ($irsBoardMembers as $irsMember) {
                    Log::info("  IRS Active Member: Name='{$irsMember->name}', Position='{$irsMember->position}', Status='{$irsMember->status}', TaxYear='{$irsMember->tax_year}'");
                }

                // If no active IRS board members found for this EIN (all tax years), mark all as not_found
                if ($irsBoardMembers->isEmpty()) {
                    Log::warning("No ACTIVE IRS board members found for EIN {$cleanEIN} (all tax years) - marking all as not_found");
                    
                    // Check if there are any inactive IRS members
                    $allIrsMembers = IrsBoardMember::forEin($cleanEIN)->get();
                    if ($allIrsMembers->isNotEmpty()) {
                        Log::info("However, found " . $allIrsMembers->count() . " IRS board members in database for EIN {$cleanEIN} (all tax years and statuses):");
                        foreach ($allIrsMembers as $irsMember) {
                            Log::info("  IRS Record: Name='{$irsMember->name}', Position='{$irsMember->position}', Status='{$irsMember->status}', TaxYear='{$irsMember->tax_year}', Created='{$irsMember->created_at}'");
                        }
                    } else {
                        Log::warning("No IRS board members found in database at all for EIN {$cleanEIN}");
                    }
                    
                    // Get organization's board members to show what we have
                    $boardMembers = $organization->boardMembers()->with('user')->get();
                    Log::info("Organization has " . $boardMembers->count() . " board members in database:");
                    foreach ($boardMembers as $bm) {
                        Log::info("  DB Member: Name='{$bm->user->name}', Position='{$bm->position}', Current Status='{$bm->verification_status}', Active='{$bm->is_active}'");
                    }
                    
                    $organization->boardMembers()->each(function ($boardMember) use (&$stats) {
                        $boardMember->update([
                            'verification_status' => 'not_found',
                            'verified_at' => now(),
                            'verification_notes' => "No active IRS board members found in database (checked all tax years).",
                        ]);
                        
                        // Deactivate not found members
                        if ($boardMember->is_active) {
                            $boardMember->update(['is_active' => false]);
                            $stats['deactivated']++;
                            
                            // Note: History not recorded for system actions - verification_notes contains this information
                        }
                        $stats['not_found']++;
                    });
                    continue; // Skip to next organization
                }

                // Get organization's board members
                $boardMembers = $organization->boardMembers()->with('user')->get();
                
                Log::info("Organization has " . $boardMembers->count() . " board members in database:");
                foreach ($boardMembers as $bm) {
                    Log::info("  DB Member: Name='{$bm->user->name}', Position='{$bm->position}', Current Status='{$bm->verification_status}', Active='{$bm->is_active}'");
                }

                Log::info("Starting name comparison (exact match, case-insensitive, ALL tax years) for EIN {$cleanEIN}:");
                foreach ($boardMembers as $boardMember) {
                    $userName = $boardMember->user->name ?? '';
                    $userPosition = $boardMember->position ?? '';
                    
                    Log::info("Checking board member: '{$userName}' (Position: '{$userPosition}')");
                    
                    // Check if name matches exactly (case-insensitive) - check ALL tax years
                    $nameMatch = false;
                    $matchedIrsMember = null;
                    $userNameLower = strtolower(trim($userName));
                    
                    Log::info("  Comparing: '{$userNameLower}' against IRS members (all tax years)...");
                    
                    foreach ($irsBoardMembers as $irsMember) {
                        $irsNameLower = strtolower(trim($irsMember->name));
                        Log::info("    vs IRS (TaxYear={$irsMember->tax_year}): '{$irsNameLower}' (Position: '{$irsMember->position}')");
                        
                        if ($userNameLower === $irsNameLower) {
                            $nameMatch = true;
                            $matchedIrsMember = $irsMember;
                            Log::info("    ✓ MATCH FOUND! User name '{$userNameLower}' matches IRS name '{$irsNameLower}' (TaxYear: {$irsMember->tax_year})");
                            break;
                        }
                    }
                    
                    if ($nameMatch && $matchedIrsMember) {
                        // Verified - name matches exactly, ensure member is active
                        $oldStatus = $boardMember->verification_status;
                        $oldActive = $boardMember->is_active;
                        $matchedTaxYear = $matchedIrsMember->tax_year;
                        
                        // Always update verification status when match is found - use direct property assignment to ensure it saves
                        $boardMember->verification_status = 'verified';
                        $boardMember->is_active = true;
                        $boardMember->verified_at = now();
                        $boardMember->verification_notes = "Verified against IRS Form 990. Name matched in IRS data (Tax Year: {$matchedTaxYear}).";
                        $saved = $boardMember->save();
                        
                        $stats['verified']++;
                        Log::info("  ✓ VERIFIED and ACTIVATED: '{$userName}' - Status changed from '{$oldStatus}'/'{$oldActive}' to 'verified'/true (matched in tax year {$matchedTaxYear}, EIN: {$cleanEIN})");
                        Log::info("  ✓ Save result: " . ($saved ? 'SUCCESS' : 'FAILED'));
                        
                        // Reload from database to verify update persisted
                        $boardMember->refresh();
                        Log::info("  ✓ Current verification_status after save: '{$boardMember->verification_status}', is_active: " . ($boardMember->is_active ? 'true' : 'false'));
                        
                        // Double check by querying database directly
                        $dbCheck = \DB::table('board_members')->where('id', $boardMember->id)->first();
                        Log::info("  ✓ Database check - verification_status: '{$dbCheck->verification_status}', is_active: " . ($dbCheck->is_active ? '1' : '0'));
                    } else {
                        // Not found in IRS data (all tax years)
                        Log::info("  ✗ NO MATCH: '{$userName}' not found in IRS data (checked all tax years)");
                        
                        $oldStatus = $boardMember->verification_status;
                        $oldActive = $boardMember->is_active;
                        
                        $boardMember->update([
                            'verification_status' => 'not_found',
                            'verified_at' => now(),
                            'verification_notes' => "Not found in IRS Form 990 data. Name does not match any active board members in IRS filing (checked all tax years).",
                        ]);
                        
                        // Deactivate not found members
                        if ($boardMember->is_active) {
                            $boardMember->update(['is_active' => false]);
                            $stats['deactivated']++;
                            
                            // Note: History not recorded for system actions - verification_notes contains this information
                            Log::info("  ✗ DEACTIVATED: '{$userName}' - Status changed from '{$oldStatus}'/true to 'not_found'/false (EIN: {$cleanEIN})");
                        } else {
                            Log::info("  ✗ NOT FOUND (already inactive): '{$userName}' - Status: '{$oldStatus}'/false (EIN: {$cleanEIN})");
                        }
                        $stats['not_found']++;
                    }
                }
                
                Log::info("=== Completed verification for organization: {$organization->name} (EIN: {$cleanEIN}) ===");
            }

        } catch (\Exception $e) {
            Log::error("Error verifying board members against IRS: " . $e->getMessage());
        }

        return $stats;
    }

    /**
     * Normalize name for comparison (remove extra spaces, lowercase, trim)
     */
    private function normalizeName(string $name): string
    {
        return strtolower(trim(preg_replace('/\s+/', ' ', $name)));
    }

    /**
     * Normalize position for comparison
     */
    private function normalizePosition(string $position): string
    {
        return strtolower(trim(preg_replace('/\s+/', ' ', $position)));
    }

    /**
     * Check if names match (with fuzzy matching)
     */
    private function namesMatch(string $name1, string $name2): bool
    {
        // Exact match
        if ($name1 === $name2) {
            return true;
        }
        
        // Similarity check (85% or higher)
        $similarity = 0;
        similar_text($name1, $name2, $similarity);
        
        return $similarity >= 85;
    }

    /**
     * Fuzzy match board member against IRS data
     * Returns array with 'matched' boolean and 'member' if matched
     */
    private function fuzzyMatchBoardMember(string $normalizedName, string $normalizedPosition, $irsBoardMembers): array
    {
        foreach ($irsBoardMembers as $irsMember) {
            $irsName = $this->normalizeName($irsMember->name);
            $irsPosition = $this->normalizePosition($irsMember->position ?? '');
            
            // Check if both name and position match with fuzzy logic
            if ($this->namesMatch($normalizedName, $irsName) && 
                $this->namesMatch($normalizedPosition, $irsPosition)) {
                return ['matched' => true, 'member' => $irsMember];
            }
        }
        
        return ['matched' => false, 'member' => null];
    }
}

