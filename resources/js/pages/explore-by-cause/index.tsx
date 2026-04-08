import React, { useState, useEffect } from 'react';
import { Head, router, Link, usePage } from '@inertiajs/react';
import toast from 'react-hot-toast';
import FrontendLayout from '@/layouts/frontend/frontend-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Heart, Users, Calendar, BookOpen, Briefcase, Building2,
    MapPin, Clock, ArrowRight, Star, CheckCircle2, HandHeart
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InterestCategory {
    id: number;
    name: string;
    slug: string;
    description?: string | null;
}

interface OrgItem {
    id: number;
    name: string;
    logo: string | null;
    description: string | null;
    city: string | null;
    state: string | null;
    website: string | null;
    is_following: boolean;
}

interface EventItem {
    id: number;
    title: string;
    description: string | null;
    start_date: string | null;
    end_date: string | null;
    location: string | null;
}

interface CourseItem {
    id: number;
    title: string;
    slug: string;
    description: string | null;
    start_date: string | null;
    format: string | null;
    is_free: boolean;
    fee: number | null;
}

interface VolunteerItem {
    id: number;
    title: string;
    description: string | null;
    location: string | null;
    date_posted: string | null;
    deadline: string | null;
}

interface ImpactCounts {
    organizations: number;
    events: number;
    courses: number;
    volunteers: number;
}

