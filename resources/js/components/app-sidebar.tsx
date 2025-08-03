import { NavMain } from '@/components/nav-main';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type NavGroup } from '@/types';
import { Link } from '@inertiajs/react';
import { Download, LayoutGrid, FileText, ShoppingCart, Shield, Settings, Package, AlignEndHorizontal, Network, HandCoins, Text } from 'lucide-react';
import AppLogo from './app-logo';


const mainNavItems: (NavItem | NavGroup)[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutGrid,
        permission: "dashbord.management.read"
    },
    {
        title: 'Upload Data',
        href: '/upload',
        icon: Download,
        permission: "upload.data.read"
    },
    {
        title: 'Manage Data',
        href: '/manage-data',
        icon: FileText,
        permission: "management.data.read"
    },
    {
        title: 'Products',
        href: '/products',
        icon: ShoppingCart,
        permission: "products.read"
    },
    {
        title: 'Categories',
        href: '/categories',
        icon: LayoutGrid,
        permission: "products.read"
    },
    {
        title: 'Job Position Categories',
        href: '/position-categories',
        icon: LayoutGrid,
        permission: "job.position.categories.read"
    },
    {
        title: 'Job Positions',
        href: '/job-positions',
        icon: LayoutGrid,
        permission: "job.positions.read"
    },
    {
        title: 'Job Post',
        href: '/job-posts',
        icon: LayoutGrid,
        permission: "job.posts.read"
    },
    {
        title: 'Job Applications',
        href: '/job-applications',
        icon: LayoutGrid,
        permission: "job.posts.read"
    },
    {
        title: 'Orders',
        href: '/orders',
        icon: Package,
        permission: "management.data.read"
    },
    {
        title: 'Node Boss Manage',
        items: [
            {
                title: 'Node Boss',
                href: '/node-boss',
                icon: AlignEndHorizontal,
                permission: "node.boss.read"
            },
            {
                title: 'Node Referral',
                href: route('node-referral.index'),
                icon: Network,
                permission: "node.boss.read"
            },
        ],
        permission: "code.management.read"
    },
        {
        title: 'Withdrawals',
        href: route("withdrawals.index"),
        icon: HandCoins,
        permission: "management.data.read"
    },

    {
        title: 'Codes',
        items: [
            {
                title: 'Classification Codes',
                href: '/classification-codes',
                icon: FileText,
                permission: "classificaiton.code.read"
            },
            {
                title: 'Status Codes',
                href: '/status-codes',
                icon: FileText,
                permission: "status.code.read"
            },
            {
                title: 'Deductibility Codes',
                href: '/deductibility-codes',
                icon: FileText,
                permission: "deductibily.code.read"
            },
        ],
        permission: "code.management.read"
    },
    {
        title: 'Role & Permissions',
        href: '/permission-management',
        icon: Shield,
        permission: "role.management.read"
    },
    {
        title: 'Chat',
        href: '/chat',
        icon: Text,
        role: "organization" // Now properly checks role
    },
    {
        title: 'Settings',
        href: '/settings/profile',
        icon: Settings,
        permission: "profile.read"
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset" className='z-30'>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            {/* <SidebarFooter>
                <NavUser />
            </SidebarFooter> */}
        </Sidebar>
    );
}
