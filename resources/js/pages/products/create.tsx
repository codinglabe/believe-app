'use client';

import React, { useState, useEffect } from 'react';
import type { SharedData } from "@/types"
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TextArea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Plus, Minus, Loader2, Upload, Package, DollarSign, ImageIcon, Tag, Settings2, Info, ExternalLink, ShoppingBag, Check } from 'lucide-react';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import AppLayout from "@/layouts/app-layout"
import type { BreadcrumbItem } from "@/types"
import axios from 'axios';
import { ProductSourceSelector } from '@/components/product-source-selector';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: "Products",
        href: "/products",
    },
    {
        title: "Create",
        href: "/products/create",
    },
];

interface Category {
    id: number;
    name: string;
}

interface Blueprint {
    id: number;
    title: string;
    description: string;
    brand: string;
    model: string;
    images: string[];
}

interface PrintProvider {
    id: number;
    title: string;
    location: {
        address1: string;
        city: string;
        country: string;
    };
}

interface Variant {
    id: number;
    title: string;
    options: {
        color: string;
        size: string;
    };
    price: number;
    cost: number;
}

interface Props {
    categories: Category[];
    organizations?: { id: number; name: string }[];
    blueprints: Blueprint[];
    printify_enabled: boolean;
}

export default function Create({ categories, organizations = [], blueprints, printify_enabled }: Props) {
    const { auth, flash } = usePage<SharedData>().props



    const { data, setData } = useForm({
        name: '',
        description: '',
        quantity: '',
        unit_price: '',
        shipping_charge: '',
        owned_by: 'admin',
        organization_id: '',
        status: 'active',
        sku: '',
        type: 'physical',
        tags: '',
        categories: [] as number[],
        image: null as File | null,

        // Printify fields
        is_printify_product: false, // Default to manual product
        printify_blueprint_id: '',
        printify_provider_id: '',
        printify_variants: [] as any[],
        printify_images: [] as { file: File; preview: string; name: string }[],
    });

     const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<any>({});


    const [providers, setProviders] = useState<PrintProvider[]>([]);
    const [variants, setVariants] = useState<Variant[]>([]);
    const [selectedVariants, setSelectedVariants] = useState<number[]>([]);
    const [loadingProviders, setLoadingProviders] = useState(false);
    const [loadingVariants, setLoadingVariants] = useState(false);
    const [selectedBlueprint, setSelectedBlueprint] = useState<Blueprint | null>(null);
    const [selectedProvider, setSelectedProvider] = useState<PrintProvider | null>(null);

    const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

// Sync with form data
useEffect(() => {
    setData('categories', selectedCategories);
}, [selectedCategories]);

// Simple handler using local state
const handleCategoryChange = (categoryId: number) => {
    setSelectedCategories(prev => {
        const isSelected = prev.includes(categoryId);
        return isSelected
            ? prev.filter(id => id !== categoryId)
            : [...prev, categoryId];
    });
};

    // Load providers when blueprint is selected
    useEffect(() => {
        if (data.printify_blueprint_id) {
            loadProviders(data.printify_blueprint_id);
        } else {
            setProviders([]);
            setSelectedProvider(null);
        }
    }, [data.printify_blueprint_id]);

    // Load variants when provider is selected
    useEffect(() => {
        if (data.printify_blueprint_id && data.printify_provider_id) {
            loadVariants(data.printify_blueprint_id, data.printify_provider_id);
        } else {
            setVariants([]);
            setSelectedVariants([]);
        }
    }, [data.printify_provider_id]);

    const loadProviders = async (blueprintId: string) => {
        setLoadingProviders(true);
        try {
            const response = await axios.get(route('printify.providers'), {
                params: { blueprint_id: blueprintId }
            });

            if (response.data.error) {
                showErrorToast(response.data.error);
                setProviders([]);
            } else {
                setProviders(response.data);
            }
        } catch (error: any) {
            console.error('Providers load error:', error);
            showErrorToast('Failed to load providers: ' + (error.response?.data?.message || error.message));
            setProviders([]);
        } finally {
            setLoadingProviders(false);
        }
    };

    const loadVariants = async (blueprintId: string, providerId: string) => {
        setLoadingVariants(true);
        try {
            const response = await axios.get(route('printify.variants'), {
                params: {
                    blueprint_id: blueprintId,
                    print_provider_id: providerId
                }
            });

            if (response.data.error) {
                showErrorToast(response.data.error);
                setVariants([]);
            } else {
                setVariants(response.data.variants || []);
            }
        } catch (error: any) {
            console.error('Variants load error:', error);
            showErrorToast('Failed to load variants: ' + (error.response?.data?.message || error.message));
            setVariants([]);
        } finally {
            setLoadingVariants(false);
        }
    };

    const handleBlueprintSelect = (blueprintId: string) => {
        const blueprint = blueprints.find(b => b.id.toString() === blueprintId);
        setSelectedBlueprint(blueprint || null);
        setData('printify_blueprint_id', blueprintId);
        setData('printify_provider_id', '');
        setData('printify_variants', []);
        setProviders([]);
        setVariants([]);
        setSelectedVariants([]);
        setSelectedProvider(null);
    };

    const handleProviderSelect = (providerId: string) => {
        const provider = providers.find(p => p.id.toString() === providerId);
        setSelectedProvider(provider || null);
        setData('printify_provider_id', providerId);
    };

    const handleVariantToggle = (variantId: number) => {
    const variant = variants.find(v => v.id === variantId);
    if (!variant) return;

    const isSelected = selectedVariants.includes(variantId);
    let newSelectedVariants: number[];
    let updatedVariants = [...data.printify_variants];

    if (isSelected) {
        // Remove variant
        newSelectedVariants = selectedVariants.filter(id => id !== variantId);
        updatedVariants = updatedVariants.filter(v => v.id !== variantId);
    } else {
        // Add variant with default price (50% markup)
        newSelectedVariants = [...selectedVariants, variantId];
        const cost = variant.cost / 100; // Convert to dollars if needed
        const defaultPrice = cost * 1.5; // 50% markup

        updatedVariants.push({
            id: variant.id,
            title: variant.title,
            cost: cost,
            price: parseFloat(defaultPrice.toFixed(2)),
            enabled: true
        });
    }

    setSelectedVariants(newSelectedVariants);
    setData('printify_variants', updatedVariants);
};

    // const handleSubmit = (e: React.FormEvent) => {
    //     e.preventDefault();

    //     // Validate Printify required fields
    //     if (data.is_printify_product) {
    //         if (!data.printify_blueprint_id) {
    //             showErrorToast('Please select a product type');
    //             return;
    //         }
    //         if (!data.printify_provider_id) {
    //             showErrorToast('Please select a print provider');
    //             return;
    //         }
    //         if (data.printify_variants.length === 0) {
    //             showErrorToast('Please select at least one variant');
    //             return;
    //         }
    //         if (data.printify_images.length === 0 || data.printify_images[0] === '') {
    //             showErrorToast('Please add at least one design image URL');
    //             return;
    //         }
    //     }

    //     post(route('products.store'));
    // };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setProcessing(true);

        // Validate based on product type
        if (data.is_printify_product) {
            // Validate Printify product fields
            if (!data.printify_blueprint_id) {
                setErrors({ printify_blueprint_id: 'Please select a product type.' });
                setProcessing(false);
                showErrorToast('Please select a product type.');
                return;
            }
            if (!data.printify_provider_id) {
                setErrors({ printify_provider_id: 'Please select a print provider.' });
                setProcessing(false);
                showErrorToast('Please select a print provider.');
                return;
            }
            if (data.printify_variants.length === 0) {
                setErrors({ printify_variants: 'Please select at least one variant.' });
                setProcessing(false);
                showErrorToast('Please select at least one variant.');
                return;
            }

            // Validate printify_images before submission
            const validImages = data.printify_images.filter(img => img && img.file);
            if (validImages.length === 0) {
                setErrors({ printify_images: 'Please upload at least one design image.' });
                setProcessing(false);
                showErrorToast('Please upload at least one design image.');
                return;
            }

            // Validate file sizes before submission (Printify only)
            const MAX_SIZE = 1 * 1024 * 1024; // 1MB (Printify API requirement)
            const invalidFiles: string[] = [];
            validImages.forEach((img, index) => {
                if (img.file && img.file.size > MAX_SIZE) {
                    invalidFiles.push(`${img.name || `Image ${index + 1}`} (${(img.file.size / 1024 / 1024).toFixed(2)}MB)`);
                }
            });

            if (invalidFiles.length > 0) {
                setErrors({
                    printify_images: `The following files are too large (max 1MB): ${invalidFiles.join(', ')}`
                });
                setProcessing(false);
                showErrorToast(
                    `Some files are too large. Maximum size is 1MB per file (Printify requirement). Please compress or resize your images.\n\nLarge files: ${invalidFiles.join(', ')}`
                );
                return;
            }

            // Check total size (prevent nginx 413 errors)
            const totalSize = validImages.reduce((sum, img) => sum + (img.file?.size || 0), 0);
            const MAX_TOTAL_SIZE = 10 * 1024 * 1024; // 10MB total (reasonable limit for multiple 1MB files)
            if (totalSize > MAX_TOTAL_SIZE) {
                const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
                setErrors({
                    printify_images: `Total size of all images (${totalSizeMB}MB) exceeds the maximum (10MB). Please reduce the number or size of images.`
                });
                setProcessing(false);
                showErrorToast(
                    `Total size of all images (${totalSizeMB}MB) exceeds the maximum (10MB). Please reduce the number or size of images.`
                );
                return;
            }
        } else {
            // Validate manual product required fields
            if (!data.unit_price || parseFloat(data.unit_price) <= 0) {
                setErrors({ unit_price: 'Please enter a valid unit price.' });
                setProcessing(false);
                showErrorToast('Please enter a valid unit price.');
                return;
            }
            if (!data.shipping_charge || parseFloat(data.shipping_charge) < 0) {
                setErrors({ shipping_charge: 'Please enter a valid shipping charge.' });
                setProcessing(false);
                showErrorToast('Please enter a valid shipping charge.');
                return;
            }
            if (!data.image) {
                setErrors({ image: 'Please upload a product image.' });
                setProcessing(false);
                showErrorToast('Please upload a product image.');
                return;
            }
        }

        const formData = new FormData();

        // Common fields
        formData.append('name', data.name);
        formData.append('description', data.description);
        formData.append('quantity', data.quantity);
        formData.append('owned_by', data.owned_by);
        formData.append('status', data.status);
        formData.append('sku', data.sku);
        formData.append('type', data.type);
        if (data.tags) formData.append('tags', data.tags);
        if (data.organization_id) formData.append('organization_id', data.organization_id);
        formData.append('is_printify_product', data.is_printify_product ? '1' : '0');

        // Categories
        data.categories.forEach(id => formData.append('categories[]', id.toString()));

        // Image handling - different for manual vs Printify
        if (!data.is_printify_product && data.image) {
            // Manual product: main image is required
            formData.append('image', data.image);
        } else if (data.is_printify_product && data.image) {
            // Printify product: main image is optional (uses design images)
            formData.append('image', data.image);
        }

        // Manual product: unit_price and shipping_charge are required
        if (!data.is_printify_product) {
            if (data.unit_price) formData.append('unit_price', data.unit_price);
            if (data.shipping_charge) formData.append('shipping_charge', data.shipping_charge);
        }

        // Printify-specific fields (only if Printify product)
        if (data.is_printify_product) {
            if (data.printify_blueprint_id) formData.append('printify_blueprint_id', data.printify_blueprint_id);
            if (data.printify_provider_id) formData.append('printify_provider_id', data.printify_provider_id);

            // Printify variants (only IDs)
            data.printify_variants.forEach((v, i) => {
                formData.append(`printify_variants[${i}][id]`, v.id.toString());
            });

            // Printify images
            data.printify_images.forEach((img, i) => {
                if (img.file) {
                    formData.append('printify_images[]', img.file);
                }
            });
        }

        // Debug (চাইলে রাখুন)
//         for (let [k, v] of formData.entries()) {
//             console.log(k, v);
//         }

        router.post(route('products.store'), formData, {
            forceFormData: true, // এটা ছাড়া কাজ করবে না
            onSuccess: () => {
                showSuccessToast('Product created successfully!');
            },
            onError: (err) => {
                setErrors(err);

                // Handle subscription error first (most important)
                if (err.subscription || (flash as any)?.subscription_required) {
                    const subscriptionError = err.subscription || 'An active subscription is required to create and sell products. Please subscribe to continue.';
                    showErrorToast(subscriptionError);
                    // Optionally redirect to subscription page
                    setTimeout(() => {
                        router.visit(route('plans.index'), {
                            preserveState: false,
                        });
                    }, 2000);
                    return;
                }

                // Handle 413 Request Entity Too Large error
                if (err.message?.includes('413') || err.message?.includes('Request Entity Too Large')) {
                    showErrorToast(
                        'File size too large. Please ensure each design image is under 1MB (Printify requirement). If you\'re uploading multiple images, try uploading them one at a time or compress your images before uploading.'
                    );
                } else if (err.printify_images) {
                    // Show specific error for printify_images
                    const imageError = Array.isArray(err.printify_images)
                        ? err.printify_images.join(', ')
                        : err.printify_images;
                    showErrorToast(`Design image error: ${imageError}`);
                } else {
                    showErrorToast('Please fix the errors');
                }
                console.log('Errors:', err);
            },
            onFinish: () => setProcessing(false),
        });
    };

    // File upload handler with validation
    const handleDesignUpload = (index: number, file: File | null) => {
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            showErrorToast(`Invalid file type. Please upload PNG or JPEG images only.`);
            return;
        }

        // Validate file size (1MB max - Printify API requirement)
        const MAX_SIZE = 1 * 1024 * 1024; // 1MB in bytes
        if (file.size > MAX_SIZE) {
            const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
            showErrorToast(
                `File "${file.name}" is too large (${fileSizeMB}MB). Maximum size is 1MB. Please compress or resize your image.`
            );
            return;
        }

        // Validate image dimensions (optional - Printify recommends high quality but reasonable size)
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);

            // Check dimensions (Printify typically works with images up to 6000x6000px)
            const MAX_DIMENSION = 6000;
            if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
                showErrorToast(
                    `Image dimensions (${img.width}x${img.height}px) exceed the maximum (${MAX_DIMENSION}x${MAX_DIMENSION}px). Please resize your image.`
                );
                return;
            }

            // Validate minimum dimensions (Printify requires at least 100x100px)
            const MIN_DIMENSION = 100;
            if (img.width < MIN_DIMENSION || img.height < MIN_DIMENSION) {
                showErrorToast(
                    `Image dimensions (${img.width}x${img.height}px) are too small. Minimum size is ${MIN_DIMENSION}x${MIN_DIMENSION}px.`
                );
                return;
            }

            // All validations passed, proceed with upload
            const reader = new FileReader();
            reader.onloadend = () => {
                const newImages = [...data.printify_images];
                newImages[index] = {
                    file,
                    preview: reader.result as string,
                    name: file.name
                };
                setData({ ...data, printify_images: newImages });

                // Clear any previous errors
                if (errors.printify_images) {
                    setErrors({ ...errors, printify_images: undefined });
                }
            };
            reader.readAsDataURL(file);
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            showErrorToast(`Failed to load image. Please check if the file is a valid image.`);
        };

        img.src = objectUrl;
    };

    const addDesignField = () => {
        setData({ ...data, printify_images: [...data.printify_images, null as any] });
    };

    const removeDesignField = (index: number) => {
        setData({
            ...data,
            printify_images: data.printify_images.filter((_, i) => i !== index)
        });
    };

    const handleChange = (field: string, value: string | number | boolean | File | null) => {
        setData(field as any, value);
    };


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setData('image', file);
    };

    // Calculate profit margin for display
    // const calculateProfitInfo = () => {
    //     if (!data.unit_price || data.printify_variants.length === 0) return null;

    //     const maxVariantCost = Math.max(...data.printify_variants.map((v: any) => v.price));
    //     const sellingPrice = parseFloat(data.unit_price);
    //     const profit = sellingPrice - maxVariantCost;
    //     const margin = (profit / sellingPrice) * 100;

    //     return {
    //         cost: maxVariantCost,
    //         profit,
    //         margin
    //     };
    // };

    // const profitInfo = calculateProfitInfo();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Product" />
            <div className="flex h-full min-h-screen flex-1 flex-col gap-6 rounded-xl bg-gradient-to-br from-gray-50 via-white to-blue-50/30 px-4 py-4 sm:px-6 md:px-8 md:py-6 lg:px-10 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950/20">
                {/* Header Section */}
                <div className="mb-2 md:mb-4">
                    <h1 className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl md:text-5xl dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400">
                        Create Product
                    </h1>
                    <p className="text-muted-foreground mt-2 max-w-2xl text-base sm:text-lg">
                        Add a new product to your store - choose between Printify or your own source
                    </p>
                </div>

                <Card className="border-2 border-gray-200 bg-white px-0 shadow-xl dark:border-gray-800 dark:bg-gray-900 dark:shadow-2xl">
                    <CardContent className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
                        {/* Subscription Error Alert */}
                        {(errors.subscription || (flash as any)?.subscription_required) && (
                            <div className="mb-6 rounded-lg border-2 border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0">
                                        <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                            />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="mb-2 text-lg font-semibold text-red-800 dark:text-red-300">Subscription Required</h3>
                                        <p className="mb-4 text-red-700 dark:text-red-400">
                                            {errors.subscription ||
                                                'An active subscription is required to create and sell products. Please subscribe to continue.'}
                                        </p>
                                        <Link
                                            href={route('plans.index')}
                                            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700"
                                        >
                                            <span>Subscribe Now</span>
                                            <ExternalLink className="h-4 w-4" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
                            {/* Product Source Selection */}
                            {printify_enabled && (
                                <Card className="border-primary/30 dark:border-primary/20 hover:border-primary/50 dark:hover:border-primary/30 from-background to-muted/30 border-2 border-dashed bg-gradient-to-br shadow-md transition-all duration-300 hover:shadow-lg dark:from-gray-900 dark:to-gray-800/50">
                                    <CardHeader className="pb-4 sm:pb-6">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-primary/10 dark:bg-primary/20 rounded-xl p-2.5 shadow-sm">
                                                    <Package className="text-primary h-5 w-5 sm:h-6 sm:w-6" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-lg font-bold sm:text-xl">Product Source</CardTitle>
                                                    <CardDescription className="mt-1 text-sm sm:text-base">
                                                        Choose how you want to source this product
                                                    </CardDescription>
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <ProductSourceSelector
                                            selected={data.is_printify_product ? 'printify' : 'manual'}
                                            onSelect={(source: 'printify' | 'manual') => {
                                                const isTrue = source === 'printify';
                                                setData('is_printify_product', isTrue);
                                                if (!isTrue) {
                                                    // Reset Printify fields when disabled
                                                    setData('printify_blueprint_id', '');
                                                    setData('printify_provider_id', '');
                                                    setData('printify_variants', []);
                                                    setData('printify_images', []);
                                                    setSelectedBlueprint(null);
                                                    setSelectedProvider(null);
                                                    setProviders([]);
                                                    setVariants([]);
                                                    setSelectedVariants([]);
                                                } else {
                                                    // Reset manual product fields when enabling Printify
                                                    setData('unit_price', '');
                                                    setData('shipping_charge', '');
                                                    // Initialize printify_images array with one empty slot
                                                    if (data.printify_images.length === 0) {
                                                        setData('printify_images', [null as any]);
                                                    }
                                                }
                                            }}
                                        />
                                    </CardContent>
                                </Card>
                            )}

                            {/* Printify Configuration Section */}
                            {data.is_printify_product && printify_enabled && (
                                <Card className="border-2 border-blue-200 shadow-sm transition-shadow hover:shadow-md dark:border-blue-800">
                                    <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                                                <ExternalLink className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-xl">Printify Configuration</CardTitle>
                                                <CardDescription>Configure your print-on-demand product settings</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-6 pt-6">
                                        {/* Product Type Selection */}
                                        <div className="space-y-3">
                                            <Label htmlFor="blueprint" className="flex items-center gap-2 text-base font-semibold">
                                                <Package className="h-4 w-4" />
                                                Product Type *
                                            </Label>
                                            <Select value={data.printify_blueprint_id} onValueChange={handleBlueprintSelect}>
                                                <SelectTrigger className="h-11 w-full border-gray-300 bg-white text-base text-gray-900 focus-visible:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
                                                    <SelectValue placeholder="Select product type" />
                                                </SelectTrigger>
                                                <SelectContent className="border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                                                    {blueprints.map((blueprint) => (
                                                        <SelectItem
                                                            key={blueprint.id}
                                                            value={blueprint.id.toString()}
                                                            className="text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                                                        >
                                                            {blueprint.title}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.printify_blueprint_id && <p className="text-sm text-red-500">{errors.printify_blueprint_id}</p>}

                                            {selectedBlueprint && (
                                                <div className="mt-4 rounded-xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-5 shadow-lg sm:p-6 dark:border-blue-700 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-purple-950/40">
                                                    <div className="flex flex-col items-start gap-4 sm:flex-row">
                                                        {selectedBlueprint.images[0] && (
                                                            <div className="shrink-0">
                                                                <img
                                                                    src={selectedBlueprint.images[0] || '/placeholder.svg'}
                                                                    alt={selectedBlueprint.title}
                                                                    className="h-20 w-20 rounded-xl border-2 border-blue-300 object-cover shadow-md sm:h-24 sm:w-24 dark:border-blue-600"
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="min-w-0 flex-1">
                                                            <h4 className="mb-2 text-lg font-bold text-blue-900 sm:text-xl dark:text-blue-100">
                                                                {selectedBlueprint.title}
                                                            </h4>
                                                            <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-blue-700 sm:text-base dark:text-blue-300">
                                                                {selectedBlueprint.description.replace(/<[^>]*>/g, '')}
                                                            </p>
                                                            <div className="flex flex-wrap gap-2">
                                                                <span className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-800 shadow-sm sm:text-sm dark:border-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                                                                    {selectedBlueprint.brand}
                                                                </span>
                                                                <span className="inline-flex items-center rounded-lg border border-green-200 bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-800 shadow-sm sm:text-sm dark:border-green-800 dark:bg-green-900/50 dark:text-green-200">
                                                                    {selectedBlueprint.model}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Print Provider Selection */}
                                        {data.printify_blueprint_id && (
                                            <div className="space-y-3">
                                                <Label htmlFor="provider" className="flex items-center gap-2 text-base font-semibold">
                                                    <Package className="h-4 w-4" />
                                                    Print Provider *
                                                </Label>
                                                <Select
                                                    value={data.printify_provider_id}
                                                    onValueChange={handleProviderSelect}
                                                    disabled={loadingProviders}
                                                >
                                                    <SelectTrigger
                                                        className={`h-11 w-full border-gray-300 bg-white text-base text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 ${loadingProviders ? 'opacity-50' : ''}`}
                                                    >
                                                        {loadingProviders ? (
                                                            <div className="flex items-center gap-2">
                                                                <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                                                                <span className="text-gray-600 dark:text-gray-400">Loading providers...</span>
                                                            </div>
                                                        ) : (
                                                            <SelectValue placeholder="Select print provider" />
                                                        )}
                                                    </SelectTrigger>
                                                    <SelectContent className="border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                                                        {providers.map((provider) => (
                                                            <SelectItem
                                                                key={provider.id}
                                                                value={provider.id.toString()}
                                                                className="text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                                                            >
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium">{provider.title}</span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {errors.printify_provider_id && <p className="text-sm text-red-500">{errors.printify_provider_id}</p>}

                                                {selectedProvider && (
                                                    <div className="mt-3 rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 shadow-sm dark:border-blue-800 dark:from-blue-950/30 dark:to-indigo-950/30">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <h5 className="text-sm font-semibold text-blue-900 sm:text-base dark:text-blue-100">
                                                                    {selectedProvider.title}
                                                                </h5>
                                                                {selectedProvider.location && (
                                                                    <p className="mt-1 text-xs text-blue-700 sm:text-sm dark:text-blue-300">
                                                                        {selectedProvider.location.city}, {selectedProvider.location.country}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div
                                                                    className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-500 shadow-sm dark:bg-green-400"
                                                                    title="Available"
                                                                />
                                                                <span className="text-xs font-medium text-green-700 dark:text-green-400">
                                                                    Available
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Variants Selection */}
                                        {variants.length > 0 && (
                                            <div className="space-y-3">
                                                <Label className="flex items-center gap-2 text-base font-semibold">
                                                    <ShoppingBag className="h-4 w-4" />
                                                    Product Variants *
                                                </Label>
                                                <p className="text-muted-foreground text-sm">Select the sizes/colors you want to offer</p>

                                                {loadingVariants ? (
                                                    <div className="flex items-center justify-center py-12">
                                                        <Loader2 className="mr-2 h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
                                                        <span className="text-gray-600 dark:text-gray-400">Loading variants...</span>
                                                    </div>
                                                ) : (
                                                    <div className="grid max-h-96 grid-cols-1 gap-3 overflow-y-auto p-1 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:dark:bg-gray-600 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:dark:bg-gray-800">
                                                        {variants.map((variant) => (
                                                            <div
                                                                key={variant.id}
                                                                className={`group cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 ${
                                                                    selectedVariants.includes(variant.id)
                                                                        ? 'scale-[1.02] border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg shadow-blue-500/20 dark:border-blue-400 dark:from-blue-950/40 dark:to-indigo-950/40 dark:shadow-blue-500/10'
                                                                        : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600'
                                                                }`}
                                                                onClick={() => handleVariantToggle(variant.id)}
                                                            >
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="min-w-0 flex-1">
                                                                        <h4 className="mb-2 text-sm font-semibold text-gray-900 sm:text-base dark:text-gray-100">
                                                                            {variant.title}
                                                                        </h4>

                                                                        {variant.options.color && (
                                                                            <div className="mt-2 flex flex-wrap gap-2">
                                                                                <span className="inline-flex items-center rounded-lg border border-purple-200 bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800 dark:border-purple-800 dark:bg-purple-900/50 dark:text-purple-200">
                                                                                    {variant.options.color}
                                                                                </span>
                                                                                {variant.options.size && (
                                                                                    <span className="inline-flex items-center rounded-lg border border-orange-200 bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800 dark:border-orange-800 dark:bg-orange-900/50 dark:text-orange-200">
                                                                                        {variant.options.size}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div
                                                                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                                                                            selectedVariants.includes(variant.id)
                                                                                ? 'border-blue-600 bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md dark:border-blue-500 dark:from-blue-400 dark:to-indigo-500'
                                                                                : 'border-gray-300 group-hover:border-blue-400 dark:border-gray-600 dark:group-hover:border-blue-500'
                                                                        }`}
                                                                    >
                                                                        {selectedVariants.includes(variant.id) && (
                                                                            <Check className="h-3.5 w-3.5 text-white" />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}

                                                        {/* {variants.map((variant) => {
    const isSelected = selectedVariants.includes(variant.id);
    const variantData = data.printify_variants.find(v => v.id === variant.id);
    const cost = variant.cost / 100; // Convert to dollars if needed

    return (
        <div
            key={variant.id}
            className={`p-4 border rounded-lg transition-all ${
                isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
            }`}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleVariantToggle(variant.id)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        <div>
                            <h4 className="font-medium text-sm">{variant.title}</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                Cost: ${cost.toFixed(2)}
                                {variant.shipping > 0 && ` + $${(variant.shipping / 100).toFixed(2)} shipping`}
                            </p>
                            {variant.options.color && (
                                <div className="flex gap-1 mt-2">
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100">
                                        {variant.options.color}
                                    </span>
                                    {variant.options.size && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100">
                                            {variant.options.size}
                                        </span>
                                    )}
                                </div>
                            )}
                            <div className="flex gap-1 mt-1">
                                {variant.decoration_methods.map((method: string) => (
                                    <span key={method} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                                        {method.toUpperCase()}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {isSelected && variantData && (
                    <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="text-right">
                            <Label htmlFor={`price-${variant.id}`} className="text-xs text-gray-500">
                                Your Price
                            </Label>
                            <div className="relative">
                                <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">$</span>
                                <Input
                                    id={`price-${variant.id}`}
                                    type="number"
                                    step="0.01"
                                    min={cost}
                                    value={variantData.price}
                                    onChange={(e) => handleVariantPriceChange(variant.id, parseFloat(e.target.value))}
                                    className="pl-6 w-24 text-sm"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Profit: ${(variantData.price - cost).toFixed(2)}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
})} */}
                                                    </div>
                                                )}

                                                {selectedVariants.length > 0 && (
                                                    <div className="mt-4 rounded-xl border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 p-4 shadow-sm dark:border-green-700 dark:from-green-950/40 dark:to-emerald-950/40">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                                                                <span className="text-sm font-semibold text-green-800 sm:text-base dark:text-green-200">
                                                                    {selectedVariants.length} variant{selectedVariants.length > 1 ? 's' : ''} selected
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {errors.printify_variants && <p className="text-sm text-red-500">{errors.printify_variants}</p>}
                                            </div>
                                        )}

                                        {/* Printify Images */}
                                        {/* <div className="space-y-3">
                                                    <Label className="text-base">Product Design Images *</Label>
                                                    <p className="text-sm text-muted-foreground">
                                                        Add URLs to your design images (PNG, JPG with transparent background recommended)
                                                    </p>

                                                    {data.printify_images.map((image, index) => (
                                                        <div key={index} className="flex gap-2 items-start">
                                                            <Input
                                                                value={image}
                                                                onChange={(e) => updateImage(index, e.target.value)}
                                                                placeholder="https://example.com/your-design.png"
                                                                className="flex-1"
                                                            />
                                                            {data.printify_images.length > 1 && (
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => removeImage(index)}
                                                                    className="shrink-0"
                                                                >
                                                                    <Minus className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ))}

                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={addImageField}
                                                    >
                                                        <Plus className="h-4 w-4 mr-2" />
                                                        Add Another Image
                                                    </Button>

                                                    {errors.printify_images && (
                                                        <p className="text-sm text-red-500">{errors.printify_images}</p>
                                                    )}
                                                </div> */}

                                        {/* Printify Design Images - File Upload Instead of URL */}
                                        <div className="space-y-4">
                                            <div>
                                                <Label className="flex items-center gap-2 text-base font-semibold text-gray-900 sm:text-lg dark:text-gray-100">
                                                    <ImageIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                                    Product Design Images *
                                                </Label>
                                                <p className="mt-2 text-sm text-gray-600 sm:text-base dark:text-gray-400">
                                                    Upload your design files (PNG recommended with transparent background)
                                                </p>
                                                <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/30">
                                                    <p className="text-xs text-blue-700 sm:text-sm dark:text-blue-300">
                                                        <strong>Requirements:</strong> PNG or JPEG format • Max 1MB per file (Printify requirement) •
                                                        Recommended: 100x100px to 6000x6000px
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                {data.printify_images.length === 0 ? (
                                                    <div className="flex items-start gap-3">
                                                        <div className="flex-1">
                                                            <Input
                                                                type="file"
                                                                accept="image/png,image/jpeg,image/jpg"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0] || null;
                                                                    if (file) {
                                                                        handleDesignUpload(0, file);
                                                                    }
                                                                }}
                                                                className="hidden"
                                                                id="design-0"
                                                            />
                                                            <label htmlFor="design-0" className="block cursor-pointer">
                                                                <div className="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 transition-all duration-200 hover:border-blue-400 hover:bg-gray-100 sm:h-56 dark:border-gray-600 dark:bg-gray-800/50 dark:hover:border-blue-500 dark:hover:bg-gray-800">
                                                                    <div className="p-6 text-center">
                                                                        <Upload className="mx-auto mb-3 h-12 w-12 text-gray-400 sm:h-16 sm:w-16 dark:text-gray-500" />
                                                                        <p className="text-sm font-medium text-gray-700 sm:text-base dark:text-gray-300">
                                                                            Click to upload
                                                                        </p>
                                                                        <p className="mt-1 text-xs text-gray-500 sm:text-sm dark:text-gray-400">
                                                                            PNG or JPEG • Max 1MB
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </label>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    data.printify_images.map((img, index) => (
                                                        <div key={index} className="flex items-start gap-3 sm:gap-4">
                                                            <div className="flex-1">
                                                                <Input
                                                                    type="file"
                                                                    accept="image/png,image/jpeg,image/jpg"
                                                                    onChange={(e) => handleDesignUpload(index, e.target.files?.[0] || null)}
                                                                    className="hidden"
                                                                    id={`design-${index}`}
                                                                />
                                                                <label htmlFor={`design-${index}`} className="block cursor-pointer">
                                                                    {img?.preview ? (
                                                                        <div className="space-y-3">
                                                                            <div className="relative overflow-hidden rounded-xl border-2 border-gray-200 shadow-md transition-shadow hover:shadow-lg dark:border-gray-700">
                                                                                <img
                                                                                    src={img.preview || '/placeholder.svg'}
                                                                                    alt="preview"
                                                                                    className="h-48 w-full bg-gray-50 object-contain sm:h-56 dark:bg-gray-800"
                                                                                />
                                                                            </div>
                                                                            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-2 text-xs sm:text-sm dark:bg-gray-800/50">
                                                                                <span className="truncate font-medium text-gray-700 dark:text-gray-300">
                                                                                    {img.name}
                                                                                </span>
                                                                                {img.file && (
                                                                                    <span className="font-medium text-gray-500 dark:text-gray-400">
                                                                                        {(img.file.size / 1024 / 1024).toFixed(2)} MB
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 transition-all duration-200 hover:border-blue-400 hover:bg-gray-100 sm:h-56 dark:border-gray-600 dark:bg-gray-800/50 dark:hover:border-blue-500 dark:hover:bg-gray-800">
                                                                            <div className="p-6 text-center">
                                                                                <Upload className="mx-auto mb-3 h-12 w-12 text-gray-400 sm:h-16 sm:w-16 dark:text-gray-500" />
                                                                                <p className="text-sm font-medium text-gray-700 sm:text-base dark:text-gray-300">
                                                                                    Click to upload
                                                                                </p>
                                                                                <p className="mt-1 text-xs text-gray-500 sm:text-sm dark:text-gray-400">
                                                                                    Max 1MB
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </label>
                                                            </div>
                                                            {data.printify_images.length > 1 && (
                                                                <Button
                                                                    type="button"
                                                                    onClick={() => removeDesignField(index)}
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="shrink-0 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                                                                >
                                                                    <Minus className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ))
                                                )}
                                            </div>

                                            <Button
                                                type="button"
                                                onClick={addDesignField}
                                                variant="outline"
                                                size="sm"
                                                className="border-2 border-dashed border-blue-300 bg-blue-50 font-semibold text-blue-700 hover:border-blue-500 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:border-blue-500 dark:hover:bg-blue-900/30"
                                            >
                                                <Plus className="mr-2 h-4 w-4" /> Add Design
                                            </Button>

                                            {errors.printify_images && (
                                                <div className="space-y-1">
                                                    <p className="text-sm text-red-500">{errors.printify_images}</p>
                                                    {errors.printify_images.includes('413') ||
                                                    errors.printify_images.includes('Request Entity Too Large') ? (
                                                        <p className="text-muted-foreground mt-1 text-xs">
                                                            Note: If you continue to see this error, your server's nginx configuration may need to be
                                                            updated. Contact your administrator to increase the{' '}
                                                            <code className="text-xs">client_max_body_size</code> setting in nginx.
                                                        </p>
                                                    ) : null}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Basic Product Information */}
                            <Card className="border-2 border-gray-200 bg-white shadow-lg transition-all duration-300 hover:shadow-xl dark:border-gray-700 dark:bg-gray-900 dark:shadow-xl dark:hover:shadow-2xl">
                                <CardHeader className="border-b border-blue-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 py-2 dark:border-blue-800 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-purple-950/40">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                        <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 shadow-md dark:from-blue-400 dark:to-indigo-500">
                                            <Info className="h-5 w-5 text-white sm:h-6 sm:w-6" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg font-bold text-gray-900 sm:text-xl dark:text-gray-100">
                                                Basic Information
                                            </CardTitle>
                                            <CardDescription className="text-sm text-gray-600 sm:text-base dark:text-gray-400">
                                                Enter the essential details about your product
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-6 md:space-y-8 md:pt-8">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            Product Name *
                                        </Label>
                                        <Input
                                            id="name"
                                            type="text"
                                            value={data.name}
                                            onChange={(e) => handleChange('name', e.target.value)}
                                            placeholder="e.g., Premium Cotton T-Shirt"
                                            className={`h-11 text-base ${errors.name ? 'border-red-500 focus-visible:ring-red-500 dark:border-red-500' : 'border-gray-300 focus-visible:ring-blue-500 dark:border-gray-600'} bg-white text-gray-900 placeholder:text-gray-400 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500`}
                                        />
                                        {errors.name && (
                                            <p className="flex items-center gap-1 text-sm text-red-500 dark:text-red-400">
                                                <span>⚠</span> {errors.name}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            Description *
                                        </Label>
                                        <TextArea
                                            id="description"
                                            value={data.description}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('description', e.target.value)}
                                            placeholder="Describe your product in detail..."
                                            rows={5}
                                            className={`resize-none text-base ${errors.description ? 'border-red-500 focus-visible:ring-red-500 dark:border-red-500' : 'border-gray-300 focus-visible:ring-blue-500 dark:border-gray-600'} bg-white text-gray-900 placeholder:text-gray-400 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500`}
                                        />
                                        {errors.description && (
                                            <p className="flex items-center gap-1 text-sm text-red-500 dark:text-red-400">
                                                <span>⚠</span> {errors.description}
                                            </p>
                                        )}
                                    </div>

                                    {!data.is_printify_product && (
                                        <div className="space-y-2">
                                            <Label htmlFor="image" className="flex items-center gap-2">
                                                <ImageIcon className="h-4 w-4" />
                                                Product Image *
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    id="image"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleFileChange}
                                                    className={`${errors.image ? 'border-red-500' : ''} file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer file:mr-4 file:rounded-md file:border-0 file:px-4 file:py-2 file:text-sm file:font-semibold`}
                                                />
                                                {data.image && (
                                                    <div className="mt-3 rounded-xl border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 p-4 shadow-sm dark:border-green-700 dark:from-green-900/30 dark:to-emerald-900/30">
                                                        <div className="flex items-center gap-3">
                                                            <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/50">
                                                                <ImageIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="truncate text-sm font-semibold text-green-800 dark:text-green-200">
                                                                    {data.image.name}
                                                                </p>
                                                                <p className="mt-0.5 text-xs text-green-600 dark:text-green-400">
                                                                    {(data.image.size / 1024 / 1024).toFixed(2)} MB
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            {errors.image && (
                                                <p className="flex items-center gap-1 text-sm text-red-500">
                                                    <span>⚠</span> {errors.image}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Pricing & Inventory */}
                            <Card className="border-2 border-gray-200 bg-white shadow-lg transition-all duration-300 hover:shadow-xl dark:border-gray-700 dark:bg-gray-900 dark:shadow-xl dark:hover:shadow-2xl">
                                <CardHeader className="border-b border-green-200 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 py-2 dark:border-green-800 dark:from-green-950/40 dark:via-emerald-950/40 dark:to-teal-950/40">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                        <div className="rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 p-2.5 shadow-md dark:from-green-400 dark:to-emerald-500">
                                            <DollarSign className="h-5 w-5 text-white sm:h-6 sm:w-6" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg font-bold text-gray-900 sm:text-xl dark:text-gray-100">
                                                Pricing & Inventory
                                            </CardTitle>
                                            <CardDescription className="text-sm text-gray-600 sm:text-base dark:text-gray-400">
                                                Set pricing, shipping, and stock information
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 gap-6 pt-6 sm:grid-cols-2 md:gap-8 md:pt-8">
                                    <div className="space-y-2">
                                        <Label htmlFor="quantity" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            Quantity *
                                        </Label>
                                        <Input
                                            id="quantity"
                                            type="number"
                                            min="0"
                                            value={data.quantity}
                                            onChange={(e) => handleChange('quantity', e.target.value)}
                                            placeholder="0"
                                            className={`h-11 text-base ${errors.quantity ? 'border-red-500 focus-visible:ring-red-500 dark:border-red-500' : 'border-gray-300 focus-visible:ring-green-500 dark:border-gray-600'} bg-white text-gray-900 placeholder:text-gray-400 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500`}
                                        />
                                        {errors.quantity && (
                                            <p className="flex items-center gap-1 text-sm text-red-500 dark:text-red-400">
                                                <span>⚠</span> {errors.quantity}
                                            </p>
                                        )}
                                    </div>

                                    {!data.is_printify_product && (
                                        <>
                                            <div className="space-y-2">
                                                <Label htmlFor="unit_price" className="flex items-center gap-2">
                                                    <DollarSign className="h-4 w-4" />
                                                    Unit Price ($) *
                                                </Label>
                                                <div className="relative">
                                                    <span className="absolute top-1/2 left-3 -translate-y-1/2 transform font-medium text-gray-500 dark:text-gray-400">
                                                        $
                                                    </span>
                                                    <Input
                                                        id="unit_price"
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={data.unit_price}
                                                        onChange={(e) => handleChange('unit_price', e.target.value)}
                                                        placeholder="0.00"
                                                        className={`h-11 pl-8 text-base ${errors.unit_price ? 'border-red-500 focus-visible:ring-red-500 dark:border-red-500' : 'border-gray-300 focus-visible:ring-green-500 dark:border-gray-600'} bg-white text-gray-900 placeholder:text-gray-400 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500`}
                                                    />
                                                </div>
                                                {errors.unit_price && (
                                                    <p className="flex items-center gap-1 text-sm text-red-500">
                                                        <span>⚠</span> {errors.unit_price}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="shipping_charge" className="flex items-center gap-2">
                                                    <Package className="h-4 w-4" />
                                                    Shipping Charge ($) *
                                                </Label>
                                                <div className="relative">
                                                    <span className="absolute top-1/2 left-3 -translate-y-1/2 transform font-medium text-gray-500 dark:text-gray-400">
                                                        $
                                                    </span>
                                                    <Input
                                                        id="shipping_charge"
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={data.shipping_charge}
                                                        onChange={(e) => handleChange('shipping_charge', e.target.value)}
                                                        placeholder="0.00"
                                                        className={`h-11 pl-8 text-base ${errors.shipping_charge ? 'border-red-500 focus-visible:ring-red-500 dark:border-red-500' : 'border-gray-300 focus-visible:ring-green-500 dark:border-gray-600'} bg-white text-gray-900 placeholder:text-gray-400 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500`}
                                                    />
                                                </div>
                                                {errors.shipping_charge && (
                                                    <p className="flex items-center gap-1 text-sm text-red-500">
                                                        <span>⚠</span> {errors.shipping_charge}
                                                    </p>
                                                )}
                                                <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/30">
                                                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                                                    <p className="text-xs leading-relaxed text-blue-700 sm:text-sm dark:text-blue-300">
                                                        Shipping charge customers will pay for this product
                                                    </p>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* <div className="space-y-2">
                                        <Label htmlFor="profit_margin_percentage">Profit Margin (%) *</Label>
                                        <Input
                                            id="profit_margin_percentage"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={data.profit_margin_percentage}
                                            onChange={(e) => handleChange('profit_margin_percentage', e.target.value)}
                                            placeholder="Enter profit margin"
                                            className={errors.profit_margin_percentage ? 'border-red-500' : ''}
                                        />
                                        {errors.profit_margin_percentage && <p className="text-sm text-red-500">{errors.profit_margin_percentage}</p>}
                                    </div> */}

                                    <div className="space-y-2">
                                        <Label htmlFor="sku" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            SKU *
                                        </Label>
                                        <Input
                                            id="sku"
                                            type="text"
                                            value={data.sku}
                                            onChange={(e) => handleChange('sku', e.target.value)}
                                            placeholder="e.g., PROD-001"
                                            className={`h-11 text-base ${errors.sku ? 'border-red-500 focus-visible:ring-red-500 dark:border-red-500' : 'border-gray-300 focus-visible:ring-green-500 dark:border-gray-600'} bg-white text-gray-900 placeholder:text-gray-400 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500`}
                                        />
                                        {errors.sku && (
                                            <p className="flex items-center gap-1 text-sm text-red-500 dark:text-red-400">
                                                <span>⚠</span> {errors.sku}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="type" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            Type *
                                        </Label>
                                        <Select value={data.type} onValueChange={(value) => handleChange('type', value)}>
                                            <SelectTrigger
                                                className={`h-11 text-base ${errors.type ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100`}
                                            >
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent className="border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                                                <SelectItem
                                                    value="physical"
                                                    className="text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                                                >
                                                    Physical
                                                </SelectItem>
                                                <SelectItem
                                                    value="digital"
                                                    className="text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                                                >
                                                    Digital
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.type && (
                                            <p className="flex items-center gap-1 text-sm text-red-500 dark:text-red-400">
                                                <span>⚠</span> {errors.type}
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Additional Settings */}
                            <Card className="border-2 border-gray-200 bg-white shadow-lg transition-all duration-300 hover:shadow-xl dark:border-gray-700 dark:bg-gray-900 dark:shadow-xl dark:hover:shadow-2xl">
                                <CardHeader className="border-b border-purple-200 bg-gradient-to-r from-purple-50 via-pink-50 to-rose-50 dark:border-purple-800 dark:from-purple-950/40 dark:via-pink-950/40 dark:to-rose-950/40 py-2">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                        <div className="rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 p-2.5 shadow-md dark:from-purple-400 dark:to-pink-500">
                                            <Settings2 className="h-5 w-5 text-white sm:h-6 sm:w-6" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg font-bold text-gray-900 sm:text-xl dark:text-gray-100">
                                                Additional Settings
                                            </CardTitle>
                                            <CardDescription className="text-sm text-gray-600 sm:text-base dark:text-gray-400">
                                                Configure status, ownership, and categorization
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-6 md:space-y-8 md:pt-8">
                                    <div className="space-y-2">
                                        <Label htmlFor="status" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            Status *
                                        </Label>
                                        <Select value={data.status} onValueChange={(value) => handleChange('status', value)}>
                                            <SelectTrigger
                                                className={`h-11 text-base ${errors.status ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100`}
                                            >
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent className="border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                                                <SelectItem
                                                    value="active"
                                                    className="text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                                                >
                                                    Active
                                                </SelectItem>
                                                <SelectItem
                                                    value="inactive"
                                                    className="text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                                                >
                                                    Inactive
                                                </SelectItem>
                                                <SelectItem
                                                    value="archived"
                                                    className="text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                                                >
                                                    Archived
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.status && (
                                            <p className="flex items-center gap-1 text-sm text-red-500 dark:text-red-400">
                                                <span>⚠</span> {errors.status}
                                            </p>
                                        )}
                                    </div>

                                    {auth.user.role === 'admin' && (
                                        <>
                                            <div className="space-y-2">
                                                <Label htmlFor="owned_by" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                    Owned By *
                                                </Label>
                                                <Select value={data.owned_by} onValueChange={(value) => handleChange('owned_by', value)}>
                                                    <SelectTrigger
                                                        className={`h-11 text-base ${errors.owned_by ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100`}
                                                    >
                                                        <SelectValue placeholder="Select owner" />
                                                    </SelectTrigger>
                                                    <SelectContent className="border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                                                        <SelectItem
                                                            value="admin"
                                                            className="text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                                                        >
                                                            Admin
                                                        </SelectItem>
                                                        <SelectItem
                                                            value="organization"
                                                            className="text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                                                        >
                                                            Organization
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {errors.owned_by && (
                                                    <p className="flex items-center gap-1 text-sm text-red-500 dark:text-red-400">
                                                        <span>⚠</span> {errors.owned_by}
                                                    </p>
                                                )}
                                            </div>

                                            {data.owned_by === 'organization' && (
                                                <div className="space-y-2">
                                                    <Label
                                                        htmlFor="organization_id"
                                                        className="text-sm font-semibold text-gray-900 dark:text-gray-100"
                                                    >
                                                        Organization
                                                    </Label>
                                                    {organizations.length > 0 ? (
                                                        <Select
                                                            value={data.organization_id}
                                                            onValueChange={(value) => handleChange('organization_id', value)}
                                                        >
                                                            <SelectTrigger
                                                                className={`h-11 text-base ${errors.organization_id ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100`}
                                                            >
                                                                <SelectValue placeholder="Select organization" />
                                                            </SelectTrigger>
                                                            <SelectContent className="border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                                                                {organizations.map((org) => (
                                                                    <SelectItem
                                                                        key={org.id}
                                                                        value={String(org.id)}
                                                                        className="text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                                                                    >
                                                                        {org.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <Input
                                                            id="organization_id"
                                                            type="number"
                                                            value={data.organization_id}
                                                            onChange={(e) => handleChange('organization_id', e.target.value)}
                                                            placeholder="Enter organization ID"
                                                            className={`h-11 text-base ${errors.organization_id ? 'border-red-500 focus-visible:ring-red-500 dark:border-red-500' : 'border-gray-300 focus-visible:ring-purple-500 dark:border-gray-600'} bg-white text-gray-900 placeholder:text-gray-400 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500`}
                                                        />
                                                    )}
                                                    {errors.organization_id && (
                                                        <p className="flex items-center gap-1 text-sm text-red-500 dark:text-red-400">
                                                            <span>⚠</span> {errors.organization_id}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    <div className="space-y-3">
                                        <Label className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            <Tag className="h-4 w-4" />
                                            Categories
                                        </Label>
                                        <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4 sm:p-6 dark:border-gray-700 dark:bg-gray-800/50">
                                            <div className="flex flex-wrap gap-2 sm:gap-3">
                                                {categories.map((category) => (
                                                    <label
                                                        key={category.id}
                                                        className={`group flex cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2 transition-all duration-200 sm:px-4 ${
                                                            selectedCategories.includes(category.id)
                                                                ? 'border-blue-600 bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/30 dark:border-blue-500 dark:from-blue-400 dark:to-indigo-500 dark:shadow-blue-500/20'
                                                                : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:bg-blue-900/20'
                                                        }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedCategories.includes(category.id)}
                                                            onChange={() => handleCategoryChange(category.id)}
                                                            className="h-4 w-4 cursor-pointer accent-blue-600"
                                                        />
                                                        <span className="text-sm font-medium">{category.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            {categories.length === 0 && (
                                                <p className="text-muted-foreground py-6 text-center text-sm">No categories available</p>
                                            )}
                                        </div>
                                        {errors.categories && (
                                            <p className="flex items-center gap-1 text-sm text-red-500 dark:text-red-400">
                                                <span>⚠</span> {errors.categories}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="tags"
                                            className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100"
                                        >
                                            <Tag className="h-4 w-4" />
                                            Tags/Keywords
                                        </Label>
                                        <Input
                                            id="tags"
                                            type="text"
                                            value={data.tags}
                                            onChange={(e) => handleChange('tags', e.target.value)}
                                            placeholder="e.g., summer, sale, popular (comma separated)"
                                            className={`h-11 text-base ${errors.tags ? 'border-red-500 focus-visible:ring-red-500 dark:border-red-500' : 'border-gray-300 focus-visible:ring-purple-500 dark:border-gray-600'} bg-white text-gray-900 placeholder:text-gray-400 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500`}
                                        />
                                        <p className="text-muted-foreground text-xs sm:text-sm">Separate multiple tags with commas</p>
                                        {errors.tags && (
                                            <p className="flex items-center gap-1 text-sm text-red-500 dark:text-red-400">
                                                <span>⚠</span> {errors.tags}
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Submit Button */}
                            <div className="flex flex-col gap-4 border-t-2 border-gray-200 pt-6 sm:flex-row md:pt-8 dark:border-gray-700">
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="h-12 flex-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-base font-bold text-white shadow-xl transition-all duration-300 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:text-lg dark:from-blue-500 dark:via-indigo-500 dark:to-purple-500 dark:hover:from-blue-600 dark:hover:via-indigo-600 dark:hover:to-purple-600"
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Creating Product...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-5 w-5" />
                                            Create Product
                                        </>
                                    )}
                                </Button>
                                <Link href={route('products.index')} className="flex-1 sm:flex-initial">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-12 w-full border-2 border-gray-300 bg-white text-base font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-100 sm:h-14 sm:w-auto sm:text-lg dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                                    >
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
