import type { NavItem, NavGroup } from '@/types';
import { route } from 'ziggy-js';
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
    Star,
    ClipboardList,
    FileCheck,
    DollarSign,
    Coins,
    PieChart,
    UserCheck,
    Info,
    Heart,
    Megaphone,
    Wallet,
    Gavel,
    Bell,
    Send,
    Store,
    CreditCard,
    FolderOpen,
    ShoppingBag,
    Search,
    Youtube,
    Video,
    TrendingUp,
    Cloud,
    Monitor,
    LayoutGrid,
    Layers,
    ScrollText,
    Home,
    Brain,
    Handshake,
    LineChart,
    Bot,
    Facebook,
    Link as LinkIcon,
    Activity,
    MessageCircle,
    Sparkles,
    Trophy,
    Compass,
    Newspaper,
    Radio,
    MapPin,
} from 'lucide-react';

/**
 * BIU sidebar — matches client “final menu” structure.
 * Convention (Option A): items that are * in the spec use `role: ORG_STAR_ROLES` so
 * supporters (`user`) do not see them at all. Admins and nonprofit roles still do.
 */
const ORG_STAR_ROLES = ['organization', 'organization_pending', 'care_alliance', 'admin'] as const;

export const dashboardSidebarNavItems: (NavItem | NavGroup)[] = [
    {
        title: 'Home',
        icon: Home,
        items: [
            {
                title: 'Dashboard',
                href: '/dashboard',
                icon: BarChart3,
                permission: 'dashboard.read',
            },
            {
                title: 'Dashboard',
                href: route('user.profile.index'),
                icon: BarChart3,
                role: 'user',
            },
            {
                title: 'Activity feed',
                href: '/social-feed',
                icon: Activity,
            },
            {
                title: 'Notifications',
                href: route('notifications.index'),
                icon: Bell,
            },
        ],
    },

    {
        title: 'Explore',
        icon: Compass,
        items: [
            {
                title: 'Explore causes',
                href: route('explore-by-cause.index'),
                icon: MapPin,
            },
            {
                title: 'Organizations',
                href: route('organizations'),
                icon: Building2,
            },
            {
                title: 'Campaigns',
                href: route('fundme.index'),
                icon: Megaphone,
            },
            {
                title: 'Events',
                href: route('alleventsPage'),
                icon: Calendar,
            },
            {
                title: 'Volunteers',
                href: route('volunteer-opportunities.index'),
                icon: UserCheck,
            },
            {
                title: 'Courses',
                href: route('course.index'),
                icon: GraduationCap,
            },
            {
                title: 'Supporters',
                href: route('find-supporters.index'),
                icon: Users,
            },
            {
                title: 'Groups',
                href: route('chat.index'),
                icon: Hash,
            },
        ],
    },

    {
        title: 'Community',
        icon: Users,
        items: [
            {
                title: 'Social feed',
                href: route('social-feed.index'),
                icon: Facebook,
            },
            {
                title: 'Find supporters',
                href: route('find-supporters.index'),
                icon: Search,
            },
            {
                title: 'Care alliances',
                href: route('find-care-alliances.index'),
                icon: HeartHandshake,
            },
            {
                title: 'Groups',
                href: route('chat.index'),
                icon: Layers,
            },
            {
                title: 'Chat',
                href: route('chat.index'),
                icon: MessageCircle,
            },
        ],
    },

    {
        title: 'Give',
        icon: Heart,
        items: [
            {
                title: 'Donate',
                href: route('donate'),
                icon: HeartHandshake,
            },
            {
                title: 'FundMe / Support a project',
                href: '/fundme',
                icon: HandCoins,
                role: [...ORG_STAR_ROLES],
            },
            {
                title: 'Raffles',
                href: '/raffles',
                icon: Gift,
                permission: 'raffle.read',
                role: [...ORG_STAR_ROLES],
            },
            {
                title: 'Gift cards',
                icon: CreditCard,
                items: [
                    {
                        title: 'Browse & buy',
                        href: route('gift-cards.index'),
                        icon: Gift,
                    },
                    {
                        title: 'My cards',
                        href: route('gift-cards.my-cards'),
                        icon: Wallet,
                        role: 'user',
                    },
                    {
                        title: 'Purchased (organization)',
                        href: route('gift-cards.created'),
                        icon: ShoppingBag,
                        role: [...ORG_STAR_ROLES],
                    },
                ],
            },
        ],
    },

    {
        title: 'Earn & save',
        icon: Wallet,
        items: [
            {
                title: 'Marketplace',
                href: route('marketplace.index'),
                icon: ShoppingCart,
            },
            {
                title: 'Merchant deals',
                href: route('merchant-hub.index'),
                icon: Store,
            },
            {
                title: 'Redeem points',
                href: route('believe-points.index'),
                icon: Coins,
            },
            {
                title: 'Sell products',
                href: '/products',
                icon: Package,
                permission: 'product.read',
                role: [...ORG_STAR_ROLES],
            },
            {
                title: 'My earnings',
                href: '/orders',
                icon: DollarSign,
                permission: 'ecommerce.read',
                role: [...ORG_STAR_ROLES],
            },
        ],
    },

    {
        title: 'Engagement',
        icon: Send,
        role: [...ORG_STAR_ROLES],
        items: [
            {
                title: 'Create engagement',
                href: route('newsletter.create'),
                icon: Mail,
                permission: 'newsletter.create',
            },
            {
                title: 'Drip campaigns (AI)',
                icon: Brain,
                items: [
                    {
                        title: 'Campaigns',
                        href: '/campaigns',
                        icon: Calendar,
                        permission: 'campaign.read',
                    },
                    {
                        title: 'Create campaign',
                        href: '/campaigns/create',
                        icon: CalendarPlus,
                        permission: 'campaign.create',
                    },
                    {
                        title: 'AI campaign generator',
                        href: '/campaigns/ai/create',
                        icon: Star,
                        permission: 'campaign.ai.create',
                    },
                    {
                        title: 'Email invites',
                        href: route('email-invite.index'),
                        icon: Mail,
                        permission: 'email.invite.read',
                    },
                ],
            },
            {
                title: 'Connection hub',
                icon: GraduationCap,
                items: [
                    {
                        title: 'Connections',
                        href: '/admin/courses-events',
                        icon: GraduationCap,
                        permission: 'course.read',
                    },
                    {
                        title: 'Course topics',
                        href: '/topics',
                        icon: BookOpen,
                        permission: ['topic.read', 'dashboard.organization'],
                    },
                ],
                permission: 'course.read',
            },
            {
                title: 'Audience / recipients',
                href: route('newsletter.recipients'),
                icon: Users,
                permission: 'newsletter.read',
            },
            {
                title: 'Usage dashboard',
                href: '/supporter-activity',
                icon: LineChart,
                permission: 'dashboard.read',
            },
        ],
    },

    {
        title: 'Media',
        icon: Video,
        items: [
            {
                title: 'News',
                href: route('nonprofit.news'),
                icon: Newspaper,
            },
            {
                title: 'Unity videos',
                href: route('unity-videos.index'),
                icon: Youtube,
            },
            {
                title: 'Unity live & meet',
                icon: Radio,
                items: [
                    {
                        title: 'Unity live',
                        href: route('unity-live.index'),
                        icon: Video,
                    },
                    {
                        title: 'Livestreams (organization)',
                        href: '/livestreams',
                        icon: Radio,
                        role: [...ORG_STAR_ROLES],
                    },
                    {
                        title: 'Unity meet',
                        href: route('livestreams.supporter.index'),
                        icon: MessageCircle,
                    },
                ],
            },
        ],
    },

    {
        title: 'Tools',
        icon: Monitor,
        items: [
            {
                title: 'Kiosk',
                href: route('kiosk.index'),
                icon: Monitor,
            },
            {
                title: 'Event calendar',
                href: '/events',
                icon: Calendar,
                permission: 'event.read',
                role: [...ORG_STAR_ROLES],
            },
            {
                title: 'Volunteer roster',
                href: '/volunteers',
                icon: UserCheck,
                permission: 'volunteer.read',
                role: [...ORG_STAR_ROLES],
            },
            {
                title: 'AI assistant',
                href: '/ai-chat',
                icon: Bot,
                permission: 'ai.chat.use',
                role: [...ORG_STAR_ROLES],
            },
        ],
    },

    {
        title: 'More',
        icon: Info,
        items: [
            {
                title: 'About',
                href: route('about'),
                icon: Info,
            },
            {
                title: 'Pricing',
                href: route('pricing'),
                icon: Sparkles,
            },
            {
                title: 'Settings / account',
                icon: Settings,
                items: [
                    {
                        title: 'Supporter profile',
                        href: route('user.profile.edit'),
                        icon: UserCheck,
                        role: 'user',
                    },
                    {
                        title: 'Integrations',
                        href: route('user.profile.integrations'),
                        icon: LinkIcon,
                        role: 'user',
                    },
                    {
                        title: 'Organization settings',
                        href: '/settings/profile',
                        icon: Settings,
                        permission: 'profile.read',
                        excludeCareAllianceHub: true,
                    },
                    {
                        title: 'Alliance settings',
                        href: '/settings/profile',
                        icon: Settings,
                        permission: 'profile.read',
                        role: 'care_alliance',
                    },
                    {
                        title: 'Roles & permissions',
                        href: '/permission-management',
                        icon: Shield,
                        permission: 'role.management.read',
                    },
                ],
            },
            {
                title: 'Help / support',
                href: route('contact'),
                icon: MessageCircle,
            },
        ],
    },

    {
        title: 'Organization',
        icon: Building2,
        role: [...ORG_STAR_ROLES],
        items: [
            {
                title: 'Donations (dashboard)',
                href: '/donations',
                icon: HeartHandshake,
                role: 'organization',
            },
            {
                title: 'Project applications',
                href: '/dashboard/project-applications',
                icon: FileText,
                role: ['organization', 'organization_pending', 'admin'],
            },
            {
                title: 'Alliance membership',
                href: '/organization/alliance-membership',
                icon: Users,
                role: ['organization', 'organization_pending'],
                organizationOnlyNav: true,
            },
            {
                title: 'Care Alliance workspace',
                icon: HeartHandshake,
                role: 'care_alliance',
                items: [
                    {
                        title: 'Members',
                        href: '/care-alliance/workspace/members',
                        icon: Users,
                        role: 'care_alliance',
                    },
                    {
                        title: 'Campaigns',
                        href: '/care-alliance/workspace/campaigns',
                        icon: Megaphone,
                        role: 'care_alliance',
                    },
                ],
            },
            {
                title: 'Governance',
                icon: Gavel,
                role: 'organization',
                items: [
                    {
                        title: 'Board',
                        href: '/board-members',
                        icon: Users,
                        role: 'organization',
                    },
                    {
                        title: 'Compliance',
                        href: '/compliance',
                        icon: Shield,
                        role: 'organization',
                    },
                ],
            },
            {
                title: 'Barter network',
                href: '/barter',
                icon: Handshake,
                role: 'organization',
            },
            {
                title: 'Contractors',
                href: '/service-hub',
                icon: Briefcase,
                role: 'organization',
            },
            {
                title: 'Jobs',
                icon: Briefcase,
                items: [
                    {
                        title: 'Position categories',
                        href: '/position-categories',
                        icon: Building2,
                        permission: 'job.position.categories.read',
                    },
                    {
                        title: 'Job positions',
                        href: '/job-positions',
                        icon: Briefcase,
                        permission: 'job.positions.read',
                    },
                    {
                        title: 'Job posts',
                        href: '/job-posts',
                        icon: FileText,
                        permission: 'job.posts.read',
                    },
                    {
                        title: 'Applications',
                        href: '/job-applications',
                        icon: Users,
                        permission: 'job.posts.read',
                    },
                ],
            },
            {
                title: 'Integrations',
                icon: LinkIcon,
                items: [
                    {
                        title: 'Social media',
                        href: route('social-media.index'),
                        icon: Facebook,
                        role: 'organization',
                    },
                    {
                        title: 'YouTube',
                        href: route('integrations.youtube'),
                        icon: Youtube,
                        role: 'organization',
                    },
                    {
                        title: 'Dropbox (recordings)',
                        href: route('integrations.dropbox'),
                        icon: Cloud,
                        role: 'organization',
                    },
                ],
            },
            {
                title: 'Followers & kiosk listings',
                icon: UserCheck,
                role: 'organization',
                items: [
                    {
                        title: 'Followers',
                        href: route('organization.followers.index'),
                        icon: UserCheck,
                        permission: 'organization.followers.read',
                        role: 'organization',
                    },
                    {
                        title: 'Kiosk listings',
                        href: route('organization.kiosk-providers.index'),
                        icon: Monitor,
                        permission: 'organization.followers.read',
                        role: 'organization',
                    },
                ],
            },
            {
                title: 'Marketing & comms (advanced)',
                icon: Megaphone,
                items: [
                    {
                        title: 'Engagement hub',
                        href: '/newsletter',
                        icon: Mail,
                        permission: 'newsletter.read',
                    },
                    {
                        title: 'Announcements',
                        href: '/chat',
                        icon: Bell,
                        permission: 'communication.read',
                    },
                    {
                        title: 'Content items',
                        href: '/content',
                        icon: FileText,
                        permission: 'content.read',
                    },
                    {
                        title: 'Create content',
                        href: '/content/create',
                        icon: Plus,
                        permission: 'content.create',
                    },
                    {
                        title: 'Group chat setup',
                        icon: Send,
                        items: [
                            {
                                title: 'Create',
                                href: '/chat-group-topics',
                                icon: MessageSquare,
                                permission: 'communication.read',
                            },
                            {
                                title: 'Select chat topic',
                                href: '/group-topics/select',
                                icon: MessageSquare,
                                permission: 'communication.read',
                            },
                        ],
                        permission: 'communication.read',
                    },
                ],
            },
            {
                title: 'Commerce (advanced)',
                icon: Store,
                items: [
                    {
                        title: 'Marketplace products',
                        href: '/products',
                        icon: ShoppingCart,
                        permission: 'product.read',
                    },
                    {
                        title: 'Categories',
                        href: '/categories',
                        icon: Tag,
                        permission: 'category.read',
                        role: 'admin',
                    },
                    {
                        title: 'Orders',
                        href: '/orders',
                        icon: Package,
                        permission: 'ecommerce.read',
                    },
                    {
                        title: 'Merchant product pool',
                        href: '/marketplace/product-pool',
                        icon: Package,
                        permission: 'product.read',
                    },
                    {
                        title: 'Merchants (admin)',
                        icon: Store,
                        role: 'admin',
                        items: [
                            {
                                title: 'Merchants',
                                href: '/admin/merchant-hub/merchants',
                                icon: Store,
                                role: 'admin',
                            },
                            {
                                title: 'Offers',
                                href: '/admin/merchant-hub/offers',
                                icon: Gift,
                                role: 'admin',
                            },
                            {
                                title: 'Redemptions',
                                href: '/admin/merchant-hub/redemptions',
                                icon: ShoppingCart,
                                role: 'admin',
                            },
                            {
                                title: 'Categories',
                                href: '/admin/merchant-hub-categories',
                                icon: Tag,
                                role: 'admin',
                            },
                        ],
                    },
                ],
            },
            {
                title: 'Programs (events & courses)',
                icon: GraduationCap,
                items: [
                    {
                        title: 'Events (manage)',
                        icon: Calendar,
                        items: [
                            {
                                title: 'Events',
                                href: '/events',
                                icon: Calendar,
                                permission: 'event.read',
                            },
                            {
                                title: 'Event types',
                                href: '/event-types',
                                icon: Layers,
                                permission: ['event_type.read', 'dashboard.organization'],
                            },
                            {
                                title: 'New event',
                                href: '/events/create',
                                icon: Plus,
                                permission: 'event.create',
                            },
                        ],
                        permission: 'event.read',
                    },
                ],
                permission: 'event.read',
            },
            {
                title: 'Insights (transactions)',
                icon: LineChart,
                permission: 'dashboard.read',
                role: [...ORG_STAR_ROLES],
                items: [
                    {
                        title: 'Overview',
                        href: '/supporter-activity',
                        icon: Activity,
                        permission: 'dashboard.read',
                    },
                    {
                        title: 'Behavior',
                        href: '/supporter-activity?metric=active_supporters',
                        icon: Activity,
                        permission: 'dashboard.read',
                    },
                    {
                        title: 'Engagement',
                        href: '/supporter-activity?metric=event_participants',
                        icon: Activity,
                        permission: 'dashboard.read',
                    },
                    {
                        title: 'Transactions (supporters)',
                        href: '/supporter-activity#transaction-ledger',
                        icon: ScrollText,
                        permission: 'dashboard.read',
                        role: 'organization',
                    },
                    {
                        title: 'Transactions (platform)',
                        href: '/admin/transactions/ledger',
                        icon: ScrollText,
                        role: 'admin',
                    },
                    {
                        title: 'Usage',
                        href: '/supporter-activity?metric=course_participants',
                        icon: Activity,
                        permission: 'dashboard.read',
                    },
                    {
                        title: 'Points',
                        href: '/supporter-activity?metric=donors',
                        icon: Coins,
                        permission: 'dashboard.read',
                    },
                ],
            },
            {
                title: 'System (org / admin)',
                icon: Settings,
                items: [
                    {
                        title: 'SEO settings',
                        href: '/admin/seo',
                        icon: Search,
                        role: 'admin',
                    },
                    {
                        title: 'Challenge Hub',
                        icon: Trophy,
                        role: 'admin',
                        items: [
                            {
                                title: 'Categories',
                                href: route('admin.challenge-hub.categories.index'),
                                icon: Layers,
                                role: 'admin',
                            },
                            {
                                title: 'Tracks',
                                href: route('admin.challenge-hub.tracks.index'),
                                icon: LayoutGrid,
                                role: 'admin',
                            },
                            {
                                title: 'Questions bank',
                                href: route('admin.challenge-hub.questions.index'),
                                icon: BookOpen,
                                role: 'admin',
                            },
                        ],
                    },
                    {
                        title: 'Stripe processing fees',
                        href: '/admin/processing-fees',
                        icon: Percent,
                        role: 'admin',
                    },
                    {
                        title: 'BIU fee (platform)',
                        href: '/admin/biu-fee',
                        icon: Coins,
                        role: 'admin',
                    },
                    {
                        title: 'IRS members',
                        href: '/admin/irs-members',
                        icon: FileText,
                        role: 'admin',
                    },
                    {
                        title: 'Compliance / logs',
                        icon: ClipboardList,
                        items: [
                            {
                                title: 'Compliance reviews',
                                href: '/admin/compliance',
                                icon: ClipboardList,
                                permission: 'compliance.review',
                            },
                            {
                                title: 'KYB verification',
                                href: '/admin/kyb-verification',
                                icon: Shield,
                                permission: 'kyb.verification.read',
                            },
                            {
                                title: 'KYC verification',
                                href: '/admin/kyc-verification',
                                icon: UserCheck,
                                permission: 'kyc.verification.read',
                            },
                            {
                                title: 'Exemption certificates',
                                href: '/admin/exemption-certificates',
                                icon: FileCheck,
                                role: 'admin',
                            },
                        ],
                        permission: 'compliance.review',
                    },
                    {
                        title: 'Billing / plans',
                        icon: CreditCard,
                        items: [
                            {
                                title: 'Plans management',
                                href: '/admin/plans',
                                icon: Sparkles,
                                role: 'admin',
                            },
                            {
                                title: 'Wallet plans management',
                                href: '/admin/wallet-plans',
                                icon: Wallet,
                                permission: 'wallet.plan.read',
                            },
                            {
                                title: 'Email packages',
                                href: '/admin/email-packages',
                                icon: Mail,
                                role: 'admin',
                            },
                            {
                                title: 'Reward points',
                                href: '/admin/reward-points',
                                icon: Gift,
                                permission: 'reward.point.manage',
                            },
                            {
                                title: 'Believe Points (admin)',
                                href: '/admin/believe-points',
                                icon: Coins,
                                role: 'admin',
                            },
                        ],
                        permission: 'wallet.plan.read',
                    },
                    {
                        title: 'About page',
                        href: '/admin/about',
                        icon: Info,
                        role: 'admin',
                    },
                    {
                        title: 'Service categories',
                        href: '/admin/service-categories',
                        icon: FolderOpen,
                        role: 'admin',
                    },
                    {
                        title: 'Org primary action categories',
                        href: '/admin/primary-action-categories',
                        icon: LayoutGrid,
                        role: 'admin',
                    },
                    {
                        title: 'Service hub settings',
                        href: '/settings/service-hub',
                        icon: ShoppingBag,
                        role: 'admin',
                    },
                    {
                        title: 'Kiosk management',
                        icon: Monitor,
                        role: 'admin',
                        items: [
                            {
                                title: 'Categories',
                                href: '/admin/kiosk',
                                icon: LayoutGrid,
                                role: 'admin',
                            },
                            {
                                title: 'Subcategories',
                                href: '/admin/kiosk/subcategories',
                                icon: Layers,
                                role: 'admin',
                            },
                            {
                                title: 'Kiosk requests',
                                href: '/admin/kiosk/requests',
                                icon: ClipboardList,
                                role: 'admin',
                            },
                            {
                                title: 'Providers',
                                href: '/admin/kiosk/providers',
                                icon: Store,
                                role: 'admin',
                            },
                        ],
                    },
                    {
                        title: 'Promotional banners',
                        href: '/admin/promotional-banners',
                        icon: Megaphone,
                        role: 'admin',
                        permission: 'promotional.banner.read',
                    },
                    {
                        title: 'Contact page',
                        href: '/admin/contact-page',
                        icon: MessageCircle,
                        role: 'admin',
                    },
                    {
                        title: 'Contact submissions',
                        href: '/admin/contact-submissions',
                        icon: Mail,
                        role: 'admin',
                    },
                    {
                        title: 'Fundraise leads',
                        href: '/admin/fundraise-leads',
                        icon: TrendingUp,
                        role: 'admin',
                    },
                    {
                        title: 'Push notifications (FCM)',
                        href: '/admin/push-notifications',
                        icon: Bell,
                        role: 'admin',
                    },
                ],
            },
        ],
    },

    {
        title: 'Platform administration',
        icon: Shield,
        role: 'admin',
        items: [
            {
                title: 'Node management',
                icon: Network,
                items: [
                    {
                        title: 'Node Boss',
                        href: '/node-boss',
                        icon: AlignEndHorizontal,
                        permission: 'node.referral.read',
                    },
                    {
                        title: 'Node referral',
                        href: '/node-referral',
                        icon: Network,
                        permission: 'node.referral.read',
                    },
                    {
                        title: 'Withdrawals',
                        href: '/withdrawals',
                        icon: HandCoins,
                        permission: 'data.management.read',
                    },
                ],
                permission: 'node.referral.read',
            },
            {
                title: 'Code management',
                icon: FileCode,
                role: 'admin',
                items: [
                    {
                        title: 'Classification codes',
                        href: '/classification-codes',
                        icon: FileCode,
                        permission: 'classification.code.read',
                    },
                    {
                        title: 'Status codes',
                        href: '/status-codes',
                        icon: Hash,
                        permission: 'status.code.read',
                    },
                    {
                        title: 'Deductibility codes',
                        href: '/deductibility-codes',
                        icon: Percent,
                        permission: 'deductibility.code.read',
                    },
                    {
                        title: 'NTEE codes',
                        href: '/ntee-codes',
                        icon: Building,
                        permission: 'ntee.code.read',
                    },
                ],
                permission: 'classification.code.read',
            },
            {
                title: 'Data management',
                icon: Database,
                items: [
                    {
                        title: 'Upload data',
                        href: '/upload',
                        icon: Download,
                        permission: 'data.management.read',
                    },
                    {
                        title: 'Manage data',
                        href: '/manage-data',
                        icon: Database,
                        permission: 'data.management.read',
                    },
                ],
                permission: 'data.management.read',
            },
            {
                title: 'Application management',
                icon: FileCheck,
                permission: 'form1023.application.read',
                items: [
                    {
                        title: 'Form 1023 applications',
                        href: '/admin/form1023',
                        icon: FileCheck,
                        permission: 'form1023.application.read',
                    },
                    {
                        title: 'Compliance reviews',
                        href: '/admin/compliance',
                        icon: ClipboardList,
                        permission: 'compliance.review',
                    },
                    {
                        title: 'Fees',
                        href: '/admin/fees',
                        icon: DollarSign,
                        permission: 'application.fees.read',
                    },
                ],
            },
            {
                title: 'Fractional ownership',
                icon: Coins,
                role: 'admin',
                items: [
                    {
                        title: 'Orders & buyers',
                        href: '/admin/fractional/orders',
                        icon: ShoppingCart,
                        role: 'admin',
                    },
                    {
                        title: 'Assets',
                        href: '/admin/fractional/assets',
                        icon: Coins,
                        role: 'admin',
                    },
                    {
                        title: 'Offerings',
                        href: '/admin/fractional/offerings',
                        icon: PieChart,
                        role: 'admin',
                    },
                ],
            },
            {
                title: 'Livestock management',
                icon: Heart,
                permission: 'admin.livestock.read',
                items: [
                    {
                        title: 'Livestock',
                        href: '/admin/livestock/listings',
                        icon: Heart,
                        permission: 'admin.livestock.read',
                    },
                    {
                        title: 'Sellers',
                        href: '/admin/livestock/sellers',
                        icon: Users,
                        permission: 'admin.livestock.read',
                    },
                    {
                        title: 'Buyers',
                        href: '/admin/livestock/buyers',
                        icon: ShoppingCart,
                        permission: 'admin.livestock.read',
                    },
                ],
            },
            {
                title: 'Country management',
                icon: Building,
                permission: 'admin.countries.read',
                items: [
                    {
                        title: 'Countries',
                        href: '/admin/countries',
                        icon: Building,
                        permission: 'admin.countries.read',
                    },
                ],
            },
            {
                title: 'User management',
                icon: Users,
                permission: 'role.management.read',
                items: [
                    {
                        title: 'Users',
                        href: route('users.list'),
                        icon: Users,
                        permission: 'role.management.read',
                    },
                ],
            },
            {
                title: 'Service hub management',
                icon: ShoppingBag,
                role: 'admin',
                items: [
                    {
                        title: 'Service sellers',
                        href: '/admin/service-sellers',
                        icon: Users,
                        role: 'admin',
                    },
                    {
                        title: 'Service categories',
                        href: '/admin/service-categories',
                        icon: FolderOpen,
                        role: 'admin',
                    },
                ],
            },
        ],
    },
];