interface Props {
    categories: InterestCategory[];
    selectedCategory: InterestCategory | null;
    organizations: OrgItem[];
    events: EventItem[];
    courses: CourseItem[];
    volunteers: VolunteerItem[];
    impactCounts: ImpactCounts;
    myCauses: InterestCategory[];
    canFollowOrganizations: boolean;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function OrganizationCard({ org, canFollowOrganizations }: { org: OrgItem; canFollowOrganizations: boolean }) {
    const { auth } = usePage<{ auth?: { user?: { id?: number } } }>().props;
    const [followed, setFollowed] = useState(org.is_following);

    useEffect(() => {
        setFollowed(org.is_following);
    }, [org.is_following]);

    const handleFollow = () => {
        router.post(`/organizations/${org.id}/toggle-favorite`, { toggle_favorite_context: 'organization' }, {
            preserveScroll: true,
            // Inertia v2 defaults POST to preserveState: true, which can keep stale org rows / follow UI after redirect
            preserveState: false,
            onSuccess: page => {
                const props = page.props as {
                    organizations?: OrgItem[];
                    flash?: { error?: string };
                    error?: string;
                };
                const flashErr = props.flash?.error;
                const err = (typeof flashErr === 'string' && flashErr) || (typeof props.error === 'string' && props.error);
                if (err) {
                    toast.error(err);
                    return;
                }
                const row = props.organizations?.find(o => o.id === org.id);
                if (row) {
                    setFollowed(row.is_following);
                } else {
                    setFollowed(f => !f);
                }
            },
            onError: () => {
                toast.error('Could not update follow. Please try again.');
            },
        });
    };

    const followControl = !auth?.user ? (
        <Link href="/login" className="flex-1">
            <Button variant="outline" size="sm" className="w-full text-xs">
                <Users className="w-3 h-3 mr-1" />
                Sign in to follow
            </Button>
        </Link>
    ) : !canFollowOrganizations ? (
        <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 text-xs opacity-60 cursor-not-allowed"
            disabled
            title="Only supporter accounts can follow organizations"
        >
            <Users className="w-3 h-3 mr-1" />
            Follow
        </Button>
    ) : (
        <Button
            type="button"
            variant="outline"
            size="sm"
            className={`flex-1 text-xs transition-colors ${followed ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-200' : ''}`}
            onClick={handleFollow}
        >
            <Users className="w-3 h-3 mr-1" />
            {followed ? 'Unfollow' : 'Follow'}
        </Button>
    );

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0 overflow-hidden">
                        {org.logo ? (
                            <img src={org.logo} alt={org.name} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                            <Building2 className="w-6 h-6 text-blue-500" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">{org.name}</h3>
                        {org.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{org.description}</p>
                        )}
                        {(org.city || org.state) && (
                            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {[org.city, org.state].filter(Boolean).join(', ')}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex gap-2 mt-3">
                    {followControl}
                    <Link href="/donate" className="flex-1">
                        <Button size="sm" className="w-full text-xs bg-orange-500 hover:bg-orange-600 text-white border-0">
                            <Heart className="w-3 h-3 mr-1" /> Donate
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}

function EventCard({ event }: { event: EventItem }) {
    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{event.title}</h3>
                        {event.start_date && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {event.start_date}{event.end_date && event.end_date !== event.start_date ? ` – ${event.end_date}` : ''}
                            </p>
                        )}
                        {event.location && (
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {event.location}
                            </p>
                        )}
                        {event.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{event.description}</p>
                        )}
                    </div>
                    <Link href={`/events/${event.id}/view`}>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs whitespace-nowrap border-0">
                            RSVP
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}

function CourseCard({ course }: { course: CourseItem }) {
    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{course.title}</h3>
                        {course.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{course.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                            {course.format && (
                                <Badge variant="secondary" className="text-xs">{course.format}</Badge>
                            )}
                            <span className="text-xs text-green-600 font-medium">
                                {course.is_free ? 'Free' : course.fee ? `$${course.fee}` : ''}
                            </span>
                        </div>
                    </div>
                    <Link href={`/courses/${course.slug}/enroll`}>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs whitespace-nowrap border-0">
                            Enroll
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}

function VolunteerCard({ volunteer }: { volunteer: VolunteerItem }) {
    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{volunteer.title}</h3>
                        {volunteer.location && (
                            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {volunteer.location}
                            </p>
                        )}
                        {volunteer.deadline && (
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Deadline: {volunteer.deadline}
                            </p>
                        )}
                        {volunteer.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{volunteer.description}</p>
                        )}
                    </div>
                    <Link href={`/jobs/${volunteer.id}/apply`}>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs whitespace-nowrap border-0">
                            Apply
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabType = 'all' | 'organizations' | 'events' | 'courses' | 'volunteers';

export default function ExploreByCause({
    categories,
    selectedCategory,
    organizations,
    events,
    courses,
    volunteers,
    impactCounts,
    myCauses,
    canFollowOrganizations,
}: Props) {
    const { auth } = usePage<{ auth?: { user?: { id?: number } } }>().props;

    const validTabs: TabType[] = ['all', 'organizations', 'events', 'courses', 'volunteers'];

    const getTabFromUrl = (): TabType => {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('tab') as TabType;
        return validTabs.includes(t) ? t : 'all';
    };

    // Sync with ?tab= on first paint so follow/unfollow (preserveState: false) does not jump back to "All"
    const [activeTab, setActiveTab] = useState<TabType>(() =>
        typeof window !== 'undefined' ? getTabFromUrl() : 'all'
    );

    // When user changes tab, update URL query param (no page reload)
    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        const params = new URLSearchParams(window.location.search);
        if (tab === 'all') {
            params.delete('tab');
        } else {
            params.set('tab', tab);
        }
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, '', newUrl);
    };

    // When cause changes, keep the current tab in the URL
    const handleCauseChange = (slug: string) => {
        const params: Record<string, string> = { interest: slug };
        if (activeTab !== 'all') params.tab = activeTab;
        router.get('/explore-by-cause', params, { preserveScroll: false });
    };

    const handleToggleInterest = (categoryId: number) => {
        router.post(`/explore-by-cause/toggle-interest/${categoryId}`, {}, {
            preserveScroll: true,
            onSuccess: page => {
                const flash = (page.props as { flash?: { error?: string } }).flash;
                if (flash?.error) {
                    toast.error(flash.error);
                    return;
                }
                router.reload({ only: ['myCauses'] });
            },
            onError: () => toast.error('Could not update your causes.'),
        });
    };

    const tabs: { key: TabType; label: string; count: number; icon: React.ReactNode }[] = [
        { key: 'all', label: 'All', count: organizations.length + events.length + courses.length + volunteers.length, icon: null },
        { key: 'organizations', label: 'Organizations', count: organizations.length, icon: <Building2 className="w-3.5 h-3.5" /> },
        { key: 'events', label: 'Events', count: events.length, icon: <Calendar className="w-3.5 h-3.5" /> },
        { key: 'courses', label: 'Courses', count: courses.length, icon: <BookOpen className="w-3.5 h-3.5" /> },
        { key: 'volunteers', label: 'Volunteers', count: volunteers.length, icon: <HandHeart className="w-3.5 h-3.5" /> },
    ];

    const isEmpty = organizations.length === 0 && events.length === 0 && courses.length === 0 && volunteers.length === 0;

    return (
        <FrontendLayout>
            <Head title={`Explore by Cause${selectedCategory ? ` – ${selectedCategory.name}` : ''}`} />

            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

                {/* ── Page Title ─────────────────────────────────────────── */}
                <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-4 px-4">
                    <div className="max-w-6xl mx-auto">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Explore by Cause</h1>
                    </div>
                </div>

                {/* ── Top Header Bar ─────────────────────────────────────── */}
                <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="max-w-6xl mx-auto px-4 py-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            {/* Title + Cause Selector */}
                            <div className="flex items-center gap-3 flex-1">
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                    Select Cause:
                                </span>
                                <Select
                                    value={selectedCategory?.slug ?? ''}
                                    onValueChange={handleCauseChange}
                                >
                                    <SelectTrigger className="w-44 bg-white dark:bg-gray-700">
                                        <SelectValue placeholder="Choose a cause…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map(cat => (
                                            <SelectItem key={cat.slug} value={cat.slug}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-2">
                                {!auth?.user ? (
                                    <Link href="/login">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                        >
                                            <Users className="w-3.5 h-3.5 mr-1" />
                                            Sign in to follow cause
                                        </Button>
                                    </Link>
                                ) : !canFollowOrganizations ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="text-blue-600 border-blue-300 opacity-60 cursor-not-allowed"
                                        disabled
                                        title="Only supporter accounts can follow causes"
                                    >
                                        <Users className="w-3.5 h-3.5 mr-1" />
                                        Follow cause
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                        onClick={() => selectedCategory && handleToggleInterest(selectedCategory.id)}
                                    >
                                        <Users className="w-3.5 h-3.5 mr-1" />
                                        Follow cause
                                    </Button>
                                )}
                                <Link href="/donate">
                                    <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white border-0">
                                        <Heart className="w-3.5 h-3.5 mr-1" />
                                        Donate
                                    </Button>
                                </Link>
                                <Link href="/groups">
                                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white border-0">
                                        <Users className="w-3.5 h-3.5 mr-1" />
                                        Join Group
                                    </Button>
                                </Link>
                                <Link href="/volunteer-opportunities">
                                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white border-0">
                                        <HandHeart className="w-3.5 h-3.5 mr-1" />
                                        Volunteer
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        {/* Cause Description */}
                        {selectedCategory?.description && (
                            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                                <span className="font-semibold text-gray-800 dark:text-gray-200">
                                    Explore everything about {selectedCategory.name}:
                                </span>{' '}
                                {selectedCategory.description}
                            </p>
                        )}
                    </div>
                </div>

                {/* ── Main Content ────────────────────────────────────────── */}
                <div className="max-w-6xl mx-auto px-4 py-6">
                    <div className="flex flex-col lg:flex-row gap-6">

                        {/* ── Left Column: Feed ──────────────────────────── */}
                        <div className="flex-1 min-w-0">

                            {/* Filter Tabs */}
                            <div className="flex gap-1 overflow-x-auto pb-1 mb-4 scrollbar-none">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => handleTabChange(tab.key)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                                            activeTab === tab.key
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                                        }`}
                                    >
                                        {tab.icon}
                                        {tab.label}
                                        {tab.count > 0 && (
                                            <span className={`text-xs rounded-full px-1.5 py-0.5 ml-0.5 ${
                                                activeTab === tab.key
                                                    ? 'bg-blue-500 text-blue-100'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                            }`}>
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                ))}
                                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 ml-auto">
                                    ⚙ Filter
                                </button>
                            </div>

                            {/* Empty State */}
                            {isEmpty && (
                                <div className="text-center py-16">
                                    <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-4">
                                        <Star className="w-8 h-8 text-blue-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                        Nothing yet for {selectedCategory?.name}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Be the first to add organizations, events, or volunteer opportunities for this cause.
                                    </p>
                                </div>
                            )}

                            {/* Organizations */}
                            {(activeTab === 'all' || activeTab === 'organizations') && organizations.length > 0 && (
                                <section className="mb-6">
                                    {activeTab === 'all' && (
                                        <div className="flex items-center justify-between mb-3">
                                            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-blue-500" />
                                                Organizations
                                            </h2>
                                            <button onClick={() => handleTabChange('organizations')} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                                View all <ArrowRight className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {(activeTab === 'all' ? organizations.slice(0, 4) : organizations).map(org => (
                                            <OrganizationCard key={org.id} org={org} canFollowOrganizations={canFollowOrganizations} />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Events */}
                            {(activeTab === 'all' || activeTab === 'events') && events.length > 0 && (
                                <section className="mb-6">
                                    {activeTab === 'all' && (
                                        <div className="flex items-center justify-between mb-3">
                                            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-purple-500" />
                                                Events
                                            </h2>
                                            <button onClick={() => handleTabChange('events')} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                                View all <ArrowRight className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                    <div className="space-y-3">
                                        {(activeTab === 'all' ? events.slice(0, 3) : events).map(event => (
                                            <EventCard key={event.id} event={event} />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Courses */}
                            {(activeTab === 'all' || activeTab === 'courses') && courses.length > 0 && (
                                <section className="mb-6">
                                    {activeTab === 'all' && (
                                        <div className="flex items-center justify-between mb-3">
                                            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                                <BookOpen className="w-4 h-4 text-green-500" />
                                                Courses
                                            </h2>
                                            <button onClick={() => handleTabChange('courses')} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                                View all <ArrowRight className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                    <div className="space-y-3">
                                        {(activeTab === 'all' ? courses.slice(0, 3) : courses).map(course => (
                                            <CourseCard key={course.id} course={course} />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Volunteer Opportunities */}
                            {(activeTab === 'all' || activeTab === 'volunteers') && volunteers.length > 0 && (
                                <section className="mb-6">
                                    {activeTab === 'all' && (
                                        <div className="flex items-center justify-between mb-3">
                                            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                                <HandHeart className="w-4 h-4 text-orange-500" />
                                                Volunteer Opportunities
                                            </h2>
                                            <button onClick={() => handleTabChange('volunteers')} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                                View all <ArrowRight className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                    <div className="space-y-3">
                                        {(activeTab === 'all' ? volunteers.slice(0, 3) : volunteers).map(v => (
                                            <VolunteerCard key={v.id} volunteer={v} />
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>

                        {/* ── Right Column: Sidebar ──────────────────────── */}
                        <div className="w-full lg:w-72 shrink-0 space-y-4">

                            {/* Your Causes */}
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h2 className="font-semibold text-gray-900 dark:text-white">Your Causes</h2>
                                        {myCauses.length === 0 && (
                                            <Link href="/profile/edit" className="text-xs text-blue-500 hover:underline">
                                                Set interests
                                            </Link>
                                        )}
                                    </div>

                                    {/* Show user's profile interests if logged in and they have some */}
                                    {myCauses.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {myCauses.map(cause => (
                                                <button
                                                    key={cause.id}
                                                    onClick={() => handleCauseChange(cause.slug)}
                                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                                                        selectedCategory?.slug === cause.slug
                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                            : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 hover:bg-blue-100'
                                                    }`}
                                                >
                                                    {cause.name}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        /* Fallback: show all categories when user has no profile interests */
                                        <>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                                                Set your interests in your profile to personalise this list.
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {categories.map(cat => (
                                                    <button
                                                        key={cat.id}
                                                        onClick={() => handleCauseChange(cat.slug)}
                                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                                                            selectedCategory?.slug === cat.slug
                                                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                        }`}
                                                    >
                                                        {cat.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Explore My Impact */}
                            {selectedCategory && (
                                <Card>
                                    <CardContent className="p-4">
                                        <h2 className="font-semibold text-gray-900 dark:text-white mb-1">
                                            Explore My Impact:
                                        </h2>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                            Because you chose <span className="font-semibold text-gray-700 dark:text-gray-300">{selectedCategory.name}…</span>
                                        </p>

                                        <div className="space-y-2 mb-4">
                                            <div className="flex items-center gap-2 text-sm">
                                                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                                <span>
                                                    <strong className="text-gray-900 dark:text-white">{impactCounts.organizations}</strong>
                                                    <span className="text-gray-500 dark:text-gray-400"> Organizations need help</span>
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm mb-2">
                                                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                                <span>
                                                    <strong className="text-gray-900 dark:text-white">{impactCounts.events}</strong>
                                                    <span className="text-gray-500 dark:text-gray-400"> Upcoming events</span>
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm mb-2">
                                                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                                <span>
                                                    <strong className="text-gray-900 dark:text-white">{impactCounts.courses}</strong>
                                                    <span className="text-gray-500 dark:text-gray-400"> Courses available</span>
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                                <span>
                                                    <strong className="text-gray-900 dark:text-white">{impactCounts.volunteers}</strong>
                                                    <span className="text-gray-500 dark:text-gray-400"> Volunteers needed</span>
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Link href="/donate">
                                                <Button className="mb-2 w-full bg-orange-500 hover:bg-orange-600 text-white border-0">
                                                    <Heart className="w-4 h-4 mr-2" /> Donate
                                                </Button>
                                            </Link>
                                            <Link href="/volunteer-opportunities">
                                                <Button className="mb-2 w-full bg-blue-600 hover:bg-blue-700 text-white border-0">
                                                    <HandHeart className="w-4 h-4 mr-2" /> Volunteer
                                                </Button>
                                            </Link>
                                            <Link href="/groups">
                                                <Button className="w-full bg-green-600 hover:bg-green-700 text-white border-0">
                                                    <Users className="w-4 h-4 mr-2" /> Join Group
                                                </Button>
                                            </Link>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </FrontendLayout>
    );
}
