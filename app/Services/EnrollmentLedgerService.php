<?php

namespace App\Services;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Organization;
use App\Models\Transaction;
use App\Support\UnifiedLedgerBrpActivity;
use App\Support\UnifiedLedgerBpStatus;
use App\Support\UnifiedLedgerType;

/**
 * Connection Hub course / event enrollments → admin unified transaction ledger.
 */
final class EnrollmentLedgerService
{
    /**
     * @return array{organization_id: int|null, organization_name: string|null, organization_ein: string|null}
     */
    public static function organizationContext(Course $course): array
    {
        $course->loadMissing('organization.organization');
        $org = $course->organization?->organization;
        if ($org === null && $course->organization_id) {
            $org = Organization::query()->where('user_id', $course->organization_id)->first();
        }

        return [
            'organization_id' => $org?->id !== null ? (int) $org->id : null,
            'organization_name' => $org?->name !== null ? (string) $org->name : null,
            'organization_ein' => $org?->ein !== null && trim((string) $org->ein) !== ''
                ? trim((string) $org->ein)
                : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function metaFor(Course $course, Enrollment $enrollment): array
    {
        $orgCtx = self::organizationContext($course);
        $isEvent = ($course->type ?? '') === 'events';
        $courseName = (string) $course->name;

        return array_filter([
            'source' => 'course_enrollment',
            'ledger_type' => UnifiedLedgerType::MONEY,
            'course_id' => $course->id,
            'course_name' => $courseName,
            'course_type' => $course->type,
            'event_name' => $isEvent ? $courseName : null,
            'enrollment_id' => $enrollment->enrollment_id,
            'enrollment_record_id' => $enrollment->id,
            'pricing_type' => $course->pricing_type,
            'organization_id' => $orgCtx['organization_id'],
            'organization_name' => $orgCtx['organization_name'],
            'description' => ($isEvent ? 'Event registration: ' : 'Course enrollment: ').$courseName,
        ], static fn ($v) => $v !== null && $v !== '');
    }

    public static function syncTransaction(Transaction $transaction, Enrollment $enrollment, ?Course $course = null): void
    {
        $course ??= $enrollment->course;
        if ($course === null) {
            return;
        }

        $meta = array_merge(
            is_array($transaction->meta) ? $transaction->meta : [],
            self::metaFor($course, $enrollment),
        );

        $updates = [
            'ledger_type' => UnifiedLedgerType::MONEY,
            'bp_status' => UnifiedLedgerBpStatus::NA,
            'brp_activity_type' => UnifiedLedgerBrpActivity::NA,
            'meta' => $meta,
        ];

        $reference = trim((string) ($enrollment->transaction_id ?? ''));
        if ($reference !== ''
            && ! str_starts_with($reference, 'free_enrollment_')
            && ! str_starts_with($reference, 'believe_points_enrollment_')) {
            $updates['transaction_id'] = $reference;
        }

        $transaction->update($updates);
    }

    /**
     * @param  array<string, mixed>  $financials
     * @return array<string, mixed>
     */
    public static function mergeLedgerFinancials(Enrollment $enrollment, Transaction $t, array $financials): array
    {
        $enrollment->loadMissing('course.organization.organization');
        $course = $enrollment->course;
        if ($course === null) {
            return $financials;
        }

        $orgCtx = self::organizationContext($course);
        $gross = round(max(0, (float) ($enrollment->amount_paid ?? $t->amount)), 2);
        if ($gross > 0) {
            $financials['gross_amount'] = $gross;
        }

        $meta = is_array($t->meta) ? $t->meta : [];
        $stripeFee = (float) ($financials['stripe_fee'] ?? $t->fee ?? 0);
        $biuFee = (float) ($meta['biu_platform_fee'] ?? $meta['platform_fee'] ?? 0);
        if ($biuFee > 0) {
            $financials['biu_fee'] = round($biuFee, 2);
            $financials['platform_payout'] = round($biuFee, 2);
        }

        if (! empty($orgCtx['organization_name'])) {
            $financials['organization_name'] = $orgCtx['organization_name'];
        }

        $orgNet = round(max(0, $gross - $biuFee - $stripeFee), 2);
        if ($orgNet > 0) {
            $financials['organization_payout'] = $orgNet;
            $financials['net_to_organization'] = $orgNet;
        }

        $creator = $course->creator;
        if ($creator !== null && filled($creator->name)) {
            $financials['supplier_name'] = (string) $creator->name;
            $financials['supplier_type'] = 'SUPPORTER';
        }

        return $financials;
    }

    public static function transactionIsEnrollment(Transaction $transaction): bool
    {
        $rt = $transaction->related_type ? ltrim((string) $transaction->related_type, '\\') : '';
        $meta = is_array($transaction->meta) ? $transaction->meta : [];

        return $rt === Enrollment::class
            || str_ends_with($rt, 'Enrollment')
            || ($meta['source'] ?? '') === 'course_enrollment'
            || ! empty($meta['enrollment_id']);
    }

    /**
     * Mark enrollment checkout paid (Stripe webhook or success URL). Idempotent for enrolled count.
     *
     * @param  array<string, string>  $sessionMeta
     * @param  array<string, mixed>  $extraMeta
     */
    public static function completeFromStripeCheckout(
        Transaction $transaction,
        string $paymentIntentId,
        array $sessionMeta = [],
        array $extraMeta = [],
    ): void {
        if (! self::transactionIsEnrollment($transaction)) {
            return;
        }

        $enrollment = self::resolveEnrollmentForTransaction($transaction, $sessionMeta);
        if ($enrollment === null || $enrollment->course === null) {
            return;
        }

        $wasPendingEnrollment = in_array($enrollment->status, ['pending', 'failed'], true);
        $wasPendingTransaction = $transaction->status === Transaction::STATUS_PENDING;
        $existingMeta = is_array($transaction->meta) ? $transaction->meta : [];

        $transactionUpdates = [
            'meta' => array_merge($existingMeta, $extraMeta),
        ];
        if ($wasPendingTransaction) {
            $transactionUpdates['status'] = Transaction::STATUS_COMPLETED;
            $transactionUpdates['processed_at'] = now();
        }
        if ($paymentIntentId !== '') {
            $transactionUpdates['transaction_id'] = $paymentIntentId;
        }

        $transaction->update($transactionUpdates);
        self::syncTransaction($transaction->fresh(), $enrollment->fresh(), $enrollment->course);

        if ($wasPendingEnrollment) {
            $enrollment->update([
                'status' => 'active',
                'transaction_id' => $paymentIntentId !== '' ? $paymentIntentId : $enrollment->transaction_id,
                'payment_method' => $enrollment->payment_method ?: 'card',
                'enrolled_at' => $enrollment->enrolled_at ?? now(),
            ]);
            $enrollment->course->increment('enrolled');
        }
    }

    /**
     * @param  array<string, string>  $sessionMeta
     */
    public static function resolveEnrollmentForTransaction(Transaction $transaction, array $sessionMeta = []): ?Enrollment
    {
        $dbId = null;
        if (! empty($sessionMeta['enrollment_id']) && ctype_digit((string) $sessionMeta['enrollment_id'])) {
            $dbId = (int) $sessionMeta['enrollment_id'];
        } elseif ($transaction->related_id !== null && (int) $transaction->related_id > 0) {
            $dbId = (int) $transaction->related_id;
        }

        if ($dbId === null || $dbId < 1) {
            return null;
        }

        return Enrollment::query()
            ->with('course.organization.organization')
            ->find($dbId);
    }
}
