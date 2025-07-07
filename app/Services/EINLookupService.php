<?php

namespace App\Services;

use App\Models\ExcelData;
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

            return $this->mapDataToOrganization($rowData, $header);

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
            'NTEE_CODE' => 'ntee_code'
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
}
