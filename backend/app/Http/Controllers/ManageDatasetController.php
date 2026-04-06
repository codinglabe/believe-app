<?php
namespace App\Http\Controllers;

use Carbon\Carbon;
use Inertia\Inertia;
use App\Models\ExcelData;
use App\Models\UploadedFile;
use Illuminate\Http\Request;
use App\Models\ExcelDataNote;
use App\Jobs\BulkDeleteExcelDataJob;
use App\Services\ExcelDataTransformer;
use Illuminate\Support\Facades\Response;

class ManageDatasetController extends Controller
{
    public function show(Request $request, $fileId)
    {
        $uploadedFile = UploadedFile::findOrFail($fileId);

        if ($uploadedFile->status !== 'completed') {
            return redirect()->route('manage-data')->with('flash', [
                'success' => false,
                'message' => 'Dataset is not ready yet. Please wait for processing to complete.',
                'type'    => 'warning',
            ]);
        }

        $perPage = $request->get('per_page', 10);
        $page    = $request->get('page', 1);
        $search  = $request->get('search', '');

        $allowedPerPage = [10, 25, 50, 100, 250, 500, 1000];
        if (! in_array($perPage, $allowedPerPage)) {
            $perPage = 10;
        }

        // Get the header row (first row) separately
        $headerRow = ExcelData::where('file_id', $fileId)
            ->orderBy('id')
            ->where("status", "complete")
            ->firstOrFail();

        $headers = [];
        if ($headerRow && is_array($headerRow->row_data)) {
            $headers = $headerRow->row_data;
        }

        // Build query for data rows EXCLUDING the header row
        $query = ExcelData::where('file_id', $fileId)
            ->where('id', '!=', $headerRow->id) // Exclude header row by ID
            ->where("status", "complete")
            ->with('note')
            ->orderBy('id');

        if ($search) {
            $query->where('row_data', 'LIKE', '%' . $search . '%');
        }

        $excelData = $query->paginate($perPage, ['*'], 'page', $page)->through(function ($item) use ($headers) {
            $transformed = ExcelDataTransformer::transform($item->row_data);

            return [
                'id'       => $item->id,
                'row_data' => $transformed,
                'status'   => $item->status,
                'created_at' => Carbon::parse($item->created_at)->format('Y-m-d H:i:s'),
            ];
        });


        return Inertia::render('manage-dataset', [
            'uploadedFile'   => $uploadedFile,
            'excelData'      => $excelData,
            'headers'        => $headers,
            'headerRowId'    => $headerRow->id, // Pass header row ID to frontend
            'filters'        => [
                'per_page' => $perPage,
                'page'     => $page,
                'search'   => $search,
            ],
            'allowedPerPage' => $allowedPerPage,
        ]);
    }

    public function bulkDelete(Request $request, $fileId)
    {
        $request->validate([
            'ids'   => 'required|array',
            'ids.*' => 'integer|exists:excel_data,id',
        ]);

        try {
            // Get the header row ID to prevent deletion
            $headerRow = ExcelData::where('file_id', $fileId)
                ->orderBy('id')
                ->first();

            // Verify all IDs belong to this file AND are not the header row
            $validIds = ExcelData::whereIn('id', $request->ids)
                ->where('file_id', $fileId)
            // ->where('id', '!=', $headerRow->id) // Prevent header row deletion
                ->pluck('id')
                ->toArray();

            ExcelData::whereIn('id', $validIds)->update(['status' => 'deleted']);

            if (empty($validIds)) {
                return redirect()->route('manage-dataset.show', $fileId)->with('flash', [
                    'success' => false,
                    'message' => 'No valid rows found to delete (header row cannot be deleted)',
                    'type'    => 'error',
                ]);
            }

            // Check if user tried to delete header row
            $attemptedHeaderDeletion = in_array($headerRow->id, $request->ids);
            $message                 = 'Selected ' . count($validIds) . ' rows deletion started. They will be removed shortly.';

            if ($attemptedHeaderDeletion) {
                $message .= ' Note: Header row was excluded from deletion.';
            }

            // Dispatch bulk delete job
            BulkDeleteExcelDataJob::dispatch($fileId, $validIds);

            return redirect()->route('manage-dataset.show', $fileId)->with('flash', [
                'success' => true,
                'message' => $message,
                'type'    => 'success',
            ]);

            // return response()->json([
            //     'success' => true,
            //     'message' => 'Selected ' . count($validIds) . ' rows deletion started. They will be removed shortly.',
            //     'deleted_count' => count($validIds),
            //     'type' => 'success'
            // ]);

        } catch (\Exception $e) {
            return redirect()->route('manage-dataset.show', $fileId)->with('flash', [
                'success' => false,
                'message' => 'Failed to start bulk deletion: ' . $e->getMessage(),
                'type'    => 'error',
            ]);
        }
    }

