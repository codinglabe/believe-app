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
    CreditCard
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
    total_amount: string;
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
    // Database amounts
    shipping_cost: number;
    tax_amount: number;
    fee: number;
}

interface Props extends PageProps {
    order: Order;
    userRole: string;
}

interface ProfitCalculation {
    customerPaid: {
        subtotal: number;
        shipping: number;
        tax: number;
        total: number;
    };
    printifyCosts: {
        products: number;
        shipping: number;
        tax: number;
        total: number;
    };
    profit: {
        amount: number;
        margin: number;
    };
    fees: {
        platform: number;
        stripe: number;
    };
}

export default function Show({ order, userRole }: Props) {
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [profitCalculation, setProfitCalculation] = useState<ProfitCalculation | null>(null);

    useEffect(() => {
        calculateProfit();
    }, [order]);

    const calculateProfit = () => {
        if (!order.printify_details) return;

        // Customer Paid Amounts (from your database)
        const customerSubtotal = order.items.reduce((sum, item) => sum + item.total_price, 0);
        const customerShipping = order.shipping_cost || 0;
        const customerTax = order.tax_amount || 0;
        const customerTotal = parseFloat(order.total_amount);

        // Printify Costs
        const printifyProducts = order.printify_details.total_price || 0;
        const printifyShipping = order.printify_details.total_shipping || 0;
        const printifyTax = order.printify_details.total_tax || 0;
        const printifyTotal = printifyProducts + printifyShipping + printifyTax;

        // Fees (without commission)
        const platformFee = order.fee || 0;
        const stripeFee = calculateStripeFee(customerTotal);

        // Profit Calculation (without commission)
        const totalFees = platformFee + stripeFee;
        const profitAmount = customerTotal - printifyTotal - totalFees;

        const calculation: ProfitCalculation = {
            customerPaid: {
                subtotal: customerSubtotal,
                shipping: customerShipping,
                tax: customerTax,
                total: customerTotal
            },
            printifyCosts: {
                products: printifyProducts,
                shipping: printifyShipping,
                tax: printifyTax,
                total: printifyTotal
            },
            profit: {
                amount: profitAmount,
                margin: customerTotal > 0 ? (profitAmount / customerTotal) * 100 : 0
            },
            fees: {
                platform: platformFee,
                stripe: stripeFee
            }
        };

        setProfitCalculation(calculation);
    };

    const calculateStripeFee = (amount: number): number => {
        // Stripe fee calculation (2.9% + $0.30)
        // return (amount * 0.029) + 0.30;
        return 0;
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

    const getProfitColor = (profit: number) => {
        if (profit > 0) return 'text-green-600 dark:text-green-400';
        if (profit < 0) return 'text-red-600 dark:text-red-400';
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

                {/* Profit Calculation Summary */}
                {profitCalculation && (
                    <Card className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border-blue-200 dark:border-blue-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                                <Calculator className="w-5 h-5" />
                                Profit Analysis
                            </CardTitle>
                            <CardDescription>
                                Detailed breakdown of revenue, costs, and profit
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {/* Customer Revenue */}
                                <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border">
                                    <div className="text-lg font-bold text-blue-600">
                                        {formatCurrency(profitCalculation.customerPaid.total)}
                                    </div>
                                    <div className="text-sm text-gray-300">Customer Paid</div>
                                    <div className="text-xs text-gray-400 mt-1 space-y-1">
                                        <div>Sub: {formatCurrency(profitCalculation.customerPaid.subtotal)}</div>
                                        <div>Ship: {formatCurrency(profitCalculation.customerPaid.shipping)}</div>
                                        <div>Tax: {formatCurrency(profitCalculation.customerPaid.tax)}</div>
                                    </div>
                                </div>

                                {/* Printify Costs */}
                                <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border">
                                    <div className="text-lg font-bold text-orange-600">
                                        {formatCurrency(profitCalculation.printifyCosts.total)}
                                    </div>
                                    <div className="text-sm text-gray-300">Printify Costs</div>
                                    <div className="text-xs text-gray-400 mt-1 space-y-1">
                                        <div>Products: {formatCurrency(profitCalculation.printifyCosts.products)}</div>
                                        <div>Shipping: {formatCurrency(profitCalculation.printifyCosts.shipping)}</div>
                                        <div>Tax: {formatCurrency(profitCalculation.printifyCosts.tax)}</div>
                                    </div>
                                </div>

                                {/* Total Fees */}
                                <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border">
                                    <div className="text-lg font-bold text-purple-600">
                                        {formatCurrency(profitCalculation.fees.platform + profitCalculation.fees.stripe)}
                                    </div>
                                    <div className="text-sm text-gray-300">Total Fees</div>
                                    <div className="text-xs text-gray-400 mt-1 space-y-1">
                                        <div>Platform: {formatCurrency(profitCalculation.fees.platform)}</div>
                                        <div>Stripe: {formatCurrency(profitCalculation.fees.stripe)}</div>
                                    </div>
                                </div>

                                {/* Net Profit */}
                                <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border">
                                    <div className={`text-2xl font-bold ${getProfitColor(profitCalculation.profit.amount)}`}>
                                        {formatCurrency(profitCalculation.profit.amount)}
                                    </div>
                                    <div className="text-sm text-gray-300">Net Profit</div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        Margin: {profitCalculation.profit.margin.toFixed(1)}%
                                    </div>
                                </div>
                            </div>

                            {/* Profit Formula */}
                            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <div className="text-sm text-blue-800 dark:text-blue-200 text-center">
                                    <strong>Profit Formula:</strong><br />
                                    Customer Paid ({formatCurrency(profitCalculation.customerPaid.total)}) -
                                    Printify Costs ({formatCurrency(profitCalculation.printifyCosts.total)}) -
                                    Fees ({formatCurrency(profitCalculation.fees.platform + profitCalculation.fees.stripe)}) =
                                    <span className={`font-bold ml-1 ${getProfitColor(profitCalculation.profit.amount)}`}>
                                        {formatCurrency(profitCalculation.profit.amount)}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Order Summary */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Package className="w-6 h-6 text-blue-600" />
                                <div>
                                    <CardTitle>Order #{order.reference_number}</CardTitle>
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
                                        {formatCurrency(parseFloat(order.total_amount))}
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

                {/* Local Database Products */}
                <Card>
                    <CardHeader>
                        <CardTitle>Order Products</CardTitle>
                        <CardDescription>
                            {order.items.length} product(s) from local database
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {order.items.map((item) => (
                                <div key={item.id} className="flex items-start gap-4 p-4 border rounded-lg">
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
                                    </div>
                                    <div className="text-right">
                                        <div className="font-medium">
                                            {formatCurrency(item.total_price)}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            {item.quantity} × {formatCurrency(item.unit_price)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

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
