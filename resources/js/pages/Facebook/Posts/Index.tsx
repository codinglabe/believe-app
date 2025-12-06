// resources/js/pages/Facebook/Posts/Index.tsx
import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Plus,
    RefreshCw,
    ExternalLink,
    Calendar,
    Clock,
    Image as ImageIcon,
    Video,
    Link as LinkIcon,
    Trash2,
    CheckCircle,
    XCircle,
    AlertCircle,
    BarChart3,
    Facebook,
    Filter,
    ChevronDown,
    AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface FacebookAccount {
    id: number;
    facebook_page_name: string;
    picture_url?: string;
}

interface FacebookPost {
    id: number;
    message: string;
    full_message: string;
    link?: string;
    image?: string;
    video?: string;
    status: 'draft' | 'pending' | 'published' | 'failed';
    scheduled_for?: string;
    published_at?: string;
    created_at: string;
    facebook_post_id?: string;
    response_data?: any;
    error_message?: string;
    facebook_account: FacebookAccount | null;
}

interface PaginationMeta {
    current_page: number;
    from: number;
    last_page: number;
    links: Array<{
        url: string | null;
        label: string;
        active: boolean;
    }>;
    path: string;
    per_page: number;
    to: number;
    total: number;
}

interface PaginationLinks {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
}

interface PostsData {
    data: FacebookPost[];
    links: PaginationLinks;
    meta: PaginationMeta;
}

interface Props {
    posts: PostsData;
    accounts: FacebookAccount[];
    hasConnectedAccounts: boolean;
    filters: {
        status: string;
        account_id: string;
        search: string;
    };
}

