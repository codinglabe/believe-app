import React, { useState, useEffect } from 'react';
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
    { title: 'Edit', href: '#' },
];

interface JobPost {
    id: number;
    position_id: number;
    organization_id: number;
    title: string;
    description: string;
    requirements: string;
    pay_rate: number | null;
    currency: string | null;
    type: string;
    location_type: string;
    city: string | null;
    state: string | null;
    country: string | null;
    time_commitment_min_hours: number | null;
    application_deadline: string | null;
    date_posted: string | null;
    status: string;
    position: {
        title: string;
    };
    organization: {
        name: string;
    };
}

interface Props {
    jobPost: JobPost;
    positions: { id: number; title: string }[];
    typeOptions: Record<string, string>;
    locationTypeOptions: Record<string, string>;
    statusOptions: Record<string, string>;
    currencyOptions: Record<string, string>;
}

export default function Edit({
    jobPost,
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
        date_posted: '',
        status: 'draft',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setFormData({
            position_id: jobPost.position_id.toString(),
            title: jobPost.title,
            description: jobPost.description,
            requirements: jobPost.requirements || '',
            pay_rate: jobPost.pay_rate?.toString() || '',
            currency: jobPost.currency || '',
            type: jobPost.type,
            location_type: jobPost.location_type,
            city: jobPost.city || '',
            state: jobPost.state || '',
            country: jobPost.country || '',
            time_commitment_min_hours: jobPost.time_commitment_min_hours?.toString() || '',
            application_deadline: jobPost.application_deadline || '',
            date_posted: jobPost.date_posted || '',
            status: jobPost.status,
        });
    }, [jobPost]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        router.put(`/job-posts/${jobPost.id}`, formData, {
            onError: (errors) => {
                setErrors(errors);
                showErrorToast('Failed to update job post');
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
            <Head title="Edit Job Post" />
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
                                <CardTitle className="text-2xl font-bold">Edit Job Post</CardTitle>
                                <p className="text-muted-foreground">Update job posting details</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 md:px-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                <Label htmlFor="position_id">Position *</Label>
                                <select
                                    id="position_id"
                                    value={formData.position_id}
                                    onChange={(e) => handleChange('position_id', e.target.value)}
                                    className={`w-full border p-2 rounded bg-white text-gray-900 dark:bg-gray-950 dark:text-white dark:border-gray-600 ${
                                    errors.position_id ? 'border-red-500 dark:border-red-500' : 'border-gray-300'
                                    }`}
                                >
                                    <option value="">Select a position</option>
                                    {positions.map((position) => (
                                    <option key={position.id} value={position.id}>
                                        {position.title}
                                    </option>
                                    ))}
                                </select>
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
  <select
    id="type"
    value={formData.type}
    onChange={(e) => handleChange('type', e.target.value)}
    className={`w-full border p-2 rounded bg-white text-gray-900 dark:bg-gray-950 dark:text-white dark:border-gray-600 ${
      errors.type ? 'border-red-500 dark:border-red-500' : 'border-gray-300'
    }`}
  >
    <option value="">Select job type</option>
    {Object.entries(typeOptions).map(([value, label]) => (
      <option key={value} value={value}>
        {label}
      </option>
    ))}
  </select>
  {errors.type && (
    <p className="text-sm text-red-500">{errors.type}</p>
  )}
</div>


<div className="space-y-2">
  <Label htmlFor="location_type">Location Type *</Label>
  <select
    id="location_type"
    value={formData.location_type}
    onChange={(e) => handleChange('location_type', e.target.value)}
    className={`w-full border p-2 rounded bg-white text-gray-900 dark:bg-gray-950 dark:text-white dark:border-gray-600 ${
      errors.location_type ? 'border-red-500 dark:border-red-500' : 'border-gray-300'
    }`}
  >
    <option value="">Select location type</option>
    {Object.entries(locationTypeOptions).map(([value, label]) => (
      <option key={value} value={value}>
        {label}
      </option>
    ))}
  </select>
  {errors.location_type && (
    <p className="text-sm text-red-500">{errors.location_type}</p>
  )}
</div>

                                <div className="space-y-2">
  <Label htmlFor="status">Status *</Label>
  <select
    id="status"
    value={formData.status}
    onChange={(e) => handleChange('status', e.target.value)}
    className={`w-full border p-2 rounded bg-white text-gray-900 dark:bg-gray-950 dark:text-white dark:border-gray-600 ${
      errors.status ? 'border-red-500 dark:border-red-500' : 'border-gray-300'
    }`}
  >
    <option value="">Select status</option>
    {Object.entries(statusOptions).map(([value, label]) => (
      <option key={value} value={value}>
        {label}
      </option>
    ))}
  </select>
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
                                        <select
    id="currency"
    value={formData.currency}
    onChange={(e) => handleChange('currency', e.target.value)}
    className={`w-full border p-2 rounded bg-white text-gray-900 dark:bg-gray-950 dark:text-white dark:border-gray-600 ${
      errors.currency ? 'border-red-500 dark:border-red-500' : 'border-gray-300'
    }`}
  >
    <option value="">Select currency</option>
    {Object.entries(currencyOptions).map(([value, label]) => (
      <option key={value} value={value}>
        {label}
      </option>
    ))}
  </select>

                                    </div>
                                    {errors.pay_rate && (
                                        <p className="text-sm text-red-500">{errors.pay_rate}</p>
                                    )}
                                    {errors.currency && (
    <p className="text-sm text-red-500">{errors.currency}</p>
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
                                    {isSubmitting ? 'Updating...' : 'Update Job Post'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
