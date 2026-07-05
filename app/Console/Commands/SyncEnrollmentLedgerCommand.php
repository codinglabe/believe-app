<?php

namespace App\Console\Commands;

use App\Models\Enrollment;
use App\Models\Transaction;
use App\Services\EnrollmentLedgerService;
use Illuminate\Console\Command;

class SyncEnrollmentLedgerCommand extends Command
{
    protected $signature = 'ledger:sync-enrollments {--limit=0 : Max enrollments to upsert (0 = all)}';

    protected $description = 'Upsert admin ledger rows for Connection Hub enrollments (one transaction row per enrollment)';

    public function handle(): int
    {
        $limit = max(0, (int) $this->option('limit'));
        $processed = 0;
        $created = 0;
        $updated = 0;
        $skipped = 0;
        $backfilled = 0;

        $enrollmentQuery = Enrollment::query()
            ->with('course.organization.organization', 'user')
            ->whereIn('status', ['active', 'completed', 'pending', 'refunded', 'cancelled'])
            ->orderBy('id');

        if ($limit > 0) {
            $enrollmentQuery->limit($limit);
        }

        $enrollmentQuery->each(function (Enrollment $enrollment) use (&$processed, &$created, &$updated, &$skipped) {
            $result = EnrollmentLedgerService::syncAdminLedgerRow($enrollment);
            if ($result['transaction'] === null) {
                $skipped++;

                return;
            }

            $processed++;
            if ($result['created']) {
                $created++;
            } else {
                $updated++;
            }
        });

        $txQuery = Transaction::query()
            ->where(function ($q) {
                $q->where('related_type', Enrollment::class)
                    ->orWhere('related_type', 'like', '%Enrollment')
                    ->orWhere('meta->source', 'course_enrollment')
                    ->orWhereNotNull('meta->enrollment_record_id')
                    ->orWhereNotNull('meta->enrollment_id');
            })
            ->orderBy('id');

        if ($limit > 0) {
            $txQuery->limit($limit);
        }

        $txQuery->each(function (Transaction $transaction) use (&$backfilled) {
            $enrollment = EnrollmentLedgerService::resolveEnrollmentForLedgerTransaction($transaction);
            if ($enrollment === null || $enrollment->course === null) {
                return;
            }

            EnrollmentLedgerService::syncTransaction($transaction, $enrollment, $enrollment->course);
            $backfilled++;
        });

        $ledgerRowCount = Transaction::query()
            ->where(function ($q) {
                $q->where('related_type', Enrollment::class)
                    ->orWhere('related_type', 'like', '%Enrollment')
                    ->orWhere('meta->source', 'course_enrollment')
                    ->orWhereNotNull('meta->enrollment_record_id');
            })
            ->whereNotIn('type', ['refund', 'cancellation'])
            ->count();

        $this->info("Processed {$processed} enrollment(s): {$created} created, {$updated} updated, {$skipped} skipped; backfilled {$backfilled} transaction row(s).");
        $this->info("Enrollment ledger rows in transactions table: {$ledgerRowCount}.");

        return self::SUCCESS;
    }
}