export default function Index({ posts, accounts, hasConnectedAccounts, filters }: Props) {
    const [loading, setLoading] = useState<Record<number, boolean>>({});
    const [deleting, setDeleting] = useState<Record<number, boolean>>({});

    // Safe access to posts data with fallback
    const safePosts = posts || {
        data: [],
        links: {
            first: '',
            last: '',
            prev: null,
            next: null
        },
        meta: {
            current_page: 1,
            from: 0,
            last_page: 1,
            links: [],
            path: '',
            per_page: 20,
            to: 0,
            total: 0
        }
    };

    const getStatusBadge = (status: FacebookPost['status']) => {
        const statusConfig = {
            draft: { variant: 'outline' as const, label: 'Draft', icon: Clock, color: 'text-gray-600' },
            pending: { variant: 'secondary' as const, label: 'Scheduled', icon: Calendar, color: 'text-blue-600' },
            published: { variant: 'default' as const, label: 'Published', icon: CheckCircle, color: 'text-green-600' },
            failed: { variant: 'destructive' as const, label: 'Failed', icon: XCircle, color: 'text-red-600' },
        };

        const config = statusConfig[status];
        const Icon = config.icon;

        return (
            <Badge variant={config.variant} className="gap-1">
                <Icon className={`h-3 w-3 ${config.color}`} />
                {config.label}
            </Badge>
        );
    };

    const getStats = () => {
        if (!safePosts?.data) {
            return {
                total: 0,
                published: 0,
                scheduled: 0,
                draft: 0,
                failed: 0,
            };
        }

        return {
            total: safePosts.meta?.total || 0,
            published: safePosts.data.filter(p => p.status === 'published').length,
            scheduled: safePosts.data.filter(p => p.status === 'pending').length,
            draft: safePosts.data.filter(p => p.status === 'draft').length,
            failed: safePosts.data.filter(p => p.status === 'failed').length,
        };
    };

    const stats = getStats();

    const handlePublish = async (postId: number) => {
        if (!confirm('Are you sure you want to publish this post to Facebook?')) {
            return;
        }

        setLoading(prev => ({ ...prev, [postId]: true }));

        try {
            await router.post(`/facebook/posts/${postId}/publish`);
            toast.success('Post published successfully!');
        } catch (error) {
            toast.error('Failed to publish post');
        } finally {
            setLoading(prev => ({ ...prev, [postId]: false }));
        }
    };

    const handleDelete = async (postId: number) => {
        if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
            return;
        }

        setDeleting(prev => ({ ...prev, [postId]: true }));

        try {
            await router.delete(`/facebook/posts/${postId}`);
            toast.success('Post deleted successfully');
        } catch (error) {
            toast.error('Failed to delete post');
        } finally {
            setDeleting(prev => ({ ...prev, [postId]: false }));
        }
    };

    const viewOnFacebook = (postId: string) => {
        window.open(`https://facebook.com/${postId}`, '_blank');
    };

    // Check if there's an error loading data
    if (!posts) {
        return (
            <AppLayout>
                <Head title="Facebook Posts - Error" />
                <div className="container mx-auto p-6">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center py-12">
                                <div className="mx-auto w-24 h-24 mb-6 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                                    <AlertTriangle className="h-12 w-12 text-red-600" />
                                </div>
                                <h2 className="text-2xl font-bold mb-3">Error Loading Posts</h2>
                                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                    There was an error loading your Facebook posts. Please try again.
                                </p>
                                <div className="flex gap-3 justify-center">
                                    <Button
                                        onClick={() => router.reload()}
                                        className="gap-2"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                        Reload Page
                                    </Button>
                                    <Link href="/dashboard">
                                        <Button variant="outline">Go to Dashboard</Button>
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </AppLayout>
        );
    }

    if (!hasConnectedAccounts) {
        return (
            <AppLayout>
                <Head title="Facebook Posts" />
                <div className="container mx-auto p-6">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center py-12">
                                <div className="mx-auto w-24 h-24 mb-6 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                                    <Facebook className="h-12 w-12 text-blue-600" />
                                </div>
                                <h2 className="text-2xl font-bold mb-3">Connect Facebook First</h2>
                                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                    You need to connect at least one Facebook page before you can create posts.
                                </p>
                                <div className="flex gap-3 justify-center">
                                    <Link href="/facebook/connect">
                                        <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                                            <Facebook className="h-4 w-4" />
                                            Connect Facebook
                                        </Button>
                                    </Link>
                                    <Link href="/dashboard">
                                        <Button variant="outline">Go to Dashboard</Button>
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <Head title="Facebook Posts" />

            <div className="container mx-auto p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Facebook Posts</h1>
                        <p className="text-muted-foreground">
                            Create and manage posts for your connected Facebook pages
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link href="/facebook/connect">
                            <Button variant="outline" className="gap-2">
                                <Facebook className="h-4 w-4" />
                                Manage Pages
                            </Button>
                        </Link>

                        <Link href="/facebook/posts/create">
                            <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                                <Plus className="h-4 w-4" />
                                Create Post
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Posts</p>
                                    <p className="text-2xl font-bold">{stats.total}</p>
                                </div>
                                <div className="p-2 bg-gray-500/10 rounded-lg">
                                    <Clock className="h-6 w-6 text-gray-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Published</p>
                                    <p className="text-2xl font-bold">{stats.published}</p>
                                </div>
                                <div className="p-2 bg-green-500/10 rounded-lg">
                                    <CheckCircle className="h-6 w-6 text-green-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Scheduled</p>
                                    <p className="text-2xl font-bold">{stats.scheduled}</p>
                                </div>
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Calendar className="h-6 w-6 text-blue-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card> */}

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Drafts</p>
                                    <p className="text-2xl font-bold">{stats.draft}</p>
                                </div>
                                <div className="p-2 bg-yellow-500/10 rounded-lg">
                                    <Clock className="h-6 w-6 text-yellow-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Failed</p>
                                    <p className="text-2xl font-bold">{stats.failed}</p>
                                </div>
                                <div className="p-2 bg-red-500/10 rounded-lg">
                                    <AlertCircle className="h-6 w-6 text-red-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs & Filters */}
                <Card className="mb-6">
                    <CardHeader>
                        <Tabs defaultValue="all" className="w-full">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <TabsList>
                                    <TabsTrigger value="all">All Posts ({stats.total})</TabsTrigger>
                                    <TabsTrigger value="published">Published ({stats.published})</TabsTrigger>
                                    {/* <TabsTrigger value="scheduled">Scheduled ({stats.scheduled})</TabsTrigger> */}
                                    <TabsTrigger value="draft">Drafts ({stats.draft})</TabsTrigger>
                                    <TabsTrigger value="failed">Failed ({stats.failed})</TabsTrigger>
                                </TabsList>

                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                        <select
                                            className="pl-10 pr-4 py-2 border rounded-lg bg-background"
                                            value={filters.account_id}
                                            onChange={(e) => router.get('/facebook/posts', { account_id: e.target.value })}
                                        >
                                            <option value="">All Pages</option>
                                            {accounts.map(account => (
                                                <option key={account.id} value={account.id}>
                                                    {account.facebook_page_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <TabsContent value="all" className="mt-4">
                                <CardDescription>
                                    All your Facebook posts across all connected pages
                                </CardDescription>
                            </TabsContent>
                            <TabsContent value="published" className="mt-4">
                                <CardDescription>
                                    Posts that have been published to Facebook
                                </CardDescription>
                            </TabsContent>
                            <TabsContent value="scheduled" className="mt-4">
                                <CardDescription>
                                    Posts scheduled for future publishing
                                </CardDescription>
                            </TabsContent>
                            <TabsContent value="draft" className="mt-4">
                                <CardDescription>
                                    Draft posts not yet scheduled or published
                                </CardDescription>
                            </TabsContent>
                            <TabsContent value="failed" className="mt-4">
                                <CardDescription>
                                    Posts that failed to publish
                                </CardDescription>
                            </TabsContent>
                        </Tabs>
                    </CardHeader>
                </Card>

                {/* Posts List */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            {safePosts.data.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="mx-auto w-24 h-24 mb-4 text-muted-foreground">
                                        <div className="w-full h-full rounded-full bg-muted flex items-center justify-center">
                                            <Plus className="h-12 w-12" />
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                                    <p className="text-muted-foreground mb-4">
                                        Create your first Facebook post to share on your connected pages
                                    </p>
                                    <Link href="/facebook/posts/create">
                                        <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                                            <Plus className="h-4 w-4" />
                                            Create First Post
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
                                safePosts.data.map((post) => (
                                    <div
                                        key={post.id}
                                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                                            {/* Post Content */}
                                            <div className="flex-1">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        {getStatusBadge(post.status)}
                                                        {post.scheduled_for && (
                                                            <Badge variant="outline" className="gap-1">
                                                                <Calendar className="h-3 w-3" />
                                                                {new Date(post.scheduled_for).toLocaleDateString()}
                                                            </Badge>
                                                        )}
                                                        {post.facebook_account && (
                                                            <Badge variant="outline" className="gap-1">
                                                                {post.facebook_account.picture_url ? (
                                                                    <img
                                                                        src={post.facebook_account.picture_url}
                                                                        alt={post.facebook_account.facebook_page_name}
                                                                        className="w-3 h-3 rounded-full"
                                                                    />
                                                                ) : (
                                                                    <Facebook className="h-3 w-3" />
                                                                )}
                                                                {post.facebook_account.facebook_page_name}
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    <div className="text-sm text-muted-foreground">
                                                        {new Date(post.created_at).toLocaleString()}
                                                    </div>
                                                </div>

                                                <p className="mb-3 whitespace-pre-line">
                                                    {post.full_message}
                                                </p>

                                                {/* Attachments */}
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {post.link && (
                                                        <Badge variant="secondary" className="gap-1">
                                                            <LinkIcon className="h-3 w-3" />
                                                            Link
                                                        </Badge>
                                                    )}
                                                    {post.image && (
                                                        <Badge variant="secondary" className="gap-1">
                                                            <ImageIcon className="h-3 w-3" />
                                                            Image
                                                        </Badge>
                                                    )}
                                                    {post.video && (
                                                        <Badge variant="secondary" className="gap-1">
                                                            <Video className="h-3 w-3" />
                                                            Video
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Preview */}
                                                {(post.image || post.video) && (
                                                    <div className="mb-4 max-w-md">
                                                        {post.image && (
                                                            <img
                                                                src={post.image}
                                                                alt="Post attachment"
                                                                className="rounded-lg w-full max-h-48 object-cover"
                                                            />
                                                        )}
                                                    </div>
                                                )}

                                                {/* Error Message */}
                                                {post.error_message && (
                                                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                                            <AlertCircle className="h-4 w-4" />
                                                            <span className="font-medium">Error:</span>
                                                        </div>
                                                        <p className="text-sm mt-1">{post.error_message}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-col gap-2 min-w-[200px]">
                                                {post.status === 'published' && post.facebook_post_id && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => viewOnFacebook(post.facebook_post_id!)}
                                                        className="gap-2"
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                        View on Facebook
                                                    </Button>
                                                )}

                                                {post.status === 'draft' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handlePublish(post.id)}
                                                        disabled={loading[post.id]}
                                                        className="gap-2 bg-blue-600 hover:bg-blue-700"
                                                    >
                                                        {loading[post.id] ? (
                                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <CheckCircle className="h-4 w-4" />
                                                        )}
                                                        Publish Now
                                                    </Button>
                                                )}

                                                {post.status === 'pending' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handlePublish(post.id)}
                                                        disabled={loading[post.id]}
                                                        className="gap-2"
                                                    >
                                                        {loading[post.id] ? (
                                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Calendar className="h-4 w-4" />
                                                        )}
                                                        Publish Now
                                                    </Button>
                                                )}

                                                {post.status === 'failed' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handlePublish(post.id)}
                                                        disabled={loading[post.id]}
                                                        className="gap-2"
                                                    >
                                                        {loading[post.id] ? (
                                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <RefreshCw className="h-4 w-4" />
                                                        )}
                                                        Retry
                                                    </Button>
                                                )}

                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDelete(post.id)}
                                                    disabled={deleting[post.id]}
                                                    className="gap-2"
                                                >
                                                    {deleting[post.id] ? (
                                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                    Delete
                                                </Button>

                                                {/* {post.status === 'published' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-2"
                                                        onClick={() => router.get(`/facebook/posts/${post.id}/analytics`)}
                                                    >
                                                        <BarChart3 className="h-4 w-4" />
                                                        Analytics
                                                    </Button>
                                                )} */}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Pagination */}
                        {safePosts?.last_page > 1 && (
                            <div className="flex items-center justify-between mt-6 pt-6 border-t">
                                <div className="text-sm text-muted-foreground">
                                    Showing {safePosts?.from} to {safePosts?.to} of {safePosts?.total} posts
                                </div>

                                <div className="flex gap-2">
                                    {safePosts.links.prev && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => router.get(safePosts.links.prev!)}
                                        >
                                            Previous
                                        </Button>
                                    )}

                                    {safePosts.links.next && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => router.get(safePosts.links.next!)}
                                        >
                                            Next
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
