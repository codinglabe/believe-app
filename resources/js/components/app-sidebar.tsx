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
    Tag,
    Briefcase,
    BookOpen,
    MessageSquare,
    FileCode,
    Hash,
    Percent,
    Building
} from 'lucide-react';
import AppLogo from './app-logo';


const mainNavItems: (NavItem | NavGroup)[] = [
    // Main Dashboard
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: BarChart3,
        permission: "dashbord.management.read"
    },
    
    // Data Management Section
    {
        title: 'Data Management',
        items: [
            {
                title: 'Upload Data',
                href: '/upload',
                icon: Download,
                permission: "upload.data.read"
            },
            {
                title: 'Manage Data',
                href: '/manage-data',
                icon: Database,
                permission: "management.data.read"
            },
        ],
        permission: "management.data.read"
    },

    // E-commerce Section
    {
        title: 'E-commerce',
        items: [
            {
                title: 'Products',
                href: '/products',
                icon: ShoppingCart,
                permission: "products.read"
            },
            {
                title: 'Categories',
                href: '/categories',
                icon: Tag,
                permission: "products.read"
            },
            {
                title: 'Orders',
                href: '/orders',
                icon: Package,
                permission: "management.data.read"
            },
        ],
        permission: "products.read"
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
        ],
        permission: "job.positions.read"
    },

    // Node Management Section
    {
        title: 'Node Management',
        items: [
            {
                title: 'Node Boss',
                href: '/node-boss',
                icon: AlignEndHorizontal,
                permission: "node.boss.read"
            },
            {
                title: 'Node Referral',
                href: '/node-referral',
                icon: Network,
                permission: "node.boss.read"
            },
            {
                title: 'Withdrawals',
                href: '/withdrawals',
                icon: HandCoins,
                permission: "management.data.read"
            },
        ],
        permission: "node.boss.read"
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
                permission: "course.read"
            },
        ],
        permission: "course.read"
    },

    // Code Management Section
    {
        title: 'Code Management',
        items: [
            {
                title: 'Classification Codes',
                href: '/classification-codes',
                icon: FileCode,
                permission: "classificaiton.code.read"
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
        ],
        permission: "code.management.read"
    },

    // Communication Section
    {
        title: 'Communication',
        items: [
            {
                title: 'Group Chat',
                href: '/chat-group-topics',
                icon: MessageSquare,
                role: "admin"
            },
            {
                title: 'Chat',
                href: '/chat',
                icon: Text,
            },
        ],
        permission: "chat.read"
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
        ],
        permission: "role.management.read"
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
