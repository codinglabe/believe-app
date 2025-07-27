import React, { useState, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';
import { showErrorToast } from '@/lib/toast';
import AppLayout from "@/layouts/app-layout"
import type { BreadcrumbItem } from "@/types"
import { TextArea } from '@/components/ui/textarea';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: "Job Positions",
        href: "/job-positions",
    },
    {
        title: "Edit",
        href: "#",
    },
]

interface JobPosition {
    id: number;
    category_id: number;
    title: string;
    default_description: string;
    default_requirements?: string;
    category: {
        id: number;
        name: string;
    };
}

interface Props {
    jobPosition: JobPosition;
    positionCategories: { id: number; name: string }[];
}

export default function Edit({ jobPosition, positionCategories }: Props) {
    const [formData, setFormData] = useState({
        category_id: '',
        title: '',
        default_description: '',
        default_requirements: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setFormData({
            category_id: jobPosition.category_id.toString(),
            title: jobPosition.title,
            default_description: jobPosition.default_description,
            default_requirements: jobPosition.default_requirements || '',
        });
    }, [jobPosition]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});
        router.put(route('job-positions.update', jobPosition.id), formData, {
            onError: (errors) => {
                setErrors(errors);
                showErrorToast('Failed to update job position');
                setIsSubmitting(false);
            },
            onSuccess: () => {
                router.visit(route('job-positions.index'));
            }
        });
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Job Position" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl py-4 px-4 md:py-6 md:px-10">
                <Card className="px-0">
                    <CardHeader className="px-4 md:px-6">
                        <div className="flex items-center gap-4">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">Edit Job Position</h1>
                                <p className="text-muted-foreground">
                                    Update job position details
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 md:px-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="category_id">Category</Label>
                                <select
                                    id="category_id"
                                    value={formData.category_id}
                                    onChange={(e) => handleChange('category_id', e.target.value)}
                                    className={`w-full border p-2 rounded bg-white text-gray-900 dark:bg-gray-900 dark:text-white dark:border-gray-600 ${
                                        errors.category_id ? 'border-red-500 dark:border-red-500' : 'border-gray-300'
                                    }`}
                                >
                                    <option value="">Select a category</option>
                                    {positionCategories.map(cat => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
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
                                <Label htmlFor="default_description">Description</Label>
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
                                <Label htmlFor="default_requirements">Requirements</Label>
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
                                    {isSubmitting ? 'Updating...' : 'Update Position'}
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
