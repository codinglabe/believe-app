<?php

namespace App\Http\Controllers;

use App\Models\ExcelData;
use App\Models\UploadedFile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\DB;
use App\Services\ExcelDataTransformer;

class IrsBmfController extends Controller
{
    public function index(): Response
    {
        // Get all IRS BMF records without file_id filtering
        $records = ExcelData::orderBy('id', 'desc')
            ->paginate(10);

        // Transform the records to extract the IRS data
        $transformedRecords = $records->getCollection()->map(function ($record) {
            // Check if row_data is already an array or needs decoding
            $rowData = is_array($record->row_data) ? $record->row_data : json_decode($record->row_data, true);

            // Check if this is the header row (first element is "EIN")
            if (isset($rowData[0]) && $rowData[0] === 'EIN') {
                // This is a header row, return it as-is without transformation
                return [
                    'id' => $record->id,
                    'ein' => $rowData[0] ?? null,
                    'name' => $rowData[1] ?? null,
                    'ico' => $rowData[2] ?? null,
                    'street' => $rowData[3] ?? null,
                    'city' => $rowData[4] ?? null,
                    'state' => $rowData[5] ?? null,
                    'zip' => $rowData[6] ?? null,
                    'group' => $rowData[7] ?? null,
                    'subsection' => $rowData[8] ?? null,
                    'affiliation' => $rowData[9] ?? null,
                    'classification' => $rowData[10] ?? null,
                    'ruling' => $rowData[11] ?? null,
                    'deductibility' => $rowData[12] ?? null,
                    'foundation' => $rowData[13] ?? null,
                    'activity' => $rowData[14] ?? null,
                    'organization' => $rowData[15] ?? null,
                    'status' => $rowData[16] ?? null,
                    'tax_period' => $rowData[17] ?? null,
                    'asset_cd' => $rowData[18] ?? null,
                    'income_cd' => $rowData[19] ?? null,
                    'revenue_amt' => $rowData[25] ?? null, // Note: Corrected index from 20 to 25 based on your structure
                    'ntee_cd' => $rowData[26] ?? null, // Note: Corrected index from 21 to 26 based on your structure
                    'sort_name' => $rowData[27] ?? null,
                    'created_at' => $record->created_at,
                    'is_header' => true, // Flag to identify header rows
                ];
            }

            // Apply the transformer to get descriptive values for actual data rows
            $transformedData = ExcelDataTransformer::transform($rowData);

            // Extract IRS data from the array structure
            return [
                'id' => $record->id,
                'ein' => $transformedData[0] ?? null,
                'name' => $transformedData[1] ?? null,
                'ico' => $transformedData[2] ?? null,
                'street' => $transformedData[3] ?? null,
                'city' => $transformedData[4] ?? null,
                'state' => $transformedData[5] ?? null,
                'zip' => $transformedData[6] ?? null,
                'group' => $transformedData[7] ?? null,
                'subsection' => $transformedData[8] ?? null,
                'affiliation' => $transformedData[9] ?? null,
                'classification' => $transformedData[10] ?? null,
                'ruling' => $transformedData[11] ?? null,
                'deductibility' => $transformedData[12] ?? null,
                'foundation' => $transformedData[13] ?? null,
                'activity' => $transformedData[14] ?? null,
                'organization' => $transformedData[15] ?? null,
                'status' => $transformedData[16] ?? null,
                'tax_period' => $transformedData[17] ?? null,
                'asset_cd' => $transformedData[18] ?? null,
                'income_cd' => $transformedData[19] ?? null,
                'revenue_amt' => $transformedData[25] ?? null, // Corrected index
                'ntee_cd' => $transformedData[26] ?? null, // Corrected index
                'sort_name' => $transformedData[27] ?? null,
                'created_at' => $record->created_at,
                'is_header' => false,
            ];
        });

        // Replace the collection with transformed data
        $records->setCollection($transformedRecords);

        // Calculate statistics from all IRS data (excluding header rows)
        $stats = $this->calculateStats();

        return Inertia::render('IrsBmf/Index', [
            'records' => $records,
            'stats' => $stats,
        ]);
    }

