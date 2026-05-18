import React, { useEffect, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    Plus,
    Settings,
    Key,
    Globe,
    CheckCircle,
    XCircle,
    Trash2,
    Edit,
    ExternalLink,
    RefreshCw,
    Shield
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

interface FacebookApp {
    id: number;
    app_name: string;
    facebook_app_id: string;
    facebook_app_secret: string;
    is_default_app: boolean;
    callback_url: string;
    connected_pages_count: number;
    created_at: string;
}

interface Props {
    apps?: FacebookApp[];
    organization?: {
        id: number;
        name: string;
    };
    defaultCallbackUrl?: string;
}

export default function FacebookAppsIndex({
    apps = [],
    organization = { id: 0, name: 'Your Organization' },
    defaultCallbackUrl = ''
}: Props) {
    const [testing, setTesting] = useState<Record<number, boolean>>({});
    const [deleting, setDeleting] = useState<Record<number, boolean>>({});

    // Setup axios with CSRF token on component mount
    useEffect(() => {
        // Function to get fresh CSRF token
        const getCsrfToken = () => {
            return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        };

        // Debug CSRF token
        const csrfToken = getCsrfToken();
        console.log('CSRF Token:', csrfToken ? '✓ Available' : '✗ Not found');
        console.log('CSRF Token length:', csrfToken?.length);

        // Set default headers
        axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfToken;
        axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
        axios.defaults.withCredentials = true;

        // Add request interceptor
        const requestInterceptor = axios.interceptors.request.use(
            (config) => {
                console.log('Making request to:', config.url);
                console.log('Request method:', config.method);
                return config;
            },
            (error) => {
                console.error('Request error:', error);
                return Promise.reject(error);
            }
        );

        // Add response interceptor
        const responseInterceptor = axios.interceptors.response.use(
            (response) => {
                console.log('Response received:', {
                    status: response.status,
                    url: response.config.url,
                    data: response.data
                });
                return response;
            },
            (error) => {
                console.error('Response error:', {
                    status: error.response?.status,
                    data: error.response?.data,
                    url: error.config?.url,
                    method: error.config?.method
                });

                if (error.response?.status === 419) {
                    toast.error('Session expired. Please refresh the page.');
                    setTimeout(() => window.location.reload(), 1000);
                } else if (error.response?.status === 401) {
                    toast.error('Please login to continue.');
                    setTimeout(() => window.location.href = '/login', 1000);
                }
                return Promise.reject(error);
            }
        );

        // Cleanup interceptors
        return () => {
            axios.interceptors.request.eject(requestInterceptor);
            axios.interceptors.response.eject(responseInterceptor);
        };
    }, []);

    const handleTestApp = async (appId: number, appName: string) => {
        setTesting(prev => ({ ...prev, [appId]: true }));

        try {
            const response = await axios.get(`/facebook/apps/${appId}/test`);

            if (response.data.success) {
                toast.success(`${appName} credentials are valid!`);
            } else {
                toast.error(`Invalid credentials for ${appName}`);
            }
        } catch (error: any) {
            console.error('Test app error:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to test app';
            toast.error(errorMessage);
        } finally {
            setTesting(prev => ({ ...prev, [appId]: false }));
        }
    };

    const handleDeleteApp = async (appId: number, appName: string) => {
        if (!confirm(`Are you sure you want to delete "${appName}"? This will also disconnect all connected pages.`)) {
            return;
        }

        setDeleting(prev => ({ ...prev, [appId]: true }));

        try {
            console.log('Deleting app:', { appId, appName });

            // Get fresh CSRF token
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            console.log('CSRF Token for delete:', csrfToken);

            const response = await axios.delete(`/facebook/apps/${appId}`, {
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    'Content-Type': 'application/json',
                }
            });

            console.log('Delete response:', response.data);

            if (response.data.success) {
                toast.success('Facebook App deleted successfully');
                // Reload the page to show updated list
                window.location.reload();
            } else {
                throw new Error(response.data.message || 'Delete failed');
            }
        } catch (error: any) {
            console.error('Delete error details:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                headers: error.response?.headers,
                config: {
                    url: error.config?.url,
                    method: error.config?.method,
                    headers: error.config?.headers
                }
            });

            let errorMessage = 'Failed to delete Facebook App';

            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.response?.status === 404) {
                errorMessage = 'App not found. It may have already been deleted.';
            } else if (error.response?.status === 403) {
                errorMessage = 'You are not authorized to delete this app.';
            } else if (error.response?.status === 419) {
                errorMessage = 'Session expired. Please refresh the page.';
                setTimeout(() => window.location.reload(), 1000);
            }

            toast.error(errorMessage);
        } finally {
            setDeleting(prev => ({ ...prev, [appId]: false }));
        }
    };

    // Fallback method using form submission
    const handleDeleteAppFallback = (appId: number, appName: string) => {
        if (!confirm(`Are you sure you want to delete "${appName}"? This will also disconnect all connected pages.`)) {
            return;
        }

        // Create a hidden form and submit it
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `/facebook/apps/${appId}`;
        form.style.display = 'none';

        // Add CSRF token
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        const csrfInput = document.createElement('input');
        csrfInput.type = 'hidden';
        csrfInput.name = '_token';
        csrfInput.value = csrfToken || '';
        form.appendChild(csrfInput);

        // Add method spoofing for DELETE
        const methodInput = document.createElement('input');
        methodInput.type = 'hidden';
        methodInput.name = '_method';
        methodInput.value = 'DELETE';
        form.appendChild(methodInput);

        // Submit the form
        document.body.appendChild(form);
        form.submit();
    };

    const safeApps = Array.isArray(apps) ? apps : [];
    const safeOrganization = organization || { id: 0, name: 'Your Organization' };

    return (
        <AppLayout>
            <Head title="Facebook Apps" />

            <div className="container mx-auto p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Facebook Apps</h1>
                        <p className="text-muted-foreground">
                            Manage your Facebook App credentials for {safeOrganization.name}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link href="/facebook/connect">
                            <Button variant="outline" className="gap-2">
                                <Globe className="h-4 w-4" />
                                Connect Pages
                            </Button>
                        </Link>

                        <Link href="/facebook/apps/create">
                            <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                                <Plus className="h-4 w-4" />
                                Add Facebook App
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Instructions */}
                <Alert className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <AlertTitle>How to get Facebook App Credentials</AlertTitle>
                    <AlertDescription className="text-sm">
                        1. Go to{' '}
                        <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            Facebook Developer Apps
                        </a>
                        <br />
                        2. Create a new app or use an existing one
                        <br />
                        3. Get App ID and App Secret from Settings → Basic
                        <br />
                        4. Add "Facebook Login" product and configure OAuth redirect URIs
                    </AlertDescription>
                </Alert>

                {/* Apps List */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Your Facebook Apps</CardTitle>
                                <CardDescription>
                                    Apps used to connect Facebook pages to {safeOrganization.name}
                                </CardDescription>
                            </div>
                            <Badge variant="outline" className="gap-2">
                                <Key className="h-3 w-3" />
                                {safeApps.length} {safeApps.length === 1 ? 'App' : 'Apps'}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {safeApps.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="mx-auto w-24 h-24 mb-4 text-muted-foreground">
                                    <div className="w-full h-full rounded-full bg-muted flex items-center justify-center">
                                        <Key className="h-12 w-12" />
                                    </div>
                                </div>
                                <h3 className="text-lg font-semibold mb-2">No Facebook Apps yet</h3>
                                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                    Add your Facebook App credentials to start connecting Facebook pages
                                </p>
                                <div className="flex gap-3 justify-center">
                                    <Link href="/facebook/apps/create">
                                        <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                                            <Plus className="h-4 w-4" />
                                            Add Your First App
                                        </Button>
                                    </Link>
                                    <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer">
                                        <Button variant="outline" className="gap-2">
                                            <ExternalLink className="h-4 w-4" />
                                            Create Facebook App
                                        </Button>
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {safeApps.map((app) => (
                                    <div
                                        key={app.id}
                                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <h4 className="font-bold text-lg">{app.app_name}</h4>
                                                    {app.is_default_app && (
                                                        <Badge variant="default" className="gap-1">
                                                            <CheckCircle className="h-3 w-3" />
                                                            Default
                                                        </Badge>
                                                    )}
                                                    <Badge variant="outline" className="gap-1">
                                                        <Globe className="h-3 w-3" />
                                                        {app.connected_pages_count} connected pages
                                                    </Badge>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                    <div>
                                                        <label className="text-sm font-medium text-muted-foreground">
                                                            App ID
                                                        </label>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                                                                {app.facebook_app_id}
                                                            </code>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => navigator.clipboard.writeText(app.facebook_app_id)}
                                                                className="h-6 w-6 p-0"
                                                            >
                                                                <ExternalLink className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="text-sm font-medium text-muted-foreground">
                                                            App Secret
                                                        </label>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                                                                {app.facebook_app_secret}
                                                            </code>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mb-2">
                                                    <label className="text-sm font-medium text-muted-foreground">
                                                        Callback URL
                                                    </label>
                                                    <p className="text-sm truncate" title={app.callback_url}>
                                                        {app.callback_url}
                                                    </p>
                                                </div>

                                                <p className="text-sm text-muted-foreground">
                                                    Added on {new Date(app.created_at).toLocaleDateString()}
                                                </p>
                                            </div>

                                            <div className="flex flex-col gap-2 ml-4">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleTestApp(app.id, app.app_name)}
                                                    disabled={testing[app.id]}
                                                    className="gap-2"
                                                >
                                                    {testing[app.id] ? (
                                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <CheckCircle className="h-4 w-4" />
                                                    )}
                                                    Test Credentials
                                                </Button>

                                                <Link href={`/facebook/apps/${app.id}/edit`}>
                                                    <Button variant="outline" size="sm" className="gap-2 w-full">
                                                        <Edit className="h-4 w-4" />
                                                        Edit
                                                    </Button>
                                                </Link>

                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDeleteApp(app.id, app.app_name)}
                                                    disabled={deleting[app.id]}
                                                    className="gap-2"
                                                >
                                                    {deleting[app.id] ? (
                                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {safeApps.length > 0 && (
                            <div className="mt-6 pt-6 border-t">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-muted-foreground">
                                        {safeApps.length} Facebook App{safeApps.length !== 1 ? 's' : ''}
                                    </div>
                                    <div className="flex gap-3">
                                        <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer">
                                            <Button variant="outline" className="gap-2">
                                                <ExternalLink className="h-4 w-4" />
                                                Facebook Developer Portal
                                            </Button>
                                        </a>
                                        <Link href="/facebook/apps/create">
                                            <Button className="gap-2">
                                                <Plus className="h-4 w-4" />
                                                Add Another App
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Next Steps */}
                {safeApps.length > 0 && (
                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle>Next Steps</CardTitle>
                            <CardDescription>
                                What to do after adding Facebook Apps
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 border rounded-lg">
                                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-3">
                                        <CheckCircle className="h-5 w-5 text-green-600" />
                                    </div>
                                    <h4 className="font-bold mb-2">Test Credentials</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Verify your App ID and App Secret are working correctly
                                    </p>
                                </div>

                                <div className="p-4 border rounded-lg">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-3">
                                        <Globe className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <h4 className="font-bold mb-2">Connect Pages</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Use your apps to connect Facebook pages
                                    </p>
                                    <Link href="/facebook/connect">
                                        <Button variant="link" className="p-0 h-auto mt-2">
                                            Connect pages →
                                        </Button>
                                    </Link>
                                </div>

                                <div className="p-4 border rounded-lg">
                                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mb-3">
                                        <Settings className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <h4 className="font-bold mb-2">Configure Facebook App</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Add required permissions and configure OAuth settings
                                    </p>
                                    <a href="https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow" target="_blank" rel="noopener noreferrer">
                                        <Button variant="link" className="p-0 h-auto mt-2">
                                            View documentation →
                                        </Button>
                                    </a>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
