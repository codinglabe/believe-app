import { Head, Link, usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
    ArrowLeft,
    User,
    Mail,
    MapPin,
    Phone,
    Calendar,
    ShoppingBag,
    Package,
    DollarSign,
    AlertTriangle,
    CheckCircle,
    XCircle,
    MoreVertical,
    FileText,
    Users,
    Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState } from 'react';

export default function ServiceSellerShow({ seller }) {
    const { props } = usePage();
    const [csrfToken, setCsrfToken] = useState('');
    const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
    const [suspensionReason, setSuspensionReason] = useState('Violation of terms of service');

    // Get CSRF token on component mount
    useEffect(() => {
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (token) {
            setCsrfToken(token);
        }
    }, []);

    const handleSuspend = () => {
        if (!csrfToken) {
            alert('CSRF token not found. Please refresh the page.');
            return;
        }

        if (!suspensionReason.trim()) {
            alert('Please provide a suspension reason.');
            return;
        }

        if (confirm('Are you sure you want to suspend this seller? This will hide all their services from the marketplace.')) {
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = route('admin.service-sellers.suspend', seller.id);
            form.style.display = 'none';

            // Add CSRF token
            const csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = '_token';
            csrfInput.value = csrfToken;

            // Add reason
            const reasonInput = document.createElement('input');
            reasonInput.type = 'hidden';
            reasonInput.name = 'reason';
            reasonInput.value = suspensionReason;

            form.appendChild(csrfInput);
            form.appendChild(reasonInput);
            document.body.appendChild(form);
            form.submit();
        }
    };

    const handleUnsuspend = () => {
        if (!csrfToken) {
            alert('CSRF token not found. Please refresh the page.');
            return;
        }

        if (confirm('Are you sure you want to unsuspend this seller?')) {
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = route('admin.service-sellers.unsuspend', seller.id);
            form.style.display = 'none';

            const csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = '_token';
            csrfInput.value = csrfToken;

            form.appendChild(csrfInput);
            document.body.appendChild(form);
            form.submit();
        }
    };

    return (
        <AdminLayout>
            <Head title={`Seller - ${seller.user.name}`} />

            <div className="space-y-6 p-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button asChild variant="outline" size="sm">
                            <Link href={route('admin.service-sellers.index')}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Sellers
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">{seller.user.name}</h1>
                            <p className="text-muted-foreground">Seller profile details</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {seller.is_suspended ? (
                            <Badge variant="destructive" className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Suspended
                            </Badge>
                        ) : (
                            <Badge variant="success" className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Active
                            </Badge>
                        )}

                        {seller.is_suspended ? (
                            <Button onClick={handleUnsuspend} variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Unsuspend
                            </Button>
                        ) : (
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                                        <AlertTriangle className="h-4 w-4 mr-2" />
                                        Suspend
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Suspend Seller</DialogTitle>
                                        <DialogDescription>
                                            This will suspend the seller and hide all their services from the marketplace.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="reason">Suspension Reason</Label>
                                            <Textarea
                                                id="reason"
                                                placeholder="Provide a clear reason for suspension..."
                                                rows={4}
                                                defaultValue="Violation of terms of service"
                                            />
                                        </div>
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
                                            <div className="font-medium text-amber-800 mb-1">What happens when suspended:</div>
                                            <ul className="text-amber-700 space-y-1">
                                                <li>• All active services will be hidden</li>
                                                <li>• Seller cannot create new services</li>
                                                <li>• No new orders can be placed</li>
                                                <li>• Existing orders will continue normally</li>
                                            </ul>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button
                                            variant="destructive"
                                            onClick={() => {
                                                const reason = document.getElementById('reason').value;
                                                handleSuspend(reason);
                                            }}
                                        >
                                            Confirm Suspension
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Services</p>
                                    <p className="text-2xl font-bold">{seller.stats.total_gigs}</p>
                                </div>
                                <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Active Services</p>
                                    <p className="text-2xl font-bold">{seller.stats.active_gigs}</p>
                                </div>
                                <Package className="h-8 w-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Suspended Services</p>
                                    <p className="text-2xl font-bold">{seller.stats.suspended_gigs}</p>
                                </div>
                                <AlertTriangle className="h-8 w-8 text-amber-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                                    <p className="text-2xl font-bold">{seller.stats.total_orders}</p>
                                </div>
                                <DollarSign className="h-8 w-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="profile">
                    <TabsList>
                        <TabsTrigger value="profile">Profile</TabsTrigger>
                        <TabsTrigger value="services">Services</TabsTrigger>
                        <TabsTrigger value="orders">Recent Orders</TabsTrigger>
                        {seller.is_suspended && (
                            <TabsTrigger value="suspension">Suspension Details</TabsTrigger>
                        )}
                    </TabsList>

                    <TabsContent value="profile" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Seller Information</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">Name:</span>
                                                <span>{seller.user.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">Email:</span>
                                                <span>{seller.user.email}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">Joined:</span>
                                                <span>{new Date(seller.user.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            {seller.phone && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-medium">Phone:</span>
                                                    <span>{seller.phone}</span>
                                                </div>
                                            )}
                                            {seller.location && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-medium">Location:</span>
                                                    <span>{seller.location}</span>
                                                </div>
                                            )}
                                            {seller.state && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-medium">State:</span>
                                                    <span>{seller.state}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {seller.bio && (
                                        <div className="pt-4 border-t">
                                            <h4 className="font-medium mb-2">Bio</h4>
                                            <p className="text-sm text-muted-foreground">{seller.bio}</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="services" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Seller Services</CardTitle>
                                <CardDescription>{seller.gigs.length} services found</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Title</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Price</TableHead>
                                            <TableHead>Orders</TableHead>
                                            <TableHead>Created</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {seller.gigs.map((gig) => (
                                            <TableRow key={gig.id}>
                                                <TableCell className="font-medium">{gig.title}</TableCell>
                                                <TableCell>
                                                    {gig.status === 'active' ? (
                                                        <Badge variant="success">Active</Badge>
                                                    ) : gig.status === 'suspended' ? (
                                                        <Badge variant="destructive">Suspended</Badge>
                                                    ) : (
                                                        <Badge variant="outline">{gig.status}</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>${gig.price}</TableCell>
                                                <TableCell>{gig.orders_count}</TableCell>
                                                <TableCell>{gig.created_at}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button asChild variant="ghost" size="sm">
                                                        <Link href={`/service-hub/${gig.slug}`} target="_blank">
                                                            View
                                                        </Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {seller.gigs.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                                    No services found
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="orders" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Orders</CardTitle>
                                <CardDescription>{seller.recent_orders.length} recent orders</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Order #</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Date</TableHead>
                                            {/* <TableHead className="text-right">Actions</TableHead> */}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {seller.recent_orders.map((order) => (
                                            <TableRow key={order.id}>
                                                <TableCell className="font-medium">{order.order_number}</TableCell>
                                                <TableCell>
                                                    {order.status === 'completed' ? (
                                                        <Badge variant="success">Completed</Badge>
                                                    ) : order.status === 'pending' ? (
                                                        <Badge variant="warning">Pending</Badge>
                                                    ) : (
                                                        <Badge variant="outline">{order.status}</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>${order.amount}</TableCell>
                                                <TableCell>{order.created_at}</TableCell>
                                                {/* <TableCell className="text-right">
                                                    <Button asChild variant="ghost" size="sm">
                                                        <Link href={`/service-hub/orders/${order.id}`} target="_blank">
                                                            View
                                                        </Link>
                                                    </Button>
                                                </TableCell> */}
                                            </TableRow>
                                        ))}
                                        {seller.recent_orders.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                                    No orders found
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {seller.is_suspended && (
                        <TabsContent value="suspension" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Suspension Details</CardTitle>
                                    <CardDescription>Seller suspension information</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                                            <div className="flex items-start gap-3">
                                                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                                                <div>
                                                    <h4 className="font-medium text-red-800">Suspension Active</h4>
                                                    <p className="text-sm text-red-700 mt-1">
                                                        This seller has been suspended and all their services are hidden from the marketplace.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <h4 className="font-medium mb-2">Suspended On</h4>
                                                <p className="text-sm">
                                                    {seller.suspended_at ? new Date(seller.suspended_at).toLocaleString() : 'N/A'}
                                                </p>
                                            </div>

                                            <div>
                                                <h4 className="font-medium mb-2">Suspended By</h4>
                                                <p className="text-sm">
                                                    {seller.suspended_by ? seller.suspended_by.name : 'N/A'}
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-medium mb-2">Suspension Reason</h4>
                                            <div className="bg-white border rounded-lg p-4">
                                                <p className="text-sm">{seller.suspension_reason || 'No reason provided.'}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-medium mb-2">Impact of Suspension</h4>
                                            <ul className="text-sm space-y-1">
                                                <li className="flex items-center gap-2">
                                                    <XCircle className="h-4 w-4 text-red-500" />
                                                    <span>All active services are hidden from marketplace</span>
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <XCircle className="h-4 w-4 text-red-500" />
                                                    <span>Cannot create new services</span>
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <XCircle className="h-4 w-4 text-red-500" />
                                                    <span>No new orders can be placed</span>
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                                    <span>Existing orders continue normally</span>
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                                    <span>Can still access dashboard (in suspended state)</span>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )}
                </Tabs>
            </div>
        </AdminLayout>
    );
}
