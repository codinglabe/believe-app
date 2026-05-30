<?php

namespace App\Console\Commands;

use App\Services\SeoService;
use Illuminate\Console\Command;

class OptimizeSeoShareImagesCommand extends Command
{
    protected $signature = 'seo:optimize-share-images';

    protected $description = 'Build WhatsApp-friendly JPEG variants (1200×630, ≤300 KB) for SEO share images';

    public function handle(): int
    {
        $paths = SeoService::optimizeAllStoredShareImages();

        if ($paths === []) {
            $this->info('No SEO share images found to optimize.');

            return self::SUCCESS;
        }

        $this->info('Optimized '.count($paths).' social share image(s):');
        foreach ($paths as $path) {
            $this->line('  - '.$path);
        }

        return self::SUCCESS;
    }
}
