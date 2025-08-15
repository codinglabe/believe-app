<?php

namespace App\Http\Controllers;

use App\Models\Recording;
use App\Models\Meeting;
use App\Services\DropboxService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class RecordingController extends Controller
{
    protected $dropboxService;

    public function __construct(DropboxService $dropboxService)
    {
        $this->dropboxService = $dropboxService;
    }

    public function store(Request $request, Meeting $meeting)
    {
        $user = Auth::user();

        if ($user->id !== $meeting->instructor_id) {
            abort(403, 'Only the instructor can upload recordings');
        }

        $validated = $request->validate([
            'recording' => 'required|file|mimes:webm,mp4,avi,mov|max:1048576', // 1GB max
            'duration_seconds' => 'required|integer|min:1',
            'started_at' => 'required|date',
            'ended_at' => 'required|date|after:started_at',
        ]);

        $file = $request->file('recording');
        $originalFilename = $file->getClientOriginalName();
        $filename = 'recording_' . $meeting->meeting_id . '_' . time() . '.' . $file->getClientOriginalExtension();

        // Store file temporarily
        $tempPath = $file->storeAs('temp/recordings', $filename, 'local');

        // Create recording record
        $recording = Recording::create([
            'meeting_id' => $meeting->id,
            'instructor_id' => $user->id,
            'filename' => $filename,
            'original_filename' => $originalFilename,
            'file_path' => $tempPath,
            'file_size' => $file->getSize(),
            'duration_seconds' => $validated['duration_seconds'],
            'mime_type' => $file->getMimeType(),
            'status' => 'processing',
            'started_at' => $validated['started_at'],
            'ended_at' => $validated['ended_at'],
        ]);

        Log::info('Recording upload started', [
            'recording_id' => $recording->id,
            'meeting_id' => $meeting->meeting_id,
            'filename' => $filename,
            'file_size' => $file->getSize(),
        ]);

        // Queue upload to Dropbox
        \App\Jobs\UploadRecordingToDropbox::dispatch($recording);

        return response()->json([
            'success' => true,
            'recording_id' => $recording->id,
            'message' => 'Recording upload started',
        ]);
    }

    public function uploadProgress(Recording $recording)
    {
        $user = Auth::user();

        if ($user->id !== $recording->instructor_id) {
            abort(403, 'Unauthorized');
        }

        return response()->json([
            'status' => $recording->status,
            'progress' => $recording->upload_progress,
            'message' => $this->getStatusMessage($recording->status),
        ]);
    }

    public function index(Meeting $meeting)
    {
        $user = Auth::user();

        // Check if user can view recordings
        if (!$meeting->canUserJoin($user)) {
            abort(403, 'You do not have permission to view recordings');
        }

        $recordings = $meeting->recordings()
            ->where('status', 'completed')
            ->orderBy('started_at', 'desc')
            ->get();

        return response()->json([
            'recordings' => $recordings,
        ]);
    }

    public function show(Recording $recording)
    {
        $user = Auth::user();
        $meeting = $recording->meeting;

        // Check permissions
        if (!$meeting->canUserJoin($user)) {
            abort(403, 'You do not have permission to view this recording');
        }

        if ($recording->status !== 'completed') {
            abort(404, 'Recording not available');
        }

        return response()->json([
            'recording' => $recording,
            'meeting' => $meeting->load(['course', 'instructor']),
        ]);
    }

    public function download(Recording $recording)
    {
        $user = Auth::user();
        $meeting = $recording->meeting;

        // Check permissions
        if (!$meeting->canUserJoin($user)) {
            abort(403, 'You do not have permission to download this recording');
        }

        if ($recording->status !== 'completed' || !$recording->dropbox_path) {
            abort(404, 'Recording not available for download');
        }

        try {
            $downloadUrl = $this->dropboxService->getTemporaryDownloadUrl($recording->dropbox_path);
            
            Log::info('Recording download requested', [
                'recording_id' => $recording->id,
                'user_id' => $user->id,
                'meeting_id' => $meeting->meeting_id,
            ]);

            return redirect($downloadUrl);
        } catch (\Exception $e) {
            Log::error('Failed to generate download URL', [
                'recording_id' => $recording->id,
                'error' => $e->getMessage(),
            ]);

            abort(500, 'Failed to generate download link');
        }
    }

    public function stream(Recording $recording)
    {
        $user = Auth::user();
        $meeting = $recording->meeting;

        // Check permissions
        if (!$meeting->canUserJoin($user)) {
            abort(403, 'You do not have permission to stream this recording');
        }

        if ($recording->status !== 'completed' || !$recording->dropbox_path) {
            abort(404, 'Recording not available for streaming');
        }

        try {
            $streamUrl = $this->dropboxService->getStreamingUrl($recording->dropbox_path);
            
            Log::info('Recording stream requested', [
                'recording_id' => $recording->id,
                'user_id' => $user->id,
                'meeting_id' => $meeting->meeting_id,
            ]);

            return response()->json([
                'stream_url' => $streamUrl,
                'recording' => $recording,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to generate streaming URL', [
                'recording_id' => $recording->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Failed to generate streaming link',
            ], 500);
        }
    }

    public function destroy(Recording $recording)
    {
        $user = Auth::user();

        if ($user->id !== $recording->instructor_id) {
            abort(403, 'Only the instructor can delete recordings');
        }

        try {
            // Delete from Dropbox
            if ($recording->dropbox_path) {
                $this->dropboxService->deleteFile($recording->dropbox_path);
            }

            // Delete local temp file if exists
            if ($recording->file_path && Storage::disk('local')->exists($recording->file_path)) {
                Storage::disk('local')->delete($recording->file_path);
            }

            $recording->delete();

            Log::info('Recording deleted', [
                'recording_id' => $recording->id,
                'meeting_id' => $recording->meeting->meeting_id,
                'instructor_id' => $user->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Recording deleted successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to delete recording', [
                'recording_id' => $recording->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Failed to delete recording',
            ], 500);
        }
    }

    private function getStatusMessage(string $status): string
    {
        return match($status) {
            'processing' => 'Processing recording...',
            'uploading' => 'Uploading to cloud storage...',
            'completed' => 'Recording ready',
            'failed' => 'Upload failed',
            default => 'Unknown status',
        };
    }
}
