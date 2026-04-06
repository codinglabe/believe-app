<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessExcelFile;
use App\Models\UploadedFile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ChunkedUploadController extends Controller
{
    public function index()
    {
        return Inertia::render('chunked-upload');
    }

    public function uploadChunk(Request $request)
    {
        try {
            // Validate the chunk upload
            $request->validate([
                'chunk' => 'required|file|max:2048',
                'chunkIndex' => 'required|integer|min:0',
                'totalChunks' => 'required|integer|min:1',
                'fileName' => 'required|string',
                'fileSize' => 'required|integer|min:1',
                'uploadId' => 'nullable|string',
            ]);

            $chunk = $request->file('chunk');
            $chunkIndex = (int) $request->input('chunkIndex');
            $totalChunks = (int) $request->input('totalChunks');
            $fileName = $request->input('fileName');
            $fileSize = (int) $request->input('fileSize');
            $uploadId = $request->input('uploadId');

            Log::info("Processing chunk {$chunkIndex}/{$totalChunks} for file: {$fileName}");

            // Find or create upload session - ONLY CREATE ONCE
            if ($uploadId) {
                $uploadedFile = UploadedFile::where('upload_id', $uploadId)->first();

                if (!$uploadedFile) {
                    Log::error("Upload session not found: {$uploadId}");
                    return response()->json([
                        'success' => false,
                        'message' => 'Upload session not found'
                    ]);
                }
            } else {
                // Create new upload session ONLY for first chunk (chunkIndex = 0)
                if ($chunkIndex === 0) {
                    $uploadId = Str::uuid()->toString();

                    try {
                        $uploadedFile = UploadedFile::create([
                            'upload_id' => $uploadId,
                            'file_name' => time() . '_' . $fileName,
                            'original_name' => $fileName,
                            'file_size' => $fileSize,
                            'total_chunks' => $totalChunks,
                            'processed_chunks' => 0,
                            'status' => 'processing',
                            'uploaded_chunks_list' => json_encode([]),
                        ]);

                        Log::info("Created new upload session: {$uploadId} for file: {$fileName}, ID: {$uploadedFile->id}");
                    } catch (\Exception $e) {
                        Log::error("Failed to create upload session: " . $e->getMessage());
                        return response()->json([
                            'success' => false,
                            'message' => 'Failed to create upload session: ' . $e->getMessage()
                        ]);
                    }
                } else {
                    // For chunks after 0, uploadId should be provided
                    Log::error("Upload ID missing for chunk {$chunkIndex}");
                    return response()->json([
                        'success' => false,
                        'message' => 'Upload ID required for chunk ' . $chunkIndex
                    ]);
                }
            }

            // Create chunks directory
            $chunksDir = Storage::disk('public')->path('chunks/' . $uploadedFile->id);
            if (!file_exists($chunksDir)) {
                mkdir($chunksDir, 0755, true);
            }

            // Save the chunk
            $chunkPath = $chunksDir . '/chunk_' . str_pad($chunkIndex, 6, '0', STR_PAD_LEFT);

            if (!file_exists($chunkPath)) {
                if (!move_uploaded_file($chunk->getRealPath(), $chunkPath)) {
                    throw new \Exception("Failed to save chunk {$chunkIndex}");
                }
                Log::info("Saved chunk {$chunkIndex} to: {$chunkPath}");
            } else {
                Log::info("Chunk {$chunkIndex} already exists, skipping");
            }

            // Update database atomically - UPDATE SAME RECORD
            DB::transaction(function () use ($uploadedFile, $chunkIndex) {
                $freshFile = UploadedFile::lockForUpdate()->find($uploadedFile->id);
                $uploadedChunks = json_decode($freshFile->uploaded_chunks_list ?? '[]', true);

                if (!in_array($chunkIndex, $uploadedChunks)) {
                    $uploadedChunks[] = $chunkIndex;
                    $freshFile->uploaded_chunks_list = json_encode($uploadedChunks);
                    $freshFile->processed_chunks = count($uploadedChunks);
                    $freshFile->save();

                    Log::info("Updated chunk count for file {$freshFile->id}: {$freshFile->processed_chunks}/{$freshFile->total_chunks}");
                }
            });

            $uploadedFile->refresh();

            // FIX: Better completion check
            $uploadedChunksList = json_decode($uploadedFile->uploaded_chunks_list ?? '[]', true);
            $isComplete = count($uploadedChunksList) >= $totalChunks;
            $progress = round((count($uploadedChunksList) / $totalChunks) * 100, 2);

            Log::info("Chunk {$chunkIndex} processed. Uploaded chunks: " . count($uploadedChunksList) . "/{$totalChunks}. Complete: " . ($isComplete ? 'Yes' : 'No'));

            if ($isComplete) {
                Log::info("All chunks uploaded, starting merge process");

                // Update status to processing
                $uploadedFile->update(['status' => 'processing']);

                // Merge chunks
                $finalPath = $this->mergeChunks($uploadedFile->id, $totalChunks, $fileName);

                if ($finalPath) {
                    $uploadedFile->update([
                        'status' => 'completed'
                    ]);

                    // Dispatch processing job - এখানে Laravel Job চালু হবে
                    ProcessExcelFile::dispatch($uploadedFile->id, $finalPath);

                    Log::info("Upload completed for file: {$fileName}. Job dispatched for processing.");

                    return response()->json([
                        'success' => true,
                        'fileId' => $uploadedFile->id,
                        'uploadId' => $uploadId,
                        'chunkIndex' => $chunkIndex,
                        'isComplete' => true,
                        'message' => 'File uploaded successfully! Processing started.',
                        'progress' => 100
                    ]);
                } else {
                    throw new \Exception("Failed to merge chunks");
                }
            }

            // Return progress response
            return response()->json([
                'success' => true,
                'fileId' => $uploadedFile->id,
                'uploadId' => $uploadId,
                'chunkIndex' => $chunkIndex,
                'isComplete' => false,
                'progress' => $progress
            ]);

        } catch (\Exception $e) {
            Log::error('Chunked upload failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Upload failed: ' . $e->getMessage()
            ]);
        }
    }

    private function mergeChunks($uploadedFileId, $totalChunks, $originalFileName)
    {
        try {
            $chunksDir = Storage::disk("public")->path('chunks/' . $uploadedFileId);
            $uploadsDir = Storage::disk("public")->path('uploads/' . $uploadedFileId);

            if (!file_exists($uploadsDir)) {
                mkdir($uploadsDir, 0755, true);
            }

            $finalFileName = $uploadedFileId . '_' . $originalFileName;
            $finalPath = $uploadsDir . '/' . $finalFileName;

            Log::info("Starting merge process: {$finalPath}");

            // Check if all chunks exist before merging
            for ($i = 0; $i < $totalChunks; $i++) {
                $chunkPath = $chunksDir . '/chunk_' . str_pad($i, 6, '0', STR_PAD_LEFT);
                if (!file_exists($chunkPath)) {
                    Log::error("Chunk {$i} is missing before merge: {$chunkPath}");
                    throw new \Exception("Chunk {$i} is missing during merge");
                }
            }

            $finalFile = fopen($finalPath, 'wb');
            if (!$finalFile) {
                throw new \Exception('Cannot create final file for writing');
            }

            try {
                for ($i = 0; $i < $totalChunks; $i++) {
                    $chunkPath = $chunksDir . '/chunk_' . str_pad($i, 6, '0', STR_PAD_LEFT);

                    $chunkFile = fopen($chunkPath, 'rb');
                    if (!$chunkFile) {
                        throw new \Exception("Cannot read chunk {$i}");
                    }

                    stream_copy_to_stream($chunkFile, $finalFile);
                    fclose($chunkFile);
                    unlink($chunkPath); // Delete chunk after merging

                    Log::info("Merged and deleted chunk {$i}");
                }
            } finally {
                fclose($finalFile);
            }

            // Remove chunks directory
            if (is_dir($chunksDir)) {
                rmdir($chunksDir);
            }

            Log::info("All chunks merged successfully into: {$finalPath}");

            return 'uploads/' . $uploadedFileId . '/' . $finalFileName;

        } catch (\Exception $e) {
            Log::error("Merge failed: " . $e->getMessage());
            return false;
        }
    }

    public function getProgress($uploadedFileId)
    {
        $file = UploadedFile::where('id', $uploadedFileId)->first();

        if (!$file) {
            return Inertia::render('chunked-upload', [
                'error' => 'File not found'
            ]);
        }

        return Inertia::render('chunked-upload', [
            'fileStatus' => [
                'status' => $file->status,
                'total_rows' => $file->total_rows,
                'processed_rows' => $file->processed_rows,
                'total_chunks' => $file->total_chunks,
                'processed_chunks' => $file->processed_chunks,
                'upload_progress' => $file->total_chunks > 0 ?
                    round(($file->processed_chunks / $file->total_chunks) * 100, 2) : 0,
                'processing_progress' => $file->total_rows > 0 ?
                    round(($file->processed_rows / $file->total_rows) * 100, 2) : 0
            ]
        ]);
    }
}
