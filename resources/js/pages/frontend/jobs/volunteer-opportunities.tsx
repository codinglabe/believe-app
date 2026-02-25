import FrontendLayout from "@/layouts/frontend/frontend-layout";
import { Link, router } from "@inertiajs/react";
import { PageHead } from "@/components/frontend/PageHead";
import { Button } from "@/components/frontend/ui/button";
import { Input } from "@/components/frontend/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/frontend/ui/select";
import { useState, useEffect, useRef } from "react";
import { HeartHandshake, Search, Loader2, ChevronRight, ChevronLeft, X, Filter, SlidersHorizontal, Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { JobStatusBadge, JobTypeBadge, LocationTypeBadge } from "@/components/frontend/jobs/badge";
import { Badge } from "@/components/frontend/ui/badge";
import { Label } from "@/components/frontend/ui/label";
import axios from "axios";

interface JobPost {
  id: number;
  title: string;
  description: string;
  type: string;
  location_type: string;
  pay_rate: number | null;
  currency: string | null;
  points: number | null;
  city: string | null;
  state: string | null;
  status: string | null;
  country: string | null;
  application_deadline: string | null;
  organization: {
    name: string;
  };
  has_applied?: boolean;
}

interface VolunteerOpportunitiesProps {
  jobs: {
    data: JobPost[];
    current_page: number;
    last_page: number;
    first_page_url: string;
    last_page_url: string;
    next_page_url: string | null;
    prev_page_url: string | null;
    links: Array<{
      url: string | null;
      label: string;
      active: boolean;
    }>;
    from?: number;
    to?: number;
    total?: number;
  };
  positionCategories: Record<string, string>;
  positions: Record<string, string>;
  organizations: Record<string, string>;
  filters: {
    search?: string;
    location_type?: string;
    city?: string;
    state?: string;
    position_category_id?: string;
    organization_id?: string;
    position_id?: string;
  };
  auth?: {
    user: {
      role: string;
    };
  };
}

export default function VolunteerOpportunities({ jobs, organizations, positionCategories, positions: initialPositions, filters, auth }: VolunteerOpportunitiesProps) {
  const [search, setSearch] = useState(filters.search || '');
  const [locationType, setLocationType] = useState(filters.location_type || '');
  const [city, setCity] = useState(filters.city || '');
  const [state, setState] = useState(filters.state || '');
  const [positionCategoryId, setPositionCategoryId] = useState(filters.position_category_id || '');
  const [organizationId, setOrganizationId] = useState(filters.organization_id || '');
  const [positionId, setPositionId] = useState(filters.position_id || '');
  const [positions, setPositions] = useState<Record<string, string>>(initialPositions || {});
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(jobs.current_page || 1);
  const [showFilters, setShowFilters] = useState(false);
  const initialRender = useRef(true);

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      router.get('/volunteer-opportunities', {
        search,
        location_type: locationType,
        city,
        state,
        position_category_id: positionCategoryId,
        organization_id: organizationId,
        position_id: positionId,
        page: currentPage,
      }, {
        preserveState: true,
        preserveScroll: true,
        onFinish: () => setLoading(false),
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [search, locationType, city, state, positionCategoryId, organizationId, positionId, currentPage]);

  useEffect(() => {
    if (positionCategoryId) {
      axios.get('/get-job-positions', { params: { category_id: positionCategoryId } })
        .then(response => {
          const positionsMap = response.data.reduce((acc: Record<string, string>, position: { id: number, title: string }) => {
            acc[position.id] = position.title;
            return acc;
          }, {});
          setPositions(positionsMap);
        })
        .catch(error => {
          console.error('Error fetching positions:', error);
          setPositions({});
        });
    } else {
      setPositions({});
      setPositionId('');
    }
  }, [positionCategoryId]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Pagination: show first, last, current and neighbours (with ellipsis)
  const getPageNumbers = (): (number | "ellipsis")[] => {
    const cur = jobs.current_page;
    const last = jobs.last_page;
    if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
    const pages: (number | "ellipsis")[] = [];
    if (cur > 2) pages.push(1);
    if (cur > 3) pages.push("ellipsis");
    for (let i = Math.max(1, cur - 1); i <= Math.min(last, cur + 1); i++) pages.push(i);
    if (cur < last - 2) pages.push("ellipsis");
    if (cur < last - 1) pages.push(last);
    return pages;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No deadline';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const clearFilters = () => {
    setSearch('');
    setLocationType('');
    setCity('');
    setPositionCategoryId('');
    setOrganizationId('');
    setPositionId('');
    setState('');
    setCurrentPage(1);
  };

  return (
    <FrontendLayout>
      <PageHead title="Volunteer Opportunities" description="Find volunteer opportunities at nonprofits. Give your time and skills to causes you care about." />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 dark:from-gray-900 dark:via-purple-900/40 dark:to-gray-900 py-10 sm:py-14 lg:py-18">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,255,255,0.15),transparent)] dark:opacity-40" />
          <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-3xl mx-auto"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-5">
                <HeartHandshake className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl lg:text-5xl mb-3">
                Volunteer Opportunities
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-white/90">
                Make a meaningful impact by volunteering with verified organizations
              </p>
            </motion.div>
          </div>
        </section>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 max-w-7xl">
          {/* Search + Filter bar */}
          <div className="mb-4 sm:mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 relative min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5 pointer-events-none" />
                  <Input
                    placeholder="Search opportunities..."
                    className="pl-10 sm:pl-12 pr-4 h-11 sm:h-12 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-sm sm:text-base"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden h-11 sm:h-12 shrink-0 border-gray-200 dark:border-gray-600 rounded-lg"
                >
                  <SlidersHorizontal className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Filters
                  {(locationType || city || state || positionCategoryId || positionId || organizationId) && (
                    <span className="ml-1.5 px-2 py-0.5 bg-violet-600 text-white text-xs rounded-full min-w-[1.25rem] text-center">
                      {[locationType, city, state, positionCategoryId, positionId, organizationId].filter(Boolean).length}
                    </span>
                  )}
                </Button>
              </div>

              {/* Active Filters Chips */}
              {(search || locationType || city || state || positionCategoryId || positionId || organizationId) && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Active filters:</span>
                    {search && (
                      <Badge variant="secondary" className="px-3 py-1 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                        Search: {search}
                        <button
                          onClick={() => setSearch('')}
                          className="ml-2 hover:text-violet-900 dark:hover:text-violet-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {locationType && (
                      <Badge variant="secondary" className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        Location: {locationType}
                        <button
                          onClick={() => setLocationType('')}
                          className="ml-2 hover:text-blue-900 dark:hover:text-blue-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {city && (
                      <Badge variant="secondary" className="px-3 py-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                        City: {city}
                        <button
                          onClick={() => setCity('')}
                          className="ml-2 hover:text-orange-900 dark:hover:text-orange-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {state && (
                      <Badge variant="secondary" className="px-3 py-1 bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">
                        State: {state}
                        <button
                          onClick={() => setState('')}
                          className="ml-2 hover:text-pink-900 dark:hover:text-pink-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {positionCategoryId && positionCategories[positionCategoryId] && (
                      <Badge variant="secondary" className="px-3 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                        Category: {positionCategories[positionCategoryId]}
                        <button
                          onClick={() => {
                            setPositionCategoryId('')
                            setPositionId('')
                          }}
                          className="ml-2 hover:text-indigo-900 dark:hover:text-indigo-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {positionId && positions[positionId] && (
                      <Badge variant="secondary" className="px-3 py-1 bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                        Position: {positions[positionId]}
                        <button
                          onClick={() => setPositionId('')}
                          className="ml-2 hover:text-cyan-900 dark:hover:text-cyan-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {organizationId && organizations[organizationId] && (
                      <Badge variant="secondary" className="px-3 py-1 bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                        Org: {organizations[organizationId]}
                        <button
                          onClick={() => setOrganizationId('')}
                          className="ml-2 hover:text-teal-900 dark:hover:text-teal-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium h-7"
                    >
                      Clear all
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* Mobile filter overlay */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                  onClick={() => setShowFilters(false)}
                />
              )}
            </AnimatePresence>

            {/* Filters Sidebar */}
            <aside
              className={`${showFilters ? "fixed inset-y-0 left-0 z-50 w-full max-w-[280px] sm:max-w-xs overflow-y-auto" : "hidden"} lg:!relative lg:inset-auto lg:z-auto lg:block lg:w-72 lg:max-w-none xl:w-80 flex-shrink-0`}
            >
              <div className="bg-white dark:bg-gray-800 rounded-r-xl lg:rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl lg:shadow-sm p-4 sm:p-5 lg:sticky lg:top-24 min-h-full lg:min-h-0">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFilters(false)}
                    className="lg:hidden"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* Location Type Filter */}
                  <div>
                    <Label htmlFor="location-type-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">Location Type</Label>
                    <Select value={locationType || undefined} onValueChange={(value) => setLocationType(value || '')}>
                      <SelectTrigger id="location-type-filter" className="h-10 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20">
                        <SelectValue placeholder="All Locations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="onsite">Onsite</SelectItem>
                        <SelectItem value="remote">Remote</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category Filter */}
                  <div>
                    <Label htmlFor="category-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</Label>
                    <Select value={positionCategoryId || undefined} onValueChange={(value) => setPositionCategoryId(value || '')}>
                      <SelectTrigger id="category-filter" className="h-10 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(positionCategories).map(([id, title]) => (
                          <SelectItem key={id} value={id}>{title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Position Filter */}
                  {positionCategoryId && (
                    <div>
                      <Label htmlFor="position-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">Position</Label>
                      <Select value={positionId || undefined} onValueChange={(value) => setPositionId(value || '')} disabled={Object.keys(positions).length === 0}>
                        <SelectTrigger id="position-filter" className="h-10 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20">
                          <SelectValue placeholder="All Positions" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(positions).map(([id, title]) => (
                            <SelectItem key={id} value={id}>{title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Organization Filter */}
                  <div>
                    <Label htmlFor="organization-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">Organization</Label>
                    <Select value={organizationId || undefined} onValueChange={(value) => setOrganizationId(value || '')}>
                      <SelectTrigger id="organization-filter" className="h-10 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20">
                        <SelectValue placeholder="All Organizations" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(organizations).map(([id, name]) => (
                          <SelectItem key={id} value={id}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Location Filters */}
                  <div className="space-y-2">
                    <Label htmlFor="city-input" className="text-sm font-medium text-gray-700 dark:text-gray-300">City</Label>
                    <Input
                      id="city-input"
                      placeholder="e.g., New York"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="h-10 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state-input" className="text-sm font-medium text-gray-700 dark:text-gray-300">State/Province</Label>
                    <Input
                      id="state-input"
                      placeholder="e.g., NY"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="h-10 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
                    />
                  </div>
                </div>

                {loading && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-violet-600 dark:text-violet-400">
                    <Loader2 className="animate-spin inline-block w-5 h-5 mr-2" />
                    Loading...
                  </div>
                )}
              </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0">
              {/* Job Listings */}
              {jobs.data.length > 0 ? (
                <>
                  {/* Results Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="min-w-0">
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                        Volunteer Opportunities {jobs.total != null && <span className="text-violet-600 dark:text-violet-400">({jobs.total})</span>}
                      </h2>
                      {search && (
                        <p className="text-gray-600 dark:text-gray-400 mt-1 text-xs sm:text-sm truncate">
                          “{search}”
                        </p>
                      )}
                    </div>
                    {jobs.from != null && jobs.to != null && jobs.total != null && (
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 shrink-0">
                        Showing {jobs.from}–{jobs.to} of {jobs.total}
                      </p>
                    )}
                  </div>

                  {/* Table - desktop */}
                  <div className="hidden lg:block rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden mb-6 sm:mb-8">
                    <div className="overflow-x-auto -mx-px">
                      <table className="w-full min-w-[640px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                            <th className="px-3 py-2.5 sm:px-4 sm:py-3 font-semibold text-gray-900 dark:text-white">Organization</th>
                            <th className="px-3 py-2.5 sm:px-4 sm:py-3 font-semibold text-gray-900 dark:text-white">Position</th>
                            <th className="px-3 py-2.5 sm:px-4 sm:py-3 font-semibold text-gray-900 dark:text-white">Status</th>
                            <th className="px-3 py-2.5 sm:px-4 sm:py-3 font-semibold text-gray-900 dark:text-white">Points</th>
                            <th className="px-3 py-2.5 sm:px-4 sm:py-3 font-semibold text-gray-900 dark:text-white">Apply by</th>
                            <th className="px-3 py-2.5 sm:px-4 sm:py-3 font-semibold text-gray-900 dark:text-white text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {jobs.data.map((job) => (
                            <motion.tr
                              key={job.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.2 }}
                              className="border-b border-gray-100 dark:border-gray-700/80 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                            >
                              <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400">
                                    <Building2 className="h-4 w-4" />
                                  </div>
                                  <span className="font-medium text-gray-900 dark:text-white truncate max-w-[140px] sm:max-w-none">
                                    {job.organization.name}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 sm:px-4 sm:py-3 font-medium text-gray-900 dark:text-white">
                                {job.title}
                              </td>
                              <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                                <div className="flex flex-col gap-1">
                                  <div className="flex flex-wrap gap-1">
                                    <LocationTypeBadge type={job.location_type} />
                                    <JobStatusBadge status={job.status} />
                                  </div>
                                  <span className="text-xs text-gray-600 dark:text-gray-400">
                                    {[job.city, job.state, job.country].filter(Boolean).join(', ') || '—'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 sm:px-4 sm:py-3 text-gray-600 dark:text-gray-300">
                                {job.points ? job.points.toLocaleString() : '—'}
                              </td>
                              <td className="px-3 py-2.5 sm:px-4 sm:py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                {formatDate(job.application_deadline)}
                              </td>
                              <td className="px-3 py-2.5 sm:px-4 sm:py-3 text-right">
                                <Link href={`/jobs/${job.id}`} className="text-violet-600 hover:text-violet-700 dark:text-violet-400 text-sm font-medium hover:underline mr-2">
                                  View
                                </Link>
                                {auth?.user?.role === 'user' && job.status === 'open' && (
                                  job.has_applied ? (
                                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs">
                                      Applied
                                    </Badge>
                                  ) : (
                                    <Link href={`/jobs/${job.id}/apply`}>
                                      <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium">
                                        Apply Now
                                      </Button>
                                    </Link>
                                  )
                                )}
                                {!auth?.user && job.status === 'open' && (
                                  <Link href="/login">
                                    <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium">
                                      Apply Now
                                    </Button>
                                  </Link>
                                )}
                                {auth?.user && auth.user.role !== 'user' && job.status === 'open' && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">—</span>
                                )}
                                {auth?.user && auth.user?.role === 'user' && job.status !== 'open' && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">Closed</span>
                                )}
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile: compact list */}
                  <div className="lg:hidden space-y-3 mb-8">
                    {jobs.data.map((job) => (
                      <motion.div
                        key={job.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <div className="h-9 w-9 shrink-0 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">{job.title}</p>
                              <p className="text-sm text-violet-600 dark:text-violet-400">{job.organization.name}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <LocationTypeBadge type={job.location_type} />
                            <JobStatusBadge status={job.status} />
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                            <span>{job.points ? `${job.points} pts` : 'Points not specified'}</span>
                            <span>Apply by: {formatDate(job.application_deadline)}</span>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Link href={`/jobs/${job.id}`} className="text-sm text-violet-600 dark:text-violet-400 font-medium hover:underline">
                              View details
                            </Link>
                            {auth?.user?.role === 'user' && job.status === 'open' && !job.has_applied && (
                              <Link href={`/jobs/${job.id}/apply`}>
                                <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs">
                                  Apply Now
                                </Button>
                              </Link>
                            )}
                            {!auth?.user && job.status === 'open' && (
                              <Link href="/login">
                                <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs">
                                  Apply Now
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {jobs.last_page > 1 && (
                    <nav className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pt-6 sm:pt-8 mt-6 sm:mt-8 border-t border-gray-200 dark:border-gray-700" aria-label="Pagination">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="h-9 px-3 sm:px-4 rounded-lg border-gray-200 dark:border-gray-600 shrink-0"
                      >
                        <ChevronLeft className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Previous</span>
                      </Button>
                      <div className="flex items-center gap-1">
                        {getPageNumbers().map((page, i) =>
                          page === "ellipsis" ? (
                            <span key={`ellipsis-${i}`} className="px-2 text-gray-400 select-none" aria-hidden>…</span>
                          ) : (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(page)}
                              className={`h-9 min-w-[2.25rem] rounded-lg ${
                                currentPage === page
                                  ? "bg-violet-600 hover:bg-violet-700 text-white border-0"
                                  : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                              }`}
                            >
                              {page}
                            </Button>
                          )
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === jobs.last_page}
                        className="h-9 px-3 sm:px-4 rounded-lg border-gray-200 dark:border-gray-600 shrink-0"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="h-4 w-4 sm:ml-1" />
                      </Button>
                    </nav>
                  )}
                </>
              ) : (
                <div className="text-center py-16 sm:py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full mb-6">
                    <HeartHandshake className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    No volunteer opportunities found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                    Try adjusting your search or filters to find what you're looking for.
                  </p>
                  {(search || locationType || city || state || positionCategoryId || positionId || organizationId) && (
                    <Button
                      onClick={clearFilters}
                      variant="outline"
                      className="border-violet-600 text-violet-600 hover:bg-violet-50 dark:border-violet-400 dark:text-violet-400 dark:hover:bg-violet-900/20 h-11 px-6"
                    >
                      Clear all filters
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </FrontendLayout>
  );
}
