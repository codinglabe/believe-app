import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/admin/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/frontend/ui/select';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { ArrowLeft, Clock, Edit, Calendar, User, Briefcase, FileText, StickyNote, UserCircle, CheckCircle2, XCircle, Loader2, Trash2, Award } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Volunteers', href: '/volunteers' },
    { title: 'Time Sheet', href: '/volunteers/timesheet' },
    { title: 'View Entry', href: '#' },
];

interface Timesheet {
    id: number;
    work_date: string;
    start_date?: string;
    end_date?: string;
    hours: number;
    description: string | null;
    notes: string | null;
    status: 'pending' | 'approved' | 'rejected' | 'in_progress';
    is_completion_request?: boolean;
    base_points?: number;
    created_at: string;
    updated_at: string;
    job_application: {
        id: number;
        user: {
            name: string;
        };
        job_post: {
            title: string;
            points?: number;
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
    const [loading, setLoading] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
    const [pendingStatus, setPendingStatus] = useState<'approved' | null>(null);
    const [grade, setGrade] = useState<string>('');
    const [reviewNotes, setReviewNotes] = useState<string>('');
    const [jobApplicationStatus, setJobApplicationStatus] = useState<string>('');

    // Grade multipliers
    const GRADE_MULTIPLIERS: Record<string, number> = {
        'excellent': 1.00,
        'good': 0.80,
        'acceptable': 0.60,
        'needs_improvement': 0.25,
        'rejected': 0.00,
    };

    const basePoints = timesheet.base_points || timesheet.job_application.job_post.points || 100;
    
    // Calculate final points preview
    const finalPoints = grade ? Math.round(basePoints * (GRADE_MULTIPLIERS[grade] || 0)) : 0;

    const getStatusColor = (status: string) => {
        const colors = {
            'pending': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
            'approved': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
            'rejected': 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
            'in_progress': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
        };
        return colors[status] || 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
    };

    const getStatusText = (status: string) => {
        const texts = {
            'pending': 'Pending Review',
            'approved': 'Approved',
            'rejected': 'Rejected',
            'in_progress': 'In Progress',
        };
        return texts[status] || status;
    };

    const handleStatusUpdate = (newStatus: string) => {
        // For completion requests, show assessment modal only for approve
        if (timesheet.is_completion_request && newStatus === 'approved') {
            setPendingStatus('approved');
            setIsAssessmentModalOpen(true);
        } else {
            // Direct status update for reject or non-completion requests
            submitStatusUpdate(newStatus, null, null);
        }
    };

    const submitStatusUpdate = (newStatus: string, selectedGrade: string | null, notes: string | null, jobStatus?: string | null) => {
        setLoading(true);
        const payload: any = { status: newStatus };
        
        if (selectedGrade) {
            payload.grade = selectedGrade;
        }
        if (notes) {
            payload.review_notes = notes;
        }
        if (jobStatus) {
            payload.job_status = jobStatus;
        }

        router.put(`/volunteers/timesheet/${timesheet.id}/status`, payload, {
            onSuccess: () => {
                showSuccessToast(`Time sheet ${newStatus === 'approved' ? 'approved and assessed' : 'rejected'} successfully`);
                setIsAssessmentModalOpen(false);
                setGrade('');
                setReviewNotes('');
                setJobApplicationStatus('');
                setPendingStatus(null);
            },
            onError: () => {
                showErrorToast('Failed to update time sheet status');
            },
            onFinish: () => setLoading(false),
        });
    };

    const handleAssessmentSubmit = () => {
        if (!grade) {
            showErrorToast('Please select a grade for the assessment');
            return;
        }
        if (pendingStatus) {
            submitStatusUpdate(pendingStatus, grade, reviewNotes, jobApplicationStatus || null);
        }
    };

    const handleDelete = () => {
        setLoading(true);
        router.delete(`/volunteers/timesheet/${timesheet.id}`, {
            onSuccess: () => {
                showSuccessToast('Time sheet entry deleted successfully');
                router.visit('/volunteers/timesheet');
            },
            onError: () => {
                showErrorToast('Failed to delete time sheet entry');
            },
            onFinish: () => {
                setLoading(false);
                setIsDeleteModalOpen(false);
            },
        });
    };

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
                                            <div className="flex-1">
                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                    {timesheet.start_date && timesheet.end_date ? 'Date Range' : 'Work Date'}
                                                </p>
                                                <p className="text-lg font-bold text-foreground">
                                                    {timesheet.start_date && timesheet.end_date 
                                                        ? `${formatDate(timesheet.start_date)} - ${formatDate(timesheet.end_date)}`
                                                        : formatDate(timesheet.work_date)}
                                                </p>
                                                {/* Status Badges Below Date Range */}
                                                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                                    {timesheet.is_completion_request && (
                                                        <Badge className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800 text-xs px-1.5 py-0.5">
                                                            Completion Request
                                                        </Badge>
                                                    )}
                                                    <Badge className={`${getStatusColor(timesheet.status)} border text-xs px-1.5 py-0.5`}>
                                                        {getStatusText(timesheet.status)}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <div>
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

                        {/* Status Actions for Completion Requests */}
                        {timesheet.is_completion_request && (timesheet.status === 'pending' || timesheet.status === 'rejected') && (
                            <Card className="border-2 border-border/50">
                                <CardHeader>
                                    <CardTitle className="text-base">Status Actions</CardTitle>
                                    <CardDescription>
                                        {timesheet.status === 'pending' 
                                            ? 'Review and update the completion request status'
                                            : 'This completion request was rejected. You can approve it if it was done by mistake.'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <Button
                                        onClick={() => handleStatusUpdate('approved')}
                                        disabled={loading}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                    >
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        Approve
                                    </Button>
                                    {timesheet.status === 'pending' && (
                                        <Button
                                            variant="outline"
                                            onClick={() => handleStatusUpdate('rejected')}
                                            disabled={loading}
                                            className="w-full border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
                                        >
                                            <XCircle className="mr-2 h-4 w-4" />
                                            Reject
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        )}

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
                                <Button
                                    variant="outline"
                                    onClick={() => setIsDeleteModalOpen(true)}
                                    disabled={loading}
                                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Entry
                                </Button>
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

            {/* Delete Confirmation Modal */}
            <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Time Sheet Entry</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this time sheet entry? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setIsDeleteModalOpen(false)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Assessment Modal for Approval/In Progress */}
            <Dialog open={isAssessmentModalOpen} onOpenChange={setIsAssessmentModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Volunteer Assessment</DialogTitle>
                        <DialogDescription>
                            Assess the volunteer's work and award recognition points. Select a grade and the system will calculate final points.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {/* Base Points Display */}
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Award className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Base Points</span>
                                </div>
                                <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{basePoints} points</span>
                            </div>
                        </div>

                        {/* Grade Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="grade">
                                Assessment Grade <span className="text-red-500">*</span>
                            </Label>
                            <Select value={grade} onValueChange={setGrade}>
                                <SelectTrigger id="grade">
                                    <SelectValue placeholder="Select a grade" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="excellent">Excellent (100%)</SelectItem>
                                    <SelectItem value="good">Good (80%)</SelectItem>
                                    <SelectItem value="acceptable">Acceptable (60%)</SelectItem>
                                    <SelectItem value="needs_improvement">Needs Improvement (25%)</SelectItem>
                                    <SelectItem value="rejected">Rejected (0%)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                The grade determines the multiplier applied to base points
                            </p>
                        </div>

                        {/* Final Points Preview */}
                        {grade && (() => {
                            // Determine color based on points (high = green, medium = blue, low/zero = gray)
                            const getPointsColor = (points: number) => {
                                if (points === 0) {
                                    return {
                                        bg: 'bg-gray-50 dark:bg-gray-950/20',
                                        border: 'border-gray-200 dark:border-gray-800',
                                        icon: 'text-gray-600 dark:text-gray-400',
                                        text: 'text-gray-900 dark:text-gray-100',
                                        value: 'text-gray-700 dark:text-gray-300',
                                        calc: 'text-gray-700 dark:text-gray-300'
                                    };
                                } else if (points >= basePoints * 0.8) {
                                    // High points (80%+ of base) - Green
                                    return {
                                        bg: 'bg-green-50 dark:bg-green-950/20',
                                        border: 'border-green-200 dark:border-green-800',
                                        icon: 'text-green-600 dark:text-green-400',
                                        text: 'text-green-900 dark:text-green-100',
                                        value: 'text-green-700 dark:text-green-300',
                                        calc: 'text-green-700 dark:text-green-300'
                                    };
                                } else if (points >= basePoints * 0.5) {
                                    // Medium points (50-79% of base) - Blue
                                    return {
                                        bg: 'bg-blue-50 dark:bg-blue-950/20',
                                        border: 'border-blue-200 dark:border-blue-800',
                                        icon: 'text-blue-600 dark:text-blue-400',
                                        text: 'text-blue-900 dark:text-blue-100',
                                        value: 'text-blue-700 dark:text-blue-300',
                                        calc: 'text-blue-700 dark:text-blue-300'
                                    };
                                } else {
                                    // Low points (below 50% of base) - Amber
                                    return {
                                        bg: 'bg-amber-50 dark:bg-amber-950/20',
                                        border: 'border-amber-200 dark:border-amber-800',
                                        icon: 'text-amber-600 dark:text-amber-400',
                                        text: 'text-amber-900 dark:text-amber-100',
                                        value: 'text-amber-700 dark:text-amber-300',
                                        calc: 'text-amber-700 dark:text-amber-300'
                                    };
                                }
                            };
                            
                            const colors = getPointsColor(finalPoints);
                            
                            return (
                                <div className={`p-3 ${colors.bg} border ${colors.border} rounded-lg`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Award className={`h-4 w-4 ${colors.icon}`} />
                                            <span className={`text-sm font-medium ${colors.text}`}>Final Points</span>
                                        </div>
                                        <span className={`text-lg font-bold ${colors.value}`}>
                                            {finalPoints} points
                                        </span>
                                    </div>
                                    <p className={`text-xs ${colors.calc} mt-1`}>
                                        {basePoints} × {Math.round((GRADE_MULTIPLIERS[grade] || 0) * 100)}% = {finalPoints}
                                    </p>
                                </div>
                            );
                        })()}

                        {/* Review Notes */}
                        <div className="space-y-2">
                            <Label htmlFor="review_notes">Review Notes (Optional)</Label>
                            <Textarea
                                id="review_notes"
                                value={reviewNotes}
                                onChange={(e) => setReviewNotes(e.target.value)}
                                placeholder="Add any notes or comments about the volunteer's work..."
                                rows={4}
                                className="w-full"
                            />
                            <p className="text-xs text-muted-foreground">
                                Optional notes about the assessment
                            </p>
                        </div>

                        {/* Optional Job Status */}
                        <div className="space-y-2">
                            <Label htmlFor="job_status">Update Job Status (Optional)</Label>
                            <Select value={jobApplicationStatus || undefined} onValueChange={(value) => setJobApplicationStatus(value || '')}>
                                <SelectTrigger id="job_status">
                                    <SelectValue placeholder="Keep current status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Optionally update the job status when approving. Leave empty to keep current status.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsAssessmentModalOpen(false);
                                setGrade('');
                                setReviewNotes('');
                                setJobApplicationStatus('');
                                setPendingStatus(null);
                            }}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAssessmentSubmit}
                            disabled={loading || !grade}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Approve & Assess
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

