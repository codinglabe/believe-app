import React, { useState, useEffect } from 'react';
import type { SharedData } from "@/types"
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, ExternalLink, Package, Tag, BarChart3, Calculator, TrendingUp, TrendingDown, Check, X } from 'lucide-react';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
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
];

interface Category {
    id: number;
    name: string;
}

interface Product {
    id: number;
    name: string;
    description: string;
    quantity: number;
    unit_price: number;
    profit_margin_percentage: number;
    admin_owned: boolean;
    owned_by: string;
    organization_id?: number;
    status: string;
    publish_status: string;
    sku: string;
    type: string;
    tags: string;
    image?: string;
    is_printify_product?: boolean;
    printify_product_id?: string;
    printify_blueprint_id?: number;
    printify_provider_id?: number;
    printify_data?: any;
    quantity_available: number;
    quantity_ordered: number;
}

interface PrintifyData {
    id: string;
    title: string;
    description: string;
    tags: string[];
    images: Array<{
        src: string;
        variant_ids: number[];
        position: string;
        is_default: boolean;
    }>;
    variants: Array<{
        id: number;
        title: string;
        enabled: boolean;
        price: number;
        is_available: boolean;
        options: {
            color?: string;
            size?: string;
        };
    }>;
    print_provider_id: number;
    blueprint_id: number;
    created_at: string;
    updated_at: string;
    visible: boolean;
    is_locked: boolean;
}

interface PrintifyProvider {
    id: number;
    title: string;
    location: {
        address1: string;
        address2: string | null;
        city: string;
        country: string;
        region: string;
        zip: string;
    };
    blueprints: Array<{
        id: number;
        title: string;
        brand: string;
        model: string;
        images: string[];
    }>;
}

interface Props {
    product: Product;
    categories: Category[];
    selectedCategories: number[];
    organizations?: { id: number; name: string }[];
    printify_data?: PrintifyData;
     printify_provider?: PrintifyProvider;
}

