import { Link, router } from '@inertiajs/react';
import { PageHead } from '@/components/frontend/PageHead';
import { useState } from 'react';
import FrontendLayout from '@/layouts/frontend/frontend-layout';
import axios from 'axios';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
import { Button } from '@/components/frontend/ui/button';
import { Card, CardContent } from '@/components/frontend/ui/card';
import { Badge } from '@/components/frontend/ui/badge';
import { ChevronLeft, ShoppingCart, Store } from 'lucide-react';

interface ListingPayload {
    id: number;
    custom_price: number;
    supporter_message: string | null;
    is_featured: boolean;
    product: {
        id: number;
        name: string;
        description: string | null;
        category: string | null;
        product_type: string | null;
        images: string[];
    };
    organization: {
        id: number;
        name: string;
        mission: string | null;
        description: string | null;
    };
    merchant: {
        business_name: string | null;
    };
    max_quantity: number | null;
    pickup_offered?: boolean;
    pickup_address_preview?: string | null;
    merchant_pickup_enabled?: boolean;
    listing_pickup_enabled?: boolean;
}

interface PageProps {
    listing: ListingPayload;
}

export default function MarketplacePoolShow({ listing }: PageProps) {
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(false);
    const maxQ = listing.max_quantity;
    const cap = maxQ !== null && maxQ !== undefined ? Math.max(1, maxQ) : 999;

    const priceDisplay = `$${Number(listing.custom_price).toFixed(2)}`;

    const addPayload = () => ({
        organization_product_id: listing.id,
        quantity,
    });

    const handleAddToCart = async () => {
        if (quantity > cap) {
            showErrorToast(maxQ !== null ? `Only ${maxQ} available` : 'Invalid quantity');
            return;
        }
        setLoading(true);
        try {
            const res = await axios.post(route('cart.add'), addPayload());
            if (res.data.success) {
                showSuccessToast(res.data.message || 'Added to cart');
            } else {
                showErrorToast(res.data.message || 'Could not add to cart');
            }
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string; error?: string } } };
            showErrorToast(err.response?.data?.message || err.response?.data?.error || 'Failed to add to cart');
        } finally {
            setLoading(false);
        }
    };

    const handleBuyNow = async () => {
        if (quantity > cap) {
            showErrorToast(maxQ !== null ? `Only ${maxQ} available` : 'Invalid quantity');
            return;
        }
        setLoading(true);
        try {
            const res = await axios.post(route('cart.add'), addPayload());
            if (!res.data.success) {
                showErrorToast(res.data.message || 'Could not add to cart');
                setLoading(false);
                return;
            }
            router.visit(route('checkout.show'));
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string; error?: string } } };
            showErrorToast(err.response?.data?.message || err.response?.data?.error || 'Failed to add to cart');
            setLoading(false);
        }
    };

    const mainImage = listing.product.images[0] || '/placeholder.svg';

    return (
        <FrontendLayout>
            <PageHead
                title={`${listing.product.name} — ${listing.organization.name}`}
                description={listing.product.description || `Sold by ${listing.organization.name} on Believe.`}
            />
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <Link
                        href={route('marketplace.index')}
                        className="inline-flex items-center text-sm text-purple-600 dark:text-purple-400 hover:underline mb-6"
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Back to marketplace
                    </Link>

                    <div className="grid lg:grid-cols-2 gap-10 lg:gap-12">
                        <div>
                            <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
                                <img src={mainImage} alt={listing.product.name} className="w-full aspect-square object-cover" />
                            </div>
                            {listing.product.images.length > 1 && (
                                <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                                    {listing.product.images.map((src, i) => (
                                        <img
                                            key={i}
                                            src={src}
                                            alt=""
                                            className="h-20 w-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600 shrink-0"
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <Badge className="mb-3 bg-emerald-600 hover:bg-emerald-600">Merchant pool</Badge>
                            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                                {listing.product.name}
                            </h1>
                            <p className="text-lg text-purple-600 dark:text-purple-400 font-semibold mb-4">{priceDisplay}</p>

                            {listing.pickup_offered && listing.pickup_address_preview && (
                                <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-gray-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-50">
                                    <p className="font-semibold text-emerald-900 dark:text-emerald-200 mb-1">Local pickup available</p>
                                    <p className="whitespace-pre-line text-gray-700 dark:text-gray-300">{listing.pickup_address_preview}</p>
                                    <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                                        Choose pickup at checkout to pay no shipping (nonprofit location above).
                                    </p>
                                </div>
                            )}
                            {!listing.pickup_offered &&
                                listing.merchant_pickup_enabled &&
                                !listing.listing_pickup_enabled &&
                                ["physical", "service", "media"].includes(String(listing.product.product_type || "")) && (
                                    <p className="text-xs text-muted-foreground mb-4">
                                        The merchant allows pickup on this product, but this nonprofit listing does not offer local pickup yet.
                                    </p>
                                )}

                            <Card className="mb-6 border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20">
                                <CardContent className="p-4">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        Sold by{' '}
                                        <span className="text-emerald-700 dark:text-emerald-400">{listing.organization.name}</span>
                                    </p>
                                    {listing.merchant.business_name && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
                                            <Store className="h-3.5 w-3.5" />
                                            Fulfilled via merchant: {listing.merchant.business_name}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>

                            {listing.supporter_message && (
                                <p className="text-gray-700 dark:text-gray-300 text-sm mb-6 whitespace-pre-wrap">
                                    {listing.supporter_message}
                                </p>
                            )}

                            {listing.product.description && (
                                <div className="prose prose-sm dark:prose-invert max-w-none mb-8 text-gray-600 dark:text-gray-300">
                                    <p className="whitespace-pre-wrap">{listing.product.description}</p>
                                </div>
                            )}

                            <div className="flex items-center gap-4 mb-6">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={cap}
                                    value={quantity}
                                    onChange={(e) => setQuantity(Math.max(1, Math.min(cap, parseInt(e.target.value, 10) || 1)))}
                                    className="w-24 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white"
                                />
                                {maxQ !== null && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{maxQ} in stock (pool)</span>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button
                                    onClick={handleAddToCart}
                                    disabled={loading}
                                    variant="outline"
                                    className="flex-1 h-12 border-purple-600 text-purple-600 hover:bg-purple-50 dark:border-purple-400 dark:text-purple-400"
                                >
                                    <ShoppingCart className="h-4 w-4 mr-2" />
                                    Add to cart
                                </Button>
                                <Button
                                    onClick={handleBuyNow}
                                    disabled={loading}
                                    className="flex-1 h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                                >
                                    Checkout
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </FrontendLayout>
    );
}
