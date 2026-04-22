import { useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, Star, Truck, Zap } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PrintifyProviderComparisonRow } from '@/types/printify';
import { cn } from '@/lib/utils';

function formatMoney(cents: number | null, currency: string): string {
    if (cents === null || !Number.isFinite(cents)) {
        return '—';
    }
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency || 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(cents / 100);
    } catch {
        return (cents / 100).toFixed(2);
    }
}

function deliveryLabel(row: PrintifyProviderComparisonRow): string | null {
    return row.estimated_delivery_label ?? row.handling_time_label ?? null;
}

function totalCostCents(row: PrintifyProviderComparisonRow): number | null {
    if (row.total_cost_cents != null && Number.isFinite(row.total_cost_cents)) {
        return row.total_cost_cents;
    }
    if (row.base_cost_cents != null && row.shipping_first_item_cents != null) {
        return row.base_cost_cents + row.shipping_first_item_cents;
    }
    return null;
}

type Props = {
    rows: PrintifyProviderComparisonRow[];
    selectedId: string;
    loading: boolean;
    onSelect: (providerId: string) => void;
    disabled?: boolean;
};

function MetadataLine({ row }: { row: PrintifyProviderComparisonRow }) {
    const cur = row.currency || 'USD';
    const base = formatMoney(row.base_cost_cents, cur);
    const ship = formatMoney(row.shipping_first_item_cents, cur);
    const totalCents = totalCostCents(row);
    const delivery = deliveryLabel(row) ?? '—';
    const place = row.country_label ?? row.country_code ?? '—';

    if (row.is_printify_choice) {
        return (
            <div className="mt-1 space-y-0.5 text-sm text-gray-600 dark:text-gray-400">
                <p>Auto-managed provider selection by Printify</p>
                <p>Best for simple setup</p>
            </div>
        );
    }

    const printMissing = row.base_cost_cents == null;

    return (
        <div className="text-muted-foreground mt-2 space-y-1.5 text-sm leading-relaxed">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                <div className="flex flex-wrap gap-x-2 sm:col-span-2">
                    <dt className="font-medium text-gray-700 dark:text-gray-300">Print fulfillment</dt>
                    <dd className="text-gray-900 dark:text-gray-100">
                        {printMissing ? (
                            <span className="text-muted-foreground font-normal">
                                Not in catalog API — set when the product is created in Printify
                            </span>
                        ) : (
                            base
                        )}
                    </dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                    <dt className="font-medium text-gray-700 dark:text-gray-300">Shipping (1st item)</dt>
                    <dd>{ship}</dd>
                </div>
                {totalCents != null && (
                    <div className="flex flex-wrap gap-x-2">
                        <dt className="font-medium text-gray-700 dark:text-gray-300">Print + ship total</dt>
                        <dd className="font-semibold text-emerald-700 dark:text-emerald-400">
                            {formatMoney(totalCents, cur)}
                        </dd>
                    </div>
                )}
                <div className="flex flex-wrap gap-x-2 sm:col-span-2">
                    <dt className="font-medium text-gray-700 dark:text-gray-300">Est. delivery</dt>
                    <dd>{delivery}</dd>
                </div>
                {row.average_rating != null && row.average_rating > 0 && (
                    <div className="flex flex-wrap items-center gap-x-2 sm:col-span-2">
                        <dt className="font-medium text-gray-700 dark:text-gray-300">Value score</dt>
                        <dd className="inline-flex items-center gap-0.5">
                            {Number(row.average_rating).toFixed(1)}
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" aria-hidden />
                            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                                (relative rank for this product — not a Printify star rating)
                            </span>
                        </dd>
                    </div>
                )}
                <div className="flex flex-wrap gap-x-2 sm:col-span-2">
                    <dt className="font-medium text-gray-700 dark:text-gray-300">Ship-to</dt>
                    <dd>{place}</dd>
                </div>
            </dl>
            <p className="text-xs text-gray-500 dark:text-gray-400">
                Standard shipping and delivery range come from Printify&apos;s v2 standard shipping catalog for the
                selected region. Per-variant print pricing is returned on the shop product after creation, not on the
                public catalog variants endpoint.
            </p>
        </div>
    );
}

/** Order: recommended first, then alphabetical. */
function orderRowsForDropdown(rows: PrintifyProviderComparisonRow[]): PrintifyProviderComparisonRow[] {
    const rec = rows.find((r) => r.is_recommended);
    const rest = rows
        .filter((r) => !r.is_recommended)
        .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
    if (rec) {
        return [rec, ...rest];
    }
    return [...rows].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
}