export default function Edit({ product, categories, selectedCategories, organizations = [], printify_data , printify_provider}: Props) {
    const { auth } = usePage<SharedData>().props
    const [formData, setFormData] = useState({
        quantity: '',
        status: 'active',
        categories: [] as number[],
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [printifyDetails, setPrintifyDetails] = useState<PrintifyData | null>(null);
    const [quantityChange, setQuantityChange] = useState<number>(0);

    useEffect(() => {
        setFormData({
            quantity: product.quantity?.toString() || '',
            status: product.status || 'active',
            categories: selectedCategories || [],
        });

        if (printify_data) {
            setPrintifyDetails(printify_data);
        }
    }, [product, selectedCategories, printify_data]);

    // Calculate quantity change whenever quantity input changes
    useEffect(() => {
        const newQuantity = parseInt(formData.quantity) || 0;
        const change = newQuantity - product.quantity;
        setQuantityChange(change);
    }, [formData.quantity, product.quantity]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        const formDataToSubmit = new FormData();

        formDataToSubmit.append('quantity', String(Number(formData.quantity) || 0));
        formDataToSubmit.append('status', formData.status);

        formData.categories.forEach((categoryId, index) => {
            formDataToSubmit.append(`categories[${index}]`, String(categoryId));
        });

        formDataToSubmit.append("_method", "PUT");

        router.post(route('products.update', product.id), formDataToSubmit, {
            onError: (errors) => {
                setErrors(errors);
                showErrorToast(errors.status_error || errors.quantity_error || 'Failed to update product');
                setIsSubmitting(false);
            },
            onSuccess: () => {
                setIsSubmitting(false);
                showSuccessToast('Product updated successfully');
            }
        });
    };

    const handleChange = (field: string, value: string | number) => {
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

    const handleCategoryChange = (id: number) => {
        setFormData(prev => {
            const exists = prev.categories.includes(id);
            return {
                ...prev,
                categories: exists
                    ? prev.categories.filter(cid => cid !== id)
                    : [...prev.categories, id],
            };
        });
    };

    const canEditStatus = product.status !== 'active';

    // CORRECTED Calculations
    const newQuantity = parseInt(formData.quantity) || 0;
    const projectedQuantityAvailable = product.quantity_available + quantityChange;
    const projectedTotalStock = projectedQuantityAvailable + product.quantity_ordered;
    const isCurrentBalanced = product.quantity === (product.quantity_available + product.quantity_ordered);
    const isProjectedBalanced = projectedTotalStock === newQuantity;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Product" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl py-4 px-4 md:py-6 md:px-10">
                <Card className="px-0">
                    <CardHeader className="px-4 md:px-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
                                <p className="text-muted-foreground">
                                    Update product inventory and categories
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 md:px-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Product Overview */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Package className="h-5 w-5" />
                                        Product Overview
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-sm font-medium text-muted-foreground">Product Name</Label>
                                        <p className="text-lg font-semibold">{product.name}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-sm font-medium text-muted-foreground">SKU</Label>
                                        <p className="text-lg font-semibold">{product.sku}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-sm font-medium text-muted-foreground">Type</Label>
                                        <p className="text-lg font-semibold capitalize">{product.type}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-sm font-medium text-muted-foreground">Unit Price</Label>
                                        <p className="text-lg font-semibold">${product.unit_price} with ({product.profit_margin_percentage} % profit)</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-sm font-medium text-muted-foreground">Current Status</Label>
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                product.status === 'active'
                                                    ? 'bg-green-100 text-green-800'
                                                    : product.status === 'inactive'
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {product.status}
                                            </span>
                                        </div>
                                    </div>
                                    {product.image && (
                                        <div className="space-y-1">
                                            <Label className="text-sm font-medium text-muted-foreground">Product Image</Label>
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                                className="w-16 h-16 object-cover rounded border"
                                            />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {product.printify_product_id && printify_provider && (
                                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
                                            <Package className="h-5 w-5" />
                                            Printify Provider Information
                                        </CardTitle>
                                        <CardDescription className="text-green-700 dark:text-green-300">
                                            Details about the print provider for this product
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Provider Basic Info */}
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium text-green-800 dark:text-green-200">
                                                        Provider Name
                                                    </Label>
                                                    <p className="text-lg font-semibold text-green-900 dark:text-green-100">
                                                        {printify_provider.title}
                                                    </p>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium text-green-800 dark:text-green-200">
                                                        Provider ID
                                                    </Label>
                                                    <p className="text-sm text-green-700 dark:text-green-300">
                                                        #{printify_provider.id}
                                                    </p>
                                                </div>

                                                {/* Service Status */}
                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium text-green-800 dark:text-green-200">
                                                        Service Status
                                                    </Label>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                        <span className="text-sm text-green-700 dark:text-green-300">
                                                            Active
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Available Blueprints */}
                                                {/* {printify_provider.blueprints && printify_provider.blueprints.length > 0 && (
                                                    <div className="space-y-2">
                                                        <Label className="text-sm font-medium text-green-800 dark:text-green-200">
                                                            Available Products
                                                        </Label>
                                                        <div className="space-y-2">
                                                            {printify_provider.blueprints.slice(0, 3).map((blueprint) => (
                                                                <div key={blueprint.id} className="flex items-center gap-2 p-2 bg-green-100 dark:bg-green-800/30 rounded">
                                                                    {blueprint.images && blueprint.images.length > 0 && (
                                                                        <img
                                                                            src={blueprint.images[0]}
                                                                            alt={blueprint.title}
                                                                            className="w-8 h-8 object-cover rounded"
                                                                        />
                                                                    )}
                                                                    <div>
                                                                        <p className="text-sm font-medium text-green-900 dark:text-green-100">
                                                                            {blueprint.title}
                                                                        </p>
                                                                        <p className="text-xs text-green-700 dark:text-green-300">
                                                                            {blueprint.brand} • {blueprint.model}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {printify_provider.blueprints.length > 3 && (
                                                                <p className="text-xs text-green-600 dark:text-green-400 text-center">
                                                                    +{printify_provider.blueprints.length - 3} more products available
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )} */}
                                            </div>

                                            {/* Location Information */}
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium text-green-800 dark:text-green-200">
                                                        Location
                                                    </Label>
                                                    <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                                                        <p>{printify_provider.location.address1}</p>
                                                        {printify_provider.location.address2 && (
                                                            <p>{printify_provider.location.address2}</p>
                                                        )}
                                                        <p>
                                                            {printify_provider.location.city}, {printify_provider.location.region}
                                                        </p>
                                                        <p>
                                                            {printify_provider.location.country} {printify_provider.location.zip}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Supported Products Count */}
                                                {printify_provider.blueprints && (
                                                    <div className="space-y-2">
                                                        <Label className="text-sm font-medium text-green-800 dark:text-green-200">
                                                            Total Products Supported
                                                        </Label>
                                                        <p className="text-sm text-green-700 dark:text-green-300">
                                                            {printify_provider.blueprints.length} products
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Quick Actions */}
                                        {/* <div className="flex gap-3 pt-4 border-t border-green-200 dark:border-green-700">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="text-green-700 border-green-300 hover:bg-green-100 dark:text-green-300 dark:border-green-600 dark:hover:bg-green-800/30"
                                            >
                                                <ExternalLink className="h-4 w-4 mr-2" />
                                                View All Products
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="text-green-700 border-green-300 hover:bg-green-100 dark:text-green-300 dark:border-green-600 dark:hover:bg-green-800/30"
                                            >
                                                <Package className="h-4 w-4 mr-2" />
                                                Provider Details
                                            </Button>
                                        </div> */}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Editable Fields */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <BarChart3 className="h-5 w-5" />
                                        Inventory & Settings
                                    </CardTitle>
                                    <CardDescription>
                                        Update product quantity, status, and categories
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Quantity Section */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="quantity">Total Quantity *</Label>
                                                <Input
                                                    id="quantity"
                                                    type="number"
                                                    min="0"
                                                    value={formData.quantity}
                                                    onChange={(e) => handleChange('quantity', e.target.value)}
                                                    placeholder="Enter total quantity"
                                                    className={errors.quantity ? 'border-red-500' : ''}
                                                />
                                                {errors.quantity && <p className="text-sm text-red-500">{errors.quantity}</p>}

                                                {/* Quantity Change Indicator */}
                                                {quantityChange !== 0 && (
                                                    <div className={`flex items-center gap-1 text-sm ${
                                                        quantityChange > 0
                                                            ? 'text-green-600 dark:text-green-400'
                                                            : 'text-red-600 dark:text-red-400'
                                                    }`}>
                                                        {quantityChange > 0 ? (
                                                            <TrendingUp className="h-4 w-4" />
                                                        ) : (
                                                            <TrendingDown className="h-4 w-4" />
                                                        )}
                                                        <span>
                                                            {quantityChange > 0 ? '+' : ''}{quantityChange} from current
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Current Inventory Summary */}
                                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
                                                <Label className="text-sm font-medium flex items-center gap-2">
                                                    <Calculator className="h-4 w-4" />
                                                    Current Inventory
                                                </Label>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span>Total Quantity:</span>
                                                        <span className="font-medium">{product.quantity}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Available Stock:</span>
                                                        <span className="font-medium">{product.quantity_available}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Ordered Items:</span>
                                                        <span className="font-medium">{product.quantity_ordered}</span>
                                                    </div>
                                                    <div className="flex justify-between border-t pt-2">
                                                        <span>Stock Check:</span>
                                                        <div className={`flex items-center gap-1 ${
                                                            isCurrentBalanced
                                                                ? 'text-green-600 dark:text-green-400'
                                                                : 'text-red-600 dark:text-red-400'
                                                        }`}>
                                                            {isCurrentBalanced ? (
                                                                <Check className="h-4 w-4" />
                                                            ) : (
                                                                <X className="h-4 w-4" />
                                                            )}
                                                            <span className="font-semibold">
                                                                {isCurrentBalanced ? 'Balanced' : 'Imbalanced'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {isCurrentBalanced && (
                                                        <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                                                            ✓ Total ({product.quantity}) = Available ({product.quantity_available}) + Ordered ({product.quantity_ordered})
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Projected Inventory After Update */}
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="status">Product Status *</Label>
                                                <Select
                                                    value={formData.status}
                                                    onValueChange={(value) => handleChange('status', value)}
                                                    disabled={!canEditStatus}
                                                >
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
                                                {!canEditStatus && (
                                                    <p className="text-xs text-amber-600 dark:text-amber-400">
                                                        Cannot change status from active. Please contact administrator.
                                                    </p>
                                                )}
                                            </div>

                                            {/* Projected Inventory Summary */}
                                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg space-y-3">
                                                <Label className="text-sm font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2">
                                                    <Calculator className="h-4 w-4" />
                                                    Projected Inventory After Update
                                                </Label>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-blue-700 dark:text-blue-300">New Total:</span>
                                                        <span className="font-medium text-blue-900 dark:text-blue-100">
                                                            {newQuantity}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-blue-700 dark:text-blue-300">New Available:</span>
                                                        <span className={`font-medium ${
                                                            projectedQuantityAvailable >= 0
                                                                ? 'text-green-600 dark:text-green-400'
                                                                : 'text-red-600 dark:text-red-400'
                                                        }`}>
                                                            {projectedQuantityAvailable}
                                                            {projectedQuantityAvailable < 0 && ' (Invalid)'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-blue-700 dark:text-blue-300">Ordered (unchanged):</span>
                                                        <span className="font-medium text-blue-900 dark:text-blue-100">
                                                            {product.quantity_ordered}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between border-t border-blue-200 dark:border-blue-700 pt-2">
                                                        <span className="text-blue-800 dark:text-blue-200">Projected Check:</span>
                                                        <div className={`flex items-center gap-1 ${
                                                            isProjectedBalanced
                                                                ? 'text-green-600 dark:text-green-400'
                                                                : 'text-red-600 dark:text-red-400'
                                                        }`}>
                                                            {isProjectedBalanced ? (
                                                                <Check className="h-4 w-4" />
                                                            ) : (
                                                                <X className="h-4 w-4" />
                                                            )}
                                                            <span className="font-semibold">
                                                                {isProjectedBalanced ? 'Balanced' : 'Imbalanced'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {isProjectedBalanced && (
                                                        <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                                                            ✓ Total ({newQuantity}) = Available ({projectedQuantityAvailable}) + Ordered ({product.quantity_ordered})
                                                        </div>
                                                    )}
                                                    {!isProjectedBalanced && (
                                                        <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                                                            ✗ Total ({newQuantity}) ≠ Available ({projectedQuantityAvailable}) + Ordered ({product.quantity_ordered})
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                                                <Label className="text-sm font-medium text-blue-800 dark:text-blue-200">Printify Status</Label>
                                                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                                    {product.publish_status}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Categories Section */}
                                    <div className="space-y-4">
                                        <Label className="flex items-center gap-2">
                                            <Tag className="h-4 w-4" />
                                            Product Categories
                                        </Label>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                            {categories.map(category => (
                                                <label key={category.id} className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.categories.includes(category.id)}
                                                        onChange={() => handleCategoryChange(category.id)}
                                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                                    />
                                                    <span className="text-sm">{category.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                        {errors.categories && <p className="text-sm text-red-500">{errors.categories}</p>}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Submit Button */}
                            <div className="flex gap-4">
                                <Button
                                    type="submit"
                                    disabled={isSubmitting || projectedQuantityAvailable < 0}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    <Save className="mr-2 h-4 w-4" />
                                    {isSubmitting ? 'Updating Product...' : 'Update Product'}
                                </Button>
                                <Link href={route('products.index')}>
                                    <Button type="button" variant="outline">
                                        Cancel
                                    </Button>
                                </Link>
                            </div>

                            {/* Validation Warning */}
                            {projectedQuantityAvailable < 0 && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                                    <p className="text-red-800 dark:text-red-200 text-sm">
                                        <strong>Warning:</strong> The new quantity would make available stock negative.
                                        You cannot reduce quantity below the number of ordered items.
                                    </p>
                                </div>
                            )}
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