    public function bulkDownload(Request $request, $fileId)
    {
        $request->validate([
            'ids'   => 'required|array',
            'ids.*' => 'integer|exists:excel_data,id',
        ]);

        try {
            $uploadedFile = UploadedFile::findOrFail($fileId);

            // Get header row
            $headerRow = ExcelData::where('file_id', $fileId)
                ->orderBy('id')
                ->first();

            // Get selected data rows (excluding header if somehow included)
            $excelData = ExcelData::whereIn('id', $request->ids)
                ->where('file_id', $fileId)
                ->where('id', '!=', $headerRow->id) // Exclude header row
                ->orderBy('id')
                ->get();

            if ($excelData->isEmpty()) {
                return redirect()->route('manage-dataset.show', $fileId)->with('flash', [
                    'success' => false,
                    'message' => 'No data found to download',
                    'type'    => 'error',
                ]);
            }

            // Create CSV content
            $csvContent = '';

            // Add headers first
            if ($headerRow && is_array($headerRow->row_data)) {
                $csvContent .= implode(',', array_map(function ($value) {
                    return '"' . str_replace('"', '""', $value) . '"';
                }, $headerRow->row_data)) . "\n";
            }

            // Add selected data rows
            foreach ($excelData as $row) {
                if (is_array($row->row_data)) {
                    $csvContent .= implode(',', array_map(function ($value) {
                        return '"' . str_replace('"', '""', $value) . '"';
                    }, $row->row_data)) . "\n";
                }
            }

            $filename = 'selected_data_' . $uploadedFile->original_name . '_' . date('Y-m-d_H-i-s') . '.csv';

            return Response::make($csvContent, 200, [
                'Content-Type'        => 'text/csv',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ]);

        } catch (\Exception $e) {
            return redirect()->route('manage-dataset.show', $fileId)->with('flash', [
                'success' => false,
                'message' => 'Failed to download data: ' . $e->getMessage(),
                'type'    => 'error',
            ]);
        }
    }

    public function downloadAll($fileId)
    {
        try {
            $uploadedFile = UploadedFile::findOrFail($fileId);

            if ($uploadedFile->status !== 'completed') {
                return redirect()->route('manage-dataset.show', $fileId)->with('flash', [
                    'success' => false,
                    'message' => 'Dataset is not ready for download',
                    'type'    => 'warning',
                ]);
            }

            $filename = 'complete_' . $uploadedFile->original_name . '_' . date('Y-m-d_H-i-s') . '.csv';

            return response()->stream(function () use ($fileId) {
                $handle = fopen('php://output', 'w');
                fwrite($handle, "\xEF\xBB\xBF");

                // Get header row first
                $headerRow = ExcelData::where('file_id', $fileId)
                    ->orderBy('id')
                    ->first();

                // Write header
                if ($headerRow && is_array($headerRow->row_data)) {
                    fputcsv($handle, $headerRow->row_data);
                }

                // Stream data rows in chunks (excluding header)
                $chunkSize = 1000;
                $offset    = 0;

                do {
                    $excelData = ExcelData::where('file_id', $fileId)
                        ->where('id', '!=', $headerRow->id) // Exclude header row
                        ->orderBy('id')
                        ->offset($offset)
                        ->limit($chunkSize)
                        ->get();

                    foreach ($excelData as $row) {
                        if (is_array($row->row_data)) {
                            fputcsv($handle, $row->row_data);
                        }
                    }

                    $offset += $chunkSize;

                } while ($excelData->count() === $chunkSize);

                fclose($handle);
            }, 200, [
                'Content-Type'        => 'text/csv',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
                'Cache-Control'       => 'no-cache, no-store, must-revalidate',
                'Pragma'              => 'no-cache',
                'Expires'             => '0',
            ]);

        } catch (\Exception $e) {
            return redirect()->route('manage-dataset.show', $fileId)->with('flash', [
                'success' => false,
                'message' => 'Failed to download dataset: ' . $e->getMessage(),
                'type'    => 'error',
            ]);
        }
    }

    public function saveNote(Request $request, $fileId, $rowId)
    {
        $request->validate([
            'note' => 'required|string|max:1000',
        ]);

        try {
            // Get header row to prevent note addition
            $headerRow = ExcelData::where('file_id', $fileId)
                ->orderBy('id')
                ->first();

            // Prevent adding notes to header row
            if ($rowId == $headerRow->id) {
                return redirect()->route('manage-dataset.show', $fileId)->with('flash', [
                    'success' => false,
                    'message' => 'Cannot add notes to header row',
                    'type'    => 'error',
                ]);
            }

            $excelData = ExcelData::where('id', $rowId)
                ->where('file_id', $fileId)
                ->where('id', '!=', $headerRow->id) // Extra safety check
                ->firstOrFail();

            ExcelDataNote::updateOrCreate(
                ['excel_data_id' => $rowId],
                ['note' => $request->note]
            );

            return redirect()->route('manage-dataset.show', $fileId)->with('flash', [
                'success' => true,
                'message' => 'Note saved successfully',
                'type'    => 'success',
            ]);

        } catch (\Exception $e) {
            return redirect()->route('manage-dataset.show', $fileId)->with('flash', [
                'success' => false,
                'message' => 'Failed to save note: ' . $e->getMessage(),
                'type'    => 'error',
            ]);
        }
    }
}
