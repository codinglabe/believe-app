import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import {
    Badge
} from '@/components/ui/badge';
import {
    Button
} from '@/components/ui/button';
import {
    Switch
} from '@/components/frontend/ui/switch';
import {
    Checkbox
} from '@/components/ui/checkbox';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import {
    LayoutGrid,
    Search,
    X,
    Users,
    Bell,
    BellOff,
    UserX,
    Mail,
    Calendar,
    Filter,
    MoreVertical,
    Check,
    ChevronDown,
    Building
} from 'lucide-react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Organization', href: '/organization' },
    { title: 'Followers', href: '/organization/followers' },
];

interface Follower {
    id: number;
    user_id: number;
    organization_id: number;
    notifications: boolean;
    created_at: string;
    updated_at: string;
    user: {
        id: number;
        name: string;
        email: string;
        image?: string;
        created_at: string;
        role: string;
    };
}

interface Props {
    followers: {
        data: Follower[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from?: number;
        to?: number;
        prev_page_url: string | null;
        next_page_url: string | null;
    };
    organization: {
        id: number;
        name: string;
        ein: string;
    };
    filters: {
        per_page: number;
        page: number;
        search: string;
    };
    allowedPerPage: number[];
}

export default function Index({ followers, organization, filters, allowedPerPage }: Props) {
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState(filters.search);
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
    const [removingId, setRemovingId] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [selectAll, setSelectAll] = useState(false);

    const handlePerPageChange = (newPerPage: number) => {
        setLoading(true);
        router.get(
            "/organization/followers",
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
        if (page < 1 || page > followers.last_page) return;
        setLoading(true);
        router.get(
            "/organization/followers",
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
                "/organization/followers",
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

    const clearSearch = () => {
        setSearchTerm('');
        setLoading(true);
        router.get(
            "/organization/followers",
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

    const toggleNotifications = async (followerId: number, currentStatus: boolean) => {
        try {
            const response = await fetch(`/organization/followers/${followerId}/toggle-notifications`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });

            const data = await response.json();

            if (data.success) {
                toast.success(data.message);
                router.reload({ only: ['followers'] });
            }
        } catch (error) {
            toast.error('Failed to update notifications');
        }
    };

    const removeFollower = async (followerId: number) => {
        setRemovingId(followerId);
        try {
            const response = await fetch(`/organization/followers/${followerId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });

            const data = await response.json();

            if (data.success) {
                toast.success(data.message);
                setSelectedIds(selectedIds.filter(id => id !== followerId));
                router.reload({ only: ['followers'] });
            }
        } catch (error) {
            toast.error('Failed to remove follower');
        } finally {
            setRemovingId(null);
        }
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedIds([]);
        } else {
            setSelectedIds(followers.data.map(f => f.id));
        }
        setSelectAll(!selectAll);
    };

    const handleSelect = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(fid => fid !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const bulkToggleNotifications = async (status: boolean) => {
        if (selectedIds.length === 0) {
            toast.error('Please select at least one follower');
            return;
        }

        try {
            const response = await fetch('/organization/followers/bulk-toggle-notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    ids: selectedIds,
                    status: status
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success(data.message);
                setSelectedIds([]);
                setSelectAll(false);
                router.reload({ only: ['followers'] });
            }
        } catch (error) {
            toast.error('Failed to update notifications');
        }
    };

    const bulkRemoveFollowers = async () => {
        if (selectedIds.length === 0) {
            toast.error('Please select at least one follower');
            return;
        }

        if (!confirm(`Are you sure you want to remove ${selectedIds.length} followers?`)) {
            return;
        }

        try {
            const response = await fetch('/organization/followers/bulk-destroy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ ids: selectedIds }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success(data.message);
                setSelectedIds([]);
                setSelectAll(false);
                router.reload({ only: ['followers'] });
            }
        } catch (error) {
            toast.error('Failed to remove followers');
        }
    };

    const getTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    const getUserRoleBadge = (role: string) => {
        const roleConfig: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" }> = {
            'admin': { label: 'Admin', variant: 'destructive' },
            'organization': { label: 'Organization', variant: 'default' },
            'user': { label: 'User', variant: 'secondary' },
            'volunteer': { label: 'Volunteer', variant: 'outline' },
        };

        const config = roleConfig[role] || { label: role, variant: 'outline' };

        return (
            <Badge variant={config.variant} className="text-xs">
                {config.label}
            </Badge>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Followers" />
            <div className="flex flex-1 flex-col gap-4 rounded-xl py-4 px-4 md:py-6 md:px-10">
                <Card className="px-0 border-border/50 bg-card/50 backdrop-blur-sm shadow-lg">
                    <CardHeader className="px-4 md:px-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <Building className="h-6 w-6 text-primary" />
                                    <CardTitle className="text-2xl font-bold">
                                        {organization.name}
                                    </CardTitle>
                                </div>
                                <CardDescription className="mt-1">
                                    Manage your organization's followers. EIN: {organization.ein}
                                </CardDescription>
                            </div>

                            <div className="flex items-center gap-4">
                                <Badge variant="outline" className="gap-2">
                                    <Users className="h-3 w-3" />
                                    {followers.total} Followers
                                </Badge>
                                <Badge variant="secondary" className="gap-2">
                                    <Bell className="h-3 w-3" />
                                    {followers.data.filter(f => f.notifications).length} Active Notifications
                                </Badge>
                            </div>
                        </div>

                        {/* Bulk Actions Bar */}
                        {selectedIds.length > 0 && (
                            <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Check className="h-5 w-5 text-primary" />
                                        <span className="font-medium">
                                            {selectedIds.length} follower{selectedIds.length > 1 ? 's' : ''} selected
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => bulkToggleNotifications(true)}
                                            className="gap-2"
                                        >
                                            <Bell className="h-4 w-4" />
                                            Enable Notifications
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => bulkToggleNotifications(false)}
                                            className="gap-2"
                                        >
                                            <BellOff className="h-4 w-4" />
                                            Disable Notifications
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={bulkRemoveFollowers}
                                            className="gap-2"
                                        >
                                            <UserX className="h-4 w-4" />
                                            Remove Selected
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedIds([]);
                                                setSelectAll(false);
                                            }}
                                        >
                                            Clear
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-4 mt-6 flex-wrap">
                            <div className="relative flex-1 max-w-lg">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                <input
                                    type="text"
                                    placeholder="Search followers by name or email..."
                                    value={searchTerm}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2.5 border border-input bg-background rounded-lg
                                             focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
                                             transition-all duration-200"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={clearSearch}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2
                                                 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2">
                                        <Filter className="h-4 w-4" />
                                        Filter
                                        <ChevronDown className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem>
                                        All Followers ({followers.total})
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        Notifications On ({followers.data.filter(f => f.notifications).length})
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        Notifications Off ({followers.data.filter(f => !f.notifications).length})
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {filters.search && (
                            <div className="text-sm text-muted-foreground mt-3">
                                Searching for: <span className="font-medium text-foreground">"{filters.search}"</span>
                            </div>
                        )}
                    </CardHeader>

                    <CardContent className="px-4 md:px-6">
                        <div className="flex flex-col gap-6">
                            {/* Desktop/Tablet View */}
                            <div className="hidden md:block rounded-lg border border-border overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-muted/50 border-b border-border">
                                            <tr>
                                                <th className="px-6 py-4 text-left font-semibold text-muted-foreground w-12">
                                                    <Checkbox
                                                        checked={selectAll}
                                                        onCheckedChange={handleSelectAll}
                                                        className="border-muted-foreground/50"
                                                    />
                                                </th>
                                                <th className="px-6 py-4 text-left font-semibold text-muted-foreground min-w-56">
                                                    Follower
                                                </th>
                                                <th className="px-6 py-4 text-left font-semibold text-muted-foreground min-w-40">
                                                    Contact & Role
                                                </th>
                                                <th className="px-6 py-4 text-left font-semibold text-muted-foreground min-w-36">
                                                    Following Since
                                                </th>
                                                <th className="px-6 py-4 text-left font-semibold text-muted-foreground min-w-40">
                                                    Notifications
                                                </th>
                                                <th className="px-6 py-4 text-left font-semibold text-muted-foreground min-w-40 text-right">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {followers.data.map((follower) => (
                                                <tr
                                                    key={follower.id}
                                                    className="hover:bg-muted/20 transition-colors duration-150 group"
                                                >
                                                    <td className="px-6 py-4">
                                                        <Checkbox
                                                            checked={selectedIds.includes(follower.id)}
                                                            onCheckedChange={() => handleSelect(follower.id)}
                                                            className="border-muted-foreground/50 group-hover:border-primary"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative">
                                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20
                                                                              flex items-center justify-center border border-primary/10 group-hover:border-primary/30">
                                                                    {follower.user.image ? (
                                                                        <img
                                                                            src={follower.user.image}
                                                                            alt={follower.user.name}
                                                                            className="w-10 h-10 rounded-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <span className="font-semibold text-primary">
                                                                            {follower.user.name.charAt(0).toUpperCase()}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {follower.notifications && (
                                                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full
                                                                                  border-2 border-background animate-pulse"></div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                                                    {follower.user.name}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                                    ID: {follower.user.id}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                                                <a
                                                                    href={`mailto:${follower.user.email}`}
                                                                    className="text-sm hover:text-primary hover:underline transition-colors truncate max-w-[200px]"
                                                                    title={follower.user.email}
                                                                >
                                                                    {follower.user.email}
                                                                </a>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {getUserRoleBadge(follower.user.role)}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                                            <div>
                                                                <div className="font-medium text-sm">
                                                                    {new Date(follower.created_at).toLocaleDateString('en-US', {
                                                                        year: 'numeric',
                                                                        month: 'short',
                                                                        day: 'numeric'
                                                                    })}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {getTimeAgo(follower.created_at)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <Switch
                                                                checked={follower.notifications}
                                                                onCheckedChange={() => toggleNotifications(follower.id, follower.notifications)}
                                                                className="data-[state=checked]:bg-green-500"
                                                            />
                                                            <div className="flex items-center gap-1.5">
                                                                {follower.notifications ? (
                                                                    <>
                                                                        <Bell className="h-4 w-4 text-green-500" />
                                                                        <span className="text-sm font-medium text-green-500">Active</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <BellOff className="h-4 w-4 text-muted-foreground" />
                                                                        <span className="text-sm font-medium text-muted-foreground">Inactive</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button
                                                                        variant="destructive"
                                                                        size="sm"
                                                                        className="gap-2 hover:bg-destructive/90"
                                                                        disabled={removingId === follower.id}
                                                                    >
                                                                        <UserX className="h-4 w-4" />
                                                                        Remove
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent className="border-border">
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Remove Follower</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Are you sure you want to remove {follower.user.name} from your followers?
                                                                            They will no longer receive updates from your organization.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            onClick={() => removeFollower(follower.id)}
                                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                        >
                                                                            {removingId === follower.id ? 'Removing...' : 'Remove Follower'}
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>

                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                                                                        <MoreVertical className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-40">
                                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={() => toggleNotifications(follower.id, follower.notifications)}
                                                                        className="gap-2"
                                                                    >
                                                                        {follower.notifications ? (
                                                                            <>
                                                                                <BellOff className="h-4 w-4" />
                                                                                Disable Notifications
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Bell className="h-4 w-4" />
                                                                                Enable Notifications
                                                                            </>
                                                                        )}
                                                                    </DropdownMenuItem>
                                                                    {/* <DropdownMenuItem className="gap-2">
                                                                        <Mail className="h-4 w-4" />
                                                                        Send Email
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem className="gap-2">
                                                                        <Users className="h-4 w-4" />
                                                                        View Profile
                                                                    </DropdownMenuItem> */}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Mobile View */}
                            <div className="md:hidden space-y-4">
                                {followers.data.map((follower) => (
                                    <Card key={follower.id} className="border-border/50 overflow-hidden">
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <Checkbox
                                                        checked={selectedIds.includes(follower.id)}
                                                        onCheckedChange={() => handleSelect(follower.id)}
                                                        className="border-muted-foreground/50 mt-1"
                                                    />
                                                    <div className="relative">
                                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20
                                                                      flex items-center justify-center border border-primary/10">
                                                            {follower.user.image ? (
                                                                <img
                                                                    src={follower.user.image}
                                                                    alt={follower.user.name}
                                                                    className="w-12 h-12 rounded-full object-cover"
                                                                />
                                                            ) : (
                                                                <span className="font-bold text-lg text-primary">
                                                                    {follower.user.name.charAt(0).toUpperCase()}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {follower.notifications && (
                                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full
                                                                          border-2 border-background animate-pulse"></div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-foreground">
                                                            {follower.user.name}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {getUserRoleBadge(follower.user.role)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Mail className="h-4 w-4 flex-shrink-0" />
                                                    <span className="truncate">{follower.user.email}</span>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Calendar className="h-4 w-4" />
                                                        Following since
                                                    </div>
                                                    <div className="text-sm font-medium">
                                                        {getTimeAgo(follower.created_at)}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Bell className="h-4 w-4" />
                                                        Notifications
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            checked={follower.notifications}
                                                            onCheckedChange={() => toggleNotifications(follower.id, follower.notifications)}
                                                            className="data-[state=checked]:bg-green-500"
                                                        />
                                                        <span className="text-sm font-medium">
                                                            {follower.notifications ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-4 pt-4 border-t border-border flex gap-2">
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            className="flex-1 gap-2"
                                                            disabled={removingId === follower.id}
                                                        >
                                                            <UserX className="h-4 w-4" />
                                                            Remove
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="border-border">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Remove Follower</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Remove {follower.user.name} from your followers?
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => removeFollower(follower.id)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                {removingId === follower.id ? 'Removing...' : 'Remove'}
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="sm" className="h-9 w-9 p-0">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuItem
                                                            onClick={() => toggleNotifications(follower.id, follower.notifications)}
                                                            className="gap-2"
                                                        >
                                                            {follower.notifications ? (
                                                                <>
                                                                    <BellOff className="h-4 w-4" />
                                                                    Disable Notifications
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Bell className="h-4 w-4" />
                                                                    Enable Notifications
                                                                </>
                                                            )}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="gap-2">
                                                            <Mail className="h-4 w-4" />
                                                            Send Email
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {followers.data.length === 0 && (
                                <div className="text-center py-16">
                                    <div className="relative mx-auto w-24 h-24 mb-6">
                                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-full
                                                      animate-pulse"></div>
                                        <Users className="relative w-full h-full text-muted-foreground" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-foreground mb-3">
                                        {filters.search ? 'No followers found' : 'No followers yet'}
                                    </h3>
                                    <p className="text-muted-foreground max-w-md mx-auto mb-6">
                                        {filters.search
                                            ? "Try adjusting your search or filter criteria to find followers."
                                            : "When users follow your organization, they will appear here. Share your organization to get more followers!"}
                                    </p>
                                    {!filters.search && (
                                        <Button variant="outline" className="gap-2">
                                            <Users className="h-4 w-4" />
                                            Share Organization
                                        </Button>
                                    )}
                                </div>
                            )}

                            {/* Pagination Controls */}
                            {followers.total > 0 && (
                                <div className="flex items-center justify-between mt-6 px-4 mb-6 text-sm text-muted-foreground flex-wrap gap-4">
                                    <div>
                                        Showing {followers.from?.toLocaleString() || 0} to {followers.to?.toLocaleString() || 0} of{" "}
                                        {followers.total.toLocaleString()} followers.
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {/* Per Page Selector */}
                                        <div className="flex items-center gap-2">
                                            <label className="text-sm text-muted-foreground">Per page:</label>
                                            <select
                                                className="border rounded px-2 py-1.5 text-sm bg-background border-input"
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
                                                className="px-3 py-1.5 text-sm border border-input rounded-lg disabled:opacity-50
                                                         hover:bg-muted transition-all hover:border-primary/30"
                                                onClick={() => handlePageChange(followers.current_page - 1)}
                                                disabled={!followers.prev_page_url || loading}
                                            >
                                                Previous
                                            </button>
                                            <span className="px-2">
                                                Page {followers.current_page} of {followers.last_page}
                                            </span>
                                            <button
                                                className="px-3 py-1.5 text-sm border border-input rounded-lg disabled:opacity-50
                                                         hover:bg-muted transition-all hover:border-primary/30"
                                                onClick={() => handlePageChange(followers.current_page + 1)}
                                                disabled={!followers.next_page_url || loading}
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
            </div>
        </AppLayout>
    );
}