    public function search(Request $request): Response
    {
        $query = $request->get('q');
        $state = $request->get('state');
        $ntee = $request->get('ntee');
        $status = $request->get('status');

        // Base query for all IRS records
        $recordsQuery = ExcelData::query();

        if ($query) {
            $recordsQuery->where('row_data', 'like', '%' . $query . '%');
        }

        // Get paginated results
        $records = $recordsQuery->orderBy('id', 'desc')->paginate(10);

        // Transform the records
        $transformedRecords = $records->getCollection()->map(function ($record) {
            // Check if row_data is already an array or needs decoding
            $rowData = is_array($record->row_data) ? $record->row_data : json_decode($record->row_data, true);

            // Skip header rows in search results
            if (isset($rowData[0]) && $rowData[0] === 'EIN') {
                return [
                    'id' => $record->id,
                    'ein' => $rowData[0] ?? null,
                    'name' => $rowData[1] ?? null,
                    'city' => $rowData[4] ?? null,
                    'state' => $rowData[5] ?? null,
                    'ntee_cd' => $rowData[26] ?? null, // Corrected index
                    'status' => $rowData[16] ?? null,
                    'ruling' => $rowData[11] ?? null,
                    'created_at' => $record->created_at,
                    'is_header' => true,
                ];
            }

            // Apply the transformer to get descriptive values
            $transformedData = ExcelDataTransformer::transform($rowData);

            return [
                'id' => $record->id,
                'ein' => $transformedData[0] ?? null,
                'name' => $transformedData[1] ?? null,
                'city' => $transformedData[4] ?? null,
                'state' => $transformedData[5] ?? null,
                'ntee_cd' => $transformedData[26] ?? null, // Corrected index
                'status' => $transformedData[16] ?? null,
                'ruling' => $transformedData[11] ?? null,
                'created_at' => $record->created_at,
                'is_header' => false,
            ];
        });

        $records->setCollection($transformedRecords);

        // Extract filter options from all data (excluding header rows)
        $filterData = $this->extractFilterData();

        return Inertia::render('IrsBmf/Search', [
            'records' => $records,
            'states' => $filterData['states'],
            'nteeCodes' => $filterData['nteeCodes'],
            'statusCodes' => $filterData['statusCodes'],
            'filters' => [
                'q' => $query ?? '',
                'state' => $state ?? 'all',
                'ntee' => $ntee ?? 'all',
                'status' => $status ?? 'all',
            ],
        ]);
    }

