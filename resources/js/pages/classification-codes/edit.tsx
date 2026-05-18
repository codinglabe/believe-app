import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TextArea } from '@/components/ui/textarea';
import { ArrowLeft, Save } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
import AppLayout from "@/layouts/app-layout"
import type { BreadcrumbItem } from "@/types"

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: "Classification Codes",
        href: "/classification-codes",
    },
    {
        title: "Edit",
        href: "/classification-codes/edit",
    },
]

interface ClassificationCode {
    id: number;
    classification_code: number;
    description: string;
    created_at: string;
    updated_at: string;
}

interface Props {
    classificationCode: ClassificationCode;
}

export default function Edit({ classificationCode }: Props) {
    const [formData, setFormData] = useState({
        classification_code: '',
        description: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setFormData({
            classification_code: classificationCode.classification_code.toString(),
            description: classificationCode.description
        });
    }, [classificationCode]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        router.put(route('classification-codes.update', classificationCode.id), formData, {
            onError: (errors) => {
                setErrors(errors);
                showErrorToast('Failed to update classification code');
                setIsSubmitting(false);
            }
        });
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Classification Code" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl py-4 px-4 md:py-6 md:px-10">
                <Card className="px-0">
                    <CardHeader className="px-4 md:px-6">
                        <div className="flex items-center gap-4">
                            {/* <Link href={route('classification-codes.index')}>
                                <Button variant="outline" size="sm">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back to List
                                </Button>
                            </Link> */}
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">Edit Classification Code</h1>
                                <p className="text-muted-foreground">
                                    Update classification code details
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 md:px-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="classification_code">Classification Code</Label>
                                <Input
                                    id="classification_code"
                                    type="number"
                                    value={formData.classification_code}
                                    onChange={(e) => handleChange('classification_code', e.target.value)}
                                    placeholder="Enter classification code"
                                    className={errors.classification_code ? 'border-red-500' : ''}
                                />
                                {errors.classification_code && (
                                    <p className="text-sm text-red-500">{errors.classification_code}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <TextArea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('description', e.target.value)}
                                    placeholder="Enter description"
                                    rows={4}
                                    className={errors.description ? 'border-red-500' : ''}
                                />
                                {errors.description && (
                                    <p className="text-sm text-red-500">{errors.description}</p>
                                )}
                            </div>

                            <div className="flex gap-4">
                                <Button type="submit" disabled={isSubmitting}>
                                    <Save className="mr-2 h-4 w-4" />
                                    {isSubmitting ? 'Updating...' : 'Update Classification Code'}
                                </Button>
                                <Link href={route('classification-codes.index')}>
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
