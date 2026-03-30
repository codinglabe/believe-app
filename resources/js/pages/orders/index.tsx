import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';
import { Plus, Edit, Trash2, LayoutGrid, Search, X, Eye, CreditCard, Package, Truck, FileDown, ExternalLink } from 'lucide-react';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import AppLayout from "@/layouts/app-layout"
import type { BreadcrumbItem } from "@/types"
import { Badge } from '@/components/ui/badge';
import { PermissionButton } from '@/components/ui/permission-guard';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: "Orders",
        href: "/orders",
    },
]

interface ShippoRate {
    object_id: string;
    provider: string;
    servicelevel: { name?: string };
    amount: string;
    currency: string;
    estimated_days: number | null;
    duration_terms?: string;
}

interface Category {
    id: number;
    reference_number: string;
    total_amount: string;
    status: string;
    payment_method?: string | null;
    created_at: string;
    updated_at: string;
    product_type?: string;
    has_manual_product?: boolean;
    is_printify_order?: boolean;
    can_create_shippo_label?: boolean;
    tracking_number?: string | null;
    tracking_url?: string | null;
    label_url?: string | null;
    shipping_status?: string | null;
    carrier?: string | null;
    delivery_status_label?: string | null;
}

interface Props {
    orders: {
        data: Category[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from?: number;
        to?: number;
        prev_page_url: string | null;
        next_page_url: string | null;
    };
    filters: {
        per_page: number;
        page: number;
        search: string;
    };
    allowedPerPage: number[];
}

export default function Index({ orders, filters, allowedPerPage }: Props) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Category | null>(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState(filters.search);
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);

    const [shippoModalOpen, setShippoModalOpen] = useState(false);
    const [shippoOrder, setShippoOrder] = useState<Category | null>(null);
    const [shippoRates, setShippoRates] = useState<ShippoRate[]>([]);
    const [shippoRatesLoading, setShippoRatesLoading] = useState(false);
    const [shippoPurchaseLoading, setShippoPurchaseLoading] = useState(false);
    const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
    const [shippoError, setShippoError] = useState<string | null>(null);
    const [purchaseResult, setPurchaseResult] = useState<{ label_url: string; tracking_number: string; tracking_url: string | null; carrier: string | null } | null>(null);

    const handleDelete = (item: Category) => {
        setItemToDelete(item);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (itemToDelete) {
            router.delete(route('orders.destroy', itemToDelete.id), {
                onError: () => {
                    showErrorToast("Failed to delete category");
                },
            });
            setDeleteDialogOpen(false);
            setItemToDelete(null);
        }
    };

    const handlePerPageChange = (newPerPage: number) => {
        setLoading(true);
        router.get(
            "/orders",
            {
                per_page: newPerPage,
                page: 1,
                search: filters.search,
            },
            {
                preserveState: false,
                onFinish: () => setLoading(false),
            },
        );
    };

    const handlePageChange = (page: number) => {
        if (page < 1 || page > orders.last_page) return;
        setLoading(true);
        router.get(
            "/orders",
            {
                per_page: filters.per_page,
                page: page,
                search: filters.search,
            },
            {
                preserveState: false,
                onFinish: () => setLoading(false),
            },
        );
    };

    const handleSearch = (value: string) => {
        setSearchTerm(value);
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        const timeout = setTimeout(() => {
            setLoading(true);
            router.get(
                "/orders",
                {
                    per_page: filters.per_page,
                    page: 1,
                    search: value,
                },
                {
                    preserveState: false,
                    onFinish: () => setLoading(false),
                },
            );
        }, 500);
        setSearchTimeout(timeout);
    };

    const handleStatusUpdate = async (orderId: number, newStatus: string) => {
        setUpdatingStatus(orderId);
        try {
            const response = await axios.put(route('orders.update', orderId), {
                status: newStatus
            });

            if (response.data.success) {
                showSuccessToast('Order status updated successfully');
                router.reload({ only: ['orders'] });
            } else {
                showErrorToast(response.data.message || 'Failed to update order status');
            }
        } catch (error: any) {
            showErrorToast(error.response?.data?.message || 'Failed to update order status');
        } finally {
            setUpdatingStatus(null);
        }
    };

    const clearSearch = () => {
        setSearchTerm('');
        setLoading(true);
        router.get(
            "/orders",
            {
                per_page: filters.per_page,
                page: 1,
                search: '',
            },
            {
                preserveState: false,
                onFinish: () => setLoading(false),
            },
        );
    };

    const openShippoModal = async (order: Category) => {
        setShippoOrder(order);
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
        setShippoOrder(null);
        setShippoRates([]);
        setSelectedRateId(null);
        setShippoError(null);
        setPurchaseResult(null);
        router.reload({ only: ['orders'] });
    };

