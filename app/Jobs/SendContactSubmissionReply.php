<?php

namespace App\Jobs;

use App\Mail\ContactSubmissionReply;
use App\Models\ContactSubmission;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendContactSubmissionReply implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 60;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public ContactSubmission $submission,
        public string $replyMessage,
        public string $adminName
    ) {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            Mail::to($this->submission->email)->send(
                new ContactSubmissionReply(
                    $this->submission,
                    $this->replyMessage,
                    $this->adminName
                )
            );

            Log::info('Contact submission reply email sent', [
                'submission_id' => $this->submission->id,
                'email' => $this->submission->email,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send contact submission reply email', [
                'submission_id' => $this->submission->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
