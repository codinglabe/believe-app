import React, { useState } from 'react';
import type { SharedData } from "@/types"
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TextArea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';
import { showErrorToast } from '@/lib/toast';
import AppLayout from "@/layouts/app-layout"
import type { BreadcrumbItem } from "@/types"

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

interface Props {
    categories: Category[];
    organizations?: { id: number; name: string }[];
}

export default function Create({ categories, organizations = [] }: Props) {

    const { auth } = usePage<SharedData>().props

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        quantity: '',
        unit_price: '',
        admin_owned: 'no',
        owned_by: 'admin',
        organization_id: '',
        status: 'active',
        sku: '',
        type: 'physical',
        tags: '',
        categories: [] as number[],
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        const submitData: Record<string, any> = { ...formData };
        submitData.categories = formData.categories;
        // Convert booleans and numbers
        submitData.admin_owned = formData.admin_owned === 'yes';
        submitData.quantity = formData.quantity ? Number(formData.quantity) : 0;
        submitData.unit_price = formData.unit_price ? Number(formData.unit_price) : 0;
        if (!submitData.organization_id) delete submitData.organization_id;

        router.post(route('products.store'), submitData, {
            onError: (errors) => {
                setErrors(errors);
                showErrorToast('Failed to create product');
                setIsSubmitting(false);
            },
            onSuccess: () => {
                setIsSubmitting(false);
            }
        });
    };


    const handleChange = (field: string, value: string | number | boolean) => {
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
                                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
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
                                {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
                            </div>
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
                            <div className="space-y-2">
                                <Label htmlFor="quantity">Quantity</Label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    min="0"
                                    value={formData.quantity}
                                    onChange={(e) => handleChange('quantity', e.target.value)}
                                    placeholder="Enter quantity"
                                    className={errors.quantity ? 'border-red-500' : ''}
                                />
                                {errors.quantity && <p className="text-sm text-red-500">{errors.quantity}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="unit_price">Unit Price</Label>
                                <Input
                                    id="unit_price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.unit_price}
                                    onChange={(e) => handleChange('unit_price', e.target.value)}
                                    placeholder="Enter unit price"
                                    className={errors.unit_price ? 'border-red-500' : ''}
                                />
                                {errors.unit_price && <p className="text-sm text-red-500">{errors.unit_price}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sku">SKU</Label>
                                <Input
                                    id="sku"
                                    type="text"
                                    value={formData.sku}
                                    onChange={(e) => handleChange('sku', e.target.value)}
                                    placeholder="Enter SKU"
                                    className={errors.sku ? 'border-red-500' : ''}
                                />
                                {errors.sku && <p className="text-sm text-red-500">{errors.sku}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="type">Type</Label>
                                <Select value={formData.type} onValueChange={(value) => handleChange('type', value)}>
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
                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
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
                                    {/* <div className="space-y-2">
                                        <Label htmlFor="admin_owned">Admin Owned</Label>
                                        <Select value={formData.admin_owned} onValueChange={(value) => handleChange('admin_owned', value)}>
                                            <SelectTrigger className={errors.admin_owned ? 'border-red-500' : ''}>
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="yes">Yes</SelectItem>
                                                <SelectItem value="no">No</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.admin_owned && <p className="text-sm text-red-500">{errors.admin_owned}</p>}
                                    </div> */}
                                    <div className="space-y-2">
                                        <Label htmlFor="owned_by">Owned By</Label>
                                        <Select value={formData.owned_by} onValueChange={(value) => handleChange('owned_by', value)}>
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
                                    {formData.owned_by === 'organization' && (
                                        <div className="space-y-2">
                                            <Label htmlFor="organization_id">Organization</Label>
                                            {organizations.length > 0 ? (
                                                <Select value={formData.organization_id} onValueChange={(value) => handleChange('organization_id', value)}>
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
                                                    value={formData.organization_id}
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
                                        <label key={category.id} className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={formData.categories.includes(category.id)}
                                                onChange={() => handleCategoryChange(category.id)}
                                            />
                                            {category.name}
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
                                    value={formData.tags}
                                    onChange={(e) => handleChange('tags', e.target.value)}
                                    placeholder="Comma separated tags"
                                    className={errors.tags ? 'border-red-500' : ''}
                                />
                                {errors.tags && <p className="text-sm text-red-500">{errors.tags}</p>}
                            </div>
                            <div className="flex gap-4">
                                <Button type="submit" disabled={isSubmitting}>
                                    <Save className="mr-2 h-4 w-4" />
                                    {isSubmitting ? 'Creating...' : 'Create Product'}
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
