<?php

namespace App\Jobs;

use App\Models\Recording;
use App\Services\DropboxService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class UploadRecordingToDropbox implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $recording;
    public $timeout = 3600; // 1 hour timeout for large files

    public function __construct(Recording $recording)
    {
        $this->recording = $recording;
    }

    public function handle(DropboxService $dropboxService)
    {
        try {
            Log::info('Starting Dropbox upload job', [
                'recording_id' => $this->recording->id,
                'filename' => $this->recording->filename,
            ]);

            // Mark as uploading
            $this->recording->markAsUploading();

            // Generate Dropbox path
            $dropboxPath = '/recordings/' . date('Y/m/d') . '/' . $this->recording->filename;

            // Upload to Dropbox
            $result = $dropboxService->uploadFile($this->recording->file_path, $dropboxPath);

            if ($result['success']) {
                // Mark as completed
                $this->recording->markAsCompleted($result['path']);

                // Delete local temp file
                if (Storage::disk('local')->exists($this->recording->file_path)) {
                    Storage::disk('local')->delete($this->recording->file_path);
                }

                Log::info('Recording uploaded to Dropbox successfully', [
                    'recording_id' => $this->recording->id,
                    'dropbox_path' => $result['path'],
                ]);

                // Broadcast upload completion event
                broadcast(new \App\Events\RecordingUploaded($this->recording));
            } else {
                // Mark as failed
                $this->recording->markAsFailed($result['error']);

                Log::error('Failed to upload recording to Dropbox', [
                    'recording_id' => $this->recording->id,
                    'error' => $result['error'],
                ]);

                // Retry the job
                $this->release(300); // Retry after 5 minutes
            }
        } catch (\Exception $e) {
            Log::error('Exception during Dropbox upload', [
                'recording_id' => $this->recording->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            $this->recording->markAsFailed($e->getMessage());
            
            // Retry the job
            $this->release(300);
        }
    }

    public function failed(\Throwable $exception)
    {
        Log::error('Dropbox upload job failed permanently', [
            'recording_id' => $this->recording->id,
            'error' => $exception->getMessage(),
        ]);

        $this->recording->markAsFailed('Job failed permanently: ' . $exception->getMessage());
    }
}
