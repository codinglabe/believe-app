"use client"

import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { Briefcase, Calendar, MapPin, Building2, Clock, CheckCircle2, XCircle, AlertCircle, FileText, ArrowRight } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Badge } from "@/components/frontend/ui/badge"
import { Card, CardContent } from "@/components/frontend/ui/card"
import { Link, usePage } from "@inertiajs/react"

interface JobPost {
  id: number
  title: string
  type: string
  location_type: string
  city?: string
  state?: string
  organization?: {
    id: number
    name: string
  }
}

interface JobApplication {
  id: number
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected'
  job_post_id: number
  created_at: string
  updated_at: string
  job_status?: 'completed' | 'in_progress' | null
  job_post: JobPost
}

interface PageProps {
  applications: JobApplication[]
}

export default function ProfileJobApplications() {
  const { applications } = usePage<PageProps>().props

  const getStatusColor = (status: string) => {
    const colors = {
      'pending': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
      'reviewed': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
      'accepted': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
      'rejected': 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
    }
    return colors[status] || 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'reviewed':
        return <FileText className="h-4 w-4" />
      case 'accepted':
        return <CheckCircle2 className="h-4 w-4" />
      case 'rejected':
        return <XCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getStatusText = (status: string) => {
    const texts = {
      'pending': 'Pending Review',
      'reviewed': 'Under Review',
      'accepted': 'Accepted',
      'rejected': 'Not Selected',
    }
    return texts[status] || status
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getJobTypeColor = (type: string) => {
    const colors = {
      'volunteer': 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
      'paid': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
      'internship': 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
      'contract': 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
    }
    return colors[type] || 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800'
  }

  const getLocationTypeColor = (type: string) => {
    const colors = {
      'onsite': 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800',
      'remote': 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800',
      'hybrid': 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800',
    }
    return colors[type] || 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800'
  }

  return (
    <ProfileLayout
      title="My Applications"
      description="Track your job and volunteer application statuses"
    >
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Job Applications</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              View the status of your applications
            </p>
          </div>
          <Link href="/jobs">
            <Button className="w-full sm:w-auto">
              Browse Jobs
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Applications List */}
        {applications && applications.length > 0 ? (
          <div className="grid gap-3 sm:gap-4">
            {applications.map((application) => (
              <Card key={application.id} className="hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-800">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col gap-4">
                    {/* Top Section - Job Info */}
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex-shrink-0">
                        <Briefcase className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-2">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white break-words">
                            {application.job_post?.title || 'Unknown Position'}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`${getStatusColor(application.status)} border`}>
                              <span className="flex items-center gap-1.5">
                                {getStatusIcon(application.status)}
                                <span className="text-xs sm:text-sm font-medium">{getStatusText(application.status)}</span>
                              </span>
                            </Badge>
                            {application.job_status === 'completed' && (
                              <Badge className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 border">
                                <span className="flex items-center gap-1.5">
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span className="text-xs sm:text-sm font-medium">Job Completed</span>
                                </span>
                              </Badge>
                            )}
                            {application.job_status === 'in_progress' && (
                              <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 border">
                                <span className="flex items-center gap-1.5">
                                  <Clock className="h-4 w-4" />
                                  <span className="text-xs sm:text-sm font-medium">In Progress</span>
                                </span>
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {application.job_post?.organization && (
                            <div className="flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                              <span className="truncate">{application.job_post.organization.name}</span>
                            </div>
                          )}
                          
                          {application.job_post?.type && (
                            <Badge variant="outline" className={`${getJobTypeColor(application.job_post.type)} border text-xs`}>
                              {application.job_post.type.charAt(0).toUpperCase() + application.job_post.type.slice(1)}
                            </Badge>
                          )}

                          {application.job_post?.location_type && (
                            <Badge variant="outline" className={`${getLocationTypeColor(application.job_post.location_type)} border text-xs`}>
                              {application.job_post.location_type.charAt(0).toUpperCase() + application.job_post.location_type.slice(1)}
                            </Badge>
                          )}

                          {(application.job_post?.city || application.job_post?.state) && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                              <span className="truncate">
                                {[application.job_post.city, application.job_post.state].filter(Boolean).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Dates */}
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span>Applied: {formatDate(application.created_at)}</span>
                          </div>
                          {application.updated_at !== application.created_at && (
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3 w-3 flex-shrink-0" />
                              <span>Updated: {formatDate(application.updated_at)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                      {application.status === 'accepted' ? (
                        <Link href={`/profile/job-applications/${application.id}`} className="flex-1 sm:flex-initial">
                          <Button variant="default" size="sm" className="w-full sm:w-auto">
                            <FileText className="h-4 w-4 mr-2" />
                            Manage Application
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      ) : (
                        application.job_post_id && (
                          <Link href={`/jobs/${application.job_post_id}`} className="flex-1 sm:flex-initial">
                            <Button variant="outline" size="sm" className="w-full sm:w-auto">
                              View Job
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </Link>
                        )
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border border-gray-200 dark:border-gray-800">
            <CardContent className="p-8 sm:p-12 text-center">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-800">
                  <Briefcase className="h-8 w-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    No Applications Yet
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">
                    You haven't applied to any jobs or volunteer opportunities yet.
                  </p>
                  <Link href="/jobs">
                    <Button>
                      Browse Available Jobs
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProfileLayout>
  )
}
