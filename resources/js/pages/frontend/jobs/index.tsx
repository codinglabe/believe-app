import FrontendLayout from "@/layouts/frontend/frontend-layout";
import { Head, Link, router } from "@inertiajs/react";
import { Button } from "@/components/frontend/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/frontend/ui/card";
import { Input } from "@/components/frontend/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/frontend/ui/select";
import { useState, useEffect } from "react";
import { MapPin, Clock, DollarSign, Briefcase, Search, Loader2, ChevronRight, ChevronLeft } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/frontend/ui/pagination";
import { JobStatusBadge, JobTypeBadge, LocationTypeBadge } from "@/components/frontend/jobs/badge";
import { Badge } from "@/components/frontend/ui/badge";
import axios from "axios";

interface JobPost {
  id: number;
  title: string;
  description: string;
  type: string;
  location_type: string;
  pay_rate: number | null;
  currency: string | null;
  city: string | null;
  state: string | null;
  status: string | null;
  country: string | null;
  application_deadline: string | null;
  organization: {
    name: string;
  };
}

interface JobsIndexProps {
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
  };
    positionCategories: Record<string, string>; // {id: title} pairs
    positions: Record<string, string>; // {id: title} pairs
    filters: {
        search?: string;
        location_type?: string;
        type?: string;
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

export default function JobsIndex({ jobs, organizations, positionCategories,positions: initialPositions, filters, auth }: JobsIndexProps) {
  const [search, setSearch] = useState(filters.search || '');
  const [locationType, setLocationType] = useState(filters.location_type || '');
    const [jobType, setJobType] = useState(filters.type || '');
     const [city, setCity] = useState(filters.city || '');
    const [state, setState] = useState(filters.state || '');
    const [positionCategoryId, setPositionCategoryId] = useState(filters.position_category_id || '');
    const [organizationId, setOrganizationId] = useState(filters.organization_id || '');
const [positionId, setPositionId] = useState(filters.position_id || '');
const [positions, setPositions] = useState<Array<{id: number, title: string}>>([]);
    const [loading, setLoading] = useState(false);
     const [currentPage, setCurrentPage] = useState(jobs.current_page || 1); // Initialize with current page from server

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      router.get('/jobs', {
        search,
        location_type: locationType,
        type: jobType,
        city,
          state,
        position_category_id: positionCategoryId,
        organization_id: organizationId,
            position_id: positionId,
        page: currentPage, // Use currentPage state
      }, {
        preserveState: true,
        preserveScroll: true,
        onFinish: () => setLoading(false),
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [search, locationType, jobType, city, state, positionCategoryId, organizationId, positionId, currentPage]); // Add currentPage to dependencies

    // Add this effect to load positions when category changes
// useEffect(() => {
//     if (positionCategoryId) {
//         router.get('/get-job-positions', { category_id: positionCategoryId }, {
//             preserveState: true,
//             preserveScroll: true,
//             onSuccess: (page) => {
//                 setPositions(page.props.positions || []);
//             },
//             onError: (error) => {
//                 console.error('Error fetching positions:', error);
//                 setPositions([]);
//             }
//         });
//     } else {
//         setPositions([]);
//         setPositionId('');
//     }
    // }, [positionCategoryId]);

    useEffect(() => {
    if (positionCategoryId) {
      axios.get('/get-job-positions', { params: { category_id: positionCategoryId } })
        .then(response => {
          // Convert array to {id: title} format
          const positionsMap = response.data.reduce((acc: Record<string, string>, position: any) => {
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

  const formatCurrency = (amount: number | null, currency: string | null) => {
    if (!amount || !currency) return 'Not specified';

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
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
         setJobType('');
         setCity('');
         setPositionCategoryId('');
         setOrganizationId('');
    setPositionId('');
    setState('');
    setCurrentPage(1); // Reset to first page when clearing filters
  };

  return (
    <FrontendLayout>
      <Head title="Job Opportunities" />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">Job Opportunities</h1>
          <p className="text-lg text-muted-foreground">Find your next career opportunity with us</p>
        </div>

        {/* Filters */}
        <div className="mb-8 p-6 rounded-lg bg-card border">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
                      </div>

            {/* Position Category Filter */}
            <select
                className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-950"
                value={positionCategoryId}
                onChange={(e) => setPositionCategoryId(e.target.value)}
            >
                <option value="">All Categories</option>
                {Object.entries(positionCategories).map(([id, title]) => (
                    <option key={id} value={id}>{title}</option>
                ))}
            </select>

            {/* Position Filter (dependent on category) */}
            <select
                className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-950"
                value={positionId}
                onChange={(e) => setPositionId(e.target.value)}
                disabled={!positionCategoryId}
            >
                <option value="">{positionCategoryId ? "All Positions" : "Select Category First"}</option>
                {Object.entries(positions).map(([id, title]) => (
                    <option key={id} value={id}>{title}</option>
                ))}
            </select>

            {/* City Input */}
            <div className="md:col-span-1">
            <Input
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
            />
            </div>

            {/* State Input */}
            <div className="md:col-span-1">
            <Input
                placeholder="State"
                value={state}
                onChange={(e) => setState(e.target.value)}
            />
            </div>

            <select
            className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-950"
            value={locationType}
            onChange={(e) => setLocationType(e.target.value)}
            >
            <option value="">All Locations</option>
            <option value="onsite">Onsite</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            </select>


            <select
            className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-950"
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
            >
            <option value="">All Types</option>
            <option value="volunteer">Volunteer</option>
            <option value="paid">Paid</option>
            <option value="internship">Internship</option>
            {/* <option value="medicaid">Medicaid</option> */}
                      </select>

                      {/* Organization Filter */}
            <select
                className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-950"
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
            >
                <option value="">All Organizations</option>
                {Object.entries(organizations).map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                ))}
            </select>

                       {/* Clear Filters Button */}
          <Button
            variant="outline"
            onClick={clearFilters}
            disabled={!search && !locationType && !jobType && !city && !state && !positionCategoryId && !positionId && !organizationId}
            className="flex items-center justify-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            Clear Filters
          </Button>
          </div>

          {loading && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              <Loader2 className="animate-spin inline-block w-4 h-4 mr-2" />
              Loading results...
            </div>
          )}
        </div>

        {/* Job Listings */}
        {jobs.data.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {jobs.data.map((job) => (
                <Card key={job.id} className="hover:shadow-lg transition-shadow duration-300 h-full flex flex-col">
                  <CardHeader>
                    <div className="flex flex-wrap gap-4 md:gap-2 justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">{job.title}</CardTitle>
                        <CardDescription className="mt-1">{job.organization.name}</CardDescription>
                      </div>
                      <div className="flex space-x-2">
                        <JobTypeBadge type={job.type} />
                        <LocationTypeBadge type={job.location_type} />
                        <JobStatusBadge status={job.status} className="ml-auto" />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-grow">
                    <p className="line-clamp-3 text-muted-foreground mb-4">{job.description}</p>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{[job.city, job.state, job.country].filter(Boolean).join(', ') || 'Location not specified'}</span>
                      </div>

                      <div className="flex items-center text-sm">
                        <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{formatCurrency(job.pay_rate, job.currency)}</span>
                      </div>

                      <div className="flex items-center text-sm">
                        <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>Apply by: {formatDate(job.application_deadline)}</span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="flex justify-between items-center">
                    <Link href={route('jobs.show', job.id)} className="text-primary hover:underline text-sm font-medium">
                        View details
                    </Link>

                    {auth?.user?.role === 'user' && job.status === 'open' && (
                        job.has_applied ? (
                        <Badge variant="success" className="px-3 py-1">
                            Already Applied
                        </Badge>
                        ) : (
                        <Link href={route('jobs.apply.show', job.id)}>
                            <Button size="sm">Apply Now</Button>
                        </Link>
                        )
                    )}

                    {!auth?.user && job.status === 'open' && (
                        <Link href="/login">
                        <Button size="sm">Login to Apply</Button>
                        </Link>
                    )}

                    {auth?.user && auth.user.role !== 'user' && job.status === 'open' && (
                        <span className="text-xs text-muted-foreground italic">Applicants only</span>
                    )}

                    {auth?.user && auth?.user?.role === 'user' && job.status !== 'open' && (
                        <span className="text-xs text-muted-foreground italic">Not Accepting Applications</span>
                    )}
                    </CardFooter>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {/* <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href={jobs.prev_page_url || '#'}
                    className={!jobs.prev_page_url ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>

                {jobs.links.slice(1, -1).map((link, index) => (
                  <PaginationItem key={link.url || link.label || index}>
                    {link.url ? (
                      <PaginationLink href={link.url} isActive={link.active}>
                        {link.label}
                      </PaginationLink>
                    ) : (
                      <PaginationEllipsis />
                    )}
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    href={jobs.next_page_url || '#'}
                    className={!jobs.next_page_url ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination> */}

                      {/* // Add this to your JobsIndex component where the pagination should appear */}
  {jobs.data.length > 0 && (
    <div className="flex flex-col sm:flex-row justify-center items-center gap-2 pt-6">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Previous</span>
          <span className="sm:hidden">Prev</span>
        </Button>

        <div className="flex gap-1">
          {Array.from({ length: jobs.last_page }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              onClick={() => handlePageChange(page)}
              className={
                currentPage === page
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
              }
            >
              {page}
            </Button>
          ))}
        </div>

        <Button
          variant="outline"
          onClick={() => handlePageChange(Math.min(jobs.last_page, currentPage + 1))}
          disabled={currentPage === jobs.last_page}
          className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
        >
          <span className="hidden sm:inline">Next</span>
          <span className="sm:hidden">Next</span>
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 sm:mt-0 sm:ml-4">
        Showing {jobs.from}-{jobs.to} of {jobs.total} jobs
      </div>
    </div>
  )}

          </>
        ) : (
          <div className="text-center py-12">
            <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-lg font-medium">No jobs found</h3>
            <p className="mt-1 text-muted-foreground">Try adjusting your search or filter to find what you're looking for.</p>
          </div>
        )}
      </div>
    </FrontendLayout>
  );
}
