import { Head, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Activity, Calendar, DollarSign, User } from 'lucide-react';
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

export default function Dashboard({totalOrg}: {totalOrg: number}) {
    const { auth } = usePage().props;
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
        pendingDonations: 3,
    };

    const stats = userRole === 'admin' ? adminStats : organizationStats;

    // Role-specific welcome messages
    const welcomeMessages = {
        admin: `Welcome back, Administrator ${auth.user?.name}!`,
        organization: `Welcome, ${auth.user?.name}! Ready to manage your organization?`,
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
                            : 'Your organization dashboard'}
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
                                title="Pending Donations"
                                value={stats.pendingDonations}
                                icon={<DollarSign className="h-6 w-6" />}
                            />
                        </>
                    )}
                </div>

                {/* Recent Activity and Quick Actions */}
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
            </div>
        </AppLayout>
    );
}
