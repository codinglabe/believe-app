import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TextArea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'react-hot-toast';
import { router } from '@inertiajs/react';
import { 
    Plus, 
    Edit, 
    Trash2, 
    Calendar, 
    Clock, 
    CheckCircle, 
    XCircle, 
    Globe,
    Facebook,
    Twitter,
    Instagram,
    Linkedin,
    Youtube,
    MessageSquare,
    Send,
    Share2,
    Zap,
    Users,
    TrendingUp,
    ExternalLink
} from 'lucide-react';

interface SocialMediaAccount {
    id: number;
    platform: string;
    username: string;
    display_name?: string;
    profile_url?: string;
    is_active: boolean;
}

interface SocialMediaPost {
    id: number;
    content: string;
    status: 'draft' | 'scheduled' | 'published' | 'failed';
    scheduled_at?: string;
    published_at?: string;
    social_media_accounts: SocialMediaAccount[];
    created_at: string;
}

interface Platform {
    [key: string]: string;
}

interface Props {
    accounts: SocialMediaAccount[];
    posts: {
        data: SocialMediaPost[];
        total: number;
    };
    platforms: Platform;
}

const platformIcons: { [key: string]: React.ComponentType<{ className?: string }> } = {
    facebook: Facebook,
    twitter: Twitter,
    instagram: Instagram,
    linkedin: Linkedin,
    youtube: Youtube,
    tiktok: Globe,
};

const platformColors: { [key: string]: string } = {
    facebook: '#1877F2',
    twitter: '#1DA1F2',
    instagram: '#E4405F',
    linkedin: '#0A66C2',
    youtube: '#FF0000',
    tiktok: '#000000',
};

