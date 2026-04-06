<?php

namespace App\Services;

use App\Models\NonprofitVerification;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NonprofitVerificationService
{
    protected $propublicaApiKey;

    public function __construct()
    {
        $this->propublicaApiKey = config('services.propublica.api_key');
    }

    public function verifyOwnership(NonprofitVerification $verification, string $state)
    {
        try {
            // Step 1: Get organization data from ProPublica API
            $orgData = $this->getOrganizationFromProPublica($verification->ein);
            
            if (!$orgData) {
                return $this->markAsFailed($verification, 'Organization not found in IRS records');
            }

            // Step 2: Check if organization name matches
            $orgNameMatches = $this->checkOrganizationNameMatch(
                $verification->organization_legal_name, 
                $orgData['organization']['name']
            );

            // Step 3: Get officers list from Form 990
            $officers = $this->getOfficersFromForm990($verification->ein, $orgData);
            
            // Step 4: Check if user name matches any officer
            $nameMatches = $this->checkNameMatches($verification->manager_name, $officers);

            // Step 5: Calculate verification score and determine status
            $score = $this->calculateVerificationScore($orgNameMatches, $nameMatches, $officers);
            
            // Step 6: Update verification record
            $verification->update([
                'nonprofit_exists' => true,
                'nonprofit_in_good_standing' => $orgData['organization']['ruling_date'] ? true : false,
                'name_matches_public_records' => $nameMatches['matches_any'],
                'manager_listed_as_officer' => $nameMatches['matches_any'],
                'profile_name_matches_ceo' => $nameMatches['matches_ceo'],
                'profile_name_matches_any_officer' => $nameMatches['matches_any'],
                'profile_name_matches_organization_name' => $orgNameMatches,
                'propublica_data' => $orgData,
                'officers_list' => $officers,
                'ceo_info' => $this->findCEO($officers),
                'compliance_score' => $score,
                'verification_status' => $this->determineVerificationStatus($score, $orgNameMatches, $nameMatches),
                'verification_notes' => $this->generateVerificationNotes($orgNameMatches, $nameMatches, $officers),
                'fraud_flags' => $this->generateFraudFlags($orgNameMatches, $nameMatches),
                'verified_at' => $score >= 80 ? now() : null,
            ]);

            return $verification;

        } catch (\Exception $e) {
            Log::error('Verification failed: ' . $e->getMessage());
            return $this->markAsFailed($verification, 'System error during verification');
        }
    }

    protected function getOrganizationFromProPublica($ein)
    {
        try {
            $response = Http::withHeaders([
                'X-API-Key' => $this->propublicaApiKey,
            ])->get("https://projects.propublica.org/nonprofits/api/v2/organizations/{$ein}.json");

            if ($response->successful()) {
                return $response->json();
            }

            return null;
        } catch (\Exception $e) {
            Log::error('ProPublica API error: ' . $e->getMessage());
            return null;
        }
    }

    protected function getOfficersFromForm990($ein, $orgData)
    {
        try {
            // Get the latest filing
            if (!isset($orgData['filings_with_data']) || empty($orgData['filings_with_data'])) {
                return [];
            }

            $latestFiling = $orgData['filings_with_data'][0];
            $filingUrl = $latestFiling['pdf_url'] ?? null;

            if (!$filingUrl) {
                return [];
            }

            // Get officers data from the filing
            $response = Http::withHeaders([
                'X-API-Key' => $this->propublicaApiKey,
            ])->get("https://projects.propublica.org/nonprofits/api/v2/organizations/{$ein}/{$latestFiling['tax_prd']}.json");

            if ($response->successful()) {
                $filingData = $response->json();
                return $this->extractOfficersFromFiling($filingData);
            }

            return [];
        } catch (\Exception $e) {
            Log::error('Error getting officers from Form 990: ' . $e->getMessage());
            return [];
        }
    }

    protected function extractOfficersFromFiling($filingData)
    {
        $officers = [];

        // Extract officers from different sections of Form 990
        if (isset($filingData['officers'])) {
            foreach ($filingData['officers'] as $officer) {
                $officers[] = [
                    'name' => $officer['name'] ?? '',
                    'title' => $officer['title'] ?? '',
                    'compensation' => $officer['compensation'] ?? 0,
                    'is_ceo' => $this->isCEOTitle($officer['title'] ?? ''),
                ];
            }
        }

        // Also check key employees section
        if (isset($filingData['key_employees'])) {
            foreach ($filingData['key_employees'] as $employee) {
                $officers[] = [
                    'name' => $employee['name'] ?? '',
                    'title' => $employee['title'] ?? '',
                    'compensation' => $employee['compensation'] ?? 0,
                    'is_ceo' => $this->isCEOTitle($employee['title'] ?? ''),
                ];
            }
        }

        return $officers;
    }

    protected function checkOrganizationNameMatch($userOrgName, $irsOrgName)
    {
        // Normalize names for comparison
        $userNormalized = strtolower(trim($userOrgName));
        $irsNormalized = strtolower(trim($irsOrgName));

        // Exact match
        if ($userNormalized === $irsNormalized) {
            return true;
        }

        // Similarity check (80% or higher)
        $similarity = 0;
        similar_text($userNormalized, $irsNormalized, $similarity);
        
        return $similarity >= 80;
    }

    protected function checkNameMatches($userName, $officers)
    {
        $matches = [
            'matches_any' => false,
            'matches_ceo' => false,
            'matched_officers' => [],
        ];

        $userNameNormalized = strtolower(trim($userName));

        foreach ($officers as $officer) {
            $officerNameNormalized = strtolower(trim($officer['name']));
            
            // Check for name similarity
            $similarity = 0;
            similar_text($userNameNormalized, $officerNameNormalized, $similarity);
            
            if ($similarity >= 70) { // 70% similarity threshold
                $matches['matches_any'] = true;
                $matches['matched_officers'][] = $officer;
                
                if ($officer['is_ceo'] || $this->isCEOTitle($officer['title'])) {
                    $matches['matches_ceo'] = true;
                }
            }
        }

        return $matches;
    }

    protected function isCEOTitle($title)
    {
        $ceoTitles = [
            'ceo', 'chief executive officer', 'president', 'executive director',
            'chief executive', 'president & ceo', 'president/ceo'
        ];

        $titleLower = strtolower(trim($title));
        
        foreach ($ceoTitles as $ceoTitle) {
            if (strpos($titleLower, $ceoTitle) !== false) {
                return true;
            }
        }

        return false;
    }

    protected function findCEO($officers)
    {
        foreach ($officers as $officer) {
            if ($officer['is_ceo'] || $this->isCEOTitle($officer['title'])) {
                return $officer;
            }
        }

        // If no CEO found, return the first officer with highest compensation
        if (!empty($officers)) {
            usort($officers, function($a, $b) {
                return $b['compensation'] <=> $a['compensation'];
            });
            return $officers[0];
        }

        return null;
    }

    protected function calculateVerificationScore($orgNameMatches, $nameMatches, $officers)
    {
        $score = 0;

        // Organization name match (30 points)
        if ($orgNameMatches) {
            $score += 30;
        }

        // Name matches CEO (40 points)
        if ($nameMatches['matches_ceo']) {
            $score += 40;
        }
        // Name matches any officer (25 points)
        elseif ($nameMatches['matches_any']) {
            $score += 25;
        }

        // Officers list found (20 points)
        if (!empty($officers)) {
            $score += 20;
        }

        // Organization exists in IRS (10 points)
        $score += 10;

        return min($score, 100); // Cap at 100
    }

    protected function determineVerificationStatus($score, $orgNameMatches, $nameMatches)
    {
        // Verified if score is 80 or higher
        if ($score >= 80) {
            return 'verified';
        }

        // Fraud flagged if no name matches at all
        if (!$nameMatches['matches_any'] && !$orgNameMatches) {
            return 'flagged_fraud';
        }

        // Rejected if score is too low
        if ($score < 50) {
            return 'rejected';
        }

        return 'pending';
    }

    protected function generateVerificationNotes($orgNameMatches, $nameMatches, $officers)
    {
        $notes = [];

        if ($orgNameMatches) {
            $notes[] = 'Organization name matches IRS records';
        } else {
            $notes[] = 'Organization name does not match IRS records';
        }

        if ($nameMatches['matches_ceo']) {
            $notes[] = 'User name matches CEO/President in IRS records';
        } elseif ($nameMatches['matches_any']) {
            $notes[] = 'User name matches officer in IRS records';
        } else {
            $notes[] = 'User name does not match any officer in IRS records';
        }

        $notes[] = count($officers) . ' officers found in Form 990 filings';

        return implode('. ', $notes);
    }

    protected function generateFraudFlags($orgNameMatches, $nameMatches)
    {
        $flags = [];

        if (!$orgNameMatches) {
            $flags[] = 'Organization name mismatch with IRS records';
        }

        if (!$nameMatches['matches_any']) {
            $flags[] = 'User name not found in organization officer records';
        }

        return $flags;
    }

    protected function markAsFailed(NonprofitVerification $verification, $reason)
    {
        $verification->update([
            'verification_status' => 'rejected',
            'verification_notes' => $reason,
            'compliance_score' => 0,
        ]);

        return $verification;
    }
}
