<?php

namespace App\Services;

use App\Models\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Log;

/**
 * Keeps IRS BMF import upload records aligned with queue batch state.
 * Stuck "queued"/"processing" rows block the scheduled irs:bmf:import command.
 */
final class IrsBmfImportMaintenanceService
{
    public static function reconcileStaleImports(): int
    {
        $staleHours = max(1, (int) config('services.irs.bmf_stale_import_hours', 6));
        $staleCutoff = now()->subHours($staleHours);
        $reconciled = 0;

        UploadedFile::query()
            ->where('original_name', 'IRS_BMF_Combined.csv')
            ->whereIn('status', ['queued', 'processing'])
            ->orderBy('id')
            ->each(function (UploadedFile $import) use ($staleCutoff, &$reconciled) {
                if (self::reconcileImport($import, $staleCutoff)) {
                    $reconciled++;
                }
            });

        return $reconciled;
    }

    private static function reconcileImport(UploadedFile $import, \DateTimeInterface $staleCutoff): bool
    {
        if ($import->batch_id) {
            $batch = Bus::findBatch($import->batch_id);
            if ($batch !== null) {
                if ($batch->finished()) {
                    $import->update([
                        'status' => $batch->failedJobs > 0 ? 'failed' : 'completed',
                    ]);
                    Log::info('IRS BMF import reconciled from finished batch', [
                        'upload_id' => $import->id,
                        'batch_id' => $import->batch_id,
                        'failed_jobs' => $batch->failedJobs,
                        'status' => $import->fresh()->status,
                    ]);

                    return true;
                }

                if ($batch->cancelled()) {
                    $import->update(['status' => 'failed']);
                    Log::info('IRS BMF import reconciled from cancelled batch', [
                        'upload_id' => $import->id,
                        'batch_id' => $import->batch_id,
                    ]);

                    return true;
                }
            }
        }

        if ($import->updated_at !== null && $import->updated_at->lt($staleCutoff)) {
            if ($import->batch_id) {
                Bus::findBatch($import->batch_id)?->cancel();
            }

            $import->update(['status' => 'failed']);
            Log::warning('IRS BMF import marked failed (stale)', [
                'upload_id' => $import->id,
                'batch_id' => $import->batch_id,
                'last_updated' => $import->updated_at?->toIso8601String(),
            ]);

            return true;
        }

        return false;
    }
}