    const purchaseShippoLabel = async () => {
        if (!shippoOrder || !selectedRateId) return;
        setShippoPurchaseLoading(true);
        setShippoError(null);
        try {
            const { data } = await axios.post(route('orders.shippo.purchase-label', { order: shippoOrder.id }), {
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
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="orders" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl py-4 px-4 md:py-6 md:px-10">
                <Card className="px-0">
                    <CardHeader className="px-4 md:px-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Orders</CardTitle>
                                <CardDescription>
                                    Manage orders for your organization. Total: {orders.total.toLocaleString()} orders
                                </CardDescription>
                            </div>

                        </div>
                        <div className="flex items-center gap-4 mt-4">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <input
                                    type="text"
                                    placeholder="Search by reference number..."
                                    value={searchTerm}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={clearSearch}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                            {filters.search && (
                                <div className="text-sm text-gray-500">
                                    Searching for: "{filters.search}"
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 md:px-6">
                        {loading && (
                            <div className="flex items-center justify-center py-8">
                                <div className="w-6 h-6 animate-spin mr-2 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                Loading orders...
                            </div>
                        )}
                        <div className="w-full overflow-x-auto">
                            <table className="min-w-full rounded-md border border-muted w-full overflow-x-auto table-responsive text-sm text-left text-foreground">
                                <thead className="bg-muted text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 font-medium min-w-32">Reference Number</th>
                                        <th className="px-4 py-3 font-medium min-w-32">Amount</th>
                                        <th className="px-4 py-3 font-medium min-w-32">Product Type</th>
                                        <th className="px-4 py-3 font-medium min-w-32">Status</th>
                                        <th className="px-4 py-3 font-medium min-w-32">Payment Method</th>
                                        <th className="px-4 py-3 font-medium min-w-32">Date</th>
                                        <th className="px-4 py-3 font-medium min-w-28 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.data.map((item) => (
                                        <tr key={item.id} className="border-t border-muted hover:bg-muted/50 transition">
                                            <td className="px-4 py-3 min-w-32">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{item.reference_number}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 min-w-64">
                                                <span className="truncate block max-w-md" title={item.total_amount}>
                                                    ${item.total_amount}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 min-w-32">
                                                <Badge
                                                    variant={item.product_type === 'Printify' ? 'default' : 'outline'}
                                                    className={`font-medium ${
                                                        item.product_type === 'Printify'
                                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border-blue-300 dark:border-blue-700'
                                                            : item.product_type === 'Manual'
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 border-green-300 dark:border-green-700'
                                                            : 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 border-purple-300 dark:border-purple-700'
                                                    }`}
                                                >
                                                    <Package className="h-3 w-3 mr-1 inline" />
                                                    {item.product_type || 'N/A'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 min-w-32">
                                                {item.has_manual_product && !item.is_printify_order && item.status !== 'cancelled' && item.status !== 'refunded' ? (
                                                    <Select
                                                        value={item.status}
                                                        onValueChange={(value) => handleStatusUpdate(item.id, value)}
                                                        disabled={updatingStatus === item.id}
                                                    >
                                                        <SelectTrigger className="w-full h-8 text-sm">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="processing">Processing</SelectItem>
                                                            <SelectItem value="shipped">Shipped</SelectItem>
                                                            <SelectItem value="delivered">Delivered</SelectItem>
                                                            <SelectItem value="cancelled">Cancelled</SelectItem>
                                                            <SelectItem value="refunded">Refunded</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <Badge
                                                        variant="secondary"
                                                        className={`font-medium ${
                                                            item.status === 'cancelled' || item.status === 'refunded'
                                                                ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border-red-300 dark:border-red-700'
                                                                : ''
                                                        }`}
                                                    >
                                                        {item.status}
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 min-w-36 text-sm">
                                                {item.delivery_status_label ? (
                                                    <span className="text-foreground" title={item.shipping_status || ''}>
                                                        {item.delivery_status_label}
                                                    </span>
                                                ) : item.tracking_number ? (
                                                    <span className="text-muted-foreground">Tracking active</span>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 min-w-32">
                                                {item.payment_method ? (
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            item.payment_method === 'stripe'
                                                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border-blue-300 dark:border-blue-700'
                                                                : item.payment_method === 'believe_points'
                                                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 border-purple-300 dark:border-purple-700'
                                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                        }
                                                    >
                                                        <CreditCard className="h-3 w-3 mr-1" />
                                                        {item.payment_method === 'stripe' ? 'Card/Stripe' : item.payment_method === 'believe_points' ? 'Believe Points' : item.payment_method}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">N/A</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 min-w-64">
                                                <span className="truncate block max-w-md" title={item.created_at}>
                                                    {new Date(item.created_at).toLocaleDateString()}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3 min-w-28 text-right w-[1%] whitespace-nowrap">
                                                <div className="flex justify-end gap-2 flex-wrap">
                                                    {item.tracking_number && (
                                                        <a
                                                            href={item.tracking_url || '#'}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                                        >
                                                            <Truck className="h-4 w-4" />
                                                            Track
                                                        </a>
                                                    )}
                                                    {item.can_create_shippo_label && (
                                                        <PermissionButton permission="ecommerce.update">
                                                            <Button variant="secondary" size="sm" onClick={() => openShippoModal(item)}>
                                                                <FileDown className="mr-2 h-4 w-4" />
                                                                Create label
                                                            </Button>
                                                        </PermissionButton>
                                                    )}
                                                    <PermissionButton permission="ecommerce.read">
                                                        <Link href={route('orders.show', item.id)}>
                                                            <Button variant="outline" size="sm">
                                                                <Eye className="mr-2 h-4 w-4" />
                                                                View
                                                            </Button>
                                                        </Link>
                                                    </PermissionButton>
                                                    {/* <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDelete(item)}
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </Button> */}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {orders.data.length === 0 && (
                                <div className="text-center py-12">
                                    <LayoutGrid className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-foreground mb-2">No orders found</h3>

                                </div>
                            )}
                            {/* Pagination Controls */}
                            {orders.total > 0 && (
                                <div className="flex items-center justify-between mt-6 px-4 mb-6 text-sm text-muted-foreground flex-wrap gap-4">
                                    <div>
                                        Showing {orders.from?.toLocaleString() || 0} to {orders.to?.toLocaleString() || 0} of{" "}
                                        {orders.total.toLocaleString()} category(ies).
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {/* Per Page Selector */}
                                        <div className="flex items-center gap-2">
                                            <label className="text-sm text-muted-foreground">Per page:</label>
                                            <select
                                                className="border rounded px-2 py-1 text-sm bg-background"
                                                value={filters.per_page}
                                                onChange={(e) => handlePerPageChange(Number.parseInt(e.target.value))}
                                                disabled={loading}
                                            >
                                                {allowedPerPage.map((num) => (
                                                    <option key={num} value={num}>
                                                        {num}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        {/* Pagination Buttons */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-muted transition"
                                                onClick={() => handlePageChange(orders.current_page - 1)}
                                                disabled={!orders.prev_page_url || loading}
                                            >
                                                Prev
                                            </button>
                                            <span className="px-2">
                                                Page {orders.current_page} of {orders.last_page}
                                            </span>
                                            <button
                                                className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-muted transition"
                                                onClick={() => handlePageChange(orders.current_page + 1)}
                                                disabled={!orders.next_page_url || loading}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
                {/* Delete Confirmation Dialog */}
                {/* <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Confirm Delete</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete category "{itemToDelete?.name}"? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={confirmDelete}>
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                                </Dialog> */}

                {/* Shippo: Create shipping label */}
                <Dialog open={shippoModalOpen} onOpenChange={(open) => !open && closeShippoModal()}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Create shipping label</DialogTitle>
                            <DialogDescription>
                                {shippoOrder && (
                                    <>Order <strong>{shippoOrder.reference_number}</strong></>
                                )}
                            </DialogDescription>
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
                                            <a
                                                href={purchaseResult.label_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                            >
                                                <FileDown className="h-4 w-4" /> Download label
                                            </a>
                                        )}
                                        {purchaseResult.tracking_url && (
                                            <a
                                                href={purchaseResult.tracking_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                            >
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
                                        <>
                                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {shippoRates.map((rate) => {
                                                const name = typeof rate.servicelevel === 'object' && rate.servicelevel?.name
                                                    ? rate.servicelevel.name
                                                    : `${rate.provider} rate`;
                                                const isSelected = selectedRateId === rate.object_id;
                                                return (
                                                    <label
                                                        key={rate.object_id}
                                                        className={`flex items-center justify-between gap-4 p-3 rounded-lg border cursor-pointer transition ${
                                                            isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                                                        }`}
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
                                                                <span className="text-muted-foreground text-sm ml-2">
                                                                    {rate.estimated_days} day(s)
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="font-medium">
                                                            ${Number(rate.amount).toFixed(2)} {rate.currency}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                        {shippoRates.length > 0 && (
                                            <DialogFooter>
                                                <Button variant="outline" onClick={closeShippoModal}>
                                                    Cancel
                                                </Button>
                                                <Button
                                                    onClick={purchaseShippoLabel}
                                                    disabled={!selectedRateId || shippoPurchaseLoading}
                                                >
                                                    {shippoPurchaseLoading ? (
                                                        <>
                                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent inline-block mr-2" />
                                                            Purchasing…
                                                        </>
                                                    ) : (
                                                        'Buy label'
                                                    )}
                                                </Button>
                                            </DialogFooter>
                                        )}
                                            </>
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
            </div>
        </AppLayout>
    );
}
