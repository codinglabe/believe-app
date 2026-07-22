import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BarChart3, Loader2, RefreshCw } from 'lucide-react';
import axios from 'axios';

interface Metric {
    key: string;
    label: string;
    value: string | number;
    description?: string;
}

interface Props {
    accountId: number;
    pageName: string;
    /** page = /facebook/{id}/engagement, post = /facebook/posts/{id}/analytics */
    type?: 'page' | 'post';
    postId?: number;
    compact?: boolean;
}

export default function FacebookEngagementPanel({
    accountId,
    pageName,
    type = 'page',
    postId,
    compact = false,
}: Props) {
    const [loading, setLoading] = useState(false);
    const [metrics, setMetrics] = useState<Metric[] | null>(null);
    const [fetchedAt, setFetchedAt] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        setWarning(null);
        try {
            const url =
                type === 'post' && postId
                    ? `/facebook/posts/${postId}/analytics`
                    : `/facebook/${accountId}/engagement`;
            const { data } = await axios.get(url);
            if (!data.success) {
                throw new Error(data.message || 'Failed to load engagement');
            }
            setMetrics(data.data.metrics ?? []);
            setFetchedAt(data.data.fetched_at ?? null);
            setWarning(typeof data.data.warning === 'string' ? data.data.warning : null);
        } catch (e: unknown) {
            const msg = axios.isAxiosError(e)
                ? e.response?.data?.message || e.message
                : e instanceof Error
                  ? e.message
                  : 'Failed to load engagement';
            setError(msg);
            setMetrics(null);
            setWarning(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={compact ? 'space-y-2' : 'space-y-3 rounded-lg border bg-muted/30 p-4'}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <BarChart3 className="h-4 w-4 text-green-600" />
                    {type === 'post' ? 'Post engagement' : 'Page engagement'} — {pageName}
                </div>
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={load} disabled={loading}>
                    {loading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                        <RefreshCw className="h-3 w-3" />
                    )}
                    {metrics ? 'Refresh' : 'View engagement'}
                </Button>
            </div>
            {!compact && (
                <p className="text-xs text-muted-foreground">
                    Uses <code>pages_read_engagement</code> to show reactions, comments, shares, and views from
                    Facebook. Data is only shown to you inside this app.
                </p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {warning && !error && <p className="text-sm text-amber-600 dark:text-amber-400">{warning}</p>}
            {metrics && metrics.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {metrics.map((m) => (
                        <div key={m.key} className="rounded-md border bg-background p-2">
                            <p className="text-xs text-muted-foreground">{m.label}</p>
                            <p className="text-lg font-semibold">{m.value}</p>
                        </div>
                    ))}
                </div>
            )}
            {fetchedAt && (
                <p className="text-xs text-muted-foreground">
                    Last loaded: {new Date(fetchedAt).toLocaleString()}
                </p>
            )}
        </div>
    );
}
