import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Facebook, CheckCircle2, Globe, Users, Info } from 'lucide-react';

interface PageOption {
    id: string;
    name: string;
    category: string | null;
    followers_count: number;
    picture_url: string | null;
}

interface Props {
    pages: PageOption[];
    facebookUserName: string;
    organizationName: string;
}

export default function SelectPages({ pages, facebookUserName, organizationName }: Props) {
    const [selected, setSelected] = useState<string[]>(pages.map((p) => p.id));
    const [submitting, setSubmitting] = useState(false);

    const toggle = (pageId: string) => {
        setSelected((prev) =>
            prev.includes(pageId) ? prev.filter((id) => id !== pageId) : [...prev, pageId]
        );
    };

    const selectAll = () => setSelected(pages.map((p) => p.id));
    const clearAll = () => setSelected([]);

    const handleSubmit = () => {
        if (selected.length === 0) return;
        setSubmitting(true);
        router.post(
            '/facebook/select-pages',
            { page_ids: selected },
            {
                onFinish: () => setSubmitting(false),
            }
        );
    };

    return (
        <AppLayout>
            <Head title="Select Facebook Pages" />

            <div className="container mx-auto max-w-3xl p-4 md:p-6">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold tracking-tight">Select Facebook Pages</h1>
                    <p className="text-muted-foreground mt-2">
                        Logged in as <strong>{facebookUserName}</strong>. Choose which Pages to connect to{' '}
                        <strong>{organizationName}</strong>.
                    </p>
                </div>

                <Alert className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertTitle>Why this step?</AlertTitle>
                    <AlertDescription>
                        We use <code className="text-xs">pages_show_list</code> only to display Pages you manage
                        and connect the ones you select. We never access Pages you do not choose here.
                    </AlertDescription>
                </Alert>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Facebook className="h-5 w-5 text-blue-600" />
                            Your Facebook Pages ({pages.length})
                        </CardTitle>
                        <CardDescription>
                            Select one or more Pages, then confirm to finish connecting.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                                Select all
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
                                Clear
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {pages.map((page) => {
                                const checked = selected.includes(page.id);
                                return (
                                    <div
                                        key={page.id}
                                        className={`flex items-center gap-4 rounded-lg border p-4 transition-colors ${
                                            checked ? 'border-blue-300 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/10' : ''
                                        }`}
                                    >
                                        <Checkbox
                                            id={`page-${page.id}`}
                                            checked={checked}
                                            onCheckedChange={() => toggle(page.id)}
                                        />
                                        {page.picture_url ? (
                                            <img
                                                src={page.picture_url}
                                                alt={page.name}
                                                className="h-12 w-12 rounded-lg object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                                <Facebook className="h-6 w-6 text-blue-600" />
                                            </div>
                                        )}
                                        <Label
                                            htmlFor={`page-${page.id}`}
                                            className="flex flex-1 cursor-pointer flex-col gap-1"
                                        >
                                            <span className="font-semibold">{page.name}</span>
                                            <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                                {page.category && (
                                                    <span className="inline-flex items-center gap-1">
                                                        <Globe className="h-3 w-3" />
                                                        {page.category}
                                                    </span>
                                                )}
                                                <span className="inline-flex items-center gap-1">
                                                    <Users className="h-3 w-3" />
                                                    {page.followers_count.toLocaleString()} followers
                                                </span>
                                                <span className="text-xs">ID: {page.id}</span>
                                            </span>
                                        </Label>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:justify-between">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.visit('/facebook/connect')}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                disabled={selected.length === 0 || submitting}
                                className="gap-2 bg-blue-600 hover:bg-blue-700"
                                onClick={handleSubmit}
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                {submitting
                                    ? 'Connecting…'
                                    : `Connect ${selected.length} Page${selected.length === 1 ? '' : 's'}`}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
