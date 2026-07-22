import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileText, Loader2, RefreshCw } from 'lucide-react';
import axios from 'axios';

interface PagePost {
    id: string;
    message: string;
    created_time?: string | null;
    permalink_url?: string | null;
    picture?: string | null;
}

interface Props {
    accountId: number;
    pageName: string;
}

export default function FacebookPageContentPanel({ accountId, pageName }: Props) {
    const [loading, setLoading] = useState(false);
    const [posts, setPosts] = useState<PagePost[] | null>(null);
    const [fetchedAt, setFetchedAt] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await axios.get(`/facebook/${accountId}/content`);
            if (!data.success) {
                throw new Error(data.message || 'Failed to load Page content');
            }
            setPosts(data.data.posts ?? []);
            setFetchedAt(data.data.fetched_at ?? null);
        } catch (e: unknown) {
            const msg = axios.isAxiosError(e)
                ? e.response?.data?.message || e.message
                : e instanceof Error
                  ? e.message
                  : 'Failed to load Page content';
            setError(msg);
            setPosts(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="h-4 w-4 text-blue-600" />
                    Page content — {pageName}
                </div>
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={load} disabled={loading}>
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    {posts ? 'Refresh' : 'View Page posts'}
                </Button>
            </div>
            <p className="text-xs text-muted-foreground">
                Uses <code>pages_read_engagement</code> to read posts published on your Page (text and media links).
                We do not load likes, reactions, comments counts, or views.
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {posts && posts.length === 0 && (
                <p className="text-sm text-muted-foreground">No recent published posts found on this Page.</p>
            )}
            {posts && posts.length > 0 && (
                <ul className="space-y-2">
                    {posts.map((post) => (
                        <li key={post.id} className="rounded-md border bg-background p-2 text-sm">
                            <p className="whitespace-pre-wrap break-words">{post.message}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                {post.created_time && (
                                    <span>{new Date(post.created_time).toLocaleString()}</span>
                                )}
                                {post.permalink_url && (
                                    <a
                                        href={post.permalink_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                        Open on Facebook
                                    </a>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            {fetchedAt && (
                <p className="text-xs text-muted-foreground">
                    Last loaded: {new Date(fetchedAt).toLocaleString()}
                </p>
            )}
        </div>
    );
}
