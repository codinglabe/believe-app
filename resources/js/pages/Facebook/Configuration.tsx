import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    CheckCircle,
    XCircle,
    RefreshCw,
    Settings,
    Globe,
    Database,
    Shield,
    ExternalLink,
    Copy,
    Terminal
} from 'lucide-react';
import { toast } from 'sonner';

interface TestResult {
    success: boolean;
    message: string;
    details?: any;
}

interface Config {
    app_id: string;
    redirect_uri: string;
    app_url: string;
    environment: string;
}

interface NextStep {
    title: string;
    description: string;
    command?: string;
    url?: string;
    priority: 'high' | 'medium' | 'low';
}

interface Props {
    config: Config;
    tests: {
        facebook_api: TestResult;
        https: TestResult;
        database: TestResult;
        all_passed: boolean;
    };
    next_steps: NextStep[];
}

export default function Configuration({ config, tests, next_steps }: Props) {
    const [loading, setLoading] = useState(false);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    const runCommand = async (command: string) => {
        setLoading(true);
        try {
            // Show command in toast
            toast.info(`Run: ${command}`);

            // Simulate delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Reload page to see changes
            router.reload();
        } catch (error) {
            toast.error('Failed to execute command');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppLayout>
            <Head title="Facebook Configuration" />

            <div className="container mx-auto p-4 md:p-6 max-w-6xl">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">Facebook Configuration</h1>
                    <p className="text-muted-foreground mt-2">
                        Configure and test your Facebook integration settings
                    </p>
                </div>

                {/* Configuration Status */}
                <div className="mb-8">
                    <Alert className={tests.all_passed ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}>
                        {tests.all_passed ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                            <XCircle className="h-4 w-4 text-yellow-600" />
                        )}
                        <AlertTitle>
                            {tests.all_passed ? 'Configuration Complete' : 'Configuration Required'}
                        </AlertTitle>
                        <AlertDescription>
                            {tests.all_passed
                                ? 'All Facebook integration tests passed successfully.'
                                : 'Some configuration steps are required before you can use Facebook integration.'}
                        </AlertDescription>
                    </Alert>
                </div>

                {/* Current Configuration */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Current Configuration</CardTitle>
                        <CardDescription>
                            Your current Facebook app settings
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">
                                        Facebook App ID
                                    </label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <code className="bg-muted px-2 py-1 rounded text-sm">
                                            {config.app_id || 'Not set'}
                                        </code>
                                        {config.app_id && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => copyToClipboard(config.app_id)}
                                                className="h-8 w-8 p-0"
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">
                                        Redirect URI
                                    </label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <code className="bg-muted px-2 py-1 rounded text-sm truncate">
                                            {config.redirect_uri || 'Not set'}
                                        </code>
                                        {config.redirect_uri && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => copyToClipboard(config.redirect_uri)}
                                                className="h-8 w-8 p-0"
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">
                                        Application URL
                                    </label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <code className="bg-muted px-2 py-1 rounded text-sm">
                                            {config.app_url}
                                        </code>
                                        <a
                                            href={config.app_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                <ExternalLink className="h-4 w-4" />
                                            </Button>
                                        </a>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">
                                        Environment
                                    </label>
                                    <div className="mt-1">
                                        <Badge variant={config.environment === 'production' ? 'destructive' : 'secondary'}>
                                            {config.environment}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Test Results */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Connection Tests</CardTitle>
                        <CardDescription>
                            Results of configuration tests
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* HTTPS Test */}
                            <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    tests.https.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                }`}>
                                    {tests.https.success ? (
                                        <CheckCircle className="h-5 w-5" />
                                    ) : (
                                        <XCircle className="h-5 w-5" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold">HTTPS Check</h4>
                                        <Badge variant={tests.https.success ? 'default' : 'destructive'}>
                                            {tests.https.success ? 'PASSED' : 'FAILED'}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {tests.https.message}
                                    </p>
                                    {tests.https.details && (
                                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                                            {JSON.stringify(tests.https.details, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            </div>

                            {/* Facebook API Test */}
                            <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    tests.facebook_api.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                }`}>
                                    {tests.facebook_api.success ? (
                                        <CheckCircle className="h-5 w-5" />
                                    ) : (
                                        <XCircle className="h-5 w-5" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold">Facebook API Connection</h4>
                                        <Badge variant={tests.facebook_api.success ? 'default' : 'destructive'}>
                                            {tests.facebook_api.success ? 'PASSED' : 'FAILED'}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {tests.facebook_api.message}
                                    </p>
                                    {tests.facebook_api.details && (
                                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                                            {JSON.stringify(tests.facebook_api.details, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            </div>

                            {/* Database Test */}
                            <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    tests.database.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                }`}>
                                    {tests.database.success ? (
                                        <CheckCircle className="h-5 w-5" />
                                    ) : (
                                        <XCircle className="h-5 w-5" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold">Database Connection</h4>
                                        <Badge variant={tests.database.success ? 'default' : 'destructive'}>
                                            {tests.database.success ? 'PASSED' : 'FAILED'}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {tests.database.message}
                                    </p>
                                    {tests.database.details && (
                                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                                            {JSON.stringify(tests.database.details, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Next Steps */}
                {next_steps.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Next Steps</CardTitle>
                            <CardDescription>
                                Follow these steps to complete Facebook configuration
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {next_steps.map((step, index) => (
                                    <div
                                        key={index}
                                        className={`p-4 border rounded-lg ${
                                            step.priority === 'high'
                                                ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                                                : 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                    step.priority === 'high'
                                                        ? 'bg-red-100 text-red-600'
                                                        : 'bg-yellow-100 text-yellow-600'
                                                }`}>
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold">{step.title}</h4>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {step.description}
                                                    </p>
                                                    {step.command && (
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <Terminal className="h-4 w-4 text-muted-foreground" />
                                                            <code className="bg-black text-white px-2 py-1 rounded text-sm">
                                                                {step.command}
                                                            </code>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => runCommand(step.command!)}
                                                                disabled={loading}
                                                                className="h-8"
                                                            >
                                                                Run Command
                                                            </Button>
                                                        </div>
                                                    )}
                                                    {step.url && (
                                                        <div className="mt-2">
                                                            <a
                                                                href={step.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                <Button variant="outline" size="sm" className="gap-2">
                                                                    <ExternalLink className="h-4 w-4" />
                                                                    Open Link
                                                                </Button>
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <Badge variant={step.priority === 'high' ? 'destructive' : 'secondary'}>
                                                {step.priority.toUpperCase()}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between mt-6 pt-6 border-t">
                    <div className="text-sm text-muted-foreground">
                        {tests.all_passed
                            ? 'All tests passed. You can now connect Facebook.'
                            : `${next_steps.length} configuration step(s) required.`}
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => router.reload()}
                            className="gap-2"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Refresh Tests
                        </Button>

                        {tests.all_passed ? (
                            <Link href="/facebook/connect">
                                <Button className="gap-2">
                                    <Globe className="h-4 w-4" />
                                    Connect Facebook
                                </Button>
                            </Link>
                        ) : (
                            <Link href="https://developers.facebook.com/apps/1662530284160452/settings/">
                                <Button className="gap-2" variant="default">
                                    <ExternalLink className="h-4 w-4" />
                                    Open Facebook App Settings
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
