import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { ArrowLeft, Clock, Edit, Calendar, User, Briefcase, FileText, StickyNote, UserCircle } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Volunteers', href: '/volunteers' },
    { title: 'Time Sheet', href: '/volunteers/timesheet' },
    { title: 'View Entry', href: '#' },
];

interface Timesheet {
    id: number;
    work_date: string;
    hours: number;
    description: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    job_application: {
        id: number;
        user: {
            name: string;
        };
        job_post: {
            title: string;
        };
    };
    creator: {
        name: string;
    };
}

interface Props {
    timesheet: Timesheet;
}

export default function Show({ timesheet }: Props) {
    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
            });
        } catch {
            return dateString;
        }
    };

    const formatDateTime = (dateString: string) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    };

    // Convert decimal hours to HH:MM:SS format
    const formatTime = (decimalHours: number): string => {
        // Use precise calculation to avoid floating point errors
        const totalSeconds = Math.round(decimalHours * 3600);
        const hours = Math.floor(totalSeconds / 3600);
        const remainingSeconds = totalSeconds % 3600;
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        
        const parts: string[] = [];
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
        
        return parts.join(' ');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="View Time Sheet Entry" />
            <div className="flex flex-1 flex-col gap-4 rounded-xl py-4 px-4 md:py-6 md:px-10">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/volunteers/timesheet">
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Time Sheet Entry</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                View detailed information about this time sheet entry
                            </p>
                        </div>
                    </div>
                    <Link href={`/volunteers/timesheet/${timesheet.id}/edit`}>
                        <Button>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Entry
                        </Button>
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Information Card */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Time Card */}
                        <Card className="border-2 border-border/50 overflow-hidden bg-gradient-to-br from-background to-muted/20">
                            <div className="relative">
                                {/* Header Bar */}
                                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-primary/20 px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                                                <Clock className="h-6 w-6 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                    Work Date
                                                </p>
                                                <p className="text-lg font-bold text-foreground">
                                                    {formatDate(timesheet.work_date)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                                Time Worked
                                            </p>
                                            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border-2 border-green-500/20">
                                                <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
                                                <span className="font-bold text-green-700 dark:text-green-300 text-xl">
                                                    {formatTime(parseFloat(timesheet.hours.toString()))}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Content */}
                                <CardContent className="p-6 space-y-6">
                                    {/* Volunteer Information */}
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                                <User className="h-6 w-6 text-primary" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                                    Volunteer
                                                </p>
                                                <h3 className="font-bold text-lg text-foreground mb-2">
                                                    {timesheet.job_application.user.name}
                                                </h3>
                                                <div className="flex items-center gap-2">
                                                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                                                    <Badge variant="outline" className="text-xs font-semibold py-1 px-2 border-2">
                                                        {timesheet.job_application.job_post.title}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        {timesheet.description && (
                                            <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                        Description
                                                    </p>
                                                </div>
                                                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                                    {timesheet.description}
                                                </p>
                                            </div>
                                        )}

                                        {/* Notes */}
                                        {timesheet.notes && (
                                            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border-2 border-amber-200 dark:border-amber-800/50">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <StickyNote className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                                                        Notes
                                                    </p>
                                                </div>
                                                <p className="text-sm text-foreground italic leading-relaxed whitespace-pre-wrap">
                                                    {timesheet.notes}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>

                                {/* Decorative Corner */}
                                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full pointer-events-none" />
                            </div>
                        </Card>
                    </div>

                    {/* Sidebar Information */}
                    <div className="space-y-6">
                        {/* Logged By Card */}
                        <Card className="border-2 border-border/50">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <UserCircle className="h-5 w-5" />
                                    Logged By
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary/30 flex items-center justify-center">
                                        <span className="text-lg font-bold text-primary">
                                            {timesheet.creator.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-foreground">
                                            {timesheet.creator.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Organization Member
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Entry Details Card */}
                        <Card className="border-2 border-border/50">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    Entry Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                        Created At
                                    </p>
                                    <p className="text-sm text-foreground font-medium">
                                        {formatDateTime(timesheet.created_at)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                        Last Updated
                                    </p>
                                    <p className="text-sm text-foreground font-medium">
                                        {formatDateTime(timesheet.updated_at)}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Actions Card */}
                        <Card className="border-2 border-border/50">
                            <CardHeader>
                                <CardTitle className="text-base">Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Link href={`/volunteers/timesheet/${timesheet.id}/edit`} className="block">
                                    <Button variant="outline" className="w-full justify-start">
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit Entry
                                    </Button>
                                </Link>
                                <Link href="/volunteers/timesheet" className="block">
                                    <Button variant="outline" className="w-full justify-start">
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Back to List
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

