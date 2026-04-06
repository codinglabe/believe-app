import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/admin/ui/input';
import { Textarea } from '@/components/admin/ui/textarea';
import { Combobox } from '@/components/admin/ui/combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/frontend/ui/select';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { ArrowLeft, Save, Award } from 'lucide-react';
import { showErrorToast } from '@/lib/toast';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Volunteers', href: '/volunteers' },
    { title: 'Time Sheet', href: '/volunteers/timesheet' },
    { title: 'Create Entry', href: '#' },
];

interface Volunteer {
    id: number;
    name: string;
    position: string;
    base_points?: number;
}

interface Props {
    volunteers: Volunteer[];
}

export default function Create({ volunteers }: Props) {
    const [timeInput, setTimeInput] = useState({ hours: '0', minutes: '0', seconds: '0' });
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

    const { data, setData, post, processing, errors } = useForm({
        job_application_id: '',
        work_date: new Date().toISOString().split('T')[0],
        start_date: '',
        end_date: '',
        hours: '',
        description: '',
        notes: '',
        grade: '',
        review_notes: '',
        job_status: '',
    });

    // Get selected volunteer to determine base points (after useForm)
    const selectedVolunteer = volunteers.find(v => v.id.toString() === data.job_application_id);
    const basePoints = selectedVolunteer?.base_points || 100;
    const finalPoints = grade ? Math.round(basePoints * (GRADE_MULTIPLIERS[grade] || 0)) : 0;

    // Convert hours:minutes:seconds to decimal hours
    const convertTimeToDecimal = (h: string, m: string, s: string): number => {
        const hours = parseInt(h) || 0;
        const minutes = parseInt(m) || 0;
        const seconds = parseInt(s) || 0;
        // Use precise calculation to avoid floating point errors
        const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
        return totalSeconds / 3600;
    };

    // Handle time input change
    const handleTimeChange = (field: 'hours' | 'minutes' | 'seconds', value: string) => {
        // Only allow numbers
        const numValue = value.replace(/[^0-9]/g, '');
        
        // Validate ranges (allow unlimited hours, but limit minutes/seconds)
        let validatedValue = numValue;
        if (field === 'minutes' && parseFloat(numValue) > 59) {
            validatedValue = '59';
        } else if (field === 'seconds' && parseFloat(numValue) > 59) {
            validatedValue = '59';
        }

        const newTime = { ...timeInput, [field]: validatedValue };
        setTimeInput(newTime);
        
        // Convert to decimal hours and update form data
        const decimalHours = convertTimeToDecimal(newTime.hours, newTime.minutes, newTime.seconds);
        setData('hours', decimalHours > 0 ? decimalHours.toString() : '');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Ensure at least some time is entered
        const totalHours = convertTimeToDecimal(timeInput.hours, timeInput.minutes, timeInput.seconds);
        if (totalHours <= 0) {
            showErrorToast('Please enter at least some time (hours, minutes, or seconds)');
            return;
        }

        // Update form data with assessment fields
        setData({
            ...data,
            grade: grade || undefined,
            review_notes: reviewNotes || undefined,
            job_status: jobApplicationStatus || undefined,
        });

        post('/volunteers/timesheet', {
            onError: () => {
                showErrorToast('Please fix the errors in the form');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Time Sheet Entry" />
            <div className="flex flex-1 flex-col gap-4 rounded-xl py-4 px-4 md:py-6 md:px-10">
                <Card className="px-0">
                    <CardHeader className="px-4 md:px-6">
                        <div className="flex items-center gap-4">
                            <Link href="/volunteers/timesheet">
                                <Button variant="outline" size="icon">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                            <div>
                                <CardTitle className="text-2xl font-bold">Create Time Sheet Entry</CardTitle>
                                <CardDescription>
                                    Log hours worked by a volunteer
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 md:px-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="job_application_id">Volunteer *</Label>
                                <Combobox
                                    fetchUrl={route('volunteers.timesheet.fetch-volunteers')}
                                    initialOptions={volunteers.map((volunteer) => ({
                                        value: volunteer.id.toString(),
                                        label: `${volunteer.name} - ${volunteer.position}`,
                                    }))}
                                    value={data.job_application_id}
                                    onValueChange={(value) => setData('job_application_id', value)}
                                    placeholder="Select a volunteer..."
                                    searchPlaceholder="Search volunteers..."
                                    emptyText="No volunteer found."
                                    className={errors.job_application_id ? 'border-destructive' : ''}
                                />
                                {errors.job_application_id && (
                                    <p className="text-sm text-destructive mt-1">{errors.job_application_id}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="work_date">Work Date *</Label>
                                    <Input
                                        id="work_date"
                                        type="date"
                                        value={data.work_date}
                                        onChange={(e) => setData('work_date', e.target.value)}
                                        className={errors.work_date ? 'border-destructive' : ''}
                                        required
                                    />
                                    {errors.work_date && (
                                        <p className="text-sm text-destructive mt-1">{errors.work_date}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>Time Worked *</Label>
                                    <div className="grid grid-cols-3 gap-3">
                                        <Input
                                            id="time_hours"
                                            type="number"
                                            min="0"
                                            value={timeInput.hours}
                                            onChange={(e) => handleTimeChange('hours', e.target.value)}
                                            className={errors.hours ? 'border-destructive' : ''}
                                            placeholder="Hours"
                                        />
                                        <Input
                                            id="time_minutes"
                                            type="number"
                                            min="0"
                                            max="59"
                                            value={timeInput.minutes}
                                            onChange={(e) => handleTimeChange('minutes', e.target.value)}
                                            className={errors.hours ? 'border-destructive' : ''}
                                            placeholder="Minutes"
                                        />
                                        <Input
                                            id="time_seconds"
                                            type="number"
                                            min="0"
                                            max="59"
                                            value={timeInput.seconds}
                                            onChange={(e) => handleTimeChange('seconds', e.target.value)}
                                            className={errors.hours ? 'border-destructive' : ''}
                                            placeholder="Seconds"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Format: Hours:Minutes:Seconds (e.g., 4:30:0 = 4 hours 30 minutes)
                                    </p>
                                    {errors.hours && (
                                        <p className="text-sm text-destructive mt-1">{errors.hours}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    className={errors.description ? 'border-destructive' : ''}
                                    placeholder="What did the volunteer do?"
                                    rows={5}
                                />
                                {errors.description && (
                                    <p className="text-sm text-destructive mt-1">{errors.description}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    className={errors.notes ? 'border-destructive' : ''}
                                    placeholder="Additional notes (optional)"
                                    rows={5}
                                />
                                {errors.notes && (
                                    <p className="text-sm text-destructive mt-1">{errors.notes}</p>
                                )}
                            </div>

                            {/* Assessment Section */}
                            {data.job_application_id && (
                                <div className="space-y-4 pt-4 border-t border-border/50">
                                    <div>
                                        <h3 className="text-base font-semibold mb-2">Volunteer Assessment (Optional)</h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Assess the volunteer's work and award recognition points. Leave empty to skip assessment.
                                        </p>
                                    </div>

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
                                        <Label htmlFor="grade">Assessment Grade (Optional)</Label>
                                        <Select value={grade || undefined} onValueChange={setGrade}>
                                            <SelectTrigger id="grade">
                                                <SelectValue placeholder="Select a grade (optional)" />
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
                                                return {
                                                    bg: 'bg-green-50 dark:bg-green-950/20',
                                                    border: 'border-green-200 dark:border-green-800',
                                                    icon: 'text-green-600 dark:text-green-400',
                                                    text: 'text-green-900 dark:text-green-100',
                                                    value: 'text-green-700 dark:text-green-300',
                                                    calc: 'text-green-700 dark:text-green-300'
                                                };
                                            } else if (points >= basePoints * 0.5) {
                                                return {
                                                    bg: 'bg-blue-50 dark:bg-blue-950/20',
                                                    border: 'border-blue-200 dark:border-blue-800',
                                                    icon: 'text-blue-600 dark:text-blue-400',
                                                    text: 'text-blue-900 dark:text-blue-100',
                                                    value: 'text-blue-700 dark:text-blue-300',
                                                    calc: 'text-blue-700 dark:text-blue-300'
                                                };
                                            } else {
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
                                            Optionally update the job status. Leave empty to keep current status.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-4 pt-4">
                                <Link href="/volunteers/timesheet">
                                    <Button type="button" variant="outline">
                                        Cancel
                                    </Button>
                                </Link>
                                <Button type="submit" disabled={processing}>
                                    <Save className="mr-2 h-4 w-4" />
                                    {processing ? 'Saving...' : 'Save Entry'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
