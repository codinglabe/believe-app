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
        title: "NTEE Codes",
        href: "/ntee-codes",
    },
    {
        title: "Edit",
        href: "/ntee-codes/edit",
    },
]

interface NteeCode {
    id: number;
    ntee_codes: string;
    category: string;
    description: string;
    created_at: string;
    updated_at: string;
}

interface Props {
    nteeCode: NteeCode;
}

export default function Edit({ nteeCode }: Props) {
    const [formData, setFormData] = useState({
        ntee_codes: '',
        category: '',
        description: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setFormData({
            ntee_codes: nteeCode.ntee_codes,
            category: nteeCode.category,
            description: nteeCode.description
        });
    }, [nteeCode]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        router.put(route('ntee-codes.update', nteeCode.id), formData, {
            onError: (errors) => {
                setErrors(errors);
                showErrorToast('Failed to update NTEE code');
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
            <Head title="Edit NTEE Code" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl py-4 px-4 md:py-6 md:px-10">
                <Card className="px-0">
                    <CardHeader className="px-4 md:px-6">
                        <div className="flex items-center gap-4">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">Edit NTEE Code</h1>
                                <p className="text-muted-foreground">
                                    Update NTEE code details for "{nteeCode.ntee_codes}"
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 md:px-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="ntee_codes">NTEE Code</Label>
                                <Input
                                    id="ntee_codes"
                                    type="text"
                                    value={formData.ntee_codes}
                                    onChange={(e) => handleChange('ntee_codes', e.target.value)}
                                    placeholder="Enter NTEE code (e.g., A20, B30)"
                                    maxLength={10}
                                    className={errors.ntee_codes ? 'border-red-500' : ''}
                                />
                                {errors.ntee_codes && (
                                    <p className="text-sm text-red-500">{errors.ntee_codes}</p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Enter the unique NTEE code identifier (e.g., A20 for Arts Education)
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <Input
                                    id="category"
                                    type="text"
                                    value={formData.category}
                                    onChange={(e) => handleChange('category', e.target.value)}
                                    placeholder="Enter category (e.g., Arts & Culture, Education)"
                                    maxLength={255}
                                    className={errors.category ? 'border-red-500' : ''}
                                />
                                {errors.category && (
                                    <p className="text-sm text-red-500">{errors.category}</p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Enter the main category this NTEE code belongs to
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <TextArea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('description', e.target.value)}
                                    placeholder="Enter detailed description of the NTEE code"
                                    rows={4}
                                    maxLength={1000}
                                    className={errors.description ? 'border-red-500' : ''}
                                />
                                {errors.description && (
                                    <p className="text-sm text-red-500">{errors.description}</p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Provide a detailed description of what this NTEE code represents
                                </p>
                            </div>

                            <div className="flex gap-4">
                                <Button type="submit" disabled={isSubmitting}>
                                    <Save className="mr-2 h-4 w-4" />
                                    {isSubmitting ? 'Updating...' : 'Update NTEE Code'}
                                </Button>
                                <Link href={route('ntee-codes.index')}>
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


