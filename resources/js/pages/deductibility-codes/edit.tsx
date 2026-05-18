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
        title: "Deductibility Codes",
        href: "/deductibility-codes",
    },
    {
        title: "Edit",
        href: "/deductibility-codes/edit",
    },
]

interface DeductibilityCode {
    id: number;
    deductibility_code: number;
    description: string;
    created_at: string;
    updated_at: string;
}

interface Props {
    deductibilityCode: DeductibilityCode;
}

export default function Edit({ deductibilityCode }: Props) {
    const [formData, setFormData] = useState({
        deductibility_code: '',
        description: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setFormData({
            deductibility_code: deductibilityCode.deductibility_code.toString(),
            description: deductibilityCode.description
        });
    }, [deductibilityCode]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        router.put(route('deductibility-codes.update', deductibilityCode.id), formData, {
            onError: (errors) => {
                setErrors(errors);
                showErrorToast('Failed to update deductibility code');
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
            <Head title="Edit Deductibility Code" />
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
                                <h1 className="text-3xl font-bold tracking-tight">Edit Deductibility Code</h1>
                                <p className="text-muted-foreground">
                                    Update deductibility code details
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 md:px-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="deductibility_code">Deductibility Code</Label>
                                <Input
                                    id="deductibility_code"
                                    type="number"
                                    value={formData.deductibility_code}
                                    onChange={(e) => handleChange('deductibility_code', e.target.value)}
                                    placeholder="Enter deductibility code"
                                    className={errors.deductibility_code ? 'border-red-500' : ''}
                                />
                                {errors.deductibility_code && (
                                    <p className="text-sm text-red-500">{errors.deductibility_code}</p>
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
                                    {isSubmitting ? 'Updating...' : 'Update Deductibility Code'}
                                </Button>
                                <Link href={route('deductibility-codes.index')}>
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
