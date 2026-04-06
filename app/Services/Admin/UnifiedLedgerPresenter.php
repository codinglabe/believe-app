<?php

namespace App\Services\Admin;

use App\Models\Organization;
use App\Models\Transaction;
use App\Models\User;

/**
 * Builds the admin "BIU unified ledger" row: combines the workbook spec (module, transaction_type,
 * From/To, amount breakdown, provider, reference) with finance columns from ledger_report.
 */
class UnifiedLedgerPresenter
{
    /**
     * @param  array<string, mixed>  $ledgerReport  Output of TransactionLedgerController::buildLedgerReportRow
     * @param  array<string, mixed>|null  $donationPayload
     * @param  array{related_kind: string, related_label: string, related_display_name: string}  $related
     * @return array<string, mixed>
     */
    public function present(
        Transaction $t,
        array $ledgerReport,
        ?array $donationPayload,
        ?string $donationPerspective,
        array $related,
    ): array {
        $meta = is_array($t->meta) ? $t->meta : [];
        $sourceType = (string) ($ledgerReport['source_type'] ?? 'ledger_unclassified');
        $module = $this->resolveModule($t, $sourceType);
        $transactionType = $this->resolveTransactionType($t, $module, $sourceType, $donationPerspective);
        $parties = $this->resolveParties($t, $donationPayload, $donationPerspective, $ledgerReport, $related, $module);
        $amounts = $this->resolveAmounts($t, $meta, $ledgerReport);
        $sellingPayouts = $this->resolveSellingPayoutAmounts($ledgerReport);
        $provider = $this->resolveProvider($t, $meta, $ledgerReport, $donationPayload);
        $reference = $this->resolveExternalReference($t, $meta);
        $relatedRecord = $this->resolveRelatedRecordLabel($t, $donationPayload, $related, $sourceType);
        $when = $t->processed_at ?? $t->created_at;

        return [
            'txn_id' => $t->id,
            'datetime_iso' => $when->toIso8601String(),
            'module' => $module,
            'transaction_type' => $transactionType,
            'direction' => $this->resolveDirection($t, $module),
            'from_type' => $parties['from_type'],
            'from_name' => $parties['from_name'],
            'from_email' => $parties['from_email'],
            'from_id' => $parties['from_id'],
            'to_type' => $parties['to_type'],
            'to_name' => $parties['to_name'],
            'to_email' => $parties['to_email'],
            'to_id' => $parties['to_id'],
            'related_record' => $relatedRecord,
            'subtotal_amount' => $amounts['subtotal'],
            'sales_tax_amount' => $amounts['sales_tax'],
            'shipping_amount' => $amounts['shipping'],
            'gross_amount' => $amounts['gross'],
            'processor_fee_amount' => $amounts['processor_fee'],
            'stripe_fee_amount' => $amounts['stripe_fee'],
            'bridge_fee_amount' => $amounts['bridge_fee'],
            'biu_fee_amount' => $amounts['biu_fee'],
            'split_amount' => $amounts['split'],
            'refund_amount' => $amounts['refund'],
            'net_amount' => $amounts['net'],
            'supplier_payout_amount' => $sellingPayouts['supplier'],
            'organization_payout_amount' => $sellingPayouts['organization'],
            'platform_payout_amount' => $sellingPayouts['platform'],
            'currency' => $t->currency ?? 'USD',
            'status' => $t->status,
            'provider' => $provider,
            'reference' => $reference,
            'organization_id' => $ledgerReport['organization_id'] ?? null,
            'organization_name' => $ledgerReport['organization_name'] ?? null,
        ];
    }

    /**
     * Supplier / nonprofit / platform settlement lines for selling modules (marketplace, Service Hub, etc.).
     *
     * @param  array<string, mixed>  $ledgerReport
     * @return array{supplier: float|null, organization: float|null, platform: float|null}
     */
    private function resolveSellingPayoutAmounts(array $ledgerReport): array
    {
        $pick = function (string $key) use ($ledgerReport): ?float {
            if (! array_key_exists($key, $ledgerReport)) {
                return null;
            }
            $v = $ledgerReport[$key];
            if ($v === null || $v === '') {
                return null;
            }

            return round((float) $v, 2);
        };

        return [
            'supplier' => $pick('supplier_payout'),
            'organization' => $pick('organization_payout'),
            'platform' => $pick('platform_payout'),
        ];
    }

