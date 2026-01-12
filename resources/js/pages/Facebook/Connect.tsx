import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios'; // Import axios
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    Facebook,
    Plus,
    RefreshCw,
    Trash2,
    CheckCircle,
    XCircle,
    ExternalLink,
    Shield,
    Users,
    Globe,
    AlertTriangle,
    Key,
    Settings,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';

interface FacebookApp {
    id: number;
    app_name: string;
    facebook_app_id: string;
    is_default_app: boolean;
    connected_pages_count: number;
}

interface FacebookAccount {
    id: number;
    app_id: string;
    app_name: string;
    facebook_page_id: string;
    facebook_page_name: string;
    page_category: string;
    followers_count: number;
    is_connected: boolean;
    last_synced_at?: string;
    picture_url?: string;
    is_token_expired: boolean;
}

interface Props {
    apps?: FacebookApp[];
    accounts?: FacebookAccount[];
    organization?: {
        id: number;
        name: string;
    };
}

export default function Connect({
    apps = [],
    accounts = [],
    organization = { id: 0, name: 'Your Organization' }
}: Props) {
    const [selectedApp, setSelectedApp] = useState<number | null>(
        apps.find(app => app.is_default_app)?.id || (apps.length > 0 ? apps[0].id : null)
    );
    const [showAppDropdown, setShowAppDropdown] = useState(false);
    const [generatingUrl, setGeneratingUrl] = useState(false);
    const [disconnecting, setDisconnecting] = useState<Record<number, boolean>>({});
    const [refreshing, setRefreshing] = useState<Record<number, boolean>>({});

    const handleConnect = async () => {
        if (!selectedApp) {
            toast.error('Please select a Facebook App first');
            return;
        }

        const selectedAppData = apps.find(app => app.id === selectedApp);
        if (!selectedAppData) {
            toast.error('Selected app not found');
            return;
        }

        setGeneratingUrl(true);

        try {
            // Use axios instead of router.post for API requests
            const response = await axios.post('/facebook/generate-oauth-url', {
                app_id: selectedApp
            });

            if (response.data.success) {
                // Redirect to Facebook OAuth URL
                window.location.href = response.data.oauth_url;
            } else {
                toast.error('Failed to generate OAuth URL: ' + (response.data.message || 'Unknown error'));
            }
        } catch (error: any) {
            console.error('Error generating OAuth URL:', error);
            toast.error('Failed to generate OAuth URL: ' + (error.response?.data?.message || error.message || 'Unknown error'));
        } finally {
            setGeneratingUrl(false);
        }
    };

    const handleDisconnect = async (accountId: number, pageName: string) => {
        if (!confirm(`Are you sure you want to disconnect "${pageName}"?`)) {
            return;
        }

        setDisconnecting(prev => ({ ...prev, [accountId]: true }));

        try {
            // Use axios for API requests
            await axios.post(`/facebook/${accountId}/disconnect`);
            toast.success('Facebook page disconnected successfully');
            // Reload the page to show updated list
            window.location.reload();
        } catch (error: any) {
            toast.error('Failed to disconnect Facebook page: ' + (error.response?.data?.message || error.message));
        } finally {
            setDisconnecting(prev => ({ ...prev, [accountId]: false }));
        }
    };

    const handleRefresh = async (accountId: number) => {
        setRefreshing(prev => ({ ...prev, [accountId]: true }));

        try {
            // Use axios for API requests
            await axios.post(`/facebook/${accountId}/refresh`);
            toast.success('Facebook page refreshed successfully');
            // Reload the page to show updated list
            window.location.reload();
        } catch (error: any) {
            toast.error('Failed to refresh Facebook page: ' + (error.response?.data?.message || error.message));
        } finally {
            setRefreshing(prev => ({ ...prev, [accountId]: false }));
        }
    };

    const handleSetDefault = async (accountId: number) => {
        try {
            // Use axios for API requests
            await axios.post(`/facebook/${accountId}/set-default`);
            toast.success('Default Facebook page set successfully');
            // Reload the page to show updated list
            window.location.reload();
        } catch (error: any) {
            toast.error('Failed to set default page: ' + (error.response?.data?.message || error.message));
        }
    };

    const safeApps = Array.isArray(apps) ? apps : [];
    const safeAccounts = Array.isArray(accounts) ? accounts : [];
    const safeOrganization = organization || { id: 0, name: 'Your Organization' };

    return (
        <AppLayout>
            <Head title="Connect Facebook" />

            <div className="container mx-auto p-4 md:p-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">Facebook Integration</h1>
                    <p className="text-muted-foreground mt-2">
                        Connect your Facebook pages to post content directly from {safeOrganization.name}
                    </p>
                </div>

                {/* App Selection & Connection */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Instructions */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Facebook className="h-5 w-5 text-blue-600" />
                                Connect Facebook Pages
                            </CardTitle>
                            <CardDescription>
                                Select a Facebook App and connect your pages
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {safeApps.length === 0 ? (
                                <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                    <AlertTitle>No Facebook Apps Found</AlertTitle>
                                    <AlertDescription>
                                        You need to add a Facebook App first before connecting pages.
                                        <div className="mt-2">
                                            <Link href="/facebook/apps/create">
                                                <Button size="sm" className="gap-2">
                                                    <Plus className="h-4 w-4" />
                                                    Add Facebook App
                                                </Button>
                                            </Link>
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <span className="text-sm font-medium">Select Facebook App</span>
                                        <div className="relative">
                                            <Button
                                                variant="outline"
                                                className="w-full justify-between"
                                                onClick={() => setShowAppDropdown(!showAppDropdown)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Key className="h-4 w-4" />
                                                    {selectedApp
                                                        ? safeApps.find(app => app.id === selectedApp)?.app_name
                                                        : 'Select an app'
                                                    }
                                                    {selectedApp && (
                                                        <Badge variant="secondary">
                                                            {safeApps.find(app => app.id === selectedApp)?.connected_pages_count || 0} pages
                                                        </Badge>
                                                    )}
                                                </div>
                                                {showAppDropdown ? (
                                                    <ChevronUp className="h-4 w-4" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4" />
                                                )}
                                            </Button>

                                            {showAppDropdown && (
                                                <div className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-lg">
                                                    {safeApps.map(app => (
                                                        <button
                                                            key={app.id}
                                                            className={`w-full p-3 text-left hover:bg-muted transition-colors flex items-center justify-between ${
                                                                selectedApp === app.id ? 'bg-muted' : ''
                                                            }`}
                                                            onClick={() => {
                                                                setSelectedApp(app.id);
                                                                setShowAppDropdown(false);
                                                            }}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${
                                                                    app.is_default_app ? 'bg-green-500' : 'bg-blue-500'
                                                                }`}></div>
                                                                <span>{app.app_name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline">
                                                                    {app.connected_pages_count}
                                                                </Badge>
                                                                {app.is_default_app && (
                                                                    <Badge variant="default">Default</Badge>
                                                                )}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Choose which Facebook App to use for connecting pages
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                <span className="font-bold text-primary">1</span>
                                            </div>
                                            <div>
                                                <h4 className="font-medium">Select Facebook App</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    Choose which app to use for authentication
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                <span className="font-bold text-primary">2</span>
                                            </div>
                                            <div>
                                                <h4 className="font-medium">Authorize on Facebook</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    You'll be redirected to Facebook to grant permissions
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                <span className="font-bold text-primary">3</span>
                                            </div>
                                            <div>
                                                <h4 className="font-medium">Select Pages</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    Choose which Facebook pages you want to connect
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                                <Shield className="h-4 w-4 text-blue-600" />
                                <AlertTitle>Permissions Required</AlertTitle>
                                <AlertDescription className="text-sm">
                                    We request permissions to post content and view basic page info.
                                    We never post without your permission.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    {/* Connect Button */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <div className="mx-auto w-20 h-20 mb-4 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                                    <Facebook className="h-10 w-10 text-blue-600" />
                                </div>

                                <h3 className="text-xl font-bold mb-2">Connect Pages</h3>
                                <p className="text-muted-foreground mb-6">
                                    Connect your Facebook pages using selected app
                                </p>

                                {safeApps.length === 0 ? (
                                    <Link href="/facebook/apps/create">
                                        <Button size="lg" className="w-full gap-2">
                                            <Key className="h-5 w-5" />
                                            Add Facebook App First
                                        </Button>
                                    </Link>
                                ) : (
                                    <>
                                        <Button
                                            onClick={handleConnect}
                                            size="lg"
                                            className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
                                            disabled={!selectedApp || generatingUrl}
                                        >
                                            {generatingUrl ? (
                                                <>
                                                    <RefreshCw className="h-5 w-5 animate-spin" />
                                                    Preparing...
                                                </>
                                            ) : (
                                                <>
                                                    <Facebook className="h-5 w-5" />
                                                    Connect Facebook Pages
                                                </>
                                            )}
                                        </Button>

                                        <div className="mt-4 p-3 bg-muted rounded-lg">
                                            <p className="text-sm font-medium">Selected App:</p>
                                            <p className="text-sm text-muted-foreground truncate">
                                                {selectedApp
                                                    ? safeApps.find(app => app.id === selectedApp)?.app_name
                                                    : 'None selected'
                                                }
                                            </p>
                                        </div>
                                    </>
                                )}

                                <div className="mt-4 flex justify-center gap-3">
                                    <Link href="/facebook/apps">
                                        <Button variant="ghost" size="sm" className="gap-2">
                                            <Settings className="h-4 w-4" />
                                            Manage Apps
                                        </Button>
                                    </Link>
                                    <Link href="/facebook/posts">
                                        <Button variant="ghost" size="sm" className="gap-2">
                                            <Globe className="h-4 w-4" />
                                            View Posts
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Connected Accounts */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Connected Pages</CardTitle>
                                <CardDescription>
                                    Your connected Facebook pages by app
                                </CardDescription>
                            </div>
                            <Badge variant="outline" className="gap-2">
                                <Users className="h-3 w-3" />
                                {safeAccounts.length} {safeAccounts.length === 1 ? 'Page' : 'Pages'}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {safeAccounts.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="mx-auto w-24 h-24 mb-4 text-muted-foreground">
                                    <div className="w-full h-full rounded-full bg-muted flex items-center justify-center">
                                        <Facebook className="h-12 w-12" />
                                    </div>
                                </div>
                                <h3 className="text-lg font-semibold mb-2">No pages connected</h3>
                                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                    Connect your Facebook pages to start posting content directly from your dashboard
                                </p>
                                {safeApps.length > 0 ? (
                                    <Button
                                        onClick={handleConnect}
                                        className="gap-2 bg-blue-600 hover:bg-blue-700"
                                        disabled={!selectedApp}
                                    >
                                        <Facebook className="h-4 w-4" />
                                        Connect Your First Page
                                    </Button>
                                ) : (
                                    <Link href="/facebook/apps/create">
                                        <Button className="gap-2">
                                            <Key className="h-4 w-4" />
                                            Add Facebook App First
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Group accounts by app */}
                                {Array.from(new Set(safeAccounts.map(a => a.app_name))).map(appName => {
                                    const appAccounts = safeAccounts.filter(a => a.app_name === appName);
                                    const app = safeApps.find(a => a.app_name === appName);

                                    return (
                                        <div key={appName} className="mb-6">
                                            <div className="flex items-center gap-2 mb-3">
                                                <h3 className="font-bold text-lg">{appName}</h3>
                                                <Badge variant="outline">
                                                    {appAccounts.length} pages
                                                </Badge>
                                                {app?.is_default_app && (
                                                    <Badge variant="default">Default App</Badge>
                                                )}
                                            </div>

                                            <div className="space-y-3">
                                                {appAccounts.map((account) => (
                                                    <div
                                                        key={account.id}
                                                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex items-start gap-4">
                                                                {account.picture_url ? (
                                                                    <img
                                                                        src={account.picture_url}
                                                                        alt={account.facebook_page_name}
                                                                        className="w-12 h-12 rounded-lg object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                                                                        <Facebook className="h-6 w-6 text-blue-600" />
                                                                    </div>
                                                                )}

                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <h4 className="font-bold text-lg">
                                                                            {account.facebook_page_name}
                                                                        </h4>
                                                                        {account.is_token_expired && (
                                                                            <Badge variant="destructive" className="gap-1">
                                                                                <AlertTriangle className="h-3 w-3" />
                                                                                Expired
                                                                            </Badge>
                                                                        )}
                                                                        {account.is_connected ? (
                                                                            <Badge variant="default" className="gap-1">
                                                                                <CheckCircle className="h-3 w-3" />
                                                                                Connected
                                                                            </Badge>
                                                                        ) : (
                                                                            <Badge variant="outline" className="gap-1">
                                                                                <XCircle className="h-3 w-3" />
                                                                                Disconnected
                                                                            </Badge>
                                                                        )}
                                                                    </div>

                                                                    <div className="flex flex-wrap gap-2 mb-2">
                                                                        {account.page_category && (
                                                                            <Badge variant="secondary">
                                                                                {account.page_category}
                                                                            </Badge>
                                                                        )}
                                                                        <Badge variant="outline" className="gap-1">
                                                                            <Users className="h-3 w-3" />
                                                                            {account.followers_count.toLocaleString()} followers
                                                                        </Badge>
                                                                        <Badge variant="outline" className="gap-1">
                                                                            <Key className="h-3 w-3" />
                                                                            {account.app_name}
                                                                        </Badge>
                                                                    </div>

                                                                    <p className="text-sm text-muted-foreground">
                                                                        Page ID: {account.facebook_page_id}
                                                                        {account.last_synced_at && (
                                                                            <> • Last synced: {new Date(account.last_synced_at).toLocaleDateString()}</>
                                                                        )}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col gap-2 min-w-[200px]">
                                                                <div className="flex gap-2">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleRefresh(account.id)}
                                                                        disabled={refreshing[account.id]}
                                                                        className="gap-2 flex-1"
                                                                    >
                                                                        {refreshing[account.id] ? (
                                                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                                                        ) : (
                                                                            <RefreshCw className="h-4 w-4" />
                                                                        )}
                                                                        Refresh
                                                                    </Button>

                                                                    <Button
                                                                        variant="destructive"
                                                                        size="sm"
                                                                        onClick={() => handleDisconnect(account.id, account.facebook_page_name)}
                                                                        disabled={disconnecting[account.id]}
                                                                        className="gap-2 flex-1"
                                                                    >
                                                                        {disconnecting[account.id] ? (
                                                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                                                        ) : (
                                                                            <Trash2 className="h-4 w-4" />
                                                                        )}
                                                                        Disconnect
                                                                    </Button>
                                                                </div>

                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleSetDefault(account.id)}
                                                                    className="gap-2"
                                                                >
                                                                    <CheckCircle className="h-4 w-4" />
                                                                    Set as Default
                                                                </Button>

                                                                <Link href={`/facebook/posts/create?account_id=${account.id}`}>
                                                                    <Button size="sm" className="w-full gap-2">
                                                                        <Plus className="h-4 w-4" />
                                                                        Create Post
                                                                    </Button>
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {safeAccounts.length > 0 && (
                            <div className="mt-6 pt-6 border-t">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-muted-foreground">
                                        {safeAccounts.length} connected page{safeAccounts.length !== 1 ? 's' : ''} across {safeApps.length} app{safeApps.length !== 1 ? 's' : ''}
                                    </div>
                                    <div className="flex gap-3">
                                        <Link href="/facebook/apps">
                                            <Button variant="outline" className="gap-2">
                                                <Key className="h-4 w-4" />
                                                Manage Apps
                                            </Button>
                                        </Link>
                                        {safeApps.length > 0 && (
                                            <Button
                                                onClick={handleConnect}
                                                variant="outline"
                                                className="gap-2"
                                                disabled={!selectedApp}
                                            >
                                                <Plus className="h-4 w-4" />
                                                Connect Another Page
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
