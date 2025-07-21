import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TextArea } from '@/components/ui/textarea';
import { ArrowLeft, Save } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { showErrorToast } from '@/lib/toast';

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Job Positions", href: "/job-positions" },
    { title: "Create", href: "/job-positions/create" },
];

export default function Create() {
    const { positionCategories } = usePage().props as {
        positionCategories: { id: number; name: string }[];
    };

    const [formData, setFormData] = useState({
        category_id: '',
        title: '',
        default_description: '',
        default_requirements: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});
        router.post(route('job-positions.store'), formData, {
            onError: (errors) => {
                setErrors(errors);
                showErrorToast('Failed to create job position');
                setIsSubmitting(false);
            }
        });
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Job Position" />
            <div className="flex flex-1 flex-col gap-4 rounded-xl py-4 px-4 md:py-6 md:px-10">
                <Card className="px-0">
                    <CardHeader className="px-4 md:px-6">
                        <h1 className="text-3xl font-bold tracking-tight">Create Job Position</h1>
                        <p className="text-muted-foreground">Add a new job position to a category</p>
                    </CardHeader>
                    <CardContent className="px-4 md:px-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="category_id">Position Category</Label>
                                <select
                                    id="category_id"
                                    value={formData.category_id}
                                    onChange={(e) => handleChange('category_id', e.target.value)}
                                    className={`w-full border p-2 rounded ${errors.category_id ? 'border-red-500' : ''}`}
                                >
                                    <option value="">Select a category</option>
                                    {positionCategories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                                {errors.category_id && (
                                    <p className="text-sm text-red-500">{errors.category_id}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="title">Position Title</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => handleChange('title', e.target.value)}
                                    placeholder="Enter job position title"
                                    className={errors.title ? 'border-red-500' : ''}
                                />
                                {errors.title && (
                                    <p className="text-sm text-red-500">{errors.title}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="default_description">Default Description</Label>
                                <TextArea
                                    id="default_description"
                                    value={formData.default_description}
                                    onChange={(e) => handleChange('default_description', e.target.value)}
                                    placeholder="Enter job description"
                                    className={errors.default_description ? 'border-red-500' : ''}
                                />
                                {errors.default_description && (
                                    <p className="text-sm text-red-500">{errors.default_description}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="default_requirements">Default Requirements</Label>
                                <TextArea
                                    id="default_requirements"
                                    value={formData.default_requirements}
                                    onChange={(e) => handleChange('default_requirements', e.target.value)}
                                    placeholder="Enter job requirements (optional)"
                                    className={errors.default_requirements ? 'border-red-500' : ''}
                                />
                                {errors.default_requirements && (
                                    <p className="text-sm text-red-500">{errors.default_requirements}</p>
                                )}
                            </div>
                            <div className="flex gap-4">
                                <Button type="submit" disabled={isSubmitting}>
                                    <Save className="mr-2 h-4 w-4" />
                                    {isSubmitting ? 'Creating...' : 'Create Job Position'}
                                </Button>
                                <Link href={route('job-positions.index')}>
                                    <Button type="button" variant="outline">
                                        Cancel
                                    </Button>
                                </Link>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
