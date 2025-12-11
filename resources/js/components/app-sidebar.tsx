import { NavMain } from '@/components/nav-main';
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter } from '@/components/ui/sidebar';
import { type NavItem, type NavGroup } from '@/types';
import { usePage } from '@inertiajs/react';
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
    HeartHandshake,
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
    Bot,
    ClipboardList,
    FileCheck,
    DollarSign,
    Coins,
    PieChart,
    Clock,
    UserCheck,
    Info,
    Heart,
    Sparkles,
    ArrowRight,
    MessageCircle,
    Facebook,
    Link as LinkIcon,
    Newspaper,
    Megaphone
} from 'lucide-react';
import SiteTitle from './site-title';
import { route } from 'ziggy-js';
import { Button } from '@/components/ui/button';
import { Link } from '@inertiajs/react';
import { motion } from 'framer-motion';


const mainNavItems: (NavItem | NavGroup)[] = [
    // Main Dashboard
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: BarChart3,
        permission: "dashboard.read"
    },

    // Feed
    // {
    //     title: 'Feed',
    //     href: route('feed.index'),
    //     icon: Newspaper,
    // },

    // AI Chat Assistant
    {
        title: 'AI Chat Assistant',
        href: '/ai-chat',
        icon: Bot,
        permission: "ai.chat.use",
        role: "organization",
    },

    {
        title: 'Board of Directors',
        icon: Users,
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
        title: 'Followers',
        href: route("organization.followers.index"),
        icon: UserCheck,
        permission: "organization.followers.read",
        role: "organization",
    },

    {
        title: 'Volunteer Management',
        icon: UserCheck,
        items: [
            {
                title: 'Volunteers',
                href: '/volunteers',
                icon: UserCheck,
                permission: "volunteer.read",
                role: "organization"
            },
            {
                title: 'Time Sheet',
                href: '/volunteers/timesheet',
                icon: Clock,
                permission: "volunteer.timesheet.read",
                role: "organization"
            },
        ],
        role: "organization"
    },

    {
        title: 'Content Management',
        icon: FileText,
        items: [
            {
                title: 'Content Items',
                href: '/content',
                icon: FileText, // or BookOpen for content
                permission: "content.read"
            },
            {
                title: 'Create Content',
                href: '/content/create',
                icon: PlusCircle, // or FilePlus for create
                permission: "content.create"
            },
            {
                title: 'Campaigns',
                href: '/campaigns',
                icon: Calendar, // or Send for campaigns
                permission: "campaign.read"
            },
            {
                title: 'Create Campaign',
                href: '/campaigns/create',
                icon: CalendarPlus, // or Send for create campaign
                permission: "campaign.create"
            },
            {
                title: 'AI Campaign Generator',
                href: '/campaigns/ai/create',
                icon: Star, // or Send for create campaign
                permission: "campaign.ai.create"
            },
            {
                title: 'Newsletter',
                href: '/newsletter',
                icon: Mail,
                permission: "newsletter.read"
            },
        ],
        role: "organization"
    },

    // Data Management Section
    {
        title: 'Data Management',
        icon: Database,
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

    {
                title: 'Raffle Draws',
                href: '/raffles',
                icon: Gift,
                permission: "raffle.read"
            },

    // E-commerce Section
    {
        title: 'E-commerce',
        icon: ShoppingCart,
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
                permission: "ecommerce.read",
            },
            //  {
            //     title: 'Order Items',
            //     href: '/order-items',
            //     icon: Package,
            //     permission: "ecommerce.read",
            // },
        ]
        // Removed group permission - nav-main will show group if any child is visible
    },

    // Job Management Section
    {
        title: 'Job Management',
        icon: Briefcase,
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

    {
        title: 'Facebook',
        icon: Facebook,
        role: "organization",
        items: [
            {
                title: 'Connect Pages',
                href: '/facebook/connect',
                icon: LinkIcon,
                role: "organization"
            },
            {
                title: 'Posts',
                href: '/facebook/posts',
                icon: FileText,
                role: "organization"
            },
            {
                title: 'Create Post',
                href: '/facebook/posts/create',
                icon: Plus,
                role: "organization"
            },
        ],
    },

    // Node Management Section
    {
        title: 'Node Management',
        icon: Network,
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
        icon: GraduationCap,
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
        icon: Calendar,
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
        icon: FileCode,
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
        ],
        // Removed group permission - nav-main will show group if any child is visible
        permission: "classification.code.read"
    },

    // Communication Section
    {
        title: 'Communication',
        icon: MessageSquare,
        items: [
            {
                title: 'Chat',
                href: '/chat',
                icon: Text,
                permission: "communication.read"
            },
            {
                title: 'Email Invites',
                href: '/email-invite',
                icon: Mail,
                permission: "email.invite.read",
                role: "organization"
            },
        ],
        permission: "communication.read"
    },

    // Donations Section (Organization Only)
    {
        title: 'Donations',
        icon: HeartHandshake,
        items: [
            {
                title: 'All Donations',
                href: '/donations',
                icon: HeartHandshake,
                role: "organization"
            },
        ],
        role: "organization"
    },

    {
        title: 'Group Chat',
        icon: MessageSquare,
        items: [
            {
                title: 'Create',
                href: '/chat-group-topics',
                icon: MessageSquare,
                permission: "communication.read"
            },
            {
                title: 'Select Chat Topic',
                href: '/group-topics/select',
                icon: MessageSquare,
                permission: "communication.read"
            },
        ],
        permission: "communication.read"
    },

    // Application Management Section
    {
        title: 'Application Management',
        icon: FileCheck,
        permission: "form1023.application.read",
        items: [
            {
                title: 'Form 1023 Applications',
                href: '/admin/form1023',
                icon: FileCheck,
                permission: "form1023.application.read"
            },
            {
                title: 'Compliance Reviews',
                href: '/admin/compliance',
                icon: ClipboardList,
                permission: "compliance.review"
            },
            {
                title: 'Fees',
                href: '/admin/fees',
                icon: DollarSign,
                permission: "application.fees.read"
            },
        ]
        // Removed group permission - nav-main will show group if any child is visible
    },

    // Fractional Ownership Section (Admin Only)
    {
        title: 'Fractional Ownership',
        icon: Coins,
        role: "admin",
        items: [
            {
                title: 'Orders & Buyers',
                href: '/admin/fractional/orders',
                icon: ShoppingCart,
                role: "admin"
            },
            {
                title: 'Assets',
                href: '/admin/fractional/assets',
                icon: Coins,
                role: "admin"
            },
            {
                title: 'Offerings',
                href: '/admin/fractional/offerings',
                icon: PieChart,
                role: "admin"
            },
        ],
    },

    // Livestock Management Section
    {
        title: 'Livestock Management',
        icon: Heart,
        permission: "admin.livestock.read",
        items: [
            {
                title: 'Livestock',
                href: '/admin/livestock/listings',
                icon: Heart,
                permission: "admin.livestock.read"
            },
            {
                title: 'Sellers',
                href: '/admin/livestock/sellers',
                icon: Users,
                permission: "admin.livestock.read"
            },
            {
                title: 'Buyers',
                href: '/admin/livestock/buyers',
                icon: ShoppingCart,
                permission: "admin.livestock.read"
            },
        ]
    },
    // Country Management Section
    {
        title: 'Country Management',
        icon: Building,
        permission: "admin.countries.read",
        items: [
            {
                title: 'Countries',
                href: '/admin/countries',
                icon: Building,
                permission: "admin.countries.read"
            },
        ]
    },

    // User Management Section
    {
        title: 'User Management',
        icon: Users,
        permission: "role.management.read",
        items: [
            {
                title: 'Users',
                href: route('users.list'),
                icon: Users,
                permission: "role.management.read"
            },
        ]
    },

    // System Management Section
    {
        title: 'System Management',
        icon: Settings,
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
            {
                title: 'Reward Points',
                href: '/admin/reward-points',
                icon: Gift,
                permission: "reward.point.manage"
            },
            {
                title: 'About Page',
                href: '/admin/about',
                icon: Info,
                role: "admin"
            },
            {
                title: 'Plans Management',
                href: '/admin/plans',
                icon: Sparkles,
                role: "admin"
            },
            {
                title: 'Email Packages',
                href: '/admin/email-packages',
                icon: Mail,
                role: "admin"
            },
            {
                title: 'Promotional Banners',
                href: '/admin/promotional-banners',
                icon: Megaphone,
                role: "admin",
                permission: "promotional.banner.read"
            },
            {
                title: 'Contact Page',
                href: '/admin/contact-page',
                icon: MessageCircle,
                role: "admin"
            },
            {
                title: 'Contact Submissions',
                href: '/admin/contact-submissions',
                icon: Mail,
                role: "admin"
            },
        ]
        // Removed group permission - nav-main will show group if any child is visible
    },
];