    private function resolveModule(Transaction $t, string $sourceType): string
    {
        $rt = $t->related_type ? ltrim((string) $t->related_type, '\\') : '';
        $base = $rt !== '' ? class_basename($rt) : '';

        if ($t->type === 'refund' || $t->status === Transaction::STATUS_REFUND) {
            return 'refund';
        }
        if (in_array($t->type, ['withdrawal', 'transfer_out'], true)) {
            return 'payout';
        }

        return match ($sourceType) {
            'donation' => 'donation',
            'fundme_donation' => 'fundme',
            'care_alliance_donation' => 'campaign',
            'believe_points_purchase' => 'believe_points',
            'order' => $base === 'MerchantHubOfferRedemption' ? 'merchant_hub' : 'marketplace',
            'service_order' => 'servicehub',
            'enrollment' => 'course',
            'plan_subscription', 'wallet_plan_subscription' => 'organization_subscription',
            'gift_card', 'raffle' => 'marketplace',
            'commission' => $this->moduleForCommission($t),
            'ledger_unclassified' => match ($base) {
                'Enrollment' => 'course',
                'Plan' => 'organization_subscription',
                'GiftCard' => 'marketplace',
                'Raffle' => 'marketplace',
                'MerchantHubOfferRedemption' => 'merchant_hub',
                'MerchantHubReferralReward' => 'merchant_hub',
                default => $this->moduleFromMetaOrType($t),
            },
            default => match ($base) {
                'Enrollment' => 'course',
                'Plan' => 'organization_subscription',
                'GiftCard' => 'marketplace',
                'Raffle' => 'marketplace',
                'MerchantHubOfferRedemption' => 'merchant_hub',
                'MerchantHubReferralReward' => 'merchant_hub',
                default => $this->moduleFromMetaOrType($t),
            },
        };
    }

    private function moduleForCommission(Transaction $t): string
    {
        $meta = is_array($t->meta) ? $t->meta : [];

        if (! empty($meta['merchant_id'])) {
            return 'merchant_subscription';
        }

        return 'organization_subscription';
    }

    private function moduleFromMetaOrType(Transaction $t): string
    {
        $meta = is_array($t->meta) ? $t->meta : [];
        $type = $t->type ?? '';

        if (! empty($meta['subscription_id']) || str_contains(strtolower((string) ($meta['plan_name'] ?? '')), 'subscription')) {
            return ! empty($meta['merchant_id']) ? 'merchant_subscription' : 'organization_subscription';
        }

        if (in_array($type, ['plan_subscription', 'wallet_subscription', 'kyc_fee'], true)) {
            return 'organization_subscription';
        }

        if ($type === 'adjustment' || ($meta['adjustment_reason'] ?? null)) {
            return 'adjustment';
        }

        if ($type === 'commission') {
            return $this->moduleForCommission($t);
        }

        if ($type === 'purchase') {
            return 'marketplace';
        }

        if ($type === 'deposit') {
            $pm = strtolower((string) ($t->payment_method ?? ''));
            if (str_contains($pm, 'donat') || ! empty($meta['donation_id']) || ! empty($meta['care_alliance_donation_id'])) {
                return 'donation';
            }

            return 'marketplace';
        }

        if ($type === 'transfer_in') {
            return 'marketplace';
        }

        // Last resort: map to a real BIU workbook module (never "other").
        return 'marketplace';
    }

