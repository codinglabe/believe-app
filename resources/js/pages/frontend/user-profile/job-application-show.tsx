"use client"

import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { 
  Briefcase, Calendar, MapPin, Building2, Clock, CheckCircle2, 
  ArrowLeft, FileText, CheckCircle, Send, MessageSquare, 
  DollarSign, Award, Mail, Phone, User, AlertCircle 
} from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Badge } from "@/components/frontend/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/frontend/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/frontend/ui/tabs"
import { Textarea } from "@/components/admin/ui/textarea"
import { Label } from "@/components/frontend/ui/label"
import { Input } from "@/components/ui/input"
import { Link, router, usePage } from "@inertiajs/react"
import { useState, useEffect } from "react"
import { showSuccessToast, showErrorToast } from "@/lib/toast"

interface JobPost {
  id: number
  title: string
  description?: string
  type: string
  location_type: string
  city?: string
  state?: string
  pay_rate?: number
  currency?: string
  points?: number
  organization?: {
    id: number
    name: string
    email?: string
    phone?: string
  }
}

interface Timesheet {
  id: number
  work_date: string
  start_date?: string
  end_date?: string
  hours: number
  description?: string
  notes?: string
  status: 'pending' | 'approved' | 'rejected' | 'in_progress'
  is_completion_request?: boolean
  created_at: string
  assessment?: {
    final_points?: number
    grade?: string
    review_notes?: string
  } | null
}

interface JobApplication {
  id: number
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected'
  job_post_id: number
  created_at: string
  updated_at: string
  job_post: JobPost
  completion_requested?: boolean
  completion_requested_at?: string
  job_status?: 'completed' | 'in_progress' | null
  last_completion_request_status?: 'pending' | 'approved' | 'rejected' | 'in_progress' | null
  timesheets?: Timesheet[]
}

interface PageProps {
  application: JobApplication
}

