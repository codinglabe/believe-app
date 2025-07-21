import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import type { PageProps } from '@/types';
import { ArrowLeft, Package } from 'lucide-react';

interface Product {
    id: number;
    name: string;
    pivot: {
        quantity: number;
        price: string;
    };
}

interface OrderProduct {
    id: number;
    product: Product;
    quantity: number;
    price: string;
}

interface ShippingInfo {
    address: string;
    city: string;
    postal_code: string;
    country: string;
}

interface User {
    id: number;
    name: string;
    email: string;
}

interface Order {
    id: number;
    reference_number: string;
    total_amount: string;
    status: string;
    created_at: string;
    user: User;
    order_shipping_info: ShippingInfo;
    order_product: {
        product: Product;
        quantity: number;
        unit_price: number;
    }[];
}

interface Props extends PageProps {
    order: Order;
}

export default function Show({ order }: Props) {
    return (
        <AppLayout>
            <Head title={`Order #${order.reference_number}`} />

            <div className="w-full px-4 md:px-10 py-8 space-y-6">
                <Link
                    href={route('orders.index')}
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Orders
                </Link>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            Order #{order.reference_number}
                        </CardTitle>
                        <CardDescription>
                            Placed on {new Date(order.created_at).toLocaleDateString()}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-sm font-semibold mb-2">Customer Info</h3>
                                <p>{order.user.name}</p>
                                <p className="text-muted-foreground text-sm">{order.user.email}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold mb-2">Shipping Address</h3>
                                <p>{order.order_shipping_info.address}</p>
                                <p>{order.order_shipping_info.city}, {order.order_shipping_info.postal_code}</p>
                                <p>{order.order_shipping_info.country}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div>
                                <span className="text-sm font-medium">Total:</span> {order.total_amount}
                            </div>
                            <Badge variant="secondary" className="capitalize">
                                {order.status}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Products</CardTitle>
                        <CardDescription>{order.order_product.length} product(s)</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left border">
                            <thead className="bg-muted text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-2 border-b">Product Name</th>
                                    <th className="px-4 py-2 border-b">Quantity</th>
                                    <th className="px-4 py-2 border-b">Unit Price</th>
                                    <th className="px-4 py-2 border-b">Total Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.order_product.map((item, index) => (
                                    <tr key={index} className="border-t">
                                        <td className="px-4 py-2">{item.product.name}</td>
                                        <td className="px-4 py-2">{item.quantity}</td>
                                        <td className="px-4 py-2">${item.unit_price}</td>
                                        <td className="px-4 py-2">${(item.unit_price*item.quantity)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
