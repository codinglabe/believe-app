<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessExcelFile;
use App\Models\UploadedFile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class UploadDataController extends Controller
{
    public function index()
    {
        return Inertia::render("upload-data");
    }

    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,xlsx,xls|max:512000' // 500MB max
        ]);

        try {
            DB::beginTransaction();

            // Store file
            $file = $request->file('file');
            $filename = time() . '_' . $file->getClientOriginalName();
            // $path = $file->storeAs('uploads', $filename, 'public');
            $path = Storage::disk('public')->putFileAs('uploads', $file, $filename);

            // Create database record
            $uploadedFile = UploadedFile::create([
                'file_name' => $filename,
                'original_name' => $file->getClientOriginalName(),
                'file_size' => $file->getSize(),
                'file_type' => $file->getMimeType(),
            ]);

            // Dispatch background job for processing
            ProcessExcelFile::dispatch($uploadedFile->id, $path);

            DB::commit();

            return response()->json([
                'success' => true,
                'file_id' => $uploadedFile->id,
                'message' => 'File uploaded successfully. Processing started.'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Upload failed: ' . $e->getMessage()
            ], 500);
        }
    }
}