export function PrintifyProviderComparisonList({ rows, selectedId, loading, onSelect, disabled }: Props) {
    const ordered = useMemo(() => orderRowsForDropdown(rows), [rows]);

    const selectedRow = useMemo(
        () => rows.find((r) => String(r.id) === selectedId) ?? null,
        [rows, selectedId],
    );

    const rowIdsKey = useMemo(() => rows.map((r) => r.id).join(','), [rows]);
    const onSelectRef = useRef(onSelect);
    onSelectRef.current = onSelect;

    useEffect(() => {
        if (loading || rows.length === 0 || selectedId !== '') {
            return;
        }
        const pick = rows.find((r) => r.is_recommended) ?? ordered[0];
        if (pick) {
            onSelectRef.current(String(pick.id));
        }
    }, [loading, rowIdsKey, selectedId, rows, ordered]);

    if (loading) {
        return (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 py-10 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                Loading providers from Printify…
            </div>
        );
    }

    if (rows.length === 0) {
        return (
            <p className="text-muted-foreground rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm dark:border-gray-700">
                No print providers returned for this product type.
            </p>
        );
    }

    return (
        <div className="space-y-3">
            <div>
                <Select value={selectedId || undefined} onValueChange={onSelect} disabled={disabled}>
                    <SelectTrigger
                        className="h-auto min-h-11 w-full border-gray-300 bg-white text-left text-base dark:border-gray-600 dark:bg-gray-800"
                        aria-label="Choose print provider"
                    >
                        <SelectValue placeholder="Select print provider" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[min(24rem,70vh)] border-gray-200 dark:border-gray-700">
                        {ordered.map((row) => {
                            const cur = row.currency || 'USD';
                            const base = formatMoney(row.base_cost_cents, cur);
                            const ship = formatMoney(row.shipping_first_item_cents, cur);
                            const tot = formatMoney(totalCostCents(row), cur);
                            const time = deliveryLabel(row) ?? '—';
                            const rating =
                                row.average_rating != null && row.average_rating > 0
                                    ? `${Number(row.average_rating).toFixed(1)} ★`
                                    : null;

                            const line1 = row.is_recommended ? `${row.title} · Recommended` : row.title;
                            const printBit =
                                row.base_cost_cents != null ? `${base} print` : 'Print at save (catalog)';
                            const totalBit = row.base_cost_cents != null ? `${tot} total · ` : '';
                            const line2 = row.is_printify_choice
                                ? 'Printify-managed · simple setup'
                                : `${printBit} · ${ship} ship · ${totalBit}${time}${rating ? ` · ${rating}` : ''} · ${row.country_label ?? row.country_code ?? '—'}`;

                            return (
                                <SelectItem
                                    key={row.id}
                                    value={String(row.id)}
                                    textValue={line1}
                                    className="cursor-pointer py-3"
                                >
                                    <div className="flex max-w-[min(100vw-4rem,28rem)] flex-col gap-0.5 pr-2 text-left">
                                        <span className="font-semibold leading-tight">{line1}</span>
                                        <span className="text-muted-foreground line-clamp-2 text-xs leading-snug">{line2}</span>
                                    </div>
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
            </div>

            {selectedRow && (
                <div
                    className={cn(
                        'rounded-lg border p-4',
                        selectedRow.is_recommended
                            ? 'border-amber-200/80 bg-gradient-to-br from-slate-50 to-blue-50/60 dark:border-amber-900/40 dark:from-slate-950/50 dark:to-blue-950/30'
                            : 'border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-900/40',
                    )}
                >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">{selectedRow.title}</h4>
                                {selectedRow.is_recommended && (
                                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-950 dark:bg-amber-900/50 dark:text-amber-100">
                                        Recommended Provider
                                    </span>
                                )}
                            </div>
                            <MetadataLine row={selectedRow} />
                            {selectedRow.is_recommended && !selectedRow.is_printify_choice && (
                                <>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-950 px-2.5 py-1 text-xs font-medium text-white dark:bg-blue-900">
                                            <Shield className="h-3 w-3 shrink-0" aria-hidden />
                                            Best Value
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-1 text-xs font-medium text-white">
                                            <Zap className="h-3 w-3 shrink-0" aria-hidden />
                                            Fast Shipping
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-900 dark:bg-blue-950/80 dark:text-blue-100">
                                            <Truck className="h-3 w-3 shrink-0" aria-hidden />
                                            {selectedRow.country_label ?? selectedRow.country_code ?? 'USA'}
                                        </span>
                                    </div>
                                    <p className="mt-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                                        Recommended from lowest standard shipping to this region when catalog print cost
                                        is unavailable. Value score is a relative rank for this blueprint only, not a Printify
                                        catalog star rating.
                                    </p>
                                </>
                            )}
                        </div>
                        {selectedRow.is_recommended && (
                            <Button
                                type="button"
                                className="shrink-0 bg-blue-600 text-white hover:bg-blue-700"
                                onClick={() => onSelect(String(selectedRow.id))}
                                disabled={disabled}
                            >
                                Use Recommended Provider
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
