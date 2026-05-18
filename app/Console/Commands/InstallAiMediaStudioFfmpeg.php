<?php

namespace App\Console\Commands;

use App\Services\AiMediaStudioVideoWatermarkService;
use Illuminate\Console\Command;
use Symfony\Component\Process\Process;

class InstallAiMediaStudioFfmpeg extends Command
{
    protected $signature = 'ai-media-studio:install-ffmpeg
        {--force : Re-download even when storage/app/bin/ffmpeg already exists}';

    protected $description = 'Download a static Linux x64 FFmpeg binary into storage/app/bin/ffmpeg for AI Media Studio logo burn';

    public function handle(AiMediaStudioVideoWatermarkService $watermark): int
    {
        $target = $watermark->bundledFfmpegPath();

        if (is_executable($target) && ! $this->option('force')) {
            $this->info("FFmpeg already installed at {$target}");

            return self::SUCCESS;
        }

        if (PHP_OS_FAMILY !== 'Linux') {
            $this->warn('Bundled install only supports Linux x64. Install FFmpeg via your OS package manager and set AI_MEDIA_STUDIO_FFMPEG if needed.');

            return self::FAILURE;
        }

        $binDir = dirname($target);
        if (! is_dir($binDir) && ! mkdir($binDir, 0755, true) && ! is_dir($binDir)) {
            $this->error("Could not create directory: {$binDir}");

            return self::FAILURE;
        }

        $archive = sys_get_temp_dir().'/ffmpeg-release-amd64-static.tar.xz';
        $this->info('Downloading static FFmpeg (johnvansickle.com)…');

        $download = new Process([
            'curl', '-fsSL', '-o', $archive,
            'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz',
        ]);
        $download->setTimeout(600);
        $download->run(function ($type, $buffer) {
            $this->output->write($buffer);
        });

        if (! $download->isSuccessful()) {
            $this->error('Download failed: '.$download->getErrorOutput());

            return self::FAILURE;
        }

        $extractDir = sys_get_temp_dir().'/ffmpeg-amd64-static-'.uniqid('', true);
        mkdir($extractDir, 0755, true);

        $extract = new Process(['tar', '-xf', $archive, '-C', $extractDir]);
        $extract->setTimeout(120);
        $extract->mustRun();

        $binary = null;
        $iterator = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($extractDir));
        foreach ($iterator as $file) {
            if ($file->isFile() && $file->getFilename() === 'ffmpeg') {
                $binary = $file->getPathname();
                break;
            }
        }

        if ($binary === null) {
            $this->error('Could not find ffmpeg binary inside the archive.');

            return self::FAILURE;
        }

        if (! copy($binary, $target)) {
            $this->error("Could not copy FFmpeg to {$target}");

            return self::FAILURE;
        }

        chmod($target, 0755);
        @unlink($archive);
        $this->removeDirectory($extractDir);

        $version = new Process([$target, '-version']);
        $version->run();
        $firstLine = strtok($version->getOutput(), "\n") ?: 'unknown version';

        $this->info("Installed {$firstLine}");
        $this->line("Path: {$target}");
        $this->line('New fal.ai videos will burn the BIU logo automatically when the queue worker runs.');

        return self::SUCCESS;
    }

    private function removeDirectory(string $dir): void
    {
        if (! is_dir($dir)) {
            return;
        }

        $items = scandir($dir);
        if ($items === false) {
            return;
        }

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $path = $dir.DIRECTORY_SEPARATOR.$item;
            if (is_dir($path)) {
                $this->removeDirectory($path);
            } else {
                @unlink($path);
            }
        }

        @rmdir($dir);
    }
}
