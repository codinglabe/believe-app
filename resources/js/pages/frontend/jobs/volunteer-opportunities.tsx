import FrontendLayout from "@/layouts/frontend/frontend-layout";
import { Link, router } from "@inertiajs/react";
import { PageHead } from "@/components/frontend/PageHead";
import { Button } from "@/components/frontend/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/frontend/ui/card";
import { Input } from "@/components/frontend/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/frontend/ui/select";
import { useState, useEffect, useRef } from "react";
import { MapPin, Clock, Award, HeartHandshake, Search, Loader2, ChevronRight, ChevronLeft, X, Filter, SlidersHorizontal, Building2, Tag } from "lucide-react";
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

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-purple-600 via-blue-600 to-purple-700 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 py-12 sm:py-16 md:py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center max-w-4xl mx-auto"
            >
              <div className="inline-flex items-center justify-center mb-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
                  <HeartHandshake className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
                Volunteer Opportunities
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
                Make a meaningful impact by volunteering with verified organizations in your community
              </p>
            </motion.div>
          </div>
        </section>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Search Bar Section */}
          <div className="mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Main Search Input */}
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 z-10" />
                  <Input
                    placeholder="Search volunteer opportunities..."
                    className="pl-12 pr-4 h-14 bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 text-base"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                
                {/* Filter Toggle Button (Mobile) */}
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden h-14 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <SlidersHorizontal className="h-5 w-5 mr-2" />
                  Filters
                  {(locationType || city || state || positionCategoryId || positionId || organizationId) && (
                    <span className="ml-2 px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full">
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
                      <Badge variant="secondary" className="px-3 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                        Search: {search}
                        <button
                          onClick={() => setSearch('')}
                          className="ml-2 hover:text-purple-900 dark:hover:text-purple-100"
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

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Filters Sidebar */}
            <aside className={`lg:w-80 flex-shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 sticky top-24">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Filters</h3>
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
                      <SelectTrigger id="location-type-filter" className="h-10 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20">
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
                      <SelectTrigger id="category-filter" className="h-10 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20">
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
                        <SelectTrigger id="position-filter" className="h-10 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20">
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
                      <SelectTrigger id="organization-filter" className="h-10 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20">
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
                      className="h-10 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state-input" className="text-sm font-medium text-gray-700 dark:text-gray-300">State/Province</Label>
                    <Input
                      id="state-input"
                      placeholder="e.g., NY"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="h-10 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                    />
                  </div>
                </div>

                {loading && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-purple-600 dark:text-purple-400">
                    <Loader2 className="animate-spin inline-block w-5 h-5 mr-2" />
                    Loading results...
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
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                        Volunteer Opportunities {jobs.total && <span className="text-purple-600 dark:text-purple-400">({jobs.total})</span>}
                      </h2>
                      {search && (
                        <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">
                          Search results for: <span className="font-semibold">"{search}"</span>
                        </p>
                      )}
                    </div>
                    {jobs.from && jobs.to && jobs.total && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        Showing {jobs.from}-{jobs.to} of {jobs.total} opportunities
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                    {jobs.data.map((job) => (
                      <motion.div
                        key={job.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 group hover:border-purple-300 dark:hover:border-purple-600 h-full flex flex-col">
                          <CardHeader className="pb-4">
                            <div className="flex flex-col gap-3">
                              <div>
                                <CardTitle className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-2">
                                  {job.title}
                                </CardTitle>
                                <CardDescription className="mt-2 text-base font-medium text-purple-600 dark:text-purple-400">
                                  {job.organization.name}
                                </CardDescription>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <JobTypeBadge type={job.type} />
                                <LocationTypeBadge type={job.location_type} />
                                <JobStatusBadge status={job.status} />
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="flex-grow">
                            <p className="line-clamp-3 text-gray-600 dark:text-gray-300 mb-5 text-sm leading-relaxed min-h-[3.75rem]">
                              {job.description}
                            </p>
                            <div className="space-y-3 pb-4 border-b border-gray-100 dark:border-gray-700">
                              <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                                <MapPin className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                                <span className="truncate">{[job.city, job.state, job.country].filter(Boolean).join(', ') || 'Location not specified'}</span>
                              </div>

                              <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                                <Award className="h-4 w-4 mr-2 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                <span>{job.points ? `${job.points.toLocaleString()} Reward Points` : 'Points not specified'}</span>
                              </div>

                              <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                                <Clock className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                                <span>Apply by: {formatDate(job.application_deadline)}</span>
                              </div>
                            </div>
                          </CardContent>

                          <CardFooter className="flex justify-between items-center pt-4 gap-3">
                            <Link href={`/jobs/${job.id}`} className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 text-sm font-semibold hover:underline transition-colors">
                              View details
                            </Link>

                            {auth?.user?.role === 'user' && job.status === 'open' && (
                              job.has_applied ? (
                                <Badge variant="success" className="px-3 py-1.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                  Already Applied
                                </Badge>
                              ) : (
                                <Link href={`/jobs/${job.id}/apply`}>
                                  <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300">
                                    Apply Now
                                  </Button>
                                </Link>
                              )
                            )}

                            {!auth?.user && job.status === 'open' && (
                              <Link href="/login">
                                <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300">
                                  Login to Apply
                                </Button>
                              </Link>
                            )}

                            {auth?.user && auth.user.role !== 'user' && job.status === 'open' && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 italic">Applicants only</span>
                            )}

                            {auth?.user && auth?.user?.role === 'user' && job.status !== 'open' && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 italic">Not Accepting Applications</span>
                            )}
                          </CardFooter>
                        </Card>
                      </motion.div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {jobs.last_page > 1 && (
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-8 mt-8 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 h-10"
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>

                        <div className="flex gap-1">
                          {Array.from({ length: jobs.last_page }, (_, i) => i + 1).map((page) => (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              onClick={() => handlePageChange(page)}
                              className={`h-10 min-w-[2.5rem] ${
                                currentPage === page
                                  ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md"
                                  : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                              }`}
                            >
                              {page}
                            </Button>
                          ))}
                        </div>

                        <Button
                          variant="outline"
                          onClick={() => handlePageChange(Math.min(jobs.last_page, currentPage + 1))}
                          disabled={currentPage === jobs.last_page}
                          className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 h-10"
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
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
                      className="border-purple-600 text-purple-600 hover:bg-purple-50 dark:border-purple-400 dark:text-purple-400 dark:hover:bg-purple-900/20 h-11 px-6"
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