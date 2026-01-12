import React, { useState, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/frontend/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    Key,
    Globe,
    Info,
    ExternalLink,
    Shield,
    Copy,
    ArrowLeft,
    Save
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
    app: {
        id: number;
        app_name: string;
        facebook_app_id: string;
        facebook_app_secret: string;
        callback_url: string;
        is_default_app: boolean;
    };
    defaultCallbackUrl?: string;
}

export default function FacebookAppsEdit({ app, defaultCallbackUrl = '' }: Props) {
    const [form, setForm] = useState({
        app_name: '',
        facebook_app_id: '',
        facebook_app_secret: '',
        callback_url: '',
        is_default_app: false,
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (app) {
            setForm({
                app_name: app.app_name || '',
                facebook_app_id: app.facebook_app_id || '',
                facebook_app_secret: app.facebook_app_secret || '',
                callback_url: app.callback_url || defaultCallbackUrl,
                is_default_app: app.is_default_app || false,
            });
        }
    }, [app, defaultCallbackUrl]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.app_name.trim()) {
            toast.error('Please enter an app name');
            return;
        }

        if (!form.facebook_app_id.trim()) {
            toast.error('Please enter Facebook App ID');
            return;
        }

        if (!form.facebook_app_secret.trim()) {
            toast.error('Please enter Facebook App Secret');
            return;
        }

        setLoading(true);

        try {
            await router.put(`/facebook/apps/${app.id}`, form, {
                onSuccess: () => {
                    toast.success('Facebook App updated successfully');
                },
                onError: (errors) => {
                    if (errors) {
                        Object.values(errors).forEach(error => {
                            if (Array.isArray(error)) {
                                error.forEach(err => toast.error(err));
                            } else {
                                toast.error(error);
                            }
                        });
                    }
                },
            });
        } catch (error) {
            toast.error('Failed to update Facebook App');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    return (
        <AppLayout>
            <Head title="Edit Facebook App" />

            <div className="container mx-auto p-4 md:p-6 max-w-4xl">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <Link href="/facebook/apps">
                        <Button variant="ghost" size="sm" className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Apps
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Edit Facebook App</h1>
                        <p className="text-muted-foreground">
                            Update your Facebook App credentials
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Form */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>App Credentials</CardTitle>
                                <CardDescription>
                                    Update your Facebook App ID and App Secret
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="app_name">App Name *</Label>
                                        <Input
                                            id="app_name"
                                            name="app_name"
                                            value={form.app_name}
                                            onChange={handleInputChange}
                                            placeholder="My Facebook App"
                                            required
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            A friendly name to identify this app
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="facebook_app_id">Facebook App ID *</Label>
                                        <Input
                                            id="facebook_app_id"
                                            name="facebook_app_id"
                                            value={form.facebook_app_id}
                                            onChange={handleInputChange}
                                            placeholder="123456789012345"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="facebook_app_secret">Facebook App Secret *</Label>
                                        <Input
                                            id="facebook_app_secret"
                                            name="facebook_app_secret"
                                            type="password"
                                            value={form.facebook_app_secret}
                                            onChange={handleInputChange}
                                            placeholder="abcdef1234567890abcdef1234567890"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="callback_url">Callback URL</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="callback_url"
                                                name="callback_url"
                                                value={form.callback_url}
                                                onChange={handleInputChange}
                                                placeholder={defaultCallbackUrl}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => copyToClipboard(form.callback_url)}
                                                className="gap-2"
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Must match the OAuth redirect URI in Facebook Developer settings
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="space-y-0.5">
                                            <Label htmlFor="is_default_app" className="text-base">
                                                Set as Default App
                                            </Label>
                                            <p className="text-sm text-muted-foreground">
                                                Use this app for new page connections by default
                                            </p>
                                        </div>
                                        <Switch
                                            id="is_default_app"
                                            checked={form.is_default_app}
                                            onCheckedChange={(checked) =>
                                                setForm(prev => ({ ...prev, is_default_app: checked }))
                                            }
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <Link href="/facebook/apps">
                                            <Button type="button" variant="outline">
                                                Cancel
                                            </Button>
                                        </Link>
                                        <Button type="submit" disabled={loading} className="gap-2">
                                            {loading ? (
                                                <>Saving...</>
                                            ) : (
                                                <>
                                                    <Save className="h-4 w-4" />
                                                    Save Changes
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Instructions */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Info className="h-5 w-5" />
                                    App Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                        App ID: {app.facebook_app_id}
                                    </p>
                                </div>

                                <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                                    <Shield className="h-4 w-4 text-green-600" />
                                    <AlertTitle>Update Notes</AlertTitle>
                                    <AlertDescription className="text-sm">
                                        When you update your App Secret, all connected pages using this app will need to reconnect.
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>

                        <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                            <Shield className="h-4 w-4 text-yellow-600" />
                            <AlertTitle>Security Warning</AlertTitle>
                            <AlertDescription className="text-sm">
                                Never share your App Secret with anyone. If compromised, regenerate it immediately.
                            </AlertDescription>
                        </Alert>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Globe className="h-5 w-5" />
                                    OAuth Configuration
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="text-sm font-medium">Callback URL to add in Facebook:</div>
                                    <code className="block p-2 bg-muted rounded text-xs break-all">
                                        {form.callback_url}
                                    </code>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => copyToClipboard(form.callback_url)}
                                        className="gap-2 w-full mt-2"
                                    >
                                        <Copy className="h-3 w-3" />
                                        Copy Callback URL
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
