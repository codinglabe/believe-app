<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\Form990Filing;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Schema;
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
     * Check Form 990 filing status for an organization by EIN
     * 
     * @param string $ein
     * @param string|null $taxYear
     * @return array|null
     */
    public function checkFilingStatus(string $ein, ?string $taxYear = null): ?array
    {
        try {
            // Clean EIN (remove dashes)
            $cleanEIN = preg_replace('/[^0-9]/', '', $ein);
            
            // If no tax year specified, use current year
            if (!$taxYear) {
                $taxYear = (string) Carbon::now()->year;
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
        // Check if we have cached XML files
        $xmlPath = storage_path("app/irs-data/{$taxYear}/form990.xml");
        
        if (!file_exists($xmlPath)) {
            Log::info("IRS XML file not found for year {$taxYear}. Please download from IRS.gov");
            return null;
        }

        // Parse XML file and search for EIN
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
                    return [
                        'ein' => $cleanReturnEIN,
                        'tax_year' => (string) $return->TaxYr ?? null,
                        'form_type' => (string) $return->FormType ?? '990',
                        'filing_date' => $this->parseDate((string) $return->FiledDt ?? null),
                        'is_filed' => true,
                        'irs_data' => json_decode(json_encode($return), true),
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
     * Download IRS Form 990 XML files
     * This should be run periodically to get the latest data
     */
    public function downloadIRSData(string $taxYear): bool
    {
        try {
            // IRS provides bulk data downloads
            // URL format may vary - check IRS.gov for current URLs
            $url = self::IRS_DATA_BASE_URL . "eo_{$taxYear}.xml";
            
            $response = Http::timeout(300)->get($url);
            
            if ($response->successful()) {
                $storagePath = "irs-data/{$taxYear}/form990.xml";
                Storage::put($storagePath, $response->body());
                
                Log::info("IRS data downloaded for year {$taxYear}");
                return true;
            }
            
            return false;
            
        } catch (\Exception $e) {
            Log::error("Failed to download IRS data for year {$taxYear}: " . $e->getMessage());
            return false;
        }
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

            Form990Filing::updateOrCreate(
                [
                    'organization_id' => $organization->id,
                    'tax_year' => $filingData['tax_year'] ?? Carbon::now()->year,
                ],
                [
                    'form_type' => $filingData['form_type'] ?? '990',
                    'filing_date' => $filingData['filing_date'] ?? null,
                    'is_filed' => $filingData['is_filed'] ?? true,
                    'last_checked_at' => now(),
                    'irs_data' => $filingData['irs_data'] ?? null,
                    'meta' => $filingData['meta'] ?? null,
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
                    'is_filed' => false,
                    'due_date' => $dueDate,
                    'last_checked_at' => now(),
                ]
            );
        } catch (\Exception $e) {
            Log::error("Error creating missing filing record for organization {$organization->id}: " . $e->getMessage());
            throw $e;
        }
    }
}

