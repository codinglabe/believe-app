<?php

namespace App\Http\Controllers;

use App\Jobs\DeleteUploadedFileJob;
use App\Models\UploadedFile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class ManageDataController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->get('per_page', 10);
        $page = $request->get('page', 1);

        $allowedPerPage = [10, 25, 50, 100, 250, 500, 1000];
        if (!in_array($perPage, $allowedPerPage)) {
            $perPage = 10;
        }

        // Get fresh data without any caching - exclude failed status files
        $uploadedFiles = UploadedFile::select([
            'id',
            'original_name',
            'file_size',
            'total_rows',
            'processed_rows',
            'status',
            'created_at',
            'updated_at'
        ])
            ->where('status', '!=', 'failed') // Exclude failed files
            ->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        $formattedFiles = $uploadedFiles->getCollection()->map(function ($file) {
            return [
                'id' => $file->id,
                'name' => $file->original_name,
                'type' => $this->getFileType($file->original_name),
                'size' => $this->formatFileSize($file->file_size),
                'totalRows' => number_format($file->total_rows ?? 0),
                'processedRows' => number_format($file->processed_rows ?? 0),
                'status' => $file->status,
                'uploadedAt' => $file->created_at->format('M j, Y'),
                'uploadedAtTime' => $file->created_at->format('M j, Y g:i A'),
                'progress' => $file->total_rows > 0
                    ? round(($file->processed_rows / $file->total_rows) * 100, 1)
                    : 0,
            ];
        });

        $uploadedFiles->setCollection($formattedFiles);

        // Log for debugging
        Log::info('ManageData index called', [
            'total_files' => $uploadedFiles->total(),
            'current_page' => $uploadedFiles->currentPage(),
            'per_page' => $perPage
        ]);

        return Inertia::render('manage-data', [
            'uploadedFiles' => $uploadedFiles,
            'filters' => [
                'per_page' => $perPage,
                'page' => $page,
            ],
            'allowedPerPage' => $allowedPerPage,
            // Add timestamp to force fresh data
            'timestamp' => now()->timestamp,
        ]);
    }

    private function getFileType($filename)
    {
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

        $types = [
            'xlsx' => 'Excel (XLSX)',
            'xls' => 'Excel (XLS)',
            'csv' => 'CSV File',
        ];

        return $types[$extension] ?? 'Unknown';
    }

    private function formatFileSize($bytes)
    {
        if ($bytes == 0)
            return '0 B';

        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $i = floor(log($bytes) / log(1024));

        return round($bytes / pow(1024, $i), 2) . ' ' . $units[$i];
    }

    public function destroy($id)
    {
        try {
            $uploadedFile = UploadedFile::findOrFail($id);

            // Log deletion attempt
            Log::info('Deleting file with ID: ' . $id);

            // Dispatch delete job for background processing
            DeleteUploadedFileJob::dispatch($id);

            // Mark as failed immediately for UI (so it gets filtered out)
            $uploadedFile->update(['status' => 'failed']);

            // Return with flash message
            return redirect()->route('manage-data')->with('flash', [
                'success' => true,
                'message' => 'Dataset deleted successfully',
                'type' => 'success'
            ]);

        } catch (\Exception $e) {
            Log::error('Delete failed: ' . $e->getMessage());

            // Redirect back to manage-data with error message
            return redirect()->route('manage-data')->with('flash', [
                'success' => false,
                'message' => 'Failed to start dataset deletion: ' . $e->getMessage(),
                'type' => 'error'
            ]);
        }
    }
}
