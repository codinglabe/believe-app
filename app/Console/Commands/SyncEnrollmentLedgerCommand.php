<?php

namespace App\Console\Commands;

use App\Models\Enrollment;
use App\Models\Transaction;
use App\Services\EnrollmentLedgerService;
use Illuminate\Console\Command;

class SyncEnrollmentLedgerCommand extends Command
{
    protected $signature = 'ledger:sync-enrollments {--limit=500 : Max enrollments to upsert}';

    protected $description = 'Upsert admin ledger rows for course/event enrollments (creates missing transactions and backfills meta)';

    public function handle(): int
    {
        $limit = max(1, (int) $this->option('limit'));
        $upserted = 0;
        $backfilled = 0;

        Enrollment::query()
            ->with('course.organization.organization', 'user')
            ->whereIn('status', ['active', 'completed', 'pending'])
            ->orderByDesc('id')
            ->limit($limit)
            ->each(function (Enrollment $enrollment) use (&$upserted) {
                if (EnrollmentLedgerService::syncAdminLedgerRow($enrollment) !== null) {
                    $upserted++;
                }
            });

        Transaction::query()
            ->where(function ($q) {
                $q->where('related_type', Enrollment::class)
                    ->orWhere('related_type', 'like', '%Enrollment')
                    ->orWhere('meta->source', 'course_enrollment')
                    ->orWhereNotNull('meta->enrollment_id');
            })
            ->orderByDesc('id')
            ->limit($limit)
            ->each(function (Transaction $transaction) use (&$backfilled) {
                $meta = is_array($transaction->meta) ? $transaction->meta : [];
                $enrollmentDbId = (int) ($transaction->related_id ?: ($meta['enrollment_record_id'] ?? 0));
                if ($enrollmentDbId < 1) {
                    return;
                }

                $enrollment = Enrollment::query()
                    ->with('course.organization.organization')
                    ->find($enrollmentDbId);
                if ($enrollment === null || $enrollment->course === null) {
                    return;
                }

                EnrollmentLedgerService::syncTransaction($transaction, $enrollment, $enrollment->course);
                $backfilled++;
            });

        $this->info("Upserted {$upserted} enrollment ledger row(s); backfilled {$backfilled} existing transaction row(s).");

        return self::SUCCESS;
    }
}
