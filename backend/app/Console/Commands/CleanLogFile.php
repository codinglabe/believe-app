<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class CleanLogFile extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'log:clean {--size=10 : Maximum file size in MB before deletion}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clean Laravel log file when it exceeds the specified size (default: 10MB)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $maxSizeMB = (float) $this->option('size');
        $maxSizeBytes = $maxSizeMB * 1024 * 1024; // Convert MB to bytes

        $logPath = storage_path('logs/laravel.log');

        // Check if log file exists
        if (!File::exists($logPath)) {
            $this->info('Log file does not exist. Nothing to clean.');
            return Command::SUCCESS;
        }

        // Get current file size
        $fileSize = File::size($logPath);
        $fileSizeMB = round($fileSize / 1024 / 1024, 2);

        $this->info("Current log file size: {$fileSizeMB} MB");

        // Check if file size exceeds the limit
        if ($fileSize >= $maxSizeBytes) {
            try {
                // Delete the log file
                File::delete($logPath);
                
                // Log the cleanup action (this will create a new log file)
                Log::info("Log file cleaned automatically. Previous size: {$fileSizeMB} MB");
                
                $this->info("✓ Log file deleted successfully. Previous size: {$fileSizeMB} MB");
                return Command::SUCCESS;
            } catch (\Exception $e) {
                $this->error("Failed to delete log file: " . $e->getMessage());
                return Command::FAILURE;
            }
        } else {
            $this->info("Log file size ({$fileSizeMB} MB) is below the limit ({$maxSizeMB} MB). No action needed.");
            return Command::SUCCESS;
        }
    }
}