    private function resolveTransactionType(
        Transaction $t,
        string $module,
        string $sourceType,
        ?string $donationPerspective,
    ): string {
        if ($t->type === 'refund') {
            $scope = is_array($t->meta) ? (string) ($t->meta['refund_scope'] ?? '') : '';

            return match ($scope) {
                'shipping' => 'shipping_refund',
                'tax' => 'tax_refund',
                default => 'payment_refund',
            };
        }

        if (in_array($t->type, ['withdrawal', 'transfer_out'], true)) {
            $meta = is_array($t->meta) ? $t->meta : '';
            $isMerchant = ! empty($meta['merchant_id']) || (! empty($meta['payout_recipient']) && $meta['payout_recipient'] === 'merchant');

            return $isMerchant ? 'merchant_payout' : 'organization_payout';
        }

        return match ($module) {
            'donation' => $this->donationTransactionType($t, $donationPerspective),
            'fundme' => 'fundme_contribution',
            'campaign' => 'campaign_contribution',
            'believe_points' => 'believe_points_purchase',
            'marketplace' => 'marketplace_sale',
            'servicehub' => 'service_payment',
            'course' => 'course_enrollment',
            'merchant_hub' => 'merchant_hub_sale',
            'organization_subscription' => 'organization_subscription_paid',
            'merchant_subscription' => 'merchant_subscription_paid',
            'payout' => 'organization_payout',
            'refund' => 'payment_refund',
            'adjustment' => 'adjustment',
            default => $sourceType !== 'ledger_unclassified' ? str_replace('-', '_', $sourceType) : str_replace('-', '_', (string) ($t->type ?? 'ledger')),
        };
    }

    private function donationTransactionType(Transaction $t, ?string $donationPerspective): string
    {
        if (in_array($donationPerspective, ['donor', 'campaign'], true)) {
            return 'donation_payment';
        }
        if ($t->type === 'purchase' && ($t->payment_method ?? '') === 'donation') {
            return 'donation_payment';
        }
        $meta = is_array($t->meta) ? $t->meta : [];
        if (($meta['ledger_role'] ?? '') === 'donor_payment') {
            return 'donation_payment';
        }

        return 'donation_received';
    }

    private function resolveDirection(Transaction $t, string $module): string
    {
        if ($t->type === 'refund' || in_array($t->type, ['withdrawal', 'transfer_out'], true)) {
            return 'debit';
        }
        if ($module === 'payout') {
            return 'debit';
        }

        return 'credit';
    }

