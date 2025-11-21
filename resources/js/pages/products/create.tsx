import React, { useState, useEffect } from 'react';
import type { SharedData } from "@/types"
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TextArea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/frontend/ui/switch'; // Corrected import path
import { Save, Plus, Minus, ExternalLink, Loader2 } from 'lucide-react';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import AppLayout from "@/layouts/app-layout"
import type { BreadcrumbItem } from "@/types"
import axios from 'axios';
import { set } from 'lodash';

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
    const { auth } = usePage<SharedData>().props

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
        quantity: '',
        unit_price: '',
        owned_by: 'admin',
        organization_id: '',
        status: 'active',
        sku: '',
        type: 'physical',
        tags: '',
        categories: [] as number[],
        image: null as File | null,

        // Printify fields
        is_printify_product: true,
        printify_blueprint_id: '',
        printify_provider_id: '',
        printify_variants: [] as any[],
        printify_images: [''] as string[],
    });


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

    const addImageField = () => {
        setData('printify_images', [...data.printify_images, '']);
    };

    const updateImage = (index: number, value: string) => {
        const newImages = [...data.printify_images];
        newImages[index] = value;
        setData('printify_images', newImages);
    };

    const removeImage = (index: number) => {
        const newImages = data.printify_images.filter((_, i) => i !== index);
        setData('printify_images', newImages);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate Printify required fields
        if (data.is_printify_product) {
            if (!data.printify_blueprint_id) {
                showErrorToast('Please select a product type');
                return;
            }
            if (!data.printify_provider_id) {
                showErrorToast('Please select a print provider');
                return;
            }
            if (data.printify_variants.length === 0) {
                showErrorToast('Please select at least one variant');
                return;
            }
            if (data.printify_images.length === 0 || data.printify_images[0] === '') {
                showErrorToast('Please add at least one design image URL');
                return;
            }
        }

        post(route('products.store'));
    };

    const handleChange = (field: string, value: string | number | boolean | File | null) => {
        setData(field, value);
    };


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setData('image', file);
    };

    // Calculate profit margin for display
    const calculateProfitInfo = () => {
        if (!data.unit_price || data.printify_variants.length === 0) return null;

        const maxVariantCost = Math.max(...data.printify_variants.map((v: any) => v.price));
        const sellingPrice = parseFloat(data.unit_price);
        const profit = sellingPrice - maxVariantCost;
        const margin = (profit / sellingPrice) * 100;

        return {
            cost: maxVariantCost,
            profit,
            margin
        };
    };

    const profitInfo = calculateProfitInfo();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Product" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl py-4 px-4 md:py-6 md:px-10">
                <Card className="px-0">
                    <CardHeader className="px-4 md:px-6">
                        <div className="flex items-center gap-4">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">Create Product</h1>
                                <p className="text-muted-foreground">
                                    Add a new product to the system
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 md:px-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Printify Toggle */}
                            {printify_enabled && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <ExternalLink className="h-5 w-5" />
                                            Printify Integration
                                        </CardTitle>
                                        <CardDescription>
                                            Create a print-on-demand product through Printify
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label htmlFor="printify-toggle" className="text-base">Create Printify Product</Label>
                                                <p className="text-sm text-muted-foreground">
                                                    Design and sell custom print-on-demand products
                                                </p>
                                            </div>
                                            <Switch
                                                id="printify-toggle"
                                                checked={data.is_printify_product}
                                                disabled={true}
                                                // onCheckedChange={(checked) => {
                                                //     setData('is_printify_product', checked);
                                                //     if (!checked) {
                                                //         // Reset Printify fields when disabled
                                                //         setData('printify_blueprint_id', '');
                                                //         setData('printify_provider_id', '');
                                                //         setData('printify_variants', []);
                                                //         setData('printify_images', ['']);
                                                //         setSelectedBlueprint(null);
                                                //         setSelectedProvider(null);
                                                //         setProviders([]);
                                                //         setVariants([]);
                                                //         setSelectedVariants([]);
                                                //     }
                                                // }}
                                            />
                                        </div>

                                        {data.is_printify_product && (
                                            <div className="space-y-6 border-t pt-6">
                                                {/* Product Type Selection */}
                                                <div className="space-y-3">
                                                    <Label htmlFor="blueprint" className="text-base">Product Type *</Label>
                                                    <Select
                                                        value={data.printify_blueprint_id}
                                                        onValueChange={handleBlueprintSelect}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select product type" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {blueprints.map((blueprint) => (
                                                                <SelectItem key={blueprint.id} value={blueprint.id.toString()}>
                                                                    {blueprint.title}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {errors.printify_blueprint_id && (
                                                        <p className="text-sm text-red-500">{errors.printify_blueprint_id}</p>
                                                    )}

                                                    {selectedBlueprint && (
                                                        <div className="mt-3 p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                                                            <div className="flex items-start space-x-4">
                                                                {selectedBlueprint.images[0] && (
                                                                    <img
                                                                        src={selectedBlueprint.images[0]}
                                                                        alt={selectedBlueprint.title}
                                                                        className="w-16 h-16 object-cover rounded-lg border"
                                                                    />
                                                                )}
                                                                <div className="flex-1">
                                                                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                                                                        {selectedBlueprint.title}
                                                                    </h4>
                                                                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                                                        {selectedBlueprint.description.replace(/<[^>]*>/g, '')}
                                                                    </p>
                                                                    <div className="flex gap-2 mt-2">
                                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                                                                            {selectedBlueprint.brand}
                                                                        </span>
                                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
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
                                                        <Label htmlFor="provider" className="text-base">Print Provider *</Label>
                                                        <Select
                                                            value={data.printify_provider_id}
                                                            onValueChange={handleProviderSelect}
                                                            disabled={loadingProviders}
                                                        >
                                                            <SelectTrigger className="w-full">
                                                                {loadingProviders ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                        Loading providers...
                                                                    </div>
                                                                ) : (
                                                                    <SelectValue placeholder="Select print provider" />
                                                                )}
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {providers.map((provider) => (
                                                                    <SelectItem key={provider.id} value={provider.id.toString()}>
                                                                        <div className="flex flex-col">
                                                                            <span className="font-medium">{provider.title}</span>
                                                                        </div>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        {errors.printify_provider_id && (
                                                            <p className="text-sm text-red-500">{errors.printify_provider_id}</p>
                                                        )}

                                                        {selectedProvider && (
                                                            <div className="mt-2 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
                                                                <div className="flex items-center justify-between">
                                                                    <div>
                                                                        <h5 className="font-medium text-sm">{selectedProvider.title}</h5>
                                                                    </div>
                                                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Available" />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Variants Selection */}
                                                {variants.length > 0 && (
                                                    <div className="space-y-3">
                                                        <Label className="text-base">Product Variants *</Label>
                                                        <p className="text-sm text-muted-foreground">
                                                            Select the sizes/colors you want to offer
                                                        </p>

                                                        {loadingVariants ? (
                                                            <div className="flex items-center justify-center py-8">
                                                                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                                                Loading variants...
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-1">
                                                                {variants.map((variant) => (
                                                                    <div
                                                                        key={variant.id}
                                                                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                                                                            selectedVariants.includes(variant.id)
                                                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                                                                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                                                        }`}
                                                                        onClick={() => handleVariantToggle(variant.id)}
                                                                    >
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex-1">
                                                                                <h4 className="font-medium text-sm">{variant.title}</h4>

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
                                                                            </div>
                                                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                                                                selectedVariants.includes(variant.id)
                                                                                    ? 'bg-blue-600 border-blue-600'
                                                                                    : 'border-gray-300'
                                                                            }`}>
                                                                                {selectedVariants.includes(variant.id) && (
                                                                                    <div className="w-2 h-2 bg-white rounded-full" />
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
                                                            <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                                                                        {selectedVariants.length} variants selected
                                                                    </span>
                                                                    {/* {profitInfo && (
                                                                        <div className="text-right">
                                                                            <p className="text-xs text-green-700 dark:text-green-300">
                                                                                Base cost: ${profitInfo.cost.toFixed(2)}
                                                                            </p>
                                                                            <p className="text-xs text-green-700 dark:text-green-300">
                                                                                Your profit: ${profitInfo.profit.toFixed(2)} ({profitInfo.margin.toFixed(1)}%)
                                                                            </p>
                                                                        </div>
                                                                    )} */}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {errors.printify_variants && (
                                                            <p className="text-sm text-red-500">{errors.printify_variants}</p>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Printify Images */}
                                                <div className="space-y-3">
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
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Rest of the form remains the same */}
                            {/* Basic Product Information */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Basic Information</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Product Name *</Label>
                                        <Input
                                            id="name"
                                            type="text"
                                            value={data.name}
                                            onChange={(e) => handleChange('name', e.target.value)}
                                            placeholder="Enter product name"
                                            className={errors.name ? 'border-red-500' : ''}
                                        />
                                        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description">Description *</Label>
                                        <TextArea
                                            id="description"
                                            value={data.description}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('description', e.target.value)}
                                            placeholder="Enter product description"
                                            rows={4}
                                            className={errors.description ? 'border-red-500' : ''}
                                        />
                                        {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
                                    </div>

                                    {!data.is_printify_product && (
                                        <div className="space-y-2">
                                            <Label htmlFor="image">Product Image</Label>
                                            <Input
                                                id="image"
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                className={errors.image ? 'border-red-500' : ''}
                                            />
                                            {errors.image && (
                                                <p className="text-sm text-red-500">{errors.image}</p>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Pricing & Inventory */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Pricing & Inventory</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="quantity">Quantity *</Label>
                                        <Input
                                            id="quantity"
                                            type="number"
                                            min="0"
                                            value={data.quantity}
                                            onChange={(e) => handleChange('quantity', e.target.value)}
                                            placeholder="Enter quantity"
                                            className={errors.quantity ? 'border-red-500' : ''}
                                        />
                                        {errors.quantity && <p className="text-sm text-red-500">{errors.quantity}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="unit_price">Unit Price ($) *</Label>
                                        <Input
                                            id="unit_price"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={data.unit_price}
                                            onChange={(e) => handleChange('unit_price', e.target.value)}
                                            placeholder="Enter unit price"
                                            className={errors.unit_price ? 'border-red-500' : ''}
                                        />
                                        {errors.unit_price && <p className="text-sm text-red-500">{errors.unit_price}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="sku">SKU *</Label>
                                        <Input
                                            id="sku"
                                            type="text"
                                            value={data.sku}
                                            onChange={(e) => handleChange('sku', e.target.value)}
                                            placeholder="Enter SKU"
                                            className={errors.sku ? 'border-red-500' : ''}
                                        />
                                        {errors.sku && <p className="text-sm text-red-500">{errors.sku}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="type">Type *</Label>
                                        <Select value={data.type} onValueChange={(value) => handleChange('type', value)}>
                                            <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="physical">Physical</SelectItem>
                                                <SelectItem value="digital">Digital</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.type && <p className="text-sm text-red-500">{errors.type}</p>}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Additional Settings */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Additional Settings</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="status">Status *</Label>
                                        <Select value={data.status} onValueChange={(value) => handleChange('status', value)}>
                                            <SelectTrigger className={errors.status ? 'border-red-500' : ''}>
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="inactive">Inactive</SelectItem>
                                                <SelectItem value="archived">Archived</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.status && <p className="text-sm text-red-500">{errors.status}</p>}
                                    </div>

                                    {auth.user.role === "admin" && (
                                        <>
                                            <div className="space-y-2">
                                                <Label htmlFor="owned_by">Owned By *</Label>
                                                <Select value={data.owned_by} onValueChange={(value) => handleChange('owned_by', value)}>
                                                    <SelectTrigger className={errors.owned_by ? 'border-red-500' : ''}>
                                                        <SelectValue placeholder="Select owner" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="admin">Admin</SelectItem>
                                                        <SelectItem value="organization">Organization</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {errors.owned_by && <p className="text-sm text-red-500">{errors.owned_by}</p>}
                                            </div>

                                            {data.owned_by === 'organization' && (
                                                <div className="space-y-2">
                                                    <Label htmlFor="organization_id">Organization</Label>
                                                    {organizations.length > 0 ? (
                                                        <Select value={data.organization_id} onValueChange={(value) => handleChange('organization_id', value)}>
                                                            <SelectTrigger className={errors.organization_id ? 'border-red-500' : ''}>
                                                                <SelectValue placeholder="Select organization" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {organizations.map(org => (
                                                                    <SelectItem key={org.id} value={String(org.id)}>{org.name}</SelectItem>
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
                                                            className={errors.organization_id ? 'border-red-500' : ''}
                                                        />
                                                    )}
                                                    {errors.organization_id && <p className="text-sm text-red-500">{errors.organization_id}</p>}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    <div className="space-y-2">
                                        <Label>Categories</Label>
                                           <div className="flex flex-wrap gap-2">
        {categories.map(category => (
            <label key={category.id} className="flex items-center gap-2 cursor-pointer">
                <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.id)}
                    onChange={() => handleCategoryChange(category.id)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm">{category.name}</span>
            </label>
        ))}
    </div>
                                        {errors.categories && <p className="text-sm text-red-500">{errors.categories}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="tags">Tags/Keywords</Label>
                                        <Input
                                            id="tags"
                                            type="text"
                                            value={data.tags}
                                            onChange={(e) => handleChange('tags', e.target.value)}
                                            placeholder="Comma separated tags"
                                            className={errors.tags ? 'border-red-500' : ''}
                                        />
                                        {errors.tags && <p className="text-sm text-red-500">{errors.tags}</p>}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Submit Button */}
                            <div className="flex gap-4">
                                <Button type="submit" disabled={processing} className="bg-blue-600 hover:bg-blue-700">
                                    <Save className="mr-2 h-4 w-4" />
                                    {processing ? 'Creating Product...' : 'Create Product'}
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
