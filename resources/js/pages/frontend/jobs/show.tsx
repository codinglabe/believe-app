import FrontendLayout from "@/layouts/frontend/frontend-layout";
import { Link } from "@inertiajs/react";
import { PageHead } from "@/components/frontend/PageHead";
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
    points: number | null;
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
      volunteer: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
      paid: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
      internship: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800',
      contract: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
  };

  const getLocationTypeColor = (type: string) => {
    const colors = {
      onsite: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
      remote: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800',
      hybrid: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border border-teal-200 dark:border-teal-800',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
      open: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
      closed: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800',
      filled: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
  };

  const metaDescription = job.description ? String(job.description).slice(0, 160) : undefined;

  return (
    <FrontendLayout>
      <PageHead title={job.title} description={metaDescription} />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <Link href={route("jobs.index")} className="inline-flex items-center text-primary hover:text-primary/80 transition-colors">
            <ChevronLeft className="h-5 w-5 mr-1" />
            Back to all jobs
          </Link>
        </div>

        {/* Job Header */}
        <div className="bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-2xl p-8 mb-8 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {job.organization?.user?.image && (
              <div className="w-20 h-20 rounded-lg bg-white dark:bg-gray-700 p-2 border dark:border-gray-600 flex items-center justify-center">
                <img
                  src={'/storage/' + job.organization?.user?.image}
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
                      <Button className="gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white shadow-md hover:shadow-lg transition-all">
                        Apply Now
                      </Button>
                    </Link>
                                  ) : (
                    <Button disabled className="gap-2 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed">
                      <Bookmark className="h-4 w-4" />
                      {job.has_applied ? 'Already Applied' : job.status === 'open' ? 'Signin First' : 'Not applicable'}
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                  <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <Building className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Organization</p>
                    <p className="font-semibold text-gray-900 dark:text-white mt-0.5">{job.organization?.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                    <MapPin className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Location</p>
                    <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                      {[job.city, job.state, job.country].filter(Boolean).join(', ') || 'Not specified'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                  <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                    {job.type === 'volunteer' ? (
                      <Award className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {job.type === 'volunteer' ? 'Reward Points' : 'Salary'}
                    </p>
                    <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                      {job.type === 'volunteer' 
                        ? (job.points ? `${job.points.toLocaleString()} Points` : 'Not specified')
                        : formatCurrency(job.pay_rate, job.currency)
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                  <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                    <Clock3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Commitment</p>
                    <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
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
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
                  <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  Job Description
                </h2>
              </div>
              <div className="prose prose-slate dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed">
                {job.description}
              </div>
            </div>

            {/* Requirements */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
                  <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                    <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  Requirements
                </h2>
              </div>
              <div className="prose prose-slate dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed">
                {job.requirements || 'No specific requirements listed.'}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Organization Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-3 text-gray-900 dark:text-white pb-3 border-b border-gray-200 dark:border-gray-700">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                  <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                About {job.organization?.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm leading-relaxed">
                {job.organization?.description || 'No description available.'}
              </p>
              {job.organization?.website && (
                <a
                  href={job.organization.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Visit website
                </a>
              )}
            </div>

            {/* Position Details */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-3 text-gray-900 dark:text-white pb-3 border-b border-gray-200 dark:border-gray-700">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <Briefcase className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                Position Details
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Category</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{job.position?.category?.name || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Position Title</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{job.position?.title || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Description</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {job.position?.default_description || 'No description available.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Job Timeline */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-3 text-gray-900 dark:text-white pb-3 border-b border-gray-200 dark:border-gray-700">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                  <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                Job Timeline
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Posted</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{formatDate(job.date_posted)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Deadline</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{formatDate(job.application_deadline)}</p>
                </div>
              </div>
            </div>

            {!auth?.user && job.status === 'open' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="text-center">
                  <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">Interested in this position?</p>
                  <Link href={route("login")}>
                    <Button className="w-full gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600">
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
