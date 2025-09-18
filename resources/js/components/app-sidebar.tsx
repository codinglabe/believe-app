import { NavMain } from '@/components/nav-main';
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type NavGroup } from '@/types';
import { Link } from '@inertiajs/react';
import {
    Download,
    FileText,
    ShoppingCart,
    Shield,
    Settings,
    Package,
    AlignEndHorizontal,
    Network,
    HandCoins,
    GraduationCap,
    Text,
    BarChart3,
    Database,
    Users,
    Building2,
    Gift,
    Tag,
    Briefcase,
    BookOpen,
    MessageSquare,
    FileCode,
    Hash,
    Percent,
    Building,
    Calendar,
    Plus
} from 'lucide-react';
import AppLogo from './app-logo';


const mainNavItems: (NavItem | NavGroup)[] = [
    // Main Dashboard
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: BarChart3,
        permission: "dashboard.read"
    },

    {
        title: 'Board of Directors',
        items: [
            {
                title: 'Index',
                href: '/board-members',
                icon: Users,
                role: "organization"
            },
        ],
        // permission: "data.management.read"
        role: "organization"
    },

    // Data Management Section
    {
        title: 'Data Management',
        items: [
            {
                title: 'Upload Data',
                href: '/upload',
                icon: Download,
                permission: "data.management.read"
            },
            {
                title: 'Manage Data',
                href: '/manage-data',
                icon: Database,
                permission: "data.management.read"
            },
        ],
        permission: "data.management.read"
    },

    // E-commerce Section
    {
        title: 'E-commerce',
        items: [
            {
                title: 'Products',
                href: '/products',
                icon: ShoppingCart,
                permission: "product.read"
            },
            {
                title: 'Categories',
                href: '/categories',
                icon: Tag,
                permission: "category.read"
            },
            {
                title: 'Orders',
                href: '/orders',
                icon: Package,
                permission: "ecommerce.read"
            },
            {
                title: 'Raffle Draws',
                href: '/raffles',
                icon: Gift,
                permission: "raffle.read"
            },
        ]
        // Removed group permission - nav-main will show group if any child is visible
    },

    // Job Management Section
    {
        title: 'Job Management',
        items: [
            {
                title: 'Position Categories',
                href: '/position-categories',
                icon: Building2,
                permission: "job.position.categories.read"
            },
            {
                title: 'Job Positions',
                href: '/job-positions',
                icon: Briefcase,
                permission: "job.positions.read"
            },
            {
                title: 'Job Posts',
                href: '/job-posts',
                icon: FileText,
                permission: "job.posts.read"
            },
            {
                title: 'Applications',
                href: '/job-applications',
                icon: Users,
                permission: "job.posts.read"
            },
        ]
        // Removed group permission - nav-main will show group if any child is visible
    },

    // Node Management Section
    {
        title: 'Node Management',
        items: [
            {
                title: 'Node Boss',
                href: '/node-boss',
                icon: AlignEndHorizontal,
                permission: "node.referral.read"
            },
            {
                title: 'Node Referral',
                href: '/node-referral',
                icon: Network,
                permission: "node.referral.read"
            },
            {
                title: 'Withdrawals',
                href: '/withdrawals',
                icon: HandCoins,
                permission: "data.management.read"
            },
        ],
        permission: "node.referral.read"
    },

    // Course Management Section
    {
        title: 'Course Management',
        items: [
            {
                title: 'Courses',
                href: '/admin/courses',
                icon: GraduationCap,
                permission: "course.read"
            },
            {
                title: 'Course Topics',
                href: '/topics',
                icon: BookOpen,
                permission: "topic.read"
            },
        ],
        permission: "course.read"
    },

    // Event Management Section
    {
        title: 'Event Management',
        items: [
            {
                title: 'Events',
                href: '/events',
                icon: Calendar,
                permission: "event.read"
            },
            {
                title: 'Create Event',
                href: '/events/create',
                icon: Plus,
                permission: "event.create"
            },
        ],
        permission: "event.read"
    },

    // Code Management Section
    {
        title: 'Code Management',
        items: [
            {
                title: 'Classification Codes',
                href: '/classification-codes',
                icon: FileCode,
                permission: "classification.code.read"
            },
            {
                title: 'Status Codes',
                href: '/status-codes',
                icon: Hash,
                permission: "status.code.read"
            },
            {
                title: 'Deductibility Codes',
                href: '/deductibility-codes',
                icon: Percent,
                permission: "deductibility.code.read"
            },
            {
                title: 'NTEE Codes',
                href: '/ntee-codes',
                icon: Building,
                permission: "ntee.code.read"
            },
        ]
        // Removed group permission - nav-main will show group if any child is visible
    },

    // Communication Section
    {
        title: 'Communication',
        items: [
            {
                title: 'Group Chat',
                href: '/chat-group-topics',
                icon: MessageSquare,
                permission: "communication.read"
            },
            {
                title: 'Chat',
                href: '/chat',
                icon: Text,
                permission: "communication.read"
            },
        ],
        permission: "communication.read"
    },

    // System Management Section
    {
        title: 'System Management',
        items: [
            {
                title: 'Role & Permissions',
                href: '/permission-management',
                icon: Shield,
                permission: "role.management.read"
            },
            {
                title: 'Settings',
                href: '/settings/profile',
                icon: Settings,
                permission: "profile.read"
            },
        ]
        // Removed group permission - nav-main will show group if any child is visible
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset" className='z-30 border-r border-border/50'>
            <SidebarHeader className="border-b border-border/50">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild className="hover:bg-accent/50 transition-colors">
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="px-2 py-4">
                <div className="space-y-2">
                    <NavMain items={mainNavItems} />
                </div>
            </SidebarContent>

            {/* <SidebarFooter>
                <NavUser />
            </SidebarFooter> */}
        </Sidebar>
    );
}
