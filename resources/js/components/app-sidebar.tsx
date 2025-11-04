import { NavMain } from '@/components/nav-main';
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type NavGroup } from '@/types';
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
    Plus,
    Mail,
    CalendarPlus,
    PlusCircle,
    Star,
    Bot
} from 'lucide-react';
import SiteTitle from './site-title';


const mainNavItems: (NavItem | NavGroup)[] = [
    // Main Dashboard
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: BarChart3,
        permission: "dashboard.read"
    },

    // AI Chat Assistant
    {
        title: 'AI Chat Assistant',
        href: '/ai-chat',
        icon: Bot,
        permission: "ai.chat.use",
        role: "organization"
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

    {
        title: 'Content Management',
        items: [
            {
                title: 'Content Items',
                href: '/content',
                icon: FileText, // or BookOpen for content
                role: "organization"
            },
            {
                title: 'Create Content',
                href: '/content/create',
                icon: PlusCircle, // or FilePlus for create
                role: "organization"
            },
            {
                title: 'Campaigns',
                href: '/campaigns',
                icon: Calendar, // or Send for campaigns
                role: "organization"
            },
            {
                title: 'Create Campaign',
                href: '/campaigns/create',
                icon: CalendarPlus, // or Send for create campaign
                role: "organization"
            },
            {
                title: 'AI Campaign Generator',
                href: '/campaigns/ai/create',
                icon: Star, // or Send for create campaign
                role: "organization"
            },
        ],
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

    // Virtual (Course,Event) Management Section
    {
        title: 'Virtual (Course,Event)',
        items: [
            {
                title: 'Courses & Events',
                href: '/admin/courses-events',
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
        role: "admin",
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
            {
                title: 'Newsletter',
                href: '/newsletter',
                icon: Mail,
                permission: "newsletter.read"
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
                            {/* <Link href="/dashboard" prefetch> */}
                                {/* <AppLogo /> */}
                                <SiteTitle href={route("dashboard")} />
                            {/* </Link> */}
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
