<?php

namespace App\Console\Commands;

use App\Models\Enrollment;
use App\Models\Transaction;
use App\Services\EnrollmentLedgerService;
use Illuminate\Console\Command;

class SyncEnrollmentLedgerCommand extends Command
{
    protected $signature = 'ledger:sync-enrollments {--limit=500 : Max enrollment transactions to sync}';

    protected $description = 'Backfill admin ledger fields for course/event enrollment transactions';

    public function handle(): int
    {
        $limit = max(1, (int) $this->option('limit'));
        $count = 0;

        Transaction::query()
            ->where(function ($q) {
                $q->where('related_type', Enrollment::class)
                    ->orWhere('related_type', 'like', '%Enrollment')
                    ->orWhere('meta->source', 'course_enrollment')
                    ->orWhereNotNull('meta->enrollment_id');
            })
            ->orderBy('id')
            ->limit($limit)
            ->each(function (Transaction $transaction) use (&$count) {
                $enrollment = Enrollment::query()
                    ->with('course.organization.organization')
                    ->find($transaction->related_id);
                if ($enrollment === null || $enrollment->course === null) {
                    return;
                }

                EnrollmentLedgerService::syncTransaction($transaction, $enrollment, $enrollment->course);
                $count++;
            });

        $this->info("Synced {$count} enrollment transaction row(s) for the admin ledger.");

        return self::SUCCESS;
    }
}
