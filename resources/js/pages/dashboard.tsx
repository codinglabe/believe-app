import { Head, Link, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Activity, Building, Calendar, Check, ChevronLeft, ChevronRight, DollarSign, ExternalLink, FileText, Globe, Heart, Mail, MapPin, Phone, Plus, Share2, ShoppingCart, Star, User } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/frontend/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/frontend/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/frontend/ui/button';
// import { IconActivity, IconDonation, IconUsers, IconCalendarStats } from '@/components/icons';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

type StatCardProps = {
    title: string;
    value: string | number;
    change?: number;
    icon: React.ReactNode;
};

const StatCard = ({ title, value, change, icon }: StatCardProps) => {
    return (
        <div className="bg-card border-border rounded-lg border p-6 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-muted-foreground text-sm font-medium">{title}</p>
                    <h3 className="text-2xl font-bold">{value}</h3>
                    {change !== undefined && (
                        <p className={`text-sm ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% from last month
                        </p>
                    )}
                </div>
                <div className="bg-primary/15 rounded-lg p-3 text-primary">{icon}</div>
            </div>
        </div>
    );
};

type ActivityItem = {
    id: number;
    type: 'donation' | 'event' | 'volunteer' | 'other';
    title: string;
    description: string;
    date: string;
    user?: string;
};

const RecentActivityItem = ({ activity }: { activity: ActivityItem }) => {
    const getIcon = () => {
        switch (activity.type) {
            case 'donation':
                return <DollarSign className="h-5 w-5 text-green-500" />;
            case 'event':
                return <Calendar className="h-5 w-5 text-blue-500" />;
            case 'volunteer':
                return <User className="h-5 w-5 text-purple-500" />;
            default:
                return <Activity className="h-5 w-5 text-gray-500" />;
        }
    };

    return (
        <div className="flex items-start gap-4 py-3">
            <div className="mt-1">{getIcon()}</div>
            <div className="flex-1">
                <h4 className="font-medium">{activity.title}</h4>
                <p className="text-muted-foreground text-sm">{activity.description}</p>
                {activity.user && (
                    <p className="text-muted-foreground text-xs">By {activity.user}</p>
                )}
            </div>
            <div className="text-muted-foreground text-xs">{activity.date}</div>
        </div>
    );
};

export default function Dashboard({totalOrg, orgInfo, totalFav}: {totalOrg: number, orgInfo: any, totalFav: number}) {
    const { auth } = usePage().props;
    const organization = orgInfo;
    const userRole = auth.user?.role; // 'admin' or 'organization'

    // Common stats for all roles
    const commonStats = {
        totalDonations: 12540,
        donationChange: 12.5,
        totalEvents: 8,
        eventsChange: -2,
    };

    // Role-specific stats
    const adminStats = {
        ...commonStats,
        totalVolunteers: 42,
        volunteersChange: 5,
        upcomingEvents: 3,
        organizationsManaged: totalOrg,
    };

    const organizationStats = {
        ...commonStats,
        myVolunteers: 15,
        myUpcomingEvents: 2,
        totalFav: totalFav,
    };

    const stats = userRole === 'admin' ? adminStats : organizationStats;

    // Role-specific welcome messages
    const welcomeMessages = {
        admin: `Welcome back, Administrator ${auth.user?.name}!`,
        organization: `Welcome, ${organization?.name}!`,
    };

    // Role-specific quick actions
    const quickActions = {
        admin: [
            { label: 'Manage Organizations', color: 'primary' },
            { label: 'System Settings', color: 'secondary' },
            { label: 'Create Global Event', color: 'accent' },
            { label: 'Generate System Report', color: 'muted' },
        ],
        organization: [
            { label: 'Create New Event', color: 'primary' },
            { label: 'Record Donation', color: 'secondary' },
            { label: 'Add Volunteer', color: 'accent' },
            { label: 'Generate Report', color: 'muted' },
        ],
    };

    const recentActivities: ActivityItem[] = [
        {
            id: 1,
            type: 'donation',
            title: 'New donation received',
            description: '$1,250 from John Doe',
            date: '2 hours ago',
            user: 'Jane Smith',
        },
        {
            id: 2,
            type: 'event',
            title: 'Community outreach scheduled',
            description: 'Event planned for next Saturday',
            date: '1 day ago',
        },
        {
            id: 3,
            type: 'volunteer',
            title: 'New volunteer joined',
            description: 'Michael Johnson signed up',
            date: '2 days ago',
        },
        {
            id: 4,
            type: 'donation',
            title: 'Monthly recurring donation',
            description: '$200 from Acme Corp',
            date: '3 days ago',
        },
    ];

return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex flex-col gap-6 m-3 md:m-6">
                {/* Welcome Section with role-based message */}
                <div className="bg-card border-border rounded-lg border p-6 shadow-sm">
                    <h1 className="text-2xl font-bold">
                        {welcomeMessages[userRole as keyof typeof welcomeMessages] || 'Welcome!'}
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        {userRole === 'admin'
                            ? 'System overview and management tools'
                            : 'EIN: ' + organization.ein}
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Total Donations"
                        value={`$${stats.totalDonations.toLocaleString()}`}
                        change={stats.donationChange}
                        icon={<DollarSign className="h-6 w-6" />}
                    />
                    <StatCard
                        title="Total Events"
                        value={stats.totalEvents}
                        change={stats.eventsChange}
                        icon={<Calendar className="h-6 w-6" />}
                    />

                    {/* Admin-specific stats */}
                    {userRole === 'admin' && (
                        <>
                            <StatCard
                                title="Active Volunteers"
                                value={stats.totalVolunteers}
                                change={stats.volunteersChange}
                                icon={<User className="h-6 w-6" />}
                            />
                            <StatCard
                                title="Organizations"
                                value={stats.organizationsManaged}
                                icon={<User className="h-6 w-6" />}
                            />
                        </>
                    )}

                    {/* Organization-specific stats */}
                    {userRole === 'organization' && (
                        <>
                            <StatCard
                                title="My Volunteers"
                                value={stats.myVolunteers}
                                icon={<User className="h-6 w-6" />}
                            />
                            <StatCard
                                title="Total Favorites"
                                value={stats.totalFav}
                                icon={<Heart className="h-6 w-6" />}
                            />
                        </>
                    )}
            </div>
            {userRole === 'organization' && (
            <div className="mx-auto w-full px-0 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-3">
                    <Tabs defaultValue="about" className="w-full">
                        <TabsList className="grid w-full grid-cols-5 mb-8">
                        <TabsTrigger value="about" className="text-xs sm:text-sm cursor-pointer">
                            About
                        </TabsTrigger>
                        <TabsTrigger value="impact" className="text-xs sm:text-sm cursor-pointer">
                            Impact
                        </TabsTrigger>
                        <TabsTrigger value="details" className="text-xs sm:text-sm cursor-pointer">
                            Details
                                    </TabsTrigger>
                                    <TabsTrigger value="product" className="text-xs sm:text-sm cursor-pointer">
                                        <Link href={route("products.index")} className='w-full'>
                                            Products
                                        </Link>
                                    </TabsTrigger>
                        <TabsTrigger value="contact" className="text-xs sm:text-sm cursor-pointer">
                            Contact
                        </TabsTrigger>
                        </TabsList>

                        <TabsContent value="about" className="space-y-6">
                        <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-gray-700">
                            <CardHeader>
                            <CardTitle className="text-gray-900 dark:text-white text-xl">About Our Mission</CardTitle>
                            </CardHeader>
                            <CardContent>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                                {organization.description}
                            </p>

                            <div className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 p-6 rounded-r-lg">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Our Mission</h3>
                                <p className="text-gray-700 dark:text-gray-300">{organization.mission}</p>
                            </div>
                            </CardContent>
                        </Card>
                        </TabsContent>

                        <TabsContent value="impact" className="space-y-6">
                        {/* Impact Statistics - You can customize these with your actual data */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 text-center">
                            <CardContent className="pt-6">
                                <div className="text-3xl font-bold text-blue-600 mb-2">
                                250,000+
                                </div>
                                <div className="text-gray-600 dark:text-gray-300">People Served</div>
                            </CardContent>
                            </Card>

                            <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 text-center">
                            <CardContent className="pt-6">
                                <div className="text-3xl font-bold text-green-600 mb-2">150+</div>
                                <div className="text-gray-600 dark:text-gray-300">Projects Completed</div>
                            </CardContent>
                            </Card>

                            <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 text-center">
                            <CardContent className="pt-6">
                                <div className="text-3xl font-bold text-purple-600 mb-2">25+</div>
                                <div className="text-gray-600 dark:text-gray-300">Countries Active</div>
                            </CardContent>
                            </Card>
                        </div>

                        {/* Recent Projects - You can customize these with your actual data */}
                        <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-gray-700">
                            <CardHeader>
                            <CardTitle className="text-gray-900 dark:text-white text-xl">Recent Projects</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="w-1 h-16 rounded-full bg-blue-500" />
                                <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Water Well Construction</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    Completed March 2024 • Serving 2,500 people
                                </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-1 h-16 rounded-full bg-green-500" />
                                <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Community Training Program</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    Completed February 2024 • 150 families trained
                                </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-1 h-16 rounded-full bg-purple-500" />
                                <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">School Water System</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    Completed January 2024 • 800 students benefited
                                </p>
                                </div>
                            </div>
                            </CardContent>
                        </Card>
                        </TabsContent>

                        <TabsContent value="details" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* IRS Information */}
                            <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-gray-900 dark:text-white flex items-center">
                                <FileText className="mr-2 h-5 w-5" />
                                IRS Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-sm text-gray-600 dark:text-gray-300">EIN</span>
                                    <div className="font-mono text-gray-900 dark:text-white">{organization.ein}</div>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-600 dark:text-gray-300">Classification</span>
                                    <div className="text-gray-900 dark:text-white">{organization.classification}</div>
                                </div>
                                </div>

                                <div>
                                <span className="text-sm text-gray-600 dark:text-gray-300">Legal Name</span>
                                <div className="text-gray-900 dark:text-white">{organization.name}</div>
                                </div>

                                <div>
                                <span className="text-sm text-gray-600 dark:text-gray-300">In Care Of</span>
                                <div className="text-gray-900 dark:text-white">{organization.ico || "N/A"}</div>
                                </div>

                                <div>
                                <span className="text-sm text-gray-600 dark:text-gray-300">Address</span>
                                <div className="text-gray-900 dark:text-white">{organization.street}</div>
                                <div className="text-gray-900 dark:text-white">{organization.city}, {organization.state} {organization.zip}</div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-sm text-gray-600 dark:text-gray-300">Ruling Year</span>
                                    <div className="text-gray-900 dark:text-white">{organization.ruling}</div>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-600 dark:text-gray-300">Tax Deductible</span>
                                    <div className="text-gray-900 dark:text-white">
                                        {organization.deductibility || 'Yes'}
                                    </div>
                                </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-sm text-gray-600 dark:text-gray-300">Organization Type</span>
                                    <div className="text-gray-900 dark:text-white">{organization.organization}</div>
                                </div>
                                <div>
                                                        <span className="text-sm text-gray-600 dark:text-gray-300">Status</span>
                                                        <br />
                                    <Badge
                                    variant="secondary"
                                    className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                    >
                                    {organization.status}
                                    </Badge>
                                </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-sm text-gray-600 dark:text-gray-300">NTEE Code</span>
                                    <div className="text-gray-900 dark:text-white">{organization.ntee_code || 'N/A'}</div>
                                </div>
                                {/* <div>
                                    <span className="text-sm text-gray-600 dark:text-gray-300">Filing Requirement</span>
                                    <div className="text-gray-900 dark:text-white">{organization.filing_req}</div>
                                </div> */}
                                </div>
                            </CardContent>
                            </Card>

                            {/* Organization Details */}
                            <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-gray-900 dark:text-white flex items-center">
                                <Building className="mr-2 h-5 w-5" />
                                Organization Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                <span className="text-sm text-gray-600 dark:text-gray-300">Primary Contact</span>
                                <div className="text-gray-900 dark:text-white">{organization.contact_name}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">{organization.contact_title}</div>
                                </div>

                                <div>
                                <span className="text-sm text-gray-600 dark:text-gray-300">Email</span>
                                <div className="text-blue-600 hover:underline">
                                    <a href={`mailto:${organization.email}`}>{organization.email}</a>
                                </div>
                                </div>

                                <div>
                                <span className="text-sm text-gray-600 dark:text-gray-300">Phone</span>
                                <div className="text-gray-900 dark:text-white">{organization.phone}</div>
                                </div>

                                <div>
                                <span className="text-sm text-gray-600 dark:text-gray-300">Website</span>
                                <div className="text-blue-600 hover:underline">
                                    <a href={organization.website} target="_blank" className="flex items-center gap-1">
                                    {organization.website}
                                    <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                                </div>

                                <div>
                                <span className="text-sm text-gray-600 dark:text-gray-300">Founded</span>
                                <div className="text-gray-900 dark:text-white">{organization.ruling}</div>
                                </div>

                                <div>
                                <span className="text-sm text-gray-600 dark:text-gray-300">Verification Status</span>
                                <div className="flex items-center gap-2 text-green-600">
                                    <Check className="h-4 w-4" />
                                    <span>Verified Organization</span>
                                </div>
                                </div>
                            </CardContent>
                            </Card>
                        </div>
                        </TabsContent>

                        <TabsContent value="contact" className="space-y-6">
                        <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-gray-700">
                            <CardHeader>
                            <CardTitle className="text-gray-900 dark:text-white text-xl">Contact Information</CardTitle>
                            </CardHeader>
                            <CardContent>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Contact Information */}
                                <div className="space-y-6">
                                <div>
                                    <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-4 w-4 text-gray-500" />
                                        <a href={`mailto:${organization.email}`} className="text-blue-600 hover:underline">
                                        {organization.email}
                                        </a>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-4 w-4 text-gray-500" />
                                        <span className="text-gray-600 dark:text-gray-300">{organization.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Globe className="h-4 w-4 text-gray-500" />
                                        <a
                                        href={organization.website}
                                        target="_blank"
                                        className="text-blue-600 hover:underline"
                                        >
                                        {organization.website}
                                        </a>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                                        <div>
                                        <div className="text-gray-600 dark:text-gray-300">{organization.street}</div>
                                        <div className="text-gray-600 dark:text-gray-300">{organization.city}, {organization.state} {organization.zip}</div>
                                        </div>
                                    </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Primary Contact</h4>
                                    <div className="text-gray-600 dark:text-gray-300">{organization.contact_name}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{organization.contact_title}</div>
                                </div>
                                </div>
                            </div>
                            </CardContent>
                        </Card>
                        </TabsContent>
                    </Tabs>
                    </div>
                </div>
            </div>
                    )}

            {userRole === 'admin' && (
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Recent Activity - can be role-specific if needed */}
                    <div className="bg-card border-border rounded-lg border p-6 shadow-sm lg:col-span-2">
                        <h2 className="mb-4 text-xl font-semibold">
                            {userRole === 'admin' ? 'System Activity' : 'Recent Activity'}
                        </h2>
                        <div className="divide-y">
                            {recentActivities.map((activity) => (
                                <RecentActivityItem key={activity.id} activity={activity} />
                            ))}
                        </div>
                    </div>

                    {/* Quick Actions - role-specific */}
                    <div className="bg-card border-border rounded-lg border p-6 shadow-sm">
                        <h2 className="mb-4 text-xl font-semibold">Quick Actions</h2>
                        <div className="space-y-3">
                            {quickActions[userRole as keyof typeof quickActions]?.map((action, index) => (
                                <button
                                    key={index}
                                    className={`hover:bg-${action.color}/90 w-full rounded-lg bg-${action.color} px-4 py-2 text-sm font-medium text-white transition-colors`}
                                >
                                    {action.label}
                                </button>
                            ))}
                        </div>

                        <div className="mt-6">
                            <h3 className="mb-3 text-lg font-medium">Upcoming Events</h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full">
                                        <Calendar className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Food Drive</p>
                                        <p className="text-muted-foreground text-sm">Tomorrow, 10 AM</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full">
                                        <Calendar className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Board Meeting</p>
                                        <p className="text-muted-foreground text-sm">June 15, 2 PM</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </AppLayout>
    );
}
