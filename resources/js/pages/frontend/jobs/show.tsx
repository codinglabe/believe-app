import FrontendLayout from "@/layouts/frontend/frontend-layout";
import { Head, Link } from "@inertiajs/react";
import { Button } from "@/components/frontend/ui/button";
import { Badge } from "@/components/frontend/ui/badge";
import {
  MapPin, Clock, DollarSign, Briefcase, Calendar,
  Building, Award, FileText, ChevronLeft, Globe,
  Users, Clock3, Bookmark, Share2
} from "lucide-react";

interface JobDetailsProps {
  job: {
    id: number;
    title: string;
    description: string;
    requirements: string;
    pay_rate: number | null;
    currency: string | null;
    type: string;
    location_type: string;
    city: string | null;
    state: string | null;
    country: string | null;
    time_commitment_min_hours: number | null;
    application_deadline: string | null;
    date_posted: string;
    status: string;
    organization?: {
      id: number;
      name: string;
      description: string;
      website: string | null;
        user?: {
          image: string | null;
        }
    };
    position?: {
      id: number;
      title: string;
      default_description: string;
      category?: {
        id: number;
        name: string;
      }
    };
  };
  auth?: {
    user: {
      role: string;
    };
  };
}

export default function JobDetails({ job, auth }: JobDetailsProps) {
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
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getJobTypeColor = (type: string) => {
    const colors = {
      volunteer: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      paid: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      internship: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
      medicaid: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
  };

  const getLocationTypeColor = (type: string) => {
    const colors = {
      onsite: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      remote: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
      hybrid: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
      open: 'bg-green-500/10 text-green-600 dark:text-green-400',
      closed: 'bg-red-500/10 text-red-600 dark:text-red-400',
      filled: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
  };

  return (
    <FrontendLayout>
      <Head title={`${job.title} - Job Details`} />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <Link href={route("jobs.index")} className="inline-flex items-center text-primary hover:text-primary/80 transition-colors">
            <ChevronLeft className="h-5 w-5 mr-1" />
            Back to all jobs
          </Link>
        </div>

        {/* Job Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 rounded-xl p-6 mb-8 border dark:border-gray-700">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {job.organization?.user?.image && (
              <div className="w-20 h-20 rounded-lg bg-white dark:bg-gray-700 p-2 border dark:border-gray-600 flex items-center justify-center">
                <img
                  src={job.organization?.user?.image}
                  alt={`${job.organization.name} logo`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}

            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{job.title}</h1>
                  <div className="flex items-center gap-2 mb-4">
                    <Badge className={`${getJobTypeColor(job.type)} rounded-md px-2.5 py-0.5 text-sm font-medium`}>
                      {job.type.charAt(0).toUpperCase() + job.type.slice(1)}
                    </Badge>
                    <Badge className={`${getLocationTypeColor(job.location_type)} rounded-md px-2.5 py-0.5 text-sm font-medium`}>
                      {job.location_type.charAt(0).toUpperCase() + job.location_type.slice(1)}
                    </Badge>
                    <Badge className={`${getStatusColor(job.status)} rounded-md px-2.5 py-0.5 text-sm font-medium`}>
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-3">
                  {auth?.user?.role === 'user' && job.status === 'open' &&
                        !job.has_applied  ? (
                    <Link href={route("jobs.apply.show", job.id)}>
                      <Button className="gap-2">
                        Apply Now
                      </Button>
                    </Link>
                                  ) : (
                    <Button disabled className="gap-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200">
                      <Bookmark className="h-4 w-4" />
                      {job.has_applied ? 'Already Applied' : job.status === 'open' ? 'Signin First' : 'Not applicable'}
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white dark:bg-gray-700 shadow-sm">
                    <Building className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Organization</p>
                    <p className="font-medium">{job.organization?.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white dark:bg-gray-700 shadow-sm">
                    <MapPin className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">
                      {[job.city, job.state, job.country].filter(Boolean).join(', ') || 'Not specified'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white dark:bg-gray-700 shadow-sm">
                    <DollarSign className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Salary</p>
                    <p className="font-medium">{formatCurrency(job.pay_rate, job.currency)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white dark:bg-gray-700 shadow-sm">
                    <Clock3 className="h-5 w-5 text-purple-500 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Commitment</p>
                    <p className="font-medium">
                      {job.time_commitment_min_hours ? `${job.time_commitment_min_hours} hrs/week` : 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Job Details */}
          <div className="lg:col-span-3 space-y-8">
            {/* Job Description */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-gray-700">
                    <FileText className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                  </div>
                  Job Description
                </h2>
              </div>
              <div className="prose dark:prose-invert max-w-none">
                {job.description}
              </div>
            </div>

            {/* Requirements */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-50 dark:bg-gray-700">
                    <Award className="h-5 w-5 text-purple-500 dark:text-purple-400" />
                  </div>
                  Requirements
                </h2>
              </div>
              <div className="prose dark:prose-invert max-w-none">
                {job.requirements || 'No specific requirements listed.'}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Organization Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-gray-700">
                  <Users className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                </div>
                About {job.organization?.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {job.organization?.description || 'No description available.'}
              </p>
              {job.organization?.website && (
                <a
                  href={job.organization.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-primary hover:text-primary/80 transition-colors"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Visit website
                </a>
              )}
            </div>

            {/* Position Details */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-gray-700">
                  <Briefcase className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                </div>
                Position Details
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium">{job.position?.category?.name || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Position Title</p>
                  <p className="font-medium">{job.position?.title || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Description</p>
                  <p className="text-gray-600 dark:text-gray-300">
                    {job.position?.default_description || 'No description available.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Job Timeline */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-gray-700">
                  <Calendar className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                </div>
                Job Timeline
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Posted</p>
                  <p className="font-medium">{formatDate(job.date_posted)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Deadline</p>
                  <p className="font-medium">{formatDate(job.application_deadline)}</p>
                </div>
              </div>
            </div>

            {!auth?.user && job.status === 'open' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700">
                <div className="text-center">
                  <p className="text-gray-600 dark:text-gray-300 mb-4">Interested in this position?</p>
                  <Link href={route("login")}>
                    <Button className="w-full gap-2">
                      Login to Apply
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </FrontendLayout>
  );
}
