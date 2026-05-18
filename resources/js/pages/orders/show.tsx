import React, { useState, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import type { PageProps } from '@/types';
import {
    ArrowLeft,
    Package,
    Truck,
    User,
    MapPin,
    Phone,
    Mail,
    DollarSign,
    AlertTriangle,
    RefreshCw,
    XCircle,
    Calculator,
    TrendingUp,
    CreditCard,
    Box,
    ShoppingCart,
    Percent,
    Heart,
    Info,
    FileDown,
    ExternalLink
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
import axios from 'axios';

interface Product {
    id: number;
    name: string;
    description: string;
    image: string;
    printify_product_id: string;
}

interface MerchantHubRevenue {
    line_subtotal: number;
    pct_merchant: number;
    pct_organization: number;
    pct_biu: number;
    amount_merchant: number;
    amount_organization: number;
    amount_biu: number;
    nonprofit_split_enabled: boolean;
    merchant_name: string | null;
    marketplace_product_name: string;
}

interface OrderItem {
    id: number;
    product?: Product;
    name: string;
    description: string;
    image: string;
    printify_product_id: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
    printify_variant_id: string;
    variant_data: any;
    is_manual_product?: boolean;
    marketplace_product_id?: number | null;
    merchant_hub_revenue?: MerchantHubRevenue | null;
}

interface ShippingInfo {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
}

interface PrintifyLineItem {
    id: string;
    quantity: number;
    product_id: string;
    variant_id: number;
    print_provider_id: number;
    shipping_cost: number;
    cost: number;
    status: string;
    metadata: {
        title: string;
        price: number;
        variant_label: string;
        sku: string;
        country: string;
        external_id: string;
    };
    product_image?: string;
}

interface PrintifyDetails {
    id: string;
    status: string;
    total_price: number;
    total_shipping: number;
    total_tax: number;
    shipping_method: number;
    created_at: string;
    line_items: PrintifyLineItem[];
    address_to: any;
    fulfilment_type: string;
}

interface FinancialBreakdown {
    printify_product_cost: number;
    profit_margin_rate: number;
    product_price: number;
    shipping_charged: number;
    sales_tax_rate: number;
    sales_tax_collected: number;
    customer_total_paid: number;
    recognized_revenue: number;
    gross_profit: number;
    platform_payment_fee: number;
    printify_shipping: number;
    printify_tax: number;
}

interface Order {
    id: number;
    reference_number: string;
    subtotal: number;
    platform_fee: number;
    donation_amount: number;
    shipping_cost: number;
    tax_amount: number;
    stripe_fee_amount?: number | null;
    total_amount: number;
    status: string;
    payment_status: string;
    printify_order_id?: string;
    printify_status?: string;
    created_at: string;
    paid_at?: string;
    tracking_number?: string | null;
    tracking_url?: string | null;
    label_url?: string | null;
    shipping_status?: string | null;
    carrier?: string | null;
    can_create_shippo_label?: boolean;
    has_manual_product?: boolean;
    shippo_configured?: boolean;
    user: {
        id: number;
        name: string;
        email: string;
    };
    shipping_info: ShippingInfo | null;
    items: OrderItem[];
    printify_details?: PrintifyDetails | null;
    printify_error?: string;
    financial_breakdown?: FinancialBreakdown;
    merchant_hub_order_summary?: {
        line_subtotal: number;
        organization: number;
        merchant: number;
        biu: number;
    } | null;
    order_split?: {
        merchant_amount: number;
        organization_amount: number;
        biu_amount: number;
    } | null;
}

interface Props extends PageProps {
    order: Order;
    userRole: string;
}

interface ProfitCalculation {
    revenue: {
        subtotal: number;
        platform_fee: number;
        donation: number;
        shipping: number;
        tax: number;
        total: number;
    };
    costs: {
        printify_products: number;
        printify_shipping: number;
        printify_tax: number;
        total: number;
    };
    Profit: {
        platform_fee_Profit: number;
        net_Profit: number;
        margin: number;
    };
}

interface ShippoRate {
    object_id: string;
    provider: string;
    servicelevel: { name?: string };
    amount: string;
    currency: string;
    estimated_days: number | null;
}

export default function Show({ order, userRole }: Props) {
    const page = usePage<{ flash?: { success?: string; error?: string } }>();
    const flash = page.props.flash || {};
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [ProfitCalculation, setProfitCalculation] = useState<ProfitCalculation | null>(null);

    const [shippoModalOpen, setShippoModalOpen] = useState(false);
    const [shippoRates, setShippoRates] = useState<ShippoRate[]>([]);
    const [shippoRatesLoading, setShippoRatesLoading] = useState(false);
    const [shippoPurchaseLoading, setShippoPurchaseLoading] = useState(false);
    const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
    const [shippoError, setShippoError] = useState<string | null>(null);
    const [purchaseResult, setPurchaseResult] = useState<{ label_url: string; tracking_number: string; tracking_url: string | null; carrier: string | null } | null>(null);

    useEffect(() => {
        calculateProfit();
    }, [order]);

    // Flash toasts shown by app-layout; do not duplicate here.

    const calculateProfit = () => {
        // REVENUE BREAKDOWN
        const revenueSubtotal = order.subtotal || 0;
        const revenuePlatformFee = order.platform_fee || 0;
        const revenueDonation = order.donation_amount || 0;
        const revenueShipping = order.shipping_cost || 0;
        const revenueTax = order.tax_amount || 0;
        const revenueTotal = order.total_amount || 0;

        // COSTS - Printify Costs
        const printifyProducts = order.printify_details?.total_price || 0;
        const printifyShipping = order.printify_details?.total_shipping || 0;
        const printifyTax = order.printify_details?.total_tax || 0;
        const totalCosts = printifyProducts + printifyShipping + printifyTax;

        // Profit CALCULATION
        // Platform Fee Profit (100% of platform fee goes to us)
        const platformFeeProfit = revenuePlatformFee;

        // Net Profit (Total Revenue - Total Costs)
        const netProfit = revenueTotal - totalCosts;

        // Profit Margin
        const ProfitMargin = revenueTotal > 0 ? (netProfit / revenueTotal) * 100 : 0;

        const calculation: ProfitCalculation = {
            revenue: {
                subtotal: revenueSubtotal,
                platform_fee: revenuePlatformFee,
                donation: revenueDonation,
                shipping: revenueShipping,
                tax: revenueTax,
                total: revenueTotal
            },
            costs: {
                printify_products: printifyProducts,
                printify_shipping: printifyShipping,
                printify_tax: printifyTax,
                total: totalCosts
            },
            Profit: {
                platform_fee_Profit: platformFeeProfit,
                net_Profit: netProfit,
                margin: ProfitMargin
            }
        };

        setProfitCalculation(calculation);
    };

    const canCancelOrder = () => {
        return order.printify_details &&
               ['on-hold', 'payment-not-received'].includes(order.printify_details.status);
    }

    const handleCancelOrder = async () => {
        setLoading(true);
        router.post(route('orders.cancel', order.id), {}, {
            preserveScroll: true,
            onSuccess: () => {
                setCancelDialogOpen(false);
                router.reload({ only: ['order'] });
            },
            onError: (errors) => {
                console.error('Cancel order errors:', errors);
                showErrorToast(errors.error || 'Failed to cancel order');
            },
            onFinish: () => {
                setLoading(false);
            }
        });
    }

    const getStatusColor = (status: string) => {
        const colors = {
            'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            'processing': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            'on-hold': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
            'shipped': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
            'delivered': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
            'completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            'canceled': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        }
        return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }

    const getStatusText = (status: string) => {
        const texts = {
            'pending': 'Pending',
            'processing': 'Processing',
            'on-hold': 'On Hold',
            'shipped': 'Shipped',
            'delivered': 'Delivered',
            'cancelled': 'Cancelled',
            'completed': 'Completed',
            'canceled': 'Cancelled',
        }
        return texts[status] || status.charAt(0).toUpperCase() + status.slice(1)
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    const getProfitColor = (Profit: number) => {
        if (Profit > 0) return 'text-green-600 dark:text-green-400';
        if (Profit < 0) return 'text-red-600 dark:text-red-400';
        return 'text-gray-600 dark:text-gray-400';
    }

    const openShippoModal = async () => {
        setShippoModalOpen(true);
        setShippoRates([]);
        setSelectedRateId(null);
        setShippoError(null);
        setPurchaseResult(null);
        setShippoRatesLoading(true);
        try {
            const { data } = await axios.get(route('orders.shippo.rates', { order: order.id }), {
                headers: { Accept: 'application/json' },
            });
            setShippoRates(data.rates || []);
            if ((data.rates?.length ?? 0) === 0) {
                setShippoError('No shipping rates available for this address.');
            }
        } catch (err: any) {
            const d = err.response?.data;
            const msg =
                (typeof d?.error === 'string' && d.error) ||
                (typeof d?.message === 'string' && d.message) ||
                'Failed to load shipping rates.';
            setShippoError(msg);
            setShippoRates([]);
        } finally {
            setShippoRatesLoading(false);
        }
    };

    const closeShippoModal = () => {
        setShippoModalOpen(false);
        setShippoRates([]);
        setSelectedRateId(null);
        setShippoError(null);
        setPurchaseResult(null);
        router.reload({ only: ['order'] });
    };

    const purchaseShippoLabel = async () => {
        if (!selectedRateId) return;
        setShippoPurchaseLoading(true);
        setShippoError(null);
        try {
            const { data } = await axios.post(route('orders.shippo.purchase-label', { order: order.id }), {
                rate_object_id: selectedRateId,
            });
            setPurchaseResult({
                label_url: data.label_url || '',
                tracking_number: data.tracking_number || '',
                tracking_url: data.tracking_url || null,
                carrier: data.carrier || null,
            });
            showSuccessToast('Shipping label created successfully.');
        } catch (err: any) {
            const d = err.response?.data;
            const msg =
                (typeof d?.error === 'string' && d.error) ||
                (typeof d?.message === 'string' && d.message) ||
                'Failed to purchase label.';
            setShippoError(msg);
            showErrorToast(msg);
        } finally {
            setShippoPurchaseLoading(false);
        }
    };

    return (
        <AppLayout>
            <Head title={`Order #${order.reference_number}`} />

            <div className="w-full px-4 md:px-10 py-8 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Link
                        href={route('orders.index')}
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Orders
                    </Link>

                    {/* Cancel Order Button */}
                    {canCancelOrder() && (
                        <Button
                            variant="destructive"
                            onClick={() => setCancelDialogOpen(true)}
                            disabled={loading}
                        >
                            <XCircle className="w-4 h-4 mr-2" />
                            {loading ? 'Cancelling...' : 'Cancel Order'}
                        </Button>
                    )}
                </div>

                {/* Shipping (Shippo) - Manual / Bidding products */}
                {(userRole === 'admin' || userRole === 'organization') && order.has_manual_product && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Truck className="w-5 h-5" />
                                Shipping
                            </CardTitle>
                            <CardDescription>
                                {order.tracking_number
                                    ? 'Label created. Download and track below.'
                                    : order.can_create_shippo_label && order.shippo_configured
                                        ? 'Create a shipping label with Shippo.'
                                        : !order.shippo_configured
                                            ? 'Shippo is not configured. Add SHIPPO_API_KEY to enable labels.'
                                            : 'This order does not need a label or already has one.'}
                            </CardDescription>
                            {order.shipping_status && (
                                <p className="text-sm text-muted-foreground mt-2">
                                    Carrier delivery status (from tracking):{' '}
                                    <strong className="text-foreground capitalize">
                                        {order.shipping_status.replace(/_/g, ' ')}
                                    </strong>
                                    . Updates when Shippo receives tracking events (configure webhook).
                                </p>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {order.tracking_number && (
                                <div className="flex flex-wrap gap-4 items-center">
                                    <span className="text-sm">
                                        <strong>Tracking:</strong> {order.tracking_number}
                                        {order.carrier && ` (${order.carrier})`}
                                    </span>
                                    {order.tracking_url && (
                                        <a
                                            href={order.tracking_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                        >
                                            <ExternalLink className="h-4 w-4" /> Track shipment
                                        </a>
                                    )}
                                    {order.label_url && (
                                        <a
                                            href={order.label_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                        >
                                            <FileDown className="h-4 w-4" /> Download label
                                        </a>
                                    )}
                                </div>
                            )}
                            {order.can_create_shippo_label && order.shippo_configured && (
                                <Button onClick={openShippoModal}>
                                    <FileDown className="w-4 h-4 mr-2" />
                                    Create shipping label
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Complete Order Summary - Admin/Organization View */}
                {(userRole === 'admin' || userRole === 'organization') && order.financial_breakdown && (
                    <Card className="overflow-hidden">
                        <CardHeader className="text-white">
                            <CardTitle className="flex items-center gap-2 text-white">
                                <Calculator className="w-6 h-6" />
                                Complete Order Summary
                            </CardTitle>
                            <CardDescription className="text-blue-100">
                                Detailed financial breakdown for admin & organization
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-6">
                                {/* Product Pricing Section */}
                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
                                    <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-4 flex items-center gap-2">
                                        <Package className="w-5 h-5" />
                                        Product Pricing
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-green-200 dark:border-green-800">
                                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Printify Product Cost</div>
                                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                                {formatCurrency(order.financial_breakdown.printify_product_cost)}
                                            </div>
                                        </div>
                                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-green-200 dark:border-green-800">
                                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Profit Margin</div>
                                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                {order.financial_breakdown.profit_margin_rate.toFixed(0)}%
                                            </div>
                                        </div>
                                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-green-200 dark:border-green-800">
                                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Product Price</div>
                                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(order.financial_breakdown.product_price)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Order Totals Section */}
                                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                                    <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-4 flex items-center gap-2">
                                        <ShoppingCart className="w-5 h-5" />
                                        Order Totals
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-blue-200 dark:border-blue-800">
                                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Shipping Charged</div>
                                            <div className="text-xl font-bold text-gray-900 dark:text-white">
                                                {formatCurrency(order.financial_breakdown.shipping_charged)}
                                            </div>
                                        </div>
                                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-blue-200 dark:border-blue-800">
                                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Sales Tax Rate</div>
                                            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                                {order.financial_breakdown.sales_tax_rate.toFixed(2)}%
                                            </div>
                                        </div>
                                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-blue-200 dark:border-blue-800">
                                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Sales Tax Collected</div>
                                            <div className="text-xl font-bold text-gray-900 dark:text-white">
                                                {formatCurrency(order.financial_breakdown.sales_tax_collected)}
                                            </div>
                                        </div>
                                        <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg p-4 shadow-lg border border-blue-700">
                                            <div className="text-sm text-blue-100 mb-1">Customer Total Paid</div>
                                            <div className="text-2xl font-bold text-white">
                                                {formatCurrency(order.financial_breakdown.customer_total_paid)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Revenue & Profit Section */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Recognized Revenue */}
                                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                                        <div className="flex items-center gap-2 mb-3">
                                            <TrendingUp className="w-5 h-5" />
                                            <h3 className="text-lg font-semibold">Recognized Revenue</h3>
                                        </div>
                                        <div className="text-3xl font-bold mb-2">
                                            {formatCurrency(order.financial_breakdown.recognized_revenue)}
                                        </div>
                                        <div className="text-sm text-indigo-100">
                                            Product Price + Shipping
                                        </div>
                                    </div>

                                    {/* Gross Profit */}
                                    <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl p-6 text-white shadow-lg">
                                        <div className="flex items-center gap-2 mb-3">
                                            <DollarSign className="w-5 h-5" />
                                            <h3 className="text-lg font-semibold">Gross Profit</h3>
                                        </div>
                                        <div className="text-3xl font-bold mb-2">
                                            {formatCurrency(order.financial_breakdown.gross_profit)}
                                        </div>
                                        <div className="text-sm text-pink-100">
                                            Revenue - Costs
                                        </div>
                                    </div>

                                    {/* Platform Fee */}
                                    <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                                        <div className="relative z-10">
                                            <div className="flex items-center gap-2 mb-3">
                                                <CreditCard className="w-5 h-5" />
                                                <h3 className="text-lg font-semibold">Platform Fee</h3>
                                            </div>
                                            <div className="text-3xl font-bold mb-2">
                                                {formatCurrency(order.financial_breakdown.platform_payment_fee)}
                                            </div>
                                            <div className="text-xs text-amber-100 bg-amber-600/30 rounded-md px-2 py-1 inline-block mt-2">
                                                Included on the buyer receipt
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Summary Note */}
                                <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg p-4 border-l-4 border-amber-500">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 mt-0.5">
                                            <Info className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                                Platform / Payment Fee
                                            </p>
                                            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                                This is the platform fee charged on the order and it is included in the buyer-facing total.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Order Details */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Package className="w-6 h-6 text-blue-600" />
                                <div>
                                    <CardTitle>Order #{order.id}</CardTitle>
                                    <CardDescription>
                                        Placed on {new Date(order.created_at).toLocaleDateString()}
                                        {order.paid_at && ` • Paid on ${new Date(order.paid_at).toLocaleDateString()}`}
                                    </CardDescription>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge className={getStatusColor(order.status)}>
                                    {getStatusText(order.status)}
                                </Badge>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {formatCurrency(order.total_amount || 0)}
                                    </div>
                                    <div className="text-sm text-gray-500">Total Amount</div>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Customer Info */}
                            <div>
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    Customer Information
                                </h3>
                                <div className="space-y-2">
                                    <p className="font-medium">{order.user.name}</p>
                                    <p className="text-muted-foreground text-sm flex items-center gap-2">
                                        <Mail className="w-4 h-4" />
                                        {order.user.email}
                                    </p>
                                </div>
                            </div>

                            {/* Shipping Address */}
                            {order.shipping_info && (
                                <div>
                                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                        <MapPin className="w-4 h-4" />
                                        Shipping Address
                                    </h3>
                                    <div className="space-y-2">
                                        <p className="font-medium">
                                            {order.shipping_info.first_name} {order.shipping_info.last_name}
                                        </p>
                                        <p>{order.shipping_info.address}</p>
                                        <p>
                                            {order.shipping_info.city}, {order.shipping_info.state} {order.shipping_info.zip}
                                        </p>
                                        <p>{order.shipping_info.country}</p>
                                        {order.shipping_info.phone && (
                                            <p className="text-muted-foreground text-sm flex items-center gap-2">
                                                <Phone className="w-4 h-4" />
                                                {order.shipping_info.phone}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="border-t pt-4">
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <CreditCard className="w-4 h-4" />
                                Buyer payment breakdown
                            </h3>
                            <div className="grid gap-2 text-sm sm:grid-cols-2">
                                <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span className="font-medium">{formatCurrency(order.subtotal || 0)}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">Shipping</span>
                                    <span className="font-medium">{formatCurrency(order.shipping_cost || 0)}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">Platform fee</span>
                                    <span className="font-medium">{formatCurrency(order.platform_fee || 0)}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">Tax</span>
                                    <span className="font-medium">{formatCurrency(order.tax_amount || 0)}</span>
                                </div>
                                {Number(order.stripe_fee_amount) > 0 && (
                                    <div className="flex justify-between gap-4">
                                        <span className="text-muted-foreground">Stripe processing fee</span>
                                        <span className="font-medium">{formatCurrency(Number(order.stripe_fee_amount))}</span>
                                    </div>
                                )}
                                <div className="flex justify-between gap-4 sm:col-span-2 border-t pt-2 mt-1">
                                    <span className="font-semibold">Total charged</span>
                                    <span className="font-bold text-blue-600">{formatCurrency(order.total_amount || 0)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Printify Status */}
                        {order.printify_order_id && (
                            <div className="border-t pt-4">
                                <h3 className="text-sm font-semibold mb-2">Printify Integration</h3>
                                <div className="flex items-center gap-4">
                                    <Badge variant="outline">
                                        Printify ID: {order.printify_order_id}
                                    </Badge>
                                    {order.printify_status && (
                                        <Badge className={getStatusColor(order.printify_status)}>
                                            Printify: {getStatusText(order.printify_status)}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Merchant Hub revenue (org catalog / pool / hub lines) */}
                {(userRole === 'admin' || userRole === 'organization') && order.merchant_hub_order_summary && (
                    <Card className="border-amber-200 dark:border-amber-900/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Percent className="h-5 w-5 text-amber-600" />
                                Merchant product revenue split
                            </CardTitle>
                            <CardDescription>
                                Line totals for items sourced from Merchant Hub listings. Amounts use the nonprofit and merchant percentages the merchant
                                set on the product (they must total 100%). Shipping and tax are not included here. The separate order platform fee is not
                                part of this split.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="rounded-lg border bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                                    <p className="text-muted-foreground text-xs font-medium">Line subtotal (products)</p>
                                    <p className="text-xl font-bold">{formatCurrency(order.merchant_hub_order_summary.line_subtotal)}</p>
                                </div>
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                                    <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200">Your organization</p>
                                    <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
                                        {formatCurrency(order.merchant_hub_order_summary.organization)}
                                    </p>
                                    <p className="text-muted-foreground mt-1 text-xs">Nonprofit share of product total</p>
                                </div>
                                <div className="rounded-lg border border-sky-200 bg-sky-50/80 p-4 dark:border-sky-900 dark:bg-sky-950/30">
                                    <p className="text-xs font-medium text-sky-800 dark:text-sky-200">Merchant</p>
                                    <p className="text-xl font-bold text-sky-900 dark:text-sky-100">
                                        {formatCurrency(order.merchant_hub_order_summary.merchant)}
                                    </p>
                                </div>
                            </div>
                            {order.order_split && (
                                <p className="text-muted-foreground text-xs">
                                    Recorded payout split for this order: merchant {formatCurrency(order.order_split.merchant_amount)}, organization{' '}
                                    {formatCurrency(order.order_split.organization_amount)}
                                    {order.order_split.biu_amount > 0.005
                                        ? `, legacy platform share ${formatCurrency(order.order_split.biu_amount)}`
                                        : ''}
                                    .
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Order Products */}
                <Card>
                    <CardHeader>
                        <CardTitle>Order Products</CardTitle>
                        <CardDescription>
                            {order.items.length} product(s) in this order
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {order.items.map((item) => (
                                <div key={item.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start">
                                    {item.image && (
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="h-16 w-16 shrink-0 rounded-lg border object-cover"
                                        />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <h5 className="font-medium">{item.name}</h5>
                                        <p className="text-sm text-gray-600 line-clamp-2 dark:text-gray-400">{item.description}</p>
                                        {item.variant_data && (
                                            <div className="mt-1">
                                                <span className="text-xs text-gray-500">
                                                    Variant: {JSON.stringify(item.variant_data)}
                                                </span>
                                            </div>
                                        )}
                                        {item.printify_product_id ? (
                                            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                                Printify Product ID: {item.printify_product_id}
                                            </div>
                                        ) : null}
                                        {item.merchant_hub_revenue && (userRole === 'admin' || userRole === 'organization') && (
                                            <div className="mt-3 rounded-lg border border-amber-200/80 bg-amber-50/50 p-3 text-sm dark:border-amber-900/40 dark:bg-amber-950/20">
                                                <p className="mb-2 font-semibold text-amber-900 dark:text-amber-100">
                                                    Merchant listing: {item.merchant_hub_revenue.marketplace_product_name}
                                                    {item.merchant_hub_revenue.merchant_name
                                                        ? ` · ${item.merchant_hub_revenue.merchant_name}`
                                                        : ''}
                                                </p>
                                                <p className="text-muted-foreground mb-2 text-xs">
                                                    {item.merchant_hub_revenue.nonprofit_split_enabled
                                                        ? `Split: ${item.merchant_hub_revenue.pct_merchant}% merchant · ${item.merchant_hub_revenue.pct_organization}% organization`
                                                        : 'No nonprofit pool split on this listing — merchant share is 100% of this line.'}
                                                </p>
                                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                    <div>
                                                        <span className="text-xs text-gray-600 dark:text-gray-400">Organization</span>
                                                        <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                                                            {formatCurrency(item.merchant_hub_revenue.amount_organization)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs text-gray-600 dark:text-gray-400">Merchant</span>
                                                        <p className="font-semibold text-sky-700 dark:text-sky-300">
                                                            {formatCurrency(item.merchant_hub_revenue.amount_merchant)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right sm:shrink-0">
                                        <div className="font-medium">{formatCurrency(item.total_price)}</div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            {item.quantity} × {formatCurrency(item.unit_price)}
                                        </div>
                                        <div className="mt-1 text-xs text-gray-500">Line subtotal</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Printify Order Details */}
                {order.printify_details && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Truck className="w-5 h-5" />
                                Printify Production Details
                            </CardTitle>
                            <CardDescription>
                                Real-time production costs from Printify
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-4 gap-4 mb-6">
                                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {formatCurrency(order.printify_details.total_price)}
                                    </div>
                                    <div className="text-sm text-gray-600">Product Cost</div>
                                </div>
                                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">
                                        {formatCurrency(order.printify_details.total_shipping)}
                                    </div>
                                    <div className="text-sm text-gray-600">Shipping Cost</div>
                                </div>
                                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                    <div className="text-2xl font-bold text-purple-600">
                                        {formatCurrency(order.printify_details.total_tax)}
                                    </div>
                                    <div className="text-sm text-gray-600">Tax</div>
                                </div>
                                <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                    <Badge className={getStatusColor(order.printify_details.status)}>
                                        {getStatusText(order.printify_details.status)}
                                    </Badge>
                                    <div className="text-sm text-gray-600 mt-1">Production Status</div>
                                </div>
                            </div>

                            {/* Printify Line Items */}
                            <h4 className="font-semibold mb-4">Production Items</h4>
                            <div className="space-y-4">
                                {order.printify_details.line_items.map((item, index) => (
                                    <div key={item.id} className="flex items-start gap-4 p-4 border rounded-lg">
                                        {/* Product Image */}
                                        <img
                                            src={item.product_image || '/placeholder.svg'}
                                            alt={item.metadata.title}
                                            className="w-16 h-16 rounded-lg object-cover border"
                                        />

                                        <div className="flex-1">
                                            <h5 className="font-medium">{item.metadata.title}</h5>
                                            <p className="text-sm text-gray-600">{item.metadata.variant_label}</p>
                                            <div className="flex items-center gap-4 mt-2 text-sm">
                                                <span>SKU: {item.metadata.sku}</span>
                                                <span>Quantity: {item.quantity}</span>
                                                <Badge variant="outline" className={getStatusColor(item.status)}>
                                                    {getStatusText(item.status)}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className="font-medium">{formatCurrency(item.cost)}</div>
                                            <div className="text-sm text-gray-600">Unit cost</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Printify Error */}
                {order.printify_error && (
                    <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                                <div>
                                    <h4 className="font-medium text-red-800">Printify API Error</h4>
                                    <p className="text-sm text-red-700">{order.printify_error}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Cancel Order Confirmation Dialog */}
            <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancel Order</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to cancel this order? This action will:
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span>Cancel the order in Printify</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-500" />
                            <span>Process refund via Stripe</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                            <span>This action cannot be undone</span>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                            Keep Order
                        </Button>
                        <Button variant="destructive" onClick={handleCancelOrder} disabled={loading}>
                            {loading ? (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Cancelling...
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Cancel Order & Refund
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Shippo: Create shipping label */}
            <Dialog open={shippoModalOpen} onOpenChange={(open) => !open && closeShippoModal()}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Create shipping label</DialogTitle>
                        <DialogDescription>Order {order.reference_number}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {shippoError && (
                            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">{shippoError}</p>
                        )}
                        {purchaseResult ? (
                            <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
                                <p className="font-medium text-green-600 dark:text-green-400">Label created successfully</p>
                                {purchaseResult.tracking_number && (
                                    <p className="text-sm">Tracking: <strong>{purchaseResult.tracking_number}</strong></p>
                                )}
                                {purchaseResult.carrier && (
                                    <p className="text-sm text-muted-foreground">Carrier: {purchaseResult.carrier}</p>
                                )}
                                <div className="flex gap-2 flex-wrap">
                                    {purchaseResult.label_url && (
                                        <a href={purchaseResult.label_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                                            <FileDown className="h-4 w-4" /> Download label
                                        </a>
                                    )}
                                    {purchaseResult.tracking_url && (
                                        <a href={purchaseResult.tracking_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                                            <ExternalLink className="h-4 w-4" /> Track shipment
                                        </a>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                {shippoRatesLoading ? (
                                    <div className="flex items-center gap-2 py-4 text-muted-foreground">
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                        Loading rates…
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {shippoRates.map((rate) => {
                                            const name = typeof rate.servicelevel === 'object' && rate.servicelevel?.name
                                                ? rate.servicelevel.name
                                                : `${rate.provider} rate`;
                                            const isSelected = selectedRateId === rate.object_id;
                                            return (
                                                <label
                                                    key={rate.object_id}
                                                    className={`flex items-center justify-between gap-4 p-3 rounded-lg border cursor-pointer transition ${isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="shippo_rate"
                                                        checked={isSelected}
                                                        onChange={() => setSelectedRateId(rate.object_id)}
                                                        className="sr-only"
                                                    />
                                                    <div>
                                                        <span className="font-medium">{name}</span>
                                                        {rate.estimated_days != null && (
                                                            <span className="text-muted-foreground text-sm ml-2">{rate.estimated_days} day(s)</span>
                                                        )}
                                                    </div>
                                                    <span className="font-medium">${Number(rate.amount).toFixed(2)} {rate.currency}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                                {shippoRates.length > 0 && (
                                    <DialogFooter>
                                        <Button variant="outline" onClick={closeShippoModal}>Cancel</Button>
                                        <Button onClick={purchaseShippoLabel} disabled={!selectedRateId || shippoPurchaseLoading}>
                                            {shippoPurchaseLoading ? (
                                                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent inline-block mr-2" />Purchasing…</>
                                            ) : (
                                                'Buy label'
                                            )}
                                        </Button>
                                    </DialogFooter>
                                )}
                            </>
                        )}
                    </div>
                    {purchaseResult && (
                        <DialogFooter>
                            <Button onClick={closeShippoModal}>Done</Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
