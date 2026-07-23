<?php

namespace App\Console\Commands;

use App\Http\Controllers\CommunityVideosController;
use Illuminate\Console\Command;

class WarmUnityVideosCache extends Command
{
    protected $signature = 'unity-videos:warm-cache';
    protected $description = 'Prefetch YouTube channel payloads for Unity Videos (hub rebuilds live from DB connections)';

    public function handle(): int
    {
        $this->info('Warming Unity Videos cache...');
        $controller = app(CommunityVideosController::class);
        $controller->warmUnityVideosCache();
        $this->info('Done.');

        return self::SUCCESS;
    }
}
