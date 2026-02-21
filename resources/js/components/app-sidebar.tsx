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
    Megaphone,
    Wallet,
    Gavel,
    Handshake,
    UserPlus,
    Bell,
    Send,
    Store,
    CreditCard,
    FolderOpen,
    ShoppingBag,
    Search,
    Youtube,
    Video,
    TrendingUp
} from 'lucide-react';
import SiteTitle from './site-title';
import { Button } from '@/components/ui/button';
import { Link } from '@inertiajs/react';
import { motion } from 'framer-motion';


const mainNavItems: (NavItem | NavGroup)[] = [
    // 1. Dashboard
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: BarChart3,
        permission: "dashboard.read"
    },

    // Believe Points (hidden for organization_pending until onboarding complete)
    {
        title: 'Believe Points',
        href: '/believe-points',
        icon: Coins,
        role: ['organization', 'admin'],
    },

    // Nonprofit Barter Network (organization only)
    {
        title: 'Barter Network',
        href: '/barter',
        icon: Handshake,
        role: 'organization',
    },

    // Believe FundMe (organization campaigns)
    {
        title: 'Believe FundMe',
        href: '/fundme',
        icon: HandCoins,
        role: "organization",
    },

    // Livestreams (organization only)
    {
        title: 'Livestreams',
        href: '/livestreams',
        icon: Video,
        role: "organization",
    },

    // 2. AI Chat Assistant
    {
        title: 'AI Believe Assistant',
        href: '/ai-chat',
        icon: Bot,
        permission: "ai.chat.use",
        role: "organization",
    },

    // 3. Governance
    {
        title: 'Governance',
        icon: Gavel,
        items: [
            {
                title: 'Board of Directors',
                href: '/board-members',
                icon: Users,
                role: "organization"
            },
        ],
        role: "organization"
    },
    {
    title: 'Service Hub Management',
    icon: ShoppingBag,
    role: "admin",
    items: [
        {
            title: 'Service Sellers',
            href: '/admin/service-sellers',
            icon: Users,
            role: "admin"
        },
        {
            title: 'Service Categories',
            href: '/admin/service-categories',
            icon: FolderOpen,
            role: "admin"
        },
    ],
},

    // 4. People & Community
    {
        title: 'People & Community',
        icon: UserPlus,
        items: [
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
            },
        ],
        role: "organization"
    },

    // 5. Communication & Engagement
    {
        title: 'Communication & Engagement',
        icon: MessageSquare,
        items: [
            {
                title: 'Communication',
                icon: MessageSquare,
                items: [
                    {
                        title: 'Announcements',
                        href: '/chat',
                        icon: Bell,
                        permission: "communication.read"
                    },
                    {
                        title: 'Newsletter',
                        href: '/newsletter',
                        icon: Mail,
                        permission: "newsletter.read"
                    },
                    {
                        title: 'Content Management',
                        icon: FileText,
                        items: [
                            {
                                title: 'Content Items',
                                href: '/content',
                                icon: FileText,
                                permission: "content.read"
                            },
                            {
                                title: 'Create Content',
                                href: '/content/create',
                                icon: PlusCircle,
                                permission: "content.create"
                            },
                        ],
                        permission: "content.read"
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
                    {
                        title: 'Campaigns',
                        icon: Send,
                        items: [
                            {
                                title: 'Campaigns',
                                href: '/campaigns',
                                icon: Calendar,
                                permission: "campaign.read"
                            },
                            {
                                title: 'Create Campaign',
                                href: '/campaigns/create',
                                icon: CalendarPlus,
                                permission: "campaign.create"
                            },
                            {
                                title: 'AI Campaign Generator',
                                href: '/campaigns/ai/create',
                                icon: Star,
                                permission: "campaign.ai.create"
                            },
                        ],
                        permission: "campaign.read"
                    },
                ],
                permission: "communication.read"
            },
            {
                title: 'Group Chat',
                icon: MessageCircle,
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
        ],
        permission: "communication.read"
    },

    // 7. Programs & Events
    {
        title: 'Programs & Events',
        icon: Calendar,
        items: [
            {
                title: 'Virtual (Courses & Events)',
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
        ],
        permission: "event.read"
    },

    // 8. Fundraising & Rewards
    {
        title: 'Fundraising & Rewards',
        icon: HeartHandshake,
        items: [
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
                title: 'Raffle Draws',
                href: '/raffles',
                icon: Gift,
                permission: "raffle.read"
            },
        ],
        role: "organization"
    },

    // 9. Commerce & Marketplace
    {
        title: 'Commerce & Marketplace',
        icon: Store,
        items: [
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
                ]
            },
            {
                title: 'Gift Cards',
                icon: Gift,
                role: ['organization', 'admin'],
                items: [
                    {
                        title: 'Purchased Cards',
                        href: route('gift-cards.created'),
                        icon: Gift,
                    },
                ],
            },
        ]
    },

    // Node Management Section (keeping for admin)
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

    // Data Management Section (keeping for admin)
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

    // Merchant Hub Section (Admin Only)
    {
        title: 'Merchant Hub',
        icon: Store,
        role: "admin",
        items: [
            // {
            //     title: 'Dashboard',
            //     href: '/admin/merchant-hub',
            //     icon: ShoppingBag,
            //     role: "admin"
            // },
            {
                title: 'Merchants',
                href: '/admin/merchant-hub/merchants',
                icon: Store,
                role: "admin"
            },
            {
                title: 'Offers',
                href: '/admin/merchant-hub/offers',
                icon: Gift,
                role: "admin"
            },
            {
                title: 'Redemptions',
                href: '/admin/merchant-hub/redemptions',
                icon: ShoppingCart,
                role: "admin"
            },
            {
                title: 'Categories',
                href: '/admin/merchant-hub-categories',
                icon: Tag,
                role: "admin"
            },
        ],
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

    // 10. System Management
    {
        title: 'System Management',
        icon: Settings,
        items: [
            {
                title: 'Roles & Permissions',
                href: '/permission-management',
                icon: Shield,
                permission: "role.management.read"
            },
            {
                title: 'Organization Settings',
                href: '/settings/profile',
                icon: Settings,
                permission: "profile.read"
            },
            {
                title: 'SEO Settings',
                href: '/admin/seo',
                icon: Search,
                role: "admin"
            },
            {
                title: 'Compliance / Logs',
                icon: ClipboardList,
                items: [
                    {
                        title: 'Compliance Reviews',
                        href: '/admin/compliance',
                        icon: ClipboardList,
                        permission: "compliance.review"
                    },
                    {
                        title: 'KYB Verification',
                        href: '/admin/kyb-verification',
                        icon: Shield,
                        permission: "kyb.verification.read"
                    },
                    {
                        title: 'KYC Verification',
                        href: '/admin/kyc-verification',
                        icon: UserCheck,
                        permission: "kyc.verification.read"
                    },
                    {
                        title: 'Exemption Certificates',
                        href: '/admin/exemption-certificates',
                        icon: FileCheck,
                        role: "admin"
                    },
                ],
                permission: "compliance.review"
            },
            {
                title: 'Integrations',
                icon: LinkIcon,
                items: [
                    {
                        title: 'Email Invites',
                        href: '/email-invite',
                        icon: Mail,
                        permission: "email.invite.read",
                        role: "organization"
                    },
                    {
                        title: 'Social Media',
                        href: route('social-media.index'),
                        icon: Facebook,
                        role: "organization"
                    },
                    {
                        title: 'YouTube',
                        href: route('integrations.youtube'),
                        icon: Youtube,
                        role: "organization"
                    },
                ],
                permission: "email.invite.read"
            },
            {
                title: 'Billing / Plans',
                icon: CreditCard,
                items: [
                    {
                        title: 'Plans Management',
                        href: '/admin/plans',
                        icon: Sparkles,
                        role: "admin"
                    },
                    {
                        title: 'Wallet Plans Management',
                        href: '/admin/wallet-plans',
                        icon: Wallet,
                        permission: "wallet.plan.read"
                    },
                    {
                        title: 'Email Packages',
                        href: '/admin/email-packages',
                        icon: Mail,
                        role: "admin"
                    },
                    {
                        title: 'Reward Points',
                        href: '/admin/reward-points',
                        icon: Gift,
                        permission: "reward.point.manage"
                    },
                    {
                        title: 'Believe Points',
                        href: '/admin/believe-points',
                        icon: Coins,
                        role: "admin"
                    },
                ],
                permission: "wallet.plan.read"
            },
            // Additional settings items
            {
                title: 'About Page',
                href: '/admin/about',
                icon: Info,
                role: "admin"
            },
            {
                title: 'Service Categories',
                href: '/admin/service-categories',
                icon: FolderOpen,
                role: "admin"
            },
            {
                title: 'Service Hub Settings',
                href: '/settings/service-hub',
                icon: ShoppingBag,
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
            {
                title: 'Fundraise Leads',
                href: '/admin/fundraise-leads',
                icon: TrendingUp,
                role: "admin"
            },
            {
                title: 'Push Notifications (FCM)',
                href: '/admin/push-notifications',
                icon: Bell,
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