export default function SocialMediaIndex({ accounts, posts, platforms }: Props) {
    const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
    const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
    const [formData, setFormData] = useState({
        platform: '',
        username: '',
        display_name: '',
        profile_url: '',
        content: '',
        scheduled_at: '',
        selected_platforms: [] as number[],
    });

    const resetForm = () => {
        setFormData({
            platform: '',
            username: '',
            display_name: '',
            profile_url: '',
            content: '',
            scheduled_at: '',
            selected_platforms: [],
        });
    };

    const handleAddAccount = async () => {
        if (!formData.platform || !formData.username) {
            toast.error('Platform and username are required');
            return;
        }

        try {
            const response = await fetch('/social-media/accounts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                const result = await response.json();
                toast.success(result.message);
                setIsAddAccountOpen(false);
                resetForm();
                router.reload();
            } else {
                const error = await response.json();
                toast.error(error.message || 'Failed to add account');
            }
        } catch {
            toast.error('An error occurred');
        }
    };

    const handleCreatePost = async () => {
        if (formData.selected_platforms.length === 0) {
            toast.error('Please select at least one social media platform');
            return;
        }

        if (!formData.content.trim()) {
            toast.error('Please enter post content');
            return;
        }

        try {
            const response = await fetch('/social-media/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    content: formData.content,
                    scheduled_at: formData.scheduled_at,
                    status: formData.scheduled_at ? 'scheduled' : 'draft',
                    social_media_account_ids: formData.selected_platforms,
                }),
            });

            if (response.ok) {
                const result = await response.json();
                toast.success(result.message);
                setIsCreatePostOpen(false);
                resetForm();
                router.reload();
            } else {
                const error = await response.json();
                toast.error(error.message || 'Failed to create post');
            }
        } catch {
            toast.error('An error occurred');
        }
    };

    const handleDeleteAccount = async (accountId: number) => {
        if (!confirm('Are you sure you want to delete this account?')) return;

        try {
            const response = await fetch(`/social-media/accounts/${accountId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });

            if (response.ok) {
                toast.success('Account deleted successfully');
                router.reload();
            } else {
                toast.error('Failed to delete account');
            }
        } catch {
            toast.error('An error occurred');
        }
    };

    const handleDeletePost = async (postId: number) => {
        if (!confirm('Are you sure you want to delete this post?')) return;

        try {
            const response = await fetch(`/social-media/posts/${postId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });

            if (response.ok) {
                toast.success('Post deleted successfully');
                router.reload();
            } else {
                toast.error('Failed to delete post');
            }
        } catch {
            toast.error('An error occurred');
        }
    };

    const togglePlatformSelection = (accountId: number) => {
        setFormData(prev => ({
            ...prev,
            selected_platforms: prev.selected_platforms.includes(accountId)
                ? prev.selected_platforms.filter(id => id !== accountId)
                : [...prev.selected_platforms, accountId]
        }));
    };

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            draft: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', icon: Edit },
            scheduled: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: Clock },
            published: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle },
            failed: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: XCircle },
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
        const Icon = config.icon;

        return (
            <Badge className={config.color}>
                <Icon className="w-3 h-3 mr-1" />
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        );
    };

    const openCreatePost = () => {
        resetForm();
        setIsCreatePostOpen(true);
    };

    return (
        <AppLayout>
            <div className="min-h-screen bg-background">
                <div className="container mx-auto px-4 py-8">
                    {/* Header Section */}
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-6">
                            <Share2 className="w-8 h-8 text-primary-foreground" />
                        </div>
                        <h1 className="text-4xl font-bold text-foreground mb-4">Social Media Manager</h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Connect your social media accounts and manage posts across all platforms from one dashboard.
                        </p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                                        <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Connected Accounts</p>
                                        <p className="text-2xl font-bold text-foreground">{accounts.length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                                        <MessageSquare className="w-6 h-6 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Total Posts</p>
                                        <p className="text-2xl font-bold text-foreground">{posts.total}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                                        <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Published</p>
                                        <p className="text-2xl font-bold text-foreground">
                                            {posts.data.filter(p => p.status === 'published').length}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Tabs defaultValue="accounts" className="space-y-8">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="accounts">
                                <Users className="w-4 h-4 mr-2" />
                                Connected Accounts ({accounts.length})
                            </TabsTrigger>
                            <TabsTrigger value="posts">
                                <MessageSquare className="w-4 h-4 mr-2" />
                                All Posts ({posts.total})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="accounts" className="space-y-8">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-3xl font-bold text-foreground">Your Social Media Accounts</h2>
                                    <p className="text-muted-foreground mt-2">Connect your accounts to start managing posts</p>
                                </div>
                                <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
                                    <DialogTrigger asChild>
                                        <Button onClick={() => resetForm()}>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Connect Account
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-md">
                                        <DialogHeader>
                                            <DialogTitle>Connect Social Media Account</DialogTitle>
                                            <DialogDescription>
                                                Add a new social media account to your dashboard. No passwords needed.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-2">
                                                    Platform *
                                                </label>
                                                <Select value={formData.platform} onValueChange={(value) => setFormData({ ...formData, platform: value })}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select platform" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(platforms).map(([key, value]) => (
                                                            <SelectItem key={key} value={key}>
                                                                <div className="flex items-center space-x-2">
                                                                    {React.createElement(platformIcons[key] || Globe, { className: "w-4 h-4" })}
                                                                    <span>{value}</span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-2">
                                                    Username *
                                                </label>
                                                <Input
                                                    value={formData.username}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, username: e.target.value })}
                                                    placeholder="Enter username"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-2">
                                                    Display Name (Optional)
                                                </label>
                                                <Input
                                                    value={formData.display_name}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, display_name: e.target.value })}
                                                    placeholder="Enter display name"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-2">
                                                    Profile URL (Optional)
                                                </label>
                                                <Input
                                                    value={formData.profile_url}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, profile_url: e.target.value })}
                                                    placeholder="https://..."
                                                />
                                            </div>
                                            <div className="flex justify-end space-x-3 pt-4">
                                                <Button variant="outline" onClick={() => setIsAddAccountOpen(false)}>
                                                    Cancel
                                                </Button>
                                                <Button onClick={handleAddAccount}>
                                                    Connect Account
                                                </Button>
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {accounts.map((account) => {
                                    const Icon = platformIcons[account.platform] || Globe;
                                    return (
                                        <Card key={account.id} className="hover:shadow-lg transition-shadow">
                                            <CardHeader className="pb-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                        <div 
                                                            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                                                            style={{ backgroundColor: platformColors[account.platform] || '#6B7280' }}
                                                        >
                                                            <Icon className="w-6 h-6 text-white" />
                                                        </div>
                                                        <div>
                                                            <CardTitle className="text-lg">{account.display_name || account.username}</CardTitle>
                                                            <CardDescription>
                                                                @{account.username}
                                                            </CardDescription>
                                                        </div>
                                                    </div>
                                                    <Badge variant={account.is_active ? "default" : "secondary"}>
                                                        {account.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-muted-foreground">Platform:</span>
                                                        <span className="font-medium capitalize">{account.platform}</span>
                                                    </div>
                                                    {account.profile_url && (
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className="text-muted-foreground">Profile:</span>
                                                            <a 
                                                                href={account.profile_url} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="text-primary hover:text-primary/80 font-medium hover:underline flex items-center"
                                                            >
                                                                View Profile
                                                                <ExternalLink className="w-3 h-3 ml-1" />
                                                            </a>
                                                        </div>
                                                    )}
                                                    <Separator />
                                                    <div className="flex space-x-2">
                                                        <Button 
                                                            size="sm" 
                                                            onClick={openCreatePost}
                                                            className="flex-1"
                                                        >
                                                            <MessageSquare className="w-4 h-4 mr-1" />
                                                            New Post
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            onClick={() => handleDeleteAccount(account.id)}
                                                            className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>

                            {accounts.length === 0 && (
                                <Card className="text-center py-16">
                                    <CardContent>
                                        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                                            <Globe className="w-10 h-10 text-muted-foreground" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-foreground mb-3">No social media accounts connected yet</h3>
                                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                            Connect your first social media account to start managing posts across platforms.
                                        </p>
                                        <Button onClick={() => setIsAddAccountOpen(true)}>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Connect Your First Account
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                        <TabsContent value="posts" className="space-y-8">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-3xl font-bold text-foreground">Your Social Media Posts</h2>
                                    <p className="text-muted-foreground mt-2">Create and manage posts across all your connected platforms</p>
                                </div>
                                <Button 
                                    disabled={accounts.length === 0} 
                                    onClick={openCreatePost}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create New Post
                                </Button>
                            </div>

                            <div className="space-y-6">
                                {posts.data.map((post) => (
                                    <Card key={post.id} className="hover:shadow-lg transition-shadow">
                                        <CardContent className="p-6">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 space-y-4">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="flex -space-x-2">
                                                            {post.social_media_accounts.map((account) => {
                                                                const Icon = platformIcons[account.platform] || Globe;
                                                                return (
                                                                    <div 
                                                                        key={account.id}
                                                                        className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-background shadow-sm"
                                                                        style={{ backgroundColor: platformColors[account.platform] || '#6B7280' }}
                                                                        title={`${account.platform} - @${account.username}`}
                                                                    >
                                                                        <Icon className="w-4 h-4 text-white" />
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-sm text-muted-foreground">Posting to {post.social_media_accounts.length} platform{post.social_media_accounts.length !== 1 ? 's' : ''}</span>
                                                            {getStatusBadge(post.status)}
                                                        </div>
                                                    </div>
                                                    
                                                    <p className="text-foreground text-lg leading-relaxed">{post.content}</p>

                                                    <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                                                        <span className="flex items-center">
                                                            <Calendar className="w-4 h-4 mr-1" />
                                                            Created: {new Date(post.created_at).toLocaleDateString()}
                                                        </span>
                                                        {post.scheduled_at && (
                                                            <span className="flex items-center">
                                                                <Clock className="w-4 h-4 mr-1" />
                                                                Scheduled: {new Date(post.scheduled_at).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                        {post.published_at && (
                                                            <span className="flex items-center">
                                                                <Send className="w-4 h-4 mr-1" />
                                                                Published: {new Date(post.published_at).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex space-x-2 ml-6">
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline"
                                                        onClick={() => handleDeletePost(post.id)}
                                                        className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {posts.data.length === 0 && (
                                <Card className="text-center py-16">
                                    <CardContent>
                                        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                                            <MessageSquare className="w-10 h-10 text-muted-foreground" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-foreground mb-3">No posts created yet</h3>
                                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                            {accounts.length === 0 
                                                ? 'Connect a social media account first to start creating posts'
                                                : 'Create your first post to publish across all your connected platforms'
                                            }
                                        </p>
                                        {accounts.length > 0 && (
                                            <Button onClick={openCreatePost}>
                                                <Plus className="w-4 h-4 mr-2" />
                                                Create Your First Post
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>
                    </Tabs>

                    {/* Create Post Dialog */}
                    <Dialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen}>
                        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Create New Cross-Platform Post</DialogTitle>
                                <DialogDescription>
                                    Write once, publish everywhere. Choose which platforms to post to.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Post Content *
                                    </label>
                                    <TextArea
                                        value={formData.content}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, content: e.target.value })}
                                        placeholder="What would you like to share with your audience?"
                                        rows={4}
                                        maxLength={280}
                                        className="w-full resize-none"
                                    />
                                    <div className="text-right text-sm text-muted-foreground mt-1">
                                        {formData.content.length}/280 characters
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-3">
                                        Select Platforms to Post To *
                                    </label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {accounts.map((account) => {
                                            const Icon = platformIcons[account.platform] || Globe;
                                            return (
                                                <div key={account.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                                                    <Checkbox
                                                        id={`account-${account.id}`}
                                                        checked={formData.selected_platforms.includes(account.id)}
                                                        onCheckedChange={() => togglePlatformSelection(account.id)}
                                                    />
                                                    <label 
                                                        htmlFor={`account-${account.id}`}
                                                        className="flex items-center space-x-3 cursor-pointer flex-1"
                                                    >
                                                        <div 
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                                                            style={{ backgroundColor: platformColors[account.platform] || '#6B7280' }}
                                                        >
                                                            <Icon className="w-4 h-4 text-white" />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-foreground">{account.display_name || account.username}</div>
                                                            <div className="text-sm text-muted-foreground">@{account.username}</div>
                                                        </div>
                                                    </label>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {accounts.length === 0 && (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Globe className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                                            <p>No social media accounts connected yet.</p>
                                            <p className="text-sm">Connect an account first to create posts.</p>
                                        </div>
                                    )}
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Schedule Post (Optional)
                                    </label>
                                    <Input
                                        type="datetime-local"
                                        value={formData.scheduled_at}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, scheduled_at: e.target.value })}
                                        className="w-full"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Leave empty to publish immediately, or set a future time to schedule your post.
                                    </p>
                                </div>

                                <div className="flex justify-end space-x-3 pt-4 border-t">
                                    <Button variant="outline" onClick={() => setIsCreatePostOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button 
                                        onClick={handleCreatePost}
                                        disabled={formData.selected_platforms.length === 0}
                                    >
                                        <Zap className="w-4 h-4 mr-2" />
                                        Create & Publish
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </AppLayout>
    );
}
