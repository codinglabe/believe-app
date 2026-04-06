<?php

namespace App\Http\Controllers;

use App\Jobs\ExportExcelDataJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ExcelDataExportController extends Controller
{
    /**
     * Initiate the export process
     */
    public function export(Request $request)
    {
        $request->validate([
            'state' => 'nullable|string|max:2',
            'format' => 'required|in:csv,xlsx'
        ]);

        $state = $request->input('state');
        $format = $request->input('format', 'csv');

        // Generate unique filename with UUID for tracking
        $jobId = Str::uuid()->toString();
        $filename = 'excel_data_export_' . ($state ? $state . '_' : '') . date('Y_m_d_H_i_s') . '_' . $jobId . '.' . $format;

        // Dispatch the export job with UUID
        ExportExcelDataJob::dispatch($state, $filename, $format, $jobId);

        return response()->json([
            'message' => 'Export started successfully',
            'job_id' => $jobId,
            'filename' => $filename,
            'status' => 'processing'
        ]);
    }

    /**
     * Check export status
     */
    public function status($filename)
    {

        if (!$filename) {
            return response()->json(['error' => 'Filename is required'], 400);
        }

        $filePath = 'exports/' . $filename;

        if (Storage::disk('public')->exists($filePath)) {
            return response()->json([
                'status' => 'completed',
                'download_url' => route('excel-data.download', ['filename' => $filename])
            ]);
        }

        // Check for error file
        $errorPath = 'exports/errors/' . $filename . '.error';
        if (Storage::disk('public')->exists($errorPath)) {
            $errorMessage = Storage::get($errorPath);
            return response()->json([
                'status' => 'failed',
                'error' => $errorMessage
            ]);
        }

        return response()->json(['status' => 'processing']);
    }

    /**
     * Download the exported file
     */
    public function download($filename)
    {
        // Sanitize the filename
        $filename = basename($filename);
        $filePath = 'exports/' . $filename;

        // Check if file exists
        if (!Storage::disk('public')->exists($filePath)) {
            // Also check in the storage/app/public/exports directory directly
            $fullPath = storage_path('app/public/exports/' . $filename);
            if (!file_exists($fullPath)) {
                abort(404, 'File not found: ' . $filename);
            }

            // File exists but not through Storage facade - use direct download
            return response()->download($fullPath, $filename);
        }

        // Use Storage facade for download
        return Storage::disk('public')->download($filePath, $filename);
    }

    /**
     * Get available states for filtering
     */
    public function getStates()
    {
        $states = \DB::table('excel_data')
            ->select('state_virtual as state')
            ->whereNotNull('state_virtual')
            ->where('state_virtual', '!=', '')
            ->distinct()
            ->orderBy('state_virtual')
            ->pluck('state');

        return response()->json($states);
    }
}