export default function JobApplicationShow() {
  const pageProps = usePage<PageProps>().props
  const { application: initialApplication } = pageProps
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [notes, setNotes] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [timesheetsLoaded, setTimesheetsLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState('job-details')
  
  // Use application from props (will be updated when timesheets are fetched)
  const application = (pageProps as any).application || initialApplication
  const timesheets = application?.timesheets || []
  const loadingTimesheets = false

  // Auto-select start date when form opens (use when application was accepted/updated, or created_at)
  useEffect(() => {
    if (showRequestForm && application?.updated_at) {
      const acceptedDate = new Date(application.updated_at)
      setStartDate(acceptedDate.toISOString().split('T')[0])
    }
  }, [showRequestForm, application?.updated_at])
  
  // Check if timesheets are already loaded in props
  useEffect(() => {
    if (application?.timesheets && application.timesheets.length > 0) {
      setTimesheetsLoaded(true)
    }
  }, [application?.timesheets])

  const getStatusColor = (status: string) => {
    const colors = {
      'pending': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
      'reviewed': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
      'accepted': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
      'rejected': 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
    }
    return colors[status] || 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800'
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

  const getJobTypeColor = (type: string) => {
    const colors = {
      'volunteer': 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
      'paid': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
      'internship': 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
      'contract': 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
    }
    return colors[type] || 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const fetchTimesheets = () => {
    if (timesheetsLoaded) return
    
    router.get(`/profile/job-applications/${application.id}/timesheets`, {}, {
      preserveState: true,
      preserveScroll: true,
      only: ['application'],
      onSuccess: () => {
        setTimesheetsLoaded(true)
      },
      onError: () => {
        showErrorToast('Failed to load timesheets')
      }
    })
  }

  const handleRequestCompletion = () => {
    if (!notes.trim()) {
      showErrorToast('Please provide notes about the completion of your work')
      return
    }
    if (!startDate) {
      showErrorToast('Please select a start date')
      return
    }
    if (!endDate) {
      showErrorToast('Please select an end date')
      return
    }
    if (new Date(endDate) < new Date(startDate)) {
      showErrorToast('End date must be after start date')
      return
    }

    setIsSubmitting(true)
    router.post(`/profile/job-applications/${application.id}/request-completion`, {
      notes: notes.trim(),
      start_date: startDate,
      end_date: endDate
    }, {
      onSuccess: () => {
        showSuccessToast('Completion request submitted successfully!')
        setShowRequestForm(false)
        setNotes('')
        setStartDate('')
        setEndDate('')
        // Reset timesheets loaded flag so it will refetch when Time Sheets tab is clicked
        setTimesheetsLoaded(false)
      },
      onError: () => {
        showErrorToast('Failed to submit completion request. Please try again.')
      },
      onFinish: () => {
        setIsSubmitting(false)
      }
    })
  }

  return (
    <ProfileLayout
      title="Application Details"
      description="Manage your job application"
    >
      <div className="space-y-4 sm:space-y-6">
        {/* Back Button */}
        <Link href="/profile/job-applications">
          <Button variant="outline" size="sm" className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Applications
          </Button>
        </Link>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value)
          if (value === 'timesheets' && !timesheetsLoaded) {
            fetchTimesheets()
          }
        }} className="w-full">
          <TabsList className="inline-flex w-auto">
            <TabsTrigger value="job-details">Job Details</TabsTrigger>
            <TabsTrigger value="timesheets">Time Sheets</TabsTrigger>
          </TabsList>

          {/* Job Details Tab */}
          <TabsContent value="job-details" className="space-y-4 sm:space-y-6 mt-4">
            {/* Job Details */}
            <Card className="border border-gray-200 dark:border-gray-800">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base sm:text-lg">Job Details</CardTitle>
                <CardDescription>Information about the position</CardDescription>
              </div>
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
          </CardHeader>
          <CardContent className="space-y-4">
            {application.job_post?.organization && (
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400">Organization</Label>
                  <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                    {application.job_post.organization.name}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {application.job_post?.location_type && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <Label className="text-xs text-gray-500 dark:text-gray-400">Location Type</Label>
                    <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white capitalize">
                      {application.job_post.location_type}
                    </p>
                  </div>
                </div>
              )}

              {(application.job_post?.city || application.job_post?.state) && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <Label className="text-xs text-gray-500 dark:text-gray-400">Location</Label>
                    <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                      {[application.job_post.city, application.job_post.state].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {application.job_post?.description && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Description</Label>
                <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {application.job_post.description}
                </p>
              </div>
            )}

            {(application.job_post?.pay_rate || application.job_post?.points) && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  {application.job_post.type === 'volunteer' && application.job_post.points ? (
                    <>
                      <Award className="h-5 w-5 text-purple-500" />
                      <div>
                        <Label className="text-xs text-gray-500 dark:text-gray-400">Reward Points</Label>
                        <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                          {application.job_post.points.toLocaleString()} Points
                        </p>
                      </div>
                    </>
                  ) : (
                    application.job_post.pay_rate && (
                      <>
                        <DollarSign className="h-5 w-5 text-green-500" />
                        <div>
                          <Label className="text-xs text-gray-500 dark:text-gray-400">Pay Rate</Label>
                          <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                            {application.job_post.currency || '$'}{application.job_post.pay_rate.toLocaleString()}
                          </p>
                        </div>
                      </>
                    )
                  )}
                </div>
              </div>
            )}
            </CardContent>
          </Card>

          {/* Actions for Accepted Applications */}
          {application.status === 'accepted' && application.job_status !== 'completed' && (
          <>
            {/* Show form if: no completion request OR last request was approved/rejected */}
            {(application.completion_requested === false || 
              application.last_completion_request_status === 'approved' || 
              application.last_completion_request_status === 'rejected') ? (
              <>
                {!showRequestForm ? (
                  <Card className="border border-gray-200 dark:border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-base sm:text-lg">Actions</CardTitle>
                      <CardDescription>Manage your accepted application</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-end">
                        <Button 
                          onClick={() => setShowRequestForm(true)}
                          className="w-full sm:w-auto"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Request Job Completion
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border border-gray-200 dark:border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-base sm:text-lg">Request Job Completion</CardTitle>
                      <CardDescription>
                        Submit a request to mark this job as completed. The organization will review your request.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="start-date" className="mb-2 block">
                            Joining Date (Start Date) <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="start-date"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full"
                            required
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            When you started this position
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="end-date-field" className="mb-2 block">
                            End Date <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="end-date-field"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={startDate || undefined}
                            className="w-full"
                            required
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            When you completed the work
                          </p>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="completion-notes" className="mb-2 block">
                          Completion Notes <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id="completion-notes"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Please describe the work you completed, including any key achievements or milestones..."
                          rows={6}
                          className="w-full"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Provide details about what you accomplished in this role
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end">
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setShowRequestForm(false)
                            setNotes('')
                            setStartDate('')
                            setEndDate('')
                          }}
                          disabled={isSubmitting}
                          className="w-full sm:w-auto"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleRequestCompletion}
                          disabled={isSubmitting || !notes.trim() || !startDate || !endDate}
                          className="w-full sm:w-auto"
                        >
                          {isSubmitting ? (
                            <>
                              <Clock className="h-4 w-4 mr-2 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Submit Request
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              /* Show message if completion request is pending */
              <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                        Completion Request Submitted
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Your completion request has been sent to the organization. 
                        {application.completion_requested_at && (
                          <span className="block mt-1">
                            Requested on: {formatDate(application.completion_requested_at)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
          )}
          </TabsContent>

          {/* Time Sheets Tab */}
          <TabsContent 
            value="timesheets" 
            className="space-y-4 sm:space-y-6 mt-4"
          >
            <Card className="border border-gray-200 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Time Sheets</CardTitle>
                <CardDescription>Your submitted time sheets for this job</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTimesheets ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3 animate-spin" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading timesheets...</p>
                  </div>
                ) : timesheets && timesheets.length > 0 ? (
                  <div className="space-y-4">
                    {timesheets.map((timesheet) => {
                      const getTimesheetStatusColor = (status: string) => {
                        const colors = {
                          'pending': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
                          'approved': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
                          'rejected': 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
                          'in_progress': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
                        }
                        return colors[status] || 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800'
                      }

                      const getTimesheetStatusText = (status: string) => {
                        const texts = {
                          'pending': 'Pending Review',
                          'approved': 'Approved',
                          'rejected': 'Rejected',
                          'in_progress': 'In Progress',
                        }
                        return texts[status] || status
                      }

                      const getGradeText = (grade?: string) => {
                        const grades: Record<string, string> = {
                          'excellent': 'Excellent',
                          'good': 'Good',
                          'acceptable': 'Acceptable',
                          'needs_improvement': 'Needs Improvement',
                          'rejected': 'Rejected',
                        }
                        return grade ? (grades[grade] || grade) : null
                      }

                      return (
                        <div key={timesheet.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              <Calendar className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <Badge className={`${getTimesheetStatusColor(timesheet.status)} border text-xs`}>
                                    {getTimesheetStatusText(timesheet.status)}
                                  </Badge>
                                  {timesheet.is_completion_request && (
                                    <Badge className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800 text-xs">
                                      Completion Request
                                    </Badge>
                                  )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                  {timesheet.start_date && timesheet.end_date && (
                                    <div>
                                      <Label className="text-xs text-gray-500 dark:text-gray-400">Date Range</Label>
                                      <p className="text-gray-900 dark:text-white font-medium">
                                        {formatDate(timesheet.start_date)} - {formatDate(timesheet.end_date)}
                                      </p>
                                    </div>
                                  )}
                                  <div>
                                    <Label className="text-xs text-gray-500 dark:text-gray-400">Hours</Label>
                                    <p className="text-gray-900 dark:text-white font-medium">{timesheet.hours}</p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-gray-500 dark:text-gray-400">Submitted</Label>
                                    <p className="text-gray-900 dark:text-white font-medium">{formatDate(timesheet.created_at)}</p>
                                  </div>
                                </div>
                                {timesheet.description && (
                                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Description</Label>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                      {timesheet.description}
                                    </p>
                                  </div>
                                )}
                                {timesheet.assessment && (
                                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
                                    <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block font-semibold">Assessment</Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {timesheet.assessment.final_points !== undefined && timesheet.assessment.final_points !== null && (
                                        <div>
                                          <Label className="text-xs text-gray-500 dark:text-gray-400">Paid Out Points</Label>
                                          <p className="text-gray-900 dark:text-white font-medium flex items-center gap-1">
                                            <Award className="h-4 w-4 text-purple-500" />
                                            {timesheet.assessment.final_points.toLocaleString()} Points
                                          </p>
                                        </div>
                                      )}
                                      {timesheet.assessment.grade && (
                                        <div>
                                          <Label className="text-xs text-gray-500 dark:text-gray-400">Grade</Label>
                                          <p className="text-gray-900 dark:text-white font-medium">
                                            {getGradeText(timesheet.assessment.grade)}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                    {timesheet.assessment.review_notes && (
                                      <div className="mt-3">
                                        <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Review Notes</Label>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-800/50 p-3 rounded-md">
                                          {timesheet.assessment.review_notes}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No time sheets submitted yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProfileLayout>
  )
}
