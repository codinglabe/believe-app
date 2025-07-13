import React, { useState, useEffect, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TextArea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
import AppLayout from "@/layouts/app-layout"
import type { BreadcrumbItem } from "@/types"

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: "Products",
        href: "/products",
    },
    {
        title: "Edit",
        href: "/products/edit",
    },
]

interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    image?: string;
    status: string;
    created_at: string;
    updated_at: string;
}

interface Props {
    product: Product;
}

export default function Edit({ product }: Props) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        image: null as File | null,
        status: 'active'
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
   

    useEffect(() => {
        
        setFormData({
            name: product.name || '',
            description: product.description || '',
            price: product.price ? product.price.toString() : '',
            image: null,
            status: product.status || 'active'
        });
    }, [product]);

   


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        // Create FormData for file upload
        const submitData = new FormData();
        submitData.append('name', formData.name);
        submitData.append('description', formData.description);
        submitData.append('price', formData.price);
        submitData.append('status', formData.status);
        if (formData.image) {
            submitData.append('image', formData.image);
        }

        // Add _method for PUT request
        submitData.append('_method', 'PUT');

        router.post(route('products.update', product.id), submitData, {
            onError: (errors) => {
                setErrors(errors);
                showErrorToast('Failed to update product');
                setIsSubmitting(false);
            },
            onSuccess: () => {
                // showSuccessToast('Product updated successfully');
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setFormData(prev => ({
            ...prev,
            image: file
        }));

        // Clear error when user selects a file
        if (errors.image) {
            setErrors(prev => ({
                ...prev,
                image: ''
            }));
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Product" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl py-4 px-4 md:py-6 md:px-10">
                <Card className="px-0">
                    <CardHeader className="px-4 md:px-6">
                        <div className="flex items-center gap-4">
                            {/* <Link href={route('products.index')}>
                                <Button variant="outline" size="sm">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back to List
                                </Button>
                            </Link> */}
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
                                <p className="text-muted-foreground">
                                    Update product details
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 md:px-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Product Name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    placeholder="Enter product name"
                                    className={errors.name ? 'border-red-500' : ''}
                                />
                                {errors.name && (
                                    <p className="text-sm text-red-500">{errors.name}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <TextArea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('description', e.target.value)}
                                    placeholder="Enter product description"
                                    rows={4}
                                    className={errors.description ? 'border-red-500' : ''}
                                />
                                {errors.description && (
                                    <p className="text-sm text-red-500">{errors.description}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="price">Price</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.price}
                                    onChange={(e) => handleChange('price', e.target.value)}
                                    placeholder="Enter product price"
                                    className={errors.price ? 'border-red-500' : ''}
                                />
                                {errors.price && (
                                    <p className="text-sm text-red-500">{errors.price}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="image">Product Image</Label>
                                {product.image && (
                                    <div className="mb-2">
                                        <p className="text-sm text-muted-foreground">Current image:</p>
                                        <img 
                                            src={product.image} 
                                            alt="Current product image" 
                                            className="w-32 h-32 object-cover rounded border"
                                        />
                                    </div>
                                )}
                                <Input
                                    id="image"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className={errors.image ? 'border-red-500' : ''}
                                />
                                <p className="text-sm text-muted-foreground">
                                    Leave empty to keep the current image
                                </p>
                                {errors.image && (
                                    <p className="text-sm text-red-500">{errors.image}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                               
                                <Select
                                    value={formData.status || 'active'}
                                    onValueChange={(value) => handleChange('status', value)}
                                >
                                    <SelectTrigger className={errors.status ? 'border-red-500' : ''}>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.status && (
                                    <p className="text-sm text-red-500">{errors.status}</p>
                                )}
                            </div>

                            <div className="flex gap-4">
                                <Button type="submit" disabled={isSubmitting}>
                                    <Save className="mr-2 h-4 w-4" />
                                    {isSubmitting ? 'Updating...' : 'Update Product'}
                                </Button>
                                <Link href={route('products.index')}>
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