    public function show(int $id): Response
    {
        $record = ExcelData::with('uploadedFile')->findOrFail($id);

        // Check if row_data is already an array or needs decoding
        $rowData = is_array($record->row_data) ? $record->row_data : json_decode($record->row_data, true);

        // Check if this is a header row
        if (isset($rowData[0]) && $rowData[0] === 'EIN') {
            return Inertia::render('IrsBmf/Show', [
                'record' => [
                    'id' => $record->id,
                    'ein' => $rowData[0] ?? null,
                    'name' => $rowData[1] ?? null,
                    'ico' => $rowData[2] ?? null,
                    'street' => $rowData[3] ?? null,
                    'city' => $rowData[4] ?? null,
                    'state' => $rowData[5] ?? null,
                    'zip' => $rowData[6] ?? null,
                    'group' => $rowData[7] ?? null,
                    'subsection' => $rowData[8] ?? null,
                    'affiliation' => $rowData[9] ?? null,
                    'classification' => $rowData[10] ?? null,
                    'ruling' => $rowData[11] ?? null,
                    'deductibility' => $rowData[12] ?? null,
                    'foundation' => $rowData[13] ?? null,
                    'activity' => $rowData[14] ?? null,
                    'organization' => $rowData[15] ?? null,
                    'status' => $rowData[16] ?? null,
                    'tax_period' => $rowData[17] ?? null,
                    'asset_cd' => $rowData[18] ?? null,
                    'income_cd' => $rowData[19] ?? null,
                    'revenue_amt' => $rowData[25] ?? null, // Corrected index
                    'ntee_cd' => $rowData[26] ?? null, // Corrected index
                    'sort_name' => $rowData[27] ?? null,
                    'created_at' => $record->created_at,
                    'file_info' => $record->uploadedFile ? [
                        'file_name' => $record->uploadedFile->file_name,
                        'uploaded_at' => $record->uploadedFile->created_at->format('M j, Y g:i A')
                    ] : null,
                    'is_header' => true,
                ]
            ]);
        }

        // Apply the transformer to get descriptive values for actual data rows
        $transformedData = ExcelDataTransformer::transform($rowData);

        return Inertia::render('IrsBmf/Show', [
            'record' => [
                'id' => $record->id,
                'ein' => $transformedData[0] ?? null,
                'name' => $transformedData[1] ?? null,
                'ico' => $transformedData[2] ?? null,
                'street' => $transformedData[3] ?? null,
                'city' => $transformedData[4] ?? null,
                'state' => $transformedData[5] ?? null,
                'zip' => $transformedData[6] ?? null,
                'group' => $transformedData[7] ?? null,
                'subsection' => $transformedData[8] ?? null,
                'affiliation' => $transformedData[9] ?? null,
                'classification' => $transformedData[10] ?? null,
                'ruling' => $transformedData[11] ?? null,
                'deductibility' => $transformedData[12] ?? null,
                'foundation' => $transformedData[13] ?? null,
                'activity' => $transformedData[14] ?? null,
                'organization' => $transformedData[15] ?? null,
                'status' => $transformedData[16] ?? null,
                'tax_period' => $transformedData[17] ?? null,
                'asset_cd' => $transformedData[18] ?? null,
                'income_cd' => $transformedData[19] ?? null,
                'revenue_amt' => $transformedData[25] ?? null, // Corrected index
                'ntee_cd' => $transformedData[26] ?? null, // Corrected index
                'sort_name' => $transformedData[27] ?? null,
                'created_at' => $record->created_at,
                'file_info' => $record->uploadedFile ? [
                    'file_name' => $record->uploadedFile->file_name,
                    'uploaded_at' => $record->uploadedFile->created_at->format('M j, Y g:i A')
                ] : null,
                'is_header' => false,
            ]
        ]);
    }

    public function triggerImport(Request $request): \Illuminate\Http\JsonResponse
    {
        try {
            $mode = $request->input('mode', 'full');
            $source = $request->input('source');

            $command = 'irs:bmf:import';
            if ($mode === 'update-only') {
                $command .= ' --update-only';
            }
            if ($source) {
                $command .= ' --source=' . escapeshellarg($source);
            }

            Artisan::queue($command);

            return response()->json([
                'success' => true,
                'message' => "IRS BMF import started in {$mode} mode. Check the logs for progress.",
                'mode' => $mode
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to start import: ' . $e->getMessage()
            ], 500);
        }
    }

    private function calculateStats(): array
    {
        // Count all IRS records excluding header rows
        $totalRecords = ExcelData::where(DB::raw('JSON_EXTRACT(row_data, "$[0]")'), '!=', 'EIN')
            ->count();

        // Get unique states count excluding header rows
        $statesCount = ExcelData::where(DB::raw('JSON_EXTRACT(row_data, "$[0]")'), '!=', 'EIN')
            ->select(DB::raw('COUNT(DISTINCT JSON_EXTRACT(row_data, "$[5]")) as states_count'))
            ->value('states_count') ?? 0;

        // Get unique NTEE codes count excluding header rows
        $nteeCount = ExcelData::where(DB::raw('JSON_EXTRACT(row_data, "$[0]")'), '!=', 'EIN')
            ->select(DB::raw('COUNT(DISTINCT JSON_EXTRACT(row_data, "$[26]")) as ntee_count')) // Corrected index
            ->value('ntee_count') ?? 0;

        return [
            'total_records' => $totalRecords,
            'total_states' => $statesCount,
            'total_ntee_codes' => $nteeCount,
        ];
    }

