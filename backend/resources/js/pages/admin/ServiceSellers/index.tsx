import { Head, Link, usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Search, UserCheck, UserX, Eye } from 'lucide-react';

export default function ServiceSellersIndex({ sellers, filters }) {
    const { props } = usePage();

    return (
        <AdminLayout>
            <Head title="Service Sellers" />

            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Service Sellers</h1>
                        <p className="text-muted-foreground">Manage seller accounts and suspensions</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>All Sellers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <Input
                                    placeholder="Search sellers..."
                                    defaultValue={filters.search}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const search = e.target.value;
                                            window.location.href = route('admin.service-sellers.index', { search });
                                        }
                                    }}
                                    className="max-w-sm"
                                />
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Seller</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Services</TableHead>
                                        <TableHead>Joined</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sellers.data.map((seller) => (
                                        <TableRow key={seller.id}>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{seller.name}</div>
                                                    <div className="text-sm text-muted-foreground">{seller.email}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {seller.is_suspended ? (
                                                    <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                                        <UserX className="h-3 w-3" />
                                                        Suspended
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="success" className="flex items-center gap-1 w-fit">
                                                        <UserCheck className="h-3 w-3" />
                                                        Active
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    <div>Active: {seller.active_gigs_count}</div>
                                                    <div>Total: {seller.gigs_count}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm text-muted-foreground">
                                                    {seller.joined_date}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem asChild>
                                                            <Link href={route('admin.service-sellers.show', seller.id)}>
                                                                <Eye className="h-4 w-4 mr-2" />
                                                                View Details
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        {!seller.is_suspended ? (
                                                            <DropdownMenuItem asChild>
                                                                <Link
                                                                    href={route('admin.service-sellers.suspend', seller.id)}
                                                                    method="post"
                                                                    data={{
                                                                        reason: 'Violation of terms of service'
                                                                    }}
                                                                    as="button"
                                                                    className="w-full text-left text-red-600"
                                                                >
                                                                    <UserX className="h-4 w-4 mr-2" />
                                                                    Suspend Seller
                                                                </Link>
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem asChild>
                                                                <Link
                                                                    href={route('admin.service-sellers.unsuspend', seller.id)}
                                                                    method="post"
                                                                    as="button"
                                                                    className="w-full text-left text-green-600"
                                                                >
                                                                    <UserCheck className="h-4 w-4 mr-2" />
                                                                    Unsuspend Seller
                                                                </Link>
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
