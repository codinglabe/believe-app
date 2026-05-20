<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

if (! Schema::hasTable('recording_youtube_uploads')) {
    fwrite(STDERR, "Table recording_youtube_uploads does not exist. Run: php artisan migrate\n");
    exit(1);
}

$name = '2026_05_21_000000_create_recording_youtube_uploads_table';
$exists = DB::table('migrations')->where('migration', $name)->exists();
if ($exists) {
    echo "Migration already recorded.\n";
    exit(0);
}

$batch = (int) DB::table('migrations')->max('batch') + 1;
DB::table('migrations')->insert(['migration' => $name, 'batch' => $batch]);
echo "Recorded migration in batch {$batch}.\n";