    /**
     * @param  array<string, mixed>  $ledgerReport
     * @param  array{related_kind: string, related_label: string, related_display_name: string}  $related
     * @return array{from_type: string, from_name: string|null, from_email: string|null, from_id: int|null, to_type: string, to_name: string|null, to_email: string|null, to_id: int|null}
     */
    private function resolveParties(
        Transaction $t,
        ?array $donationPayload,
        ?string $donationPerspective,
        array $ledgerReport,
        array $related,
        string $module,
    ): array {
        $orgId = $ledgerReport['organization_id'] ?? null;
        $orgName = $ledgerReport['organization_name'] ?? null;
        $orgEmail = null;
        if ($orgId) {
            $orgEmail = Organization::query()->whereKey($orgId)->value('email');
        }

        $walletUser = $t->relationLoaded('user') ? $t->user : null;
        if (! $walletUser && $t->user_id) {
            $walletUser = User::query()->find($t->user_id, ['id', 'name', 'email']);
        }

        $donorUser = null;
        if ($donationPayload && ($donationPayload['kind'] ?? '') === 'donation' && ! empty($donationPayload['donor_user_id'])) {
            $donorUser = User::query()->find((int) $donationPayload['donor_user_id'], ['id', 'name', 'email']);
        }

        $defaultFrom = [
            'from_type' => 'supporter',
            'from_name' => $walletUser?->name,
            'from_email' => $walletUser?->email,
            'from_id' => $walletUser?->id,
        ];
        $defaultTo = [
            'to_type' => 'organization',
            'to_name' => $orgName,
            'to_email' => $orgEmail,
            'to_id' => $orgId,
        ];

        if ($module === 'merchant_hub' || ($module === 'marketplace' && str_contains(strtolower($related['related_kind'] ?? ''), 'merchant'))) {
            $defaultTo['to_type'] = 'merchant';
        }

        if ($module === 'organization_subscription' || $module === 'merchant_subscription') {
            $payer = $walletUser;
            $defaultFrom = [
                'from_type' => $module === 'merchant_subscription' ? 'merchant' : 'organization',
                'from_name' => $payer?->name ?? $orgName,
                'from_email' => $payer?->email ?? $orgEmail,
                'from_id' => $payer?->id,
            ];
            $defaultTo = [
                'to_type' => 'platform',
                'to_name' => 'BIU Platform',
                'to_email' => null,
                'to_id' => null,
            ];
        }

        if ($module === 'payout') {
            $defaultFrom = [
                'from_type' => 'platform',
                'from_name' => 'BIU Platform',
                'from_email' => null,
                'from_id' => null,
            ];
            $defaultTo = [
                'to_type' => $orgId ? 'organization' : 'merchant',
                'to_name' => $orgName ?? $walletUser?->name,
                'to_email' => $orgEmail ?? $walletUser?->email,
                'to_id' => $orgId ?? $walletUser?->id,
            ];
        }

        if ($module === 'refund') {
            $defaultFrom = [
                'from_type' => 'platform',
                'from_name' => 'BIU Platform',
                'from_email' => null,
                'from_id' => null,
            ];
            $defaultTo = [
                'to_type' => 'buyer',
                'to_name' => $walletUser?->name,
                'to_email' => $walletUser?->email,
                'to_id' => $walletUser?->id,
            ];
        }

        if ($module === 'campaign' && $donationPerspective === 'campaign') {
            $defaultFrom['from_type'] = 'supporter';
            $defaultTo['to_type'] = 'organization';
        }

        if ($donationPayload && ($donationPayload['kind'] ?? '') === 'donation' && ! ($donationPayload['missing'] ?? false)) {
            if ($donorUser) {
                $defaultFrom['from_name'] = $donorUser->name;
                $defaultFrom['from_email'] = $donorUser->email;
                $defaultFrom['from_id'] = $donorUser->id;
            }
            if ($orgName === null && ! empty($donationPayload['organization_name'])) {
                $defaultTo['to_name'] = (string) $donationPayload['organization_name'];
            }
        }

        if (in_array($donationPerspective, ['recipient_direct', 'recipient_split', 'alliance_fee'], true)) {
            $defaultTo['to_name'] = $orgName ?? $defaultTo['to_name'];
            $defaultTo['to_type'] = $donationPerspective === 'alliance_fee' ? 'organization' : 'organization';
        }

        if ($donationPerspective === 'donor' || $donationPerspective === 'campaign') {
            $defaultFrom['from_type'] = 'supporter';
            if ($donorUser) {
                $defaultFrom['from_name'] = $donorUser->name;
                $defaultFrom['from_email'] = $donorUser->email;
                $defaultFrom['from_id'] = $donorUser->id;
            }
            $defaultTo['to_type'] = 'organization';
            $defaultTo['to_name'] = $orgName ?? $related['related_display_name'] ?? $defaultTo['to_name'];
        }

        if ($module === 'marketplace') {
            if ($walletUser) {
                $payerOrg = Organization::forAuthUser($walletUser);
                if ($payerOrg) {
                    $defaultFrom['from_type'] = 'organization';
                    $defaultFrom['from_name'] = $payerOrg->name;
                    $defaultFrom['from_email'] = $payerOrg->email ?: $walletUser->email;
                    $defaultFrom['from_id'] = $payerOrg->id;
                }
            }
            if ($orgName !== null && $orgName !== '') {
                $defaultTo['to_type'] = 'organization';
                $defaultTo['to_name'] = $orgName;
                $defaultTo['to_id'] = $orgId ?? $defaultTo['to_id'];
                $defaultTo['to_email'] = $orgEmail ?? $defaultTo['to_email'];
            }
        }

        if ($module === 'believe_points' && $walletUser) {
            $defaultFrom = [
                'from_type' => 'buyer',
                'from_name' => $walletUser->name,
                'from_email' => $walletUser->email,
                'from_id' => (int) $walletUser->id,
            ];
            $defaultTo = [
                'to_type' => '',
                'to_name' => null,
                'to_email' => null,
                'to_id' => null,
            ];
        }

        $rowMeta = is_array($t->meta) ? $t->meta : [];
        if ($module === 'refund' && $walletUser && ($rowMeta['source'] ?? '') === 'believe_points_purchase_refund') {
            $party = $this->resolveBelievePointsPayerFromUser($walletUser);
            $defaultFrom = [
                'from_type' => 'platform',
                'from_name' => 'BIU Platform',
                'from_email' => null,
                'from_id' => null,
            ];
            $defaultTo = [
                'to_type' => $party['from_type'],
                'to_name' => $party['from_name'],
                'to_email' => $party['from_email'],
                'to_id' => $party['from_id'],
            ];
        }

        return array_merge($defaultFrom, $defaultTo);
    }

