<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$on = App\Support\StreamingWorkerSourceUrl::shouldAttachVdoMediaMtxPush();
$host = App\Support\StreamingWorkerSourceUrl::vdoMediaMtxHost();
echo 'browser_push_enabled=' . (config('streaming.bridge.browser_push_enabled') ? 'true' : 'false') . PHP_EOL;
echo 'shouldAttach=' . ($on ? 'true' : 'false') . PHP_EOL;
echo 'vdoMediaMtxHost=' . ($host ?? 'null') . PHP_EOL;
