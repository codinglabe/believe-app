import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TextArea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { ArrowLeft, Save } from 'lucide-react';
import { showErrorToast } from '@/lib/toast';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Job Posts', href: '/job-posts' },
    { title: 'Create', href: '/job-posts/create' },
];

interface Props {
    positions: { id: number; title: string }[];
    typeOptions: Record<string, string>;
    locationTypeOptions: Record<string, string>;
    statusOptions: Record<string, string>;
    currencyOptions: Record<string, string>;
}

export default function Create({
    positions,
    typeOptions,
    locationTypeOptions,
    statusOptions,
    currencyOptions,
}: Props) {
    const [formData, setFormData] = useState({
        position_id: '',
        title: '',
        description: '',
        requirements: '',
        pay_rate: '',
        currency: '',
        type: '',
        location_type: '',
        city: '',
        state: '',
        country: '',
        time_commitment_min_hours: '',
        application_deadline: '',
        status: 'draft',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        router.post('/job-posts', formData, {
            onError: (errors) => {
                setErrors(errors);
                showErrorToast('Failed to create job post');
                setIsSubmitting(false);
            },
            onSuccess: () => {
                router.visit('/job-posts');
            },
        });
    };

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }));
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Job Post" />
            <div className="flex flex-1 flex-col gap-4 rounded-xl py-4 px-4 md:py-6 md:px-10">
                <Card className="px-0">
                    <CardHeader className="px-4 md:px-6">
                        <div className="flex items-center gap-4">
                            <Link href="/job-posts">
                                <Button variant="outline" size="icon">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                            <div>
                                <CardTitle className="text-2xl font-bold">Create Job Post</CardTitle>
                                <p className="text-muted-foreground">Add a new job posting</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 md:px-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="position_id">Position *</Label>
                                    <Select
                                        value={formData.position_id}
                                        onValueChange={(value) => handleChange('position_id', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a position" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {positions.map((position) => (
                                                <SelectItem key={position.id} value={position.id.toString()}>
                                                    {position.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.position_id && (
                                        <p className="text-sm text-red-500">{errors.position_id}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="title">Job Title *</Label>
                                    <Input
                                        id="title"
                                        value={formData.title}
                                        onChange={(e) => handleChange('title', e.target.value)}
                                        placeholder="Enter job title"
                                        className={errors.title ? 'border-red-500' : ''}
                                    />
                                    {errors.title && (
                                        <p className="text-sm text-red-500">{errors.title}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="type">Job Type *</Label>
                                    <Select
                                        value={formData.type}
                                        onValueChange={(value) => handleChange('type', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select job type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(typeOptions).map(([value, label]) => (
                                                <SelectItem key={value} value={value}>
                                                    {label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.type && (
                                        <p className="text-sm text-red-500">{errors.type}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="location_type">Location Type *</Label>
                                    <Select
                                        value={formData.location_type}
                                        onValueChange={(value) => handleChange('location_type', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select location type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(locationTypeOptions).map(([value, label]) => (
                                                <SelectItem key={value} value={value}>
                                                    {label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.location_type && (
                                        <p className="text-sm text-red-500">{errors.location_type}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="status">Status *</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(value) => handleChange('status', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(statusOptions).map(([value, label]) => (
                                                <SelectItem key={value} value={value}>
                                                    {label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.status && (
                                        <p className="text-sm text-red-500">{errors.status}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="pay_rate">Pay Rate</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="pay_rate"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={formData.pay_rate}
                                            onChange={(e) => handleChange('pay_rate', e.target.value)}
                                            placeholder="Enter pay rate"
                                            className={errors.pay_rate ? 'border-red-500' : ''}
                                        />
                                        <Select
                                            value={formData.currency}
                                            onValueChange={(value) => handleChange('currency', value)}
                                        >
                                            <SelectTrigger className="w-[100px]">
                                                <SelectValue placeholder="Currency" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(currencyOptions).map(([value, label]) => (
                                                    <SelectItem key={value} value={value}>
                                                        {label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {errors.pay_rate && (
                                        <p className="text-sm text-red-500">{errors.pay_rate}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="time_commitment_min_hours">Time Commitment (hours)</Label>
                                    <Input
                                        id="time_commitment_min_hours"
                                        type="number"
                                        min="0"
                                        value={formData.time_commitment_min_hours}
                                        onChange={(e) => handleChange('time_commitment_min_hours', e.target.value)}
                                        placeholder="Enter minimum hours per week"
                                        className={errors.time_commitment_min_hours ? 'border-red-500' : ''}
                                    />
                                    {errors.time_commitment_min_hours && (
                                        <p className="text-sm text-red-500">{errors.time_commitment_min_hours}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="application_deadline">Application Deadline</Label>
                                    <Input
                                        id="application_deadline"
                                        type="date"
                                        value={formData.application_deadline}
                                        onChange={(e) => handleChange('application_deadline', e.target.value)}
                                        className={errors.application_deadline ? 'border-red-500' : ''}
                                    />
                                    {errors.application_deadline && (
                                        <p className="text-sm text-red-500">{errors.application_deadline}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="city">City</Label>
                                    <Input
                                        id="city"
                                        value={formData.city}
                                        onChange={(e) => handleChange('city', e.target.value)}
                                        placeholder="Enter city"
                                        className={errors.city ? 'border-red-500' : ''}
                                    />
                                    {errors.city && (
                                        <p className="text-sm text-red-500">{errors.city}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="state">State/Province</Label>
                                    <Input
                                        id="state"
                                        value={formData.state}
                                        onChange={(e) => handleChange('state', e.target.value)}
                                        placeholder="Enter state or province"
                                        className={errors.state ? 'border-red-500' : ''}
                                    />
                                    {errors.state && (
                                        <p className="text-sm text-red-500">{errors.state}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="country">Country</Label>
                                    <Input
                                        id="country"
                                        value={formData.country}
                                        onChange={(e) => handleChange('country', e.target.value)}
                                        placeholder="Enter country"
                                        className={errors.country ? 'border-red-500' : ''}
                                    />
                                    {errors.country && (
                                        <p className="text-sm text-red-500">{errors.country}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description *</Label>
                                <TextArea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                    placeholder="Enter detailed job description"
                                    rows={6}
                                    className={errors.description ? 'border-red-500' : ''}
                                />
                                {errors.description && (
                                    <p className="text-sm text-red-500">{errors.description}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="requirements">Requirements</Label>
                                <TextArea
                                    id="requirements"
                                    value={formData.requirements}
                                    onChange={(e) => handleChange('requirements', e.target.value)}
                                    placeholder="Enter job requirements (optional)"
                                    rows={4}
                                    className={errors.requirements ? 'border-red-500' : ''}
                                />
                                {errors.requirements && (
                                    <p className="text-sm text-red-500">{errors.requirements}</p>
                                )}
                            </div>

                            <div className="flex justify-end gap-4">
                                <Link href="/job-posts">
                                    <Button type="button" variant="outline">
                                        Cancel
                                    </Button>
                                </Link>
                                <Button type="submit" disabled={isSubmitting}>
                                    <Save className="mr-2 h-4 w-4" />
                                    {isSubmitting ? 'Creating...' : 'Create Job Post'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
