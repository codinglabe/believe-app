<?php

/**
 * One-shot: re-queue stuck pending YouTube recording uploads.
 * Run on the site that owns the recordings:
 *   php artisan tinker < scripts/...  OR php this-file from public_html after copy
 */

use App\Jobs\PublishDropboxRecordingToYouTube;
use App\Models\RecordingYoutubeUpload;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$stuck = RecordingYoutubeUpload::query()
    ->where('status', RecordingYoutubeUpload::STATUS_PENDING)
    ->where(function ($q) {
        $q->whereNull('progress_stage')
            ->orWhereIn('progress_stage', [
                RecordingYoutubeUpload::STAGE_QUEUED,
                'pending',
            ]);
    })
    ->where('updated_at', '<', now()->subMinutes(1))
    ->get();

echo 'Stuck pending uploads: '.$stuck->count().PHP_EOL;

foreach ($stuck as $upload) {
    $upload->update([
        'progress_stage' => RecordingYoutubeUpload::STAGE_QUEUED,
        'progress_percent' => 0,
        'error_message' => null,
    ]);
    PublishDropboxRecordingToYouTube::dispatch($upload->id)->onQueue('default');
    echo "Re-dispatched upload #{$upload->id} ({$upload->dropbox_name})".PHP_EOL;
}

echo "Done.\n";
