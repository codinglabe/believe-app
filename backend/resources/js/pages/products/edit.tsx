import React, { useState, useEffect, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Package, Tag, BarChart3, MapPin, Settings2 } from 'lucide-react';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Products', href: '/products' },
    { title: 'Edit', href: '/products/edit' },
];

interface Category {
    id: number;
    name: string;
}

interface MerchantShipFromOption {
    id: number;
    label: string;
    address_preview: {
        name: string;
        street1: string;
        street2?: string;
        city: string;
        state: string;
        zip: string;
        country: string;
    };
}

interface Product {
    id: number;
    name: string;
    description: string;
    quantity: number;
    unit_price: number;
    profit_margin_percentage: number;
    owned_by: string;
    organization_id?: number | null;
    status: string;
    publish_status: string;
    sku: string;
    type: string;
    tags: string | null;
    image?: string | null;
    printify_product_id?: string | null;
    quantity_available: number;
    quantity_ordered: number;
    shipping_charge?: number | string | null;
    pricing_model?: string | null;
    starting_bid?: number | string | null;
    reserve_price?: number | string | null;
    buy_now_price?: number | string | null;
    bid_increment?: number | string | null;
    auction_start?: string | null;
    auction_end?: string | null;
    auto_extend?: boolean;
    blind_bid_type?: string | null;
    min_bid?: number | string | null;
    bid_deadline?: string | null;
    offer_to_next_if_unpaid?: boolean;
    ship_from_merchant_id?: number | null;
    ship_from_name?: string | null;
    ship_from_street1?: string | null;
    ship_from_city?: string | null;
    ship_from_state?: string | null;
    ship_from_zip?: string | null;
    ship_from_country?: string | null;
    parcel_length_in?: number | string | null;
    parcel_width_in?: number | string | null;
    parcel_height_in?: number | string | null;
    parcel_weight_oz?: number | string | null;
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
}

function isPrintifyProvider(v: unknown): v is PrintifyProvider {
    return (
        v !== null &&
        typeof v === 'object' &&
        !Array.isArray(v) &&
        'title' in v &&
        typeof (v as PrintifyProvider).title === 'string' &&
        'location' in v &&
        typeof (v as PrintifyProvider).location === 'object' &&
        (v as PrintifyProvider).location !== null
    );
}

interface Props {
    product: Product;
    categories: Category[];
    selectedCategories: number[];
    merchants_for_ship_from?: MerchantShipFromOption[];
    is_printify_product?: boolean;
    printify_provider?: PrintifyProvider | unknown[];
}

function numStr(v: unknown): string {
    if (v === null || v === undefined || v === '') return '';
    return String(v);
}