export function AppSidebar() {
    const page = usePage();
    const userRoles = (page.props as any).auth?.roles ?? [];
    const isOrganization = userRoles.some((role: string) => role.toLowerCase() === 'organization');
    const currentPlanId = (page.props as any).auth?.user?.current_plan_id ?? null;
    const hasPlan = currentPlanId !== null;

    return (
        <Sidebar collapsible="icon" variant="inset" className='z-30 [&_.group\\/sidebar-wrapper.has-data-\\[variant\\=inset\\]]:!bg-sidebar [&_[data-sidebar=sidebar]]:!bg-sidebar'>
            <div className="h-full flex flex-col border-r border-sidebar-border bg-sidebar">
                <SidebarHeader className="border-b border-sidebar-border bg-sidebar flex-shrink-0 px-4 py-3">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild className="hover:bg-sidebar-accent/50 transition-colors rounded-lg">
                            {/* <Link href="/dashboard" prefetch> */}
                                {/* <AppLogo /> */}
                                <SiteTitle href={route("dashboard")} />
                            {/* </Link> */}
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

                <SidebarContent className="px-3 py-4 bg-sidebar flex-1 overflow-y-auto min-h-0 sidebar-scrollbar">
                    <div className="space-y-1">
                        <NavMain items={mainNavItems} />
                    </div>
                </SidebarContent>

                {isOrganization && !hasPlan && (
                    <SidebarFooter className="px-3 py-3 border-t border-sidebar-border bg-sidebar flex-shrink-0">
                    <motion.div
                        className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/15 dark:to-primary/10 border border-primary/20 dark:border-primary/30 p-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        whileHover={{ scale: 1.02 }}
                    >
                        <motion.div
                            className="flex items-center gap-3 mb-3"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                        >
                            <motion.div
                                className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/20 dark:bg-primary/25 flex items-center justify-center"
                                animate={{
                                    rotate: [0, 10, -10, 0],
                                    scale: [1, 1.1, 1]
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    repeatDelay: 3
                                }}
                            >
                                <Sparkles className="h-5 w-5 text-primary" />
                            </motion.div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm text-foreground leading-tight mb-1">
                                    Upgrade to Pro
                                </h3>
                                <p className="text-xs text-muted-foreground leading-snug">
                                    Unlock premium features and tools
                                </p>
                            </div>
                        </motion.div>
                        <Link href={route('plans.index')}>
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Button
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium h-9 shadow-sm group"
                                    size="sm"
                                >
                                    <span>Upgrade Now</span>
                                    <ArrowRight className="h-4 w-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </motion.div>
                        </Link>
                    </motion.div>
                </SidebarFooter>
                )}
            </div>
        </Sidebar>
    );
}
