<?php

namespace App\Services;

use App\Models\ExcelData;
use App\Models\ClassificationCode;
use App\Models\DeductibilityCode;
use App\Models\OrganizationTypeCode;
use App\Models\StatusCode;
use App\Models\NteeCode;
use Illuminate\Support\Facades\Log;

class EINLookupService
{
    public function lookupEIN($ein)
    {
        try {
            // Remove any formatting from EIN
            $cleanEIN = preg_replace('/[^0-9]/', '', $ein);

            // Search in all uploaded Excel data
            $results = $this->searchInExcelData($cleanEIN);

            if ($results->isEmpty()) {
                return null;
            }

            // Get the first matching result
            $data = $results->first();
            $rowData = $data->row_data;

            // Get header to map data correctly
            $header = ExcelData::getHeaderForFile($data->file_id);

            $organizationData = $this->mapDataToOrganization($rowData, $header);

            // Enhance with descriptive data from code tables
            return $this->enhanceWithCodeDescriptions($organizationData);

        } catch (\Exception $e) {
            Log::error('EIN Lookup Error: ' . $e->getMessage());
            return null;
        }
    }

    private function searchInExcelData($ein)
    {
        return ExcelData::where(function ($query) use ($ein) {
            // Search in first column (EIN column)
            $query->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(row_data, '$[0]')) = ?", [$ein])
                ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(row_data, '$[0]')) = ?", [
                    substr($ein, 0, 2) . '-' . substr($ein, 2)
                ]);
        })->get();
    }

    private function mapDataToOrganization($rowData, $header)
    {
        // Create mapping based on your Excel structure
        $mapping = [
            'EIN' => 'ein',
            'NAME' => 'name',
            'ICO' => 'ico',
            'STREET' => 'street',
            'CITY' => 'city',
            'STATE' => 'state',
            'ZIP' => 'zip',
            'CLASSIFICATION' => 'classification',
            'RULING' => 'ruling',
            'DEDUCTIBILITY' => 'deductibility',
            'ORGANIZATION' => 'organization',
            'STATUS' => 'status',
            'TAX_PERIOD' => 'tax_period',
            'FILING_REQ' => 'filing_req',
            'NTEE_CD' => 'ntee_code'
        ];

        $result = [];

        foreach ($header as $index => $columnName) {
            $columnName = strtoupper(trim($columnName));
            if (isset($mapping[$columnName]) && isset($rowData[$index])) {
                $key = $mapping[$columnName];
                $value = $rowData[$index];

                // Clean EIN format
                if ($key === 'ein') {
                    $value = preg_replace('/[^0-9]/', '', $value);
                }

                $result[$key] = $value;
            }
        }

        return $result;
    }

    private function enhanceWithCodeDescriptions($organizationData)
    {
        if (empty($organizationData)) {
            return $organizationData;
        }

        // Add classification description
        if (!empty($organizationData['classification'])) {
            $classification = ClassificationCode::where('classification_code', $organizationData['classification'])
                ->first();

            $organizationData['classification'] = $classification->description ?? $organizationData['classification'];
        }

        // Add deductibility description
        if (!empty($organizationData['deductibility'])) {
            $deductibility = DeductibilityCode::where('deductibility_code', $organizationData['deductibility'])
                ->first();

            $organizationData['deductibility'] = $deductibility->description ?? $organizationData['deductibility'];
        }

        // Add organization type structure and description
        if (!empty($organizationData['organization'])) {
            $orgType = OrganizationTypeCode::where('organization_code', $organizationData['organization'])
                ->first();

            $organizationData['organization'] = $orgType->organization_structure ?? $organizationData['organization'];
            $organizationData['organization_description'] = $orgType->description ?? null;
        }

        // Add status description
        if (!empty($organizationData['status'])) {
            $status = StatusCode::where('status_code', $organizationData['status'])
                ->first();

            $organizationData['status'] = $status->status ?? $organizationData['status'];
            $organizationData['status_full_description'] = $status->description ?? null;
        }

        // Add NTEE code category and description
        if (!empty($organizationData['ntee_code'])) {
            $ntee = NteeCode::where('ntee_codes', $organizationData['ntee_code'])
                ->first();

            $organizationData['ntee_code'] = $ntee->category ?? $organizationData['ntee_code'];
            $organizationData['ntee_description'] = $ntee->description ?? null;
        }

        return $organizationData;
    }
}