export default function Edit({
    product,
    categories,
    selectedCategories,
    merchants_for_ship_from = [],
    is_printify_product = false,
    printify_provider,
}: Props) {
    const isPrintify = Boolean(is_printify_product || product.printify_product_id);
    const isManualPhysical = !isPrintify && product.type === 'physical';
    const printifyProviderResolved = isPrintifyProvider(printify_provider) ? printify_provider : null;

    const [formData, setFormData] = useState({
        quantity: '',
        status: 'active',
        categories: [] as number[],
        ship_from_mode: 'custom' as 'custom' | 'merchant',
        ship_from_merchant_id: '' as string | number,
        ship_from_name: '',
        ship_from_street1: '',
        ship_from_city: '',
        ship_from_state: '',
        ship_from_zip: '',
        ship_from_country: 'US',
        parcel_length_in: '',
        parcel_width_in: '',
        parcel_height_in: '',
        parcel_weight_oz: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [quantityChange, setQuantityChange] = useState(0);

    const selectedMerchantShipFrom = useMemo(() => {
        if (!formData.ship_from_merchant_id) return null;
        const id = Number(formData.ship_from_merchant_id);
        return merchants_for_ship_from.find((m) => m.id === id) ?? null;
    }, [formData.ship_from_merchant_id, merchants_for_ship_from]);

    useEffect(() => {
        setFormData({
            quantity: product.quantity?.toString() || '',
            status: product.status || 'active',
            categories: selectedCategories || [],
            ship_from_mode: product.ship_from_merchant_id ? 'merchant' : 'custom',
            ship_from_merchant_id: product.ship_from_merchant_id ? product.ship_from_merchant_id : '',
            ship_from_name: product.ship_from_name || '',
            ship_from_street1: product.ship_from_street1 || '',
            ship_from_city: product.ship_from_city || '',
            ship_from_state: product.ship_from_state || '',
            ship_from_zip: product.ship_from_zip || '',
            ship_from_country: (product.ship_from_country || 'US').toString().slice(0, 2).toUpperCase(),
            parcel_length_in: numStr(product.parcel_length_in),
            parcel_width_in: numStr(product.parcel_width_in),
            parcel_height_in: numStr(product.parcel_height_in),
            parcel_weight_oz: numStr(product.parcel_weight_oz),
        });
    }, [product, selectedCategories]);

    useEffect(() => {
        if (merchants_for_ship_from.length === 0 && formData.ship_from_mode === 'merchant') {
            setFormData((prev) => ({ ...prev, ship_from_mode: 'custom' }));
        }
    }, [merchants_for_ship_from.length, formData.ship_from_mode]);

    useEffect(() => {
        const newQ = parseInt(formData.quantity, 10) || 0;
        setQuantityChange(newQ - product.quantity);
    }, [formData.quantity, product.quantity]);

    const canEditStatus = product.status !== 'active';
    const newQuantity = parseInt(formData.quantity, 10) || 0;
    const projectedQuantityAvailable = product.quantity_available + quantityChange;
    const projectedTotalStock = projectedQuantityAvailable + product.quantity_ordered;
    const isCurrentBalanced = product.quantity === product.quantity_available + product.quantity_ordered;
    const isProjectedBalanced = projectedTotalStock === newQuantity;

    const pricingLabel =
        product.pricing_model === 'auction'
            ? 'Auction'
            : product.pricing_model === 'blind_bid'
              ? 'Blind bid'
              : product.pricing_model === 'offer'
                ? 'Offers'
                : 'Fixed price';

    const handleChange = (field: string, value: string | number) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => {
                const n = { ...prev };
                delete n[field];
                return n;
            });
        }
    };

    const handleCategoryChange = (id: number) => {
        setFormData((prev) => {
            const exists = prev.categories.includes(id);
            return {
                ...prev,
                categories: exists ? prev.categories.filter((cid) => cid !== id) : [...prev.categories, id],
            };
        });
        setErrors((prev) => {
            if (!prev.categories) return prev;
            const n = { ...prev };
            delete n.categories;
            return n;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        if (!formData.categories?.length) {
            setErrors({ categories: 'Select at least one product category.' });
            showErrorToast('Select at least one product category.');
            setIsSubmitting(false);
            return;
        }

        if (isManualPhysical) {
            const hasMerchants = merchants_for_ship_from.length > 0;
            const effectiveMode = hasMerchants ? formData.ship_from_mode : 'custom';
            if (effectiveMode === 'merchant') {
                if (!formData.ship_from_merchant_id) {
                    setErrors({ ship_from_merchant_id: 'Select a merchant warehouse for ship-from.' });
                    showErrorToast('Select a merchant for the Shippo ship-from address.');
                    setIsSubmitting(false);
                    return;
                }
            } else {
                if (
                    !formData.ship_from_name?.trim() ||
                    !formData.ship_from_street1?.trim() ||
                    !formData.ship_from_city?.trim() ||
                    !formData.ship_from_state?.trim() ||
                    !formData.ship_from_zip?.trim() ||
                    !formData.ship_from_country?.trim()
                ) {
                    setErrors({ ship_from_street1: 'Fill in the complete ship-from address.' });
                    showErrorToast('Enter the full ship-from address for Shippo.');
                    setIsSubmitting(false);
                    return;
                }
            }
        }

        const fd = new FormData();
        fd.append('quantity', String(parseInt(formData.quantity, 10) || 0));
        fd.append('status', formData.status);
        formData.categories.forEach((id, index) => {
            fd.append(`categories[${index}]`, String(id));
        });

        if (isManualPhysical) {
            const hasMerchants = merchants_for_ship_from.length > 0;
            const effectiveMode = hasMerchants ? formData.ship_from_mode : 'custom';
            fd.append('ship_from_mode', effectiveMode);
            if (effectiveMode === 'merchant' && formData.ship_from_merchant_id) {
                fd.append('ship_from_merchant_id', String(formData.ship_from_merchant_id));
            } else {
                fd.append('ship_from_name', formData.ship_from_name.trim());
                fd.append('ship_from_street1', formData.ship_from_street1.trim());
                fd.append('ship_from_city', formData.ship_from_city.trim());
                fd.append('ship_from_state', formData.ship_from_state.trim());
                fd.append('ship_from_zip', formData.ship_from_zip.trim());
                fd.append(
                    'ship_from_country',
                    (formData.ship_from_country || 'US').toUpperCase().slice(0, 2)
                );
            }
            if (formData.parcel_length_in) fd.append('parcel_length_in', formData.parcel_length_in);
            if (formData.parcel_width_in) fd.append('parcel_width_in', formData.parcel_width_in);
            if (formData.parcel_height_in) fd.append('parcel_height_in', formData.parcel_height_in);
            if (formData.parcel_weight_oz) fd.append('parcel_weight_oz', formData.parcel_weight_oz);
        }

        fd.append('_method', 'PUT');

        router.post(route('products.update', product.id), fd, {
            onError: (errs) => {
                setErrors(errs as Record<string, string>);
                showErrorToast(
                    (errs as Record<string, string>).status_error ||
                        (errs as Record<string, string>).quantity_error ||
                        'Failed to update product'
                );
                setIsSubmitting(false);
            },
            onSuccess: () => {
                setIsSubmitting(false);
                showSuccessToast('Product updated successfully');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit — ${product.name}`} />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl px-4 py-4 md:px-10 md:py-6">
                <Card className="px-0">
                    <CardHeader className="px-4 md:px-6">
                        <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
                        <p className="text-muted-foreground">
                            Basic details and pricing are shown for reference only. You can update ship-from (manual
                            physical), quantity, status, and categories.
                        </p>
                    </CardHeader>
                    <CardContent className="px-4 md:px-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Package className="h-5 w-5" />
                                        Basic information
                                    </CardTitle>
                                    <CardDescription>View only — not editable on this page.</CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <p className="text-muted-foreground text-sm">Name</p>
                                        <p className="font-semibold">{product.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-sm">SKU</p>
                                        <p className="font-semibold">{product.sku}</p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <p className="text-muted-foreground text-sm">Description</p>
                                        <p className="text-sm whitespace-pre-wrap">{product.description}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-sm">Type</p>
                                        <p className="font-semibold capitalize">{product.type}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-sm">Tags</p>
                                        <p className="text-sm">{product.tags || '—'}</p>
                                    </div>
                                    {product.image && (
                                        <div className="md:col-span-2">
                                            <p className="text-muted-foreground text-sm">Image</p>
                                            <img
                                                src={product.image}
                                                alt=""
                                                className="mt-2 h-24 w-24 rounded-md border object-cover"
                                            />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {!isPrintify && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Settings2 className="h-5 w-5" />
                                            Pricing model
                                        </CardTitle>
                                        <CardDescription>View only — not editable on this page.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4 text-sm">
                                        <p>
                                            <span className="text-muted-foreground">Model:</span>{' '}
                                            <span className="font-medium">{pricingLabel}</span>
                                        </p>
                                        {(product.pricing_model === 'fixed' || !product.pricing_model) && (
                                            <div className="grid gap-2 md:grid-cols-2">
                                                <p>
                                                    <span className="text-muted-foreground">Unit price:</span> $
                                                    {numStr(product.unit_price)}
                                                </p>
                                                {product.type === 'physical' ? (
                                                    <p>
                                                        <span className="text-muted-foreground">Shipping:</span>{' '}
                                                        <span className="font-medium">Calculated at checkout (Shippo)</span>
                                                    </p>
                                                ) : (
                                                    <p>
                                                        <span className="text-muted-foreground">Shipping:</span> N/A
                                                        (digital)
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        {product.pricing_model === 'auction' && (
                                            <div className="grid gap-2 md:grid-cols-2">
                                                <p>Starting bid: ${numStr(product.starting_bid)}</p>
                                                <p>Reserve: ${numStr(product.reserve_price)}</p>
                                                <p>Buy now: ${numStr(product.buy_now_price)}</p>
                                                <p>Bid increment: ${numStr(product.bid_increment)}</p>
                                                <p className="md:col-span-2">
                                                    {product.auction_start && (
                                                        <span>Start: {String(product.auction_start)} </span>
                                                    )}
                                                    {product.auction_end && (
                                                        <span>End: {String(product.auction_end)}</span>
                                                    )}
                                                </p>
                                                <p>Auto-extend: {product.auto_extend ? 'Yes' : 'No'}</p>
                                            </div>
                                        )}
                                        {product.pricing_model === 'blind_bid' && (
                                            <div className="grid gap-2 md:grid-cols-2">
                                                <p>Type: {product.blind_bid_type || '—'}</p>
                                                <p>Min bid: ${numStr(product.min_bid)}</p>
                                                <p>Deadline: {product.bid_deadline ? String(product.bid_deadline) : '—'}</p>
                                                <p>Offer to next if unpaid: {product.offer_to_next_if_unpaid ? 'Yes' : 'No'}</p>
                                            </div>
                                        )}
                                        <p className="text-muted-foreground">
                                            Profit margin: {product.profit_margin_percentage ?? '—'}%
                                        </p>
                                    </CardContent>
                                </Card>
                            )}

                            {isPrintify && printifyProviderResolved && (
                                <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
                                    <CardHeader>
                                        <CardTitle className="text-green-900 dark:text-green-100">Printify</CardTitle>
                                        <CardDescription>
                                            Variant pricing is managed in Printify. Update quantity, status, and
                                            categories here.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="text-sm text-green-800 dark:text-green-200">
                                        <p className="font-semibold">{printifyProviderResolved.title}</p>
                                        <p>
                                            {printifyProviderResolved.location.city},{' '}
                                            {printifyProviderResolved.location.region}
                                        </p>
                                    </CardContent>
                                </Card>
                            )}

                            {isManualPhysical && (
                                <Card className="border-sky-200 dark:border-sky-800">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <MapPin className="h-5 w-5" />
                                            Ship from (Shippo)
                                        </CardTitle>
                                        <CardDescription>
                                            Editable. Customer checkout address is the ship-to address.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex flex-wrap gap-3">
                                            {merchants_for_ship_from.length > 0 && (
                                                <label
                                                    className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-4 py-2 ${
                                                        formData.ship_from_mode === 'merchant'
                                                            ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40'
                                                            : 'border-gray-200'
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        className="sr-only"
                                                        checked={formData.ship_from_mode === 'merchant'}
                                                        onChange={() => handleChange('ship_from_mode', 'merchant')}
                                                    />
                                                    Merchant warehouse
                                                </label>
                                            )}
                                            <label
                                                className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-4 py-2 ${
                                                    formData.ship_from_mode === 'custom'
                                                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40'
                                                        : 'border-gray-200'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    className="sr-only"
                                                    checked={formData.ship_from_mode === 'custom'}
                                                    onChange={() => handleChange('ship_from_mode', 'custom')}
                                                />
                                                Custom address
                                            </label>
                                        </div>
                                        {merchants_for_ship_from.length > 0 &&
                                            formData.ship_from_mode === 'merchant' && (
                                                <div className="space-y-2">
                                                    <Label>Merchant *</Label>
                                                    <Select
                                                        value={
                                                            formData.ship_from_merchant_id
                                                                ? String(formData.ship_from_merchant_id)
                                                                : ''
                                                        }
                                                        onValueChange={(v) =>
                                                            handleChange('ship_from_merchant_id', v ? Number(v) : '')
                                                        }
                                                    >
                                                        <SelectTrigger
                                                            className={
                                                                errors.ship_from_merchant_id ? 'border-red-500' : ''
                                                            }
                                                        >
                                                            <SelectValue placeholder="Select merchant" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {merchants_for_ship_from.map((m) => (
                                                                <SelectItem key={m.id} value={String(m.id)}>
                                                                    {m.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {errors.ship_from_merchant_id && (
                                                        <p className="text-sm text-red-500">
                                                            {errors.ship_from_merchant_id}
                                                        </p>
                                                    )}
                                                    {selectedMerchantShipFrom && (
                                                        <div className="rounded-md border bg-sky-50 p-3 text-sm dark:bg-sky-950/30">
                                                            <p className="font-medium">
                                                                {selectedMerchantShipFrom.address_preview.name}
                                                            </p>
                                                            <p>{selectedMerchantShipFrom.address_preview.street1}</p>
                                                            <p>
                                                                {selectedMerchantShipFrom.address_preview.city},{' '}
                                                                {selectedMerchantShipFrom.address_preview.state}{' '}
                                                                {selectedMerchantShipFrom.address_preview.zip}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        {formData.ship_from_mode === 'custom' && (
                                            <div className="grid gap-3 md:grid-cols-2">
                                                <Input
                                                    placeholder="Contact / business name *"
                                                    value={formData.ship_from_name}
                                                    onChange={(e) => handleChange('ship_from_name', e.target.value)}
                                                />
                                                <Input
                                                    placeholder="Street *"
                                                    className="md:col-span-2"
                                                    value={formData.ship_from_street1}
                                                    onChange={(e) =>
                                                        handleChange('ship_from_street1', e.target.value)
                                                    }
                                                />
                                                <Input
                                                    placeholder="City *"
                                                    value={formData.ship_from_city}
                                                    onChange={(e) => handleChange('ship_from_city', e.target.value)}
                                                />
                                                <Input
                                                    placeholder="State *"
                                                    value={formData.ship_from_state}
                                                    onChange={(e) => handleChange('ship_from_state', e.target.value)}
                                                />
                                                <Input
                                                    placeholder="ZIP *"
                                                    value={formData.ship_from_zip}
                                                    onChange={(e) => handleChange('ship_from_zip', e.target.value)}
                                                />
                                                <Input
                                                    placeholder="Country ISO2 *"
                                                    maxLength={2}
                                                    value={formData.ship_from_country}
                                                    onChange={(e) =>
                                                        handleChange(
                                                            'ship_from_country',
                                                            e.target.value.toUpperCase().slice(0, 2)
                                                        )
                                                    }
                                                />
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-muted-foreground mb-2 text-xs">
                                                Parcel optional (inches / oz)
                                            </p>
                                            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                                                <Input
                                                    placeholder="L"
                                                    value={formData.parcel_length_in}
                                                    onChange={(e) =>
                                                        handleChange('parcel_length_in', e.target.value)
                                                    }
                                                />
                                                <Input
                                                    placeholder="W"
                                                    value={formData.parcel_width_in}
                                                    onChange={(e) => handleChange('parcel_width_in', e.target.value)}
                                                />
                                                <Input
                                                    placeholder="H"
                                                    value={formData.parcel_height_in}
                                                    onChange={(e) =>
                                                        handleChange('parcel_height_in', e.target.value)
                                                    }
                                                />
                                                <Input
                                                    placeholder="Wt oz"
                                                    value={formData.parcel_weight_oz}
                                                    onChange={(e) =>
                                                        handleChange('parcel_weight_oz', e.target.value)
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <BarChart3 className="h-5 w-5" />
                                        Inventory, status & categories
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label>Total quantity *</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={formData.quantity}
                                                onChange={(e) => handleChange('quantity', e.target.value)}
                                                className={errors.quantity ? 'border-red-500' : ''}
                                            />
                                            {errors.quantity && (
                                                <p className="text-sm text-red-500">{errors.quantity}</p>
                                            )}
                                            {quantityChange !== 0 && (
                                                <p
                                                    className={
                                                        quantityChange > 0 ? 'text-sm text-green-600' : 'text-sm text-red-600'
                                                    }
                                                >
                                                    {quantityChange > 0 ? '+' : ''}
                                                    {quantityChange} from saved total
                                                </p>
                                            )}
                                            <div className="bg-muted/50 space-y-1 rounded-md p-3 text-sm">
                                                <div className="flex justify-between">
                                                    <span>Available</span>
                                                    <span className="font-medium">{product.quantity_available}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Ordered</span>
                                                    <span className="font-medium">{product.quantity_ordered}</span>
                                                </div>
                                                <div className="flex justify-between border-t pt-1">
                                                    <span>Balanced</span>
                                                    <span>{isCurrentBalanced ? 'Yes' : 'No'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Status *</Label>
                                            <Select
                                                value={formData.status}
                                                onValueChange={(v) => handleChange('status', v)}
                                                disabled={!canEditStatus}
                                            >
                                                <SelectTrigger className={errors.status ? 'border-red-500' : ''}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="active">Active</SelectItem>
                                                    <SelectItem value="inactive">Inactive</SelectItem>
                                                    <SelectItem value="archived">Archived</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {errors.status && <p className="text-sm text-red-500">{errors.status}</p>}
                                            {!canEditStatus && (
                                                <p className="text-amber-600 text-xs">
                                                    Cannot change status from active here.
                                                </p>
                                            )}
                                            <div className="bg-muted/50 rounded-md p-3 text-sm">
                                                <p>
                                                    Projected available:{' '}
                                                    <strong
                                                        className={
                                                            projectedQuantityAvailable < 0 ? 'text-red-600' : ''
                                                        }
                                                    >
                                                        {projectedQuantityAvailable}
                                                    </strong>
                                                </p>
                                                <p>Balanced after save: {isProjectedBalanced ? 'Yes' : 'No'}</p>
                                            </div>
                                            {isPrintify && (
                                                <p className="text-muted-foreground text-xs">
                                                    Printify: {product.publish_status}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <Tag className="h-4 w-4" />
                                            Categories *
                                        </Label>
                                        <div
                                            className={`grid grid-cols-2 gap-2 rounded-lg border-2 p-3 md:grid-cols-3 lg:grid-cols-4 ${
                                                errors.categories ? 'border-red-500' : 'border-transparent'
                                            }`}
                                        >
                                            {categories.map((c) => (
                                                <label
                                                    key={c.id}
                                                    className="flex cursor-pointer items-center gap-2 rounded border p-2 text-sm hover:bg-muted/50"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.categories.includes(c.id)}
                                                        onChange={() => handleCategoryChange(c.id)}
                                                        className="rounded border-gray-300"
                                                    />
                                                    {c.name}
                                                </label>
                                            ))}
                                        </div>
                                        {errors.categories && (
                                            <p className="text-sm text-red-500">{errors.categories}</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex flex-wrap gap-4">
                                <Button
                                    type="submit"
                                    disabled={isSubmitting || projectedQuantityAvailable < 0}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    <Save className="mr-2 h-4 w-4" />
                                    {isSubmitting ? 'Saving…' : 'Save changes'}
                                </Button>
                                <Link href={route('products.index')}>
                                    <Button type="button" variant="outline">
                                        Cancel
                                    </Button>
                                </Link>
                            </div>

                            {projectedQuantityAvailable < 0 && (
                                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                                    Quantity cannot go below ordered units.
                                </div>
                            )}
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
