<?php

namespace App\Console\Commands;

use App\Models\PushNotificationLog;
use App\Support\PushNotificationLogMetadata;
use Illuminate\Console\Command;

class BackfillPushNotificationLogMetadata extends Command
{
    protected $signature = 'push-notifications:backfill-metadata {--dry-run : Preview changes without saving}';

    protected $description = 'Backfill push notification log module and sender for chat and other inferrable rows';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $updated = 0;

        PushNotificationLog::query()
            ->orderBy('id')
            ->chunkById(200, function ($logs) use ($dryRun, &$updated) {
                foreach ($logs as $log) {
                    $changes = PushNotificationLogMetadata::persistableCorrections($log);

                    if ($changes === []) {
                        continue;
                    }

                    $updated++;

                    if ($dryRun) {
                        $this->line(sprintf(
                            'Log #%d: %s',
                            $log->id,
                            json_encode($changes),
                        ));

                        continue;
                    }

                    $log->update($changes);
                }
            });

        $this->info($dryRun
            ? "Would update {$updated} log(s). Run without --dry-run to apply."
            : "Updated {$updated} log(s).");

        return self::SUCCESS;
    }
}
