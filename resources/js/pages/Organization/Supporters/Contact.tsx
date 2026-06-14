import React, { useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Copy, Mail, Send } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
    organization: { id: number; name: string };
    supporter: {
        supporter_id: number;
        name: string;
        email: string;
    };
    ledgerShowUrl: string;
    ledgerIndexUrl: string;
}

export default function OrganizationSupportersContact({
    organization,
    supporter,
    ledgerShowUrl,
    ledgerIndexUrl,
}: Props) {
    const [subject, setSubject] = useState(`Message from ${organization.name}`);
    const [message, setMessage] = useState(
        `Hi ${supporter.name},\n\n`,
    );

    const mailtoHref = useMemo(() => {
        const params = new URLSearchParams();
        if (subject.trim()) {
            params.set('subject', subject.trim());
        }
        if (message.trim()) {
            params.set('body', message.trim());
        }
        const query = params.toString();

        return `mailto:${supporter.email}${query ? `?${query}` : ''}`;
    }, [message, subject, supporter.email]);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Organization', href: '/organization' },
        { title: 'Supporters', href: ledgerIndexUrl },
        { title: supporter.name, href: ledgerShowUrl },
        { title: 'Send email', href: route('organization.supporters.contact', supporter.supporter_id) },
    ];

    const copyEmail = async () => {
        try {
            await navigator.clipboard.writeText(supporter.email);
            toast.success('Email copied to clipboard');
        } catch {
            toast.error('Could not copy email');
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Email ${supporter.name}`} />

            <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
                <div className="flex items-start gap-3">
                    <Button variant="ghost" size="icon" className="mt-0.5 shrink-0" asChild>
                        <Link href={ledgerShowUrl}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Send email</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Contact {supporter.name} from {organization.name}
                        </p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            Compose message
                        </CardTitle>
                        <CardDescription>
                            Opens your email app with the fields below pre-filled
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="recipient">To</Label>
                            <div className="flex gap-2">
                                <Input id="recipient" value={supporter.email} readOnly className="font-medium" />
                                <Button type="button" variant="outline" size="icon" onClick={copyEmail} title="Copy email">
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="subject">Subject</Label>
                            <Input
                                id="subject"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="message">Message</Label>
                            <Textarea
                                id="message"
                                rows={8}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2">
                            <Button
                                asChild
                                className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500"
                            >
                                <a href={mailtoHref}>
                                    <Send className="h-4 w-4" />
                                    Open in email app
                                </a>
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href={ledgerShowUrl}>Back to supporter</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