    /**
     * Believe Points purchases are billed to a user; if they act as an org (owner or board-linked), show the org as payer.
     *
     * @return array{from_type: string, from_name: string|null, from_email: string|null, from_id: int|null}
     */
    private function resolveBelievePointsPayerFromUser(User $walletUser): array
    {
        $org = Organization::forAuthUser($walletUser);
        if ($org) {
            return [
                'from_type' => 'organization',
                'from_name' => $org->name,
                'from_email' => $org->email ?: $walletUser->email,
                'from_id' => (int) $org->id,
            ];
        }

        return [
            'from_type' => 'buyer',
            'from_name' => $walletUser->name,
            'from_email' => $walletUser->email,
            'from_id' => (int) $walletUser->id,
        ];
    }

    /**
     * @param  array<string, mixed>  $meta
     * @param  array<string, mixed>  $ledgerReport
     * @return array{subtotal: float|null, sales_tax: float|null, shipping: float|null, gross: float, stripe_fee: float, bridge_fee: float, biu_fee: float, split: float, refund: float, net: float|null, processor_fee: float}
     */
    private function resolveAmounts(Transaction $t, array $meta, array $ledgerReport): array
    {
        $gross = (float) ($ledgerReport['gross_amount'] ?? 0);
        $stripe = (float) ($ledgerReport['stripe_fee'] ?? 0);
        $bridge = (float) ($ledgerReport['bridge_fee'] ?? 0);
        $biu = (float) ($ledgerReport['biu_fee'] ?? 0);
        $split = (float) ($ledgerReport['split_deduction'] ?? 0);
        $refund = (float) ($ledgerReport['refund_amount'] ?? 0);
        $net = $ledgerReport['net_to_organization'] ?? null;
        if ($net !== null) {
            $net = (float) $net;
        }

        $subtotal = $this->metaFloat($meta, ['subtotal_amount', 'subtotal', 'line_subtotal']);
        $tax = $this->metaFloat($meta, ['sales_tax_amount', 'sales_tax', 'tax_amount', 'tax_total']);
        $shipping = $this->metaFloat($meta, ['shipping_amount', 'shipping', 'shipping_total']);

        $lrSub = $ledgerReport['subtotal_amount'] ?? null;
        if ($lrSub !== null && is_numeric($lrSub) && (float) $lrSub > 0) {
            $subtotal = round((float) $lrSub, 2);
        }
        $lrTax = $ledgerReport['sales_tax_amount'] ?? null;
        if ($lrTax !== null && is_numeric($lrTax) && (float) $lrTax > 0) {
            $tax = round((float) $lrTax, 2);
        }
        $lrShip = $ledgerReport['shipping_amount'] ?? null;
        if ($lrShip !== null && is_numeric($lrShip) && (float) $lrShip > 0) {
            $shipping = round((float) $lrShip, 2);
        }

        if ($subtotal <= 0 && $gross > 0) {
            $subtotal = $gross - $tax - $shipping;
            if ($subtotal < 0) {
                $subtotal = $gross;
            }
        }

        $processorFee = $stripe + $bridge;

        return [
            'subtotal' => $subtotal > 0 ? round($subtotal, 2) : null,
            'sales_tax' => $tax > 0 ? round($tax, 2) : null,
            'shipping' => $shipping > 0 ? round($shipping, 2) : null,
            'gross' => round($gross, 2),
            'stripe_fee' => round($stripe, 2),
            'bridge_fee' => round($bridge, 2),
            'biu_fee' => round($biu, 2),
            'split' => round($split, 2),
            'refund' => round($refund, 2),
            'net' => $net !== null ? round($net, 2) : null,
            'processor_fee' => round($processorFee, 2),
        ];
    }

    private function metaFloat(array $meta, array $keys): float
    {
        foreach ($keys as $k) {
            if (! array_key_exists($k, $meta) || $meta[$k] === null || $meta[$k] === '') {
                continue;
            }
            $v = $meta[$k];
            if (is_numeric($v)) {
                return round((float) $v, 2);
            }
        }

        return 0.0;
    }

