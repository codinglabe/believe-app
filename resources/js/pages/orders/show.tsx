import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
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
    Heart
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { showSuccessToast, showErrorToast } from '@/lib/toast';

interface Product {
    id: number;
    name: string;
    description: string;
    image: string;
    printify_product_id: string;
}

interface OrderItem {
    id: number;
    product: Product;
    name: string;
    description: string;
    image: string;
    printify_product_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    printify_variant_id: string;
    variant_data: any;
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

interface Order {
    id: number;
    reference_number: string;
    subtotal: number;
    platform_fee: number;
    donation_amount: number;
    shipping_cost: number;
    tax_amount: number;
    total_amount: number;
    status: string;
    payment_status: string;
    printify_order_id?: string;
    printify_status?: string;
    created_at: string;
    paid_at?: string;
    user: {
        id: number;
        name: string;
        email: string;
    };
    shipping_info: ShippingInfo | null;
    items: OrderItem[];
    printify_details?: PrintifyDetails | null;
    printify_error?: string;
}

interface Props extends PageProps {
    order: Order;
    userRole: string;
}

interface DonationCalculation {
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
    Donation: {
        platform_fee_Donation: number;
        net_Donation: number;
        margin: number;
    };
}

export default function Show({ order, userRole }: Props) {
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [DonationCalculation, setDonationCalculation] = useState<DonationCalculation | null>(null);

    useEffect(() => {
        calculateDonation();
    }, [order]);

    const calculateDonation = () => {
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

        // Donation CALCULATION
        // Platform Fee Donation (100% of platform fee goes to us)
        const platformFeeDonation = revenuePlatformFee;

        // Net Donation (Total Revenue - Total Costs)
        const netDonation = revenueTotal - totalCosts;

        // Donation Margin
        const DonationMargin = revenueTotal > 0 ? (netDonation / revenueTotal) * 100 : 0;

        const calculation: DonationCalculation = {
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
            Donation: {
                platform_fee_Donation: platformFeeDonation,
                net_Donation: netDonation,
                margin: DonationMargin
            }
        };

        setDonationCalculation(calculation);
    };

    const canCancelOrder = () => {
        return order.printify_details &&
               ['on-hold', 'payment-not-received'].includes(order.printify_details.status);
    }

    const handleCancelOrder = async () => {
        setLoading(true);
        try {
            const response = await router.post(route('orders.cancel', order.id));

            if (response.data.success) {
                showSuccessToast(response.data.message || 'Order cancelled successfully');
                router.reload();
            } else {
                showErrorToast(response.data.error || 'Failed to cancel order');
            }
        } catch (error: any) {
            showErrorToast(error.response?.data?.error || 'Failed to cancel order');
        } finally {
            setLoading(false);
            setCancelDialogOpen(false);
        }
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

    const getDonationColor = (Donation: number) => {
        if (Donation > 0) return 'text-green-600 dark:text-green-400';
        if (Donation < 0) return 'text-red-600 dark:text-red-400';
        return 'text-gray-600 dark:text-gray-400';
    }

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

                {/* Complete Order Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5" />
                            Complete Order Summary
                        </CardTitle>
                        <CardDescription>
                            Detailed breakdown of order revenue and costs
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Revenue Breakdown */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-green-600 flex items-center gap-2">
                                    <DollarSign className="w-5 h-5" />
                                    Revenue Breakdown
                                </h3>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center py-2 border-b">
                                        <span className="text-gray-600">Products Subtotal</span>
                                        <span className="font-medium">{formatCurrency(order.subtotal || 0)}</span>
                                    </div>

                                    <div className="flex justify-between items-center py-2 border-b">
                                        <span className="text-gray-600 flex items-center gap-2">
                                            <Percent className="w-4 h-4" />
                                            Platform Fee
                                        </span>
                                        <span className="font-medium text-blue-600">
                                            +{formatCurrency(order.platform_fee || 0)}
                                        </span>
                                    </div>

                                    {order.donation_amount > 0 && (
                                        <div className="flex justify-between items-center py-2 border-b">
                                            <span className="text-gray-600 flex items-center gap-2">
                                                <Heart className="w-4 h-4 text-red-500" />
                                                Donation
                                            </span>
                                            <span className="font-medium text-red-600">
                                                +{formatCurrency(order.donation_amount || 0)}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center py-2 border-b">
                                        <span className="text-gray-600">Shipping</span>
                                        <span className="font-medium">
                                            +{formatCurrency(order.shipping_cost || 0)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center py-2 border-b">
                                        <span className="text-gray-600">Tax</span>
                                        <span className="font-medium">
                                            +{formatCurrency(order.tax_amount || 0)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center pt-3 border-t-2 border-green-200">
                                        <span className="text-lg font-bold text-green-600">Total Revenue</span>
                                        <span className="text-xl font-bold text-green-600">
                                            {formatCurrency(order.total_amount || 0)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Donation Calculation */}
                            {DonationCalculation && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-blue-600 flex items-center gap-2">
                                        <Calculator className="w-5 h-5" />
                                        Donation Calculation
                                    </h3>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center py-2 border-b">
                                            <span className="text-gray-600">Platform Fee Donation</span>
                                            <span className="font-medium text-green-600">
                                                +{formatCurrency(DonationCalculation.Donation.platform_fee_Donation)}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center py-2 border-b">
                                            <span className="text-gray-600">Supporter Donation</span>
                                            <span className="font-medium text-green-600">
                                                +{formatCurrency(DonationCalculation.revenue.donation)}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center py-2 border-b">
                                            <span className="text-gray-600">Printify Product Costs</span>
                                            <span className="font-medium text-orange-600">
                                                -{formatCurrency(DonationCalculation.costs.printify_products)}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center py-2 border-b">
                                            <span className="text-gray-600">Printify Shipping</span>
                                            <span className="font-medium text-orange-600">
                                                -{formatCurrency(DonationCalculation.costs.printify_shipping)}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center py-2 border-b">
                                            <span className="text-gray-600">Printify Tax</span>
                                            <span className="font-medium text-orange-600">
                                                -{formatCurrency(DonationCalculation.costs.printify_tax)}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center pt-3 border-t-2 border-blue-200">
                                            <span className="text-lg font-bold text-blue-600">Net Donation & Platform Fee</span>
                                            <span className={`text-xl font-bold ${getDonationColor(DonationCalculation.Donation.net_Donation)}`}>
                                                {formatCurrency(DonationCalculation.Donation.net_Donation)}
                                            </span>
                                        </div>

                                        <div className="text-center pt-2">
                                            <Badge variant="outline" className={getDonationColor(DonationCalculation.Donation.net_Donation)}>
                                                Donation Margin: {DonationCalculation.Donation.margin.toFixed(1)}%
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Simple Donation Formula */}
                        {DonationCalculation && (
                            <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl border border-green-200">
                                <div className="text-center">
                                    <div className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3">
                                        Donation Formula
                                    </div>
                                    <div className="text-lg text-blue-800 dark:text-blue-200 font-semibold space-y-2">
                                        <div>
                                            <span className="text-green-600">Total Revenue ({formatCurrency(DonationCalculation.revenue.total)})</span>
                                            <span className="mx-4">-</span>
                                            <span className="text-orange-600">Total Costs ({formatCurrency(DonationCalculation.costs.total)})</span>
                                        </div>
                                        <div className="text-xl">
                                            <span className="mx-4">=</span>
                                            <span className={`${getDonationColor(DonationCalculation.Donation.net_Donation)}`}>
                                                Net Donation & Platform Fee: {formatCurrency(DonationCalculation.Donation.net_Donation)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

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
                                <div key={item.id} className="flex items-start gap-4 p-4 border rounded-lg">
                                    {item.image && (
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-16 h-16 rounded-lg object-cover border"
                                        />
                                    )}
                                    <div className="flex-1">
                                        <h5 className="font-medium">{item.name}</h5>
                                        <p className="text-sm text-gray-600 line-clamp-2">
                                            {item.description}
                                        </p>
                                        {item.variant_data && (
                                            <div className="mt-1">
                                                <span className="text-xs text-gray-500">
                                                    Variant: {JSON.stringify(item.variant_data)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="mt-2 text-sm text-gray-600">
                                            Printify Product ID: {item.printify_product_id}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-medium">
                                            {formatCurrency(item.total_price)}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            {item.quantity} × {formatCurrency(item.unit_price)}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            Unit Price
                                        </div>
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
        </AppLayout>
    );
}
