import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/admin/ui/input';
import { Textarea } from '@/components/admin/ui/textarea';
import { Combobox } from '@/components/admin/ui/combobox';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { ArrowLeft, Save } from 'lucide-react';
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
}

interface Props {
    volunteers: Volunteer[];
}

export default function Create({ volunteers }: Props) {
    const [timeInput, setTimeInput] = useState({ hours: '0', minutes: '0', seconds: '0' });

    const { data, setData, post, processing, errors } = useForm({
        job_application_id: '',
        work_date: new Date().toISOString().split('T')[0],
        hours: '',
        description: '',
        notes: '',
    });

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
        
        // Validate ranges
        let validatedValue = numValue;
        if (field === 'hours' && parseFloat(numValue) > 23) {
            validatedValue = '23';
        } else if (field === 'minutes' && parseFloat(numValue) > 59) {
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
                                            max="23"
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