    /**
     * @param  array<string, mixed>  $meta
     * @param  array<string, mixed>|null  $donationPayload
     */
    private function resolveProvider(Transaction $t, array $meta, array $ledgerReport, ?array $donationPayload = null): string
    {
        if ($donationPayload !== null && ($donationPayload['kind'] ?? '') === 'donation') {
            $dpm = strtolower((string) ($donationPayload['payment_method'] ?? ''));
            if ($dpm === 'believe_points' || str_contains($dpm, 'believe_point')) {
                return 'points';
            }
        }

        $pm = strtolower((string) ($t->payment_method ?? ''));
        if ($pm === 'believe_points' || str_contains($pm, 'point') || str_contains($pm, 'believe_point')) {
            return 'points';
        }
        $metaDonationPm = strtolower((string) ($meta['donation_payment_method'] ?? ''));
        if ($metaDonationPm === 'believe_points' || str_contains($metaDonationPm, 'believe_point')) {
            return 'points';
        }
        if (str_starts_with((string) ($t->transaction_id ?? ''), 'believe_points_donation')) {
            return 'points';
        }
        if ((float) ($ledgerReport['bridge_fee'] ?? 0) > 0
            || ! empty($meta['bridge_transfer_id'])
            || ! empty($meta['bridge_payment_id'])
            || ! empty($meta['bridge_customer_id'])
            || ! empty($meta['bridge_virtual_account_id'])) {
            if (str_starts_with((string) ($t->transaction_id ?? ''), 'pi_')) {
                return 'stripe';
            }

            return 'bridge';
        }
        if (str_contains($pm, 'stripe') || str_contains($pm, 'card')
            || str_starts_with((string) ($t->transaction_id ?? ''), 'pi_')
            || str_starts_with((string) ($t->transaction_id ?? ''), 'ch_')) {
            return 'stripe';
        }
        if (! empty($meta['stripe_payment_intent']) || ! empty($meta['stripe_payment_intent_id'])) {
            return 'stripe';
        }

        return 'internal';
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    private function resolveExternalReference(Transaction $t, array $meta): string
    {
        foreach (['stripe_payment_intent', 'stripe_payment_intent_id', 'payment_intent', 'bridge_transfer_id', 'bridge_payment_id', 'paypal_order_id'] as $k) {
            if (! empty($meta[$k]) && is_string($meta[$k])) {
                return $meta[$k];
            }
        }
        $tid = (string) ($t->transaction_id ?? '');

        return $tid !== '' ? $tid : '—';
    }

    /**
     * @param  array<string, mixed>|null  $donationPayload
     * @param  array{related_kind: string, related_label: string, related_display_name: string}  $related
     */
    private function resolveRelatedRecordLabel(Transaction $t, ?array $donationPayload, array $related, string $sourceType): string
    {
        if ($donationPayload && ($donationPayload['missing'] ?? false)) {
            return 'Donation #'.($donationPayload['donation_id'] ?? '?').' (missing)';
        }
        if (($donationPayload['kind'] ?? '') === 'donation' && ! empty($donationPayload['id'])) {
            return 'Donation #'.$donationPayload['id'];
        }
        if (($donationPayload['kind'] ?? '') === 'care_alliance_campaign' && ! empty($donationPayload['id'])) {
            return 'Campaign Donation #'.$donationPayload['id'];
        }

        if ($sourceType === 'fundme_donation' && $t->related_id) {
            return 'FundMe Donation #'.$t->related_id;
        }
        if ($sourceType === 'order' && $t->related_id) {
            return 'Order #'.$t->related_id;
        }
        if ($sourceType === 'service_order' && $t->related_id) {
            return 'Service Order #'.$t->related_id;
        }
        if ($sourceType === 'believe_points_purchase' && $t->related_id) {
            return $t->type === 'refund'
                ? 'Believe Points refund #'.$t->related_id
                : 'Believe Points purchase #'.$t->related_id;
        }

        $label = trim((string) ($related['related_label'] ?? ''));
        if ($label !== '' && $label !== '—') {
            return $label;
        }

        if ($t->related_type && $t->related_id !== null && $t->related_id !== '') {
            $base = class_basename(ltrim((string) $t->related_type, '\\'));

            return $base.' #'.$t->related_id;
        }

        return '—';
    }
}