    private function extractFilterData(): array
    {
        // Get unique states excluding header rows
        $states = ExcelData::where(DB::raw('JSON_EXTRACT(row_data, "$[0]")'), '!=', 'EIN')
            ->select(DB::raw('DISTINCT JSON_EXTRACT(row_data, "$[5]") as state'))
            ->whereNotNull(DB::raw('JSON_EXTRACT(row_data, "$[5]")'))
            ->orderBy('state')
            ->pluck('state')
            ->map(function ($state) {
                return trim($state, '"');
            })
            ->filter()
            ->values()
            ->toArray();

        // Get unique NTEE codes excluding header rows
        $nteeCodes = ExcelData::where(DB::raw('JSON_EXTRACT(row_data, "$[0]")'), '!=', 'EIN')
            ->select(DB::raw('DISTINCT JSON_EXTRACT(row_data, "$[26]") as ntee_code')) // Corrected index
            ->whereNotNull(DB::raw('JSON_EXTRACT(row_data, "$[26]")'))
            ->orderBy('ntee_code')
            ->pluck('ntee_code')
            ->map(function ($code) {
                return trim($code, '"');
            })
            ->filter()
            ->values()
            ->toArray();

        // Get unique status codes excluding header rows
        $statusCodes = ExcelData::where(DB::raw('JSON_EXTRACT(row_data, "$[0]")'), '!=', 'EIN')
            ->select(DB::raw('DISTINCT JSON_EXTRACT(row_data, "$[16]") as status_code'))
            ->whereNotNull(DB::raw('JSON_EXTRACT(row_data, "$[16]")'))
            ->orderBy('status_code')
            ->pluck('status_code')
            ->map(function ($code) {
                return trim($code, '"');
            })
            ->filter()
            ->values()
            ->toArray();

        return [
            'states' => $states,
            'nteeCodes' => $nteeCodes,
            'statusCodes' => $statusCodes,
        ];
    }

    /**
     * Get import history
     */
    public function importHistory(): Response
    {
        $imports = UploadedFile::where('original_name', 'like', '%IRS_BMF%')
            ->orWhere('file_name', 'like', '%irs_bmf%')
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return Inertia::render('IrsBmf/ImportHistory', [
            'imports' => $imports
        ]);
    }

    /**
     * Show records from a specific import
     */
    public function showImport($importId): Response
    {
        $import = UploadedFile::findOrFail($importId);

        $records = ExcelData::where('file_id', $importId)
            ->orderBy('id', 'desc')
            ->paginate(10);

        // Transform the records
        $transformedRecords = $records->getCollection()->map(function ($record) {
            $rowData = is_array($record->row_data) ? $record->row_data : json_decode($record->row_data, true);

            // Skip header rows
            if (isset($rowData[0]) && $rowData[0] === 'EIN') {
                return [
                    'id' => $record->id,
                    'ein' => $rowData[0] ?? null,
                    'name' => $rowData[1] ?? null,
                    'city' => $rowData[4] ?? null,
                    'state' => $rowData[5] ?? null,
                    'ntee_cd' => $rowData[26] ?? null, // Corrected index
                    'status' => $rowData[16] ?? null,
                    'created_at' => $record->created_at,
                    'is_header' => true,
                ];
            }

            // Apply the transformer to get descriptive values
            $transformedData = ExcelDataTransformer::transform($rowData);

            return [
                'id' => $record->id,
                'ein' => $transformedData[0] ?? null,
                'name' => $transformedData[1] ?? null,
                'city' => $transformedData[4] ?? null,
                'state' => $transformedData[5] ?? null,
                'ntee_cd' => $transformedData[26] ?? null, // Corrected index
                'status' => $transformedData[16] ?? null,
                'created_at' => $record->created_at,
                'is_header' => false,
            ];
        });

        $records->setCollection($transformedRecords);

        return Inertia::render('IrsBmf/ImportShow', [
            'import' => $import,
            'records' => $records
        ]);
    }
}
