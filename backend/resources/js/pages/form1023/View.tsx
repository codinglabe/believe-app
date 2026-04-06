import React from "react"
import { Head, router, usePage } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  FileText, 
  ArrowLeft, 
  Edit, 
  CheckCircle, 
  Clock, 
  XCircle, 
  CreditCard,
  Building,
  DollarSign,
  Users,
  Globe,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Download,
  Briefcase,
  TrendingUp,
  Award
} from "lucide-react"
import type { BreadcrumbItem } from "@/types"

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Form 1023 Application", href: "#" },
]

export default function Form1023View() {
  const { application, canEdit, canPay, applicationFee } = usePage<{
    application: any
    canEdit: boolean
    canPay: boolean
    applicationFee: number
  }>().props

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      draft: {
        label: "Draft",
        className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
        icon: <FileText className="h-4 w-4" />,
      },
      pending_payment: {
        label: "Pending Payment",
        className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        icon: <Clock className="h-4 w-4" />,
      },
      awaiting_review: {
        label: "Pending Review",
        className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
        icon: <Clock className="h-4 w-4" />,
      },
      needs_more_info: {
        label: "Needs More Info",
        className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
        icon: <FileText className="h-4 w-4" />,
      },
      approved: {
        label: "Approved",
        className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        icon: <CheckCircle className="h-4 w-4" />,
      },
      rejected: {
        label: "Rejected",
        className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        icon: <XCircle className="h-4 w-4" />,
      },
    }

    const config = statusConfig[status] || {
      label: status,
      className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
      icon: <FileText className="h-4 w-4" />,
    }

    return (
      <Badge className={config.className}>
        <span className="flex items-center gap-2">
          {config.icon}
          {config.label}
        </span>
      </Badge>
    )
  }

  const getPaymentStatusBadge = (paymentStatus: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      pending: {
        label: "Pending",
        className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      },
      paid: {
        label: "Paid",
        className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      },
      cancelled: {
        label: "Cancelled",
        className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      },
    }

    const config = configs[paymentStatus] || {
      label: paymentStatus,
      className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    }

    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    )
  }

  const renderFileList = (files: any, title: string) => {
    if (!files) return null
    
    const fileArray = Array.isArray(files) ? files : [files]
    const validFiles = fileArray.filter((f: any) => f && (f.path || f.name))

    if (validFiles.length === 0) return null

    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="space-y-1">
          {validFiles.map((file: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2 p-2 bg-muted rounded-md">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm flex-1">{file.name || 'Document'}</span>
              {file.path && (
                <a
                  href={`/storage/${file.path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                >
                  <Download className="h-3 w-3" />
                  View
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Form 1023 Application" />
      <div className="m-3 space-y-6 md:m-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.visit("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <div className="flex items-center gap-3">
            {canEdit && (
              <Button 
                onClick={() => router.visit("/dashboard/form1023/apply")}
                className="bg-green-600 hover:bg-green-700"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Application
              </Button>
            )}
            {canPay && (
              <Button 
                onClick={() => router.post(`/dashboard/form1023/apply/${application.id}/pay`)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Pay Now
              </Button>
            )}
          </div>
        </div>

        {/* Status Overview Card */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl md:text-3xl flex items-center gap-2">
                  <FileText className="h-6 w-6 md:h-8 md:w-8" />
                  Form 1023 Application
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  Application #{application.application_number}
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {getStatusBadge(application.status)}
                {getPaymentStatusBadge(application.payment_status)}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 pt-4 border-t">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Submitted</p>
                  <p className="text-lg font-semibold">
                    {application.submitted_at 
                      ? new Date(application.submitted_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })
                      : 'Not submitted'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Application Fee</p>
                  <p className="text-lg font-semibold">
                    ${application.amount ? Number(application.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : applicationFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              {application.payment_status === 'paid' && application.amount && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Amount Paid</p>
                    <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                      ${Number(application.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Basic Organization Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Basic Organization Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Legal Name
                </p>
                <p className="text-base font-semibold">{application.legal_name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  EIN
                </p>
                <p className="text-base font-semibold font-mono">{application.ein}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date Incorporated
                </p>
                <p className="text-base font-semibold">
                  {application.date_incorporated 
                    ? new Date(application.date_incorporated).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })
                    : 'N/A'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  State of Incorporation
                </p>
                <p className="text-base font-semibold">{application.state_of_incorporation}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Organizational Structure
                </p>
                <p className="text-base font-semibold capitalize">{application.organizational_structure}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Contact Email
                </p>
                <p className="text-base font-semibold">{application.contact_email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Contact Phone
                </p>
                <p className="text-base font-semibold">{application.contact_phone}</p>
              </div>
              {application.website && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Website
                  </p>
                  <a 
                    href={application.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-base font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {application.website}
                  </a>
                </div>
              )}
            </div>
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Mailing Address
                </p>
                <p className="text-base font-semibold whitespace-pre-line">{application.mailing_address}</p>
              </div>
              {application.physical_address && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Physical Address
                  </p>
                  <p className="text-base font-semibold whitespace-pre-line">{application.physical_address}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mission Statement */}
        {application.mission_statement && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Mission Statement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base leading-relaxed whitespace-pre-wrap">{application.mission_statement}</p>
            </CardContent>
          </Card>
        )}

        {/* Activities */}
        {application.activities && Array.isArray(application.activities) && application.activities.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {application.activities.map((activity: any, index: number) => (
                  <Card key={index} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-6">
                      <h4 className="font-semibold text-lg mb-3">{activity.activity_name}</h4>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="font-medium text-muted-foreground mb-1">Description</p>
                          <p className="leading-relaxed">{activity.description}</p>
                        </div>
                        <div>
                          <p className="font-medium text-muted-foreground mb-1">Beneficiaries</p>
                          <p className="leading-relaxed">{activity.beneficiaries}</p>
                        </div>
                        <div>
                          <p className="font-medium text-muted-foreground mb-1">Funding Source</p>
                          <p className="leading-relaxed">{activity.funding_source}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Financial Information */}
        {(application.revenue_sources || application.budget_per_program) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Financial Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Revenue Sources */}
              {application.revenue_sources && Array.isArray(application.revenue_sources) && application.revenue_sources.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Revenue Sources</h4>
                  <div className="space-y-2">
                    {application.revenue_sources.map((source: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-4 bg-muted rounded-lg border">
                        <span className="font-medium">{source.source}</span>
                        <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                          ${Number(source.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Budget Per Program */}
              {application.budget_per_program && Array.isArray(application.budget_per_program) && application.budget_per_program.length > 0 && (
                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-3">Budget Per Program</h4>
                  <div className="space-y-2">
                    {application.budget_per_program.map((program: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-4 bg-muted rounded-lg border">
                        <span className="font-medium">{program.program}</span>
                        <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                          ${Number(program.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Officers & Directors */}
        {application.officers_directors && Array.isArray(application.officers_directors) && application.officers_directors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Officers & Directors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {application.officers_directors.map((officer: any, index: number) => (
                  <div key={index} className="p-4 bg-muted rounded-lg border">
                    <p className="font-semibold text-lg">{officer.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">{officer.title}</p>
                    {officer.address && (
                      <p className="text-sm mt-2 text-muted-foreground">{officer.address}</p>
                    )}
                    {officer.compensation !== null && officer.compensation !== undefined && (
                      <p className="text-sm mt-2 font-medium">
                        Compensation: ${Number(officer.compensation).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Supporting Documents */}
        {(application.organizing_documents || application.bylaws_document || application.conflict_of_interest_policy_document || 
          application.financial_statements || application.form_ss4_confirmation) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Supporting Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderFileList(application.organizing_documents, "Organizing Documents")}
              {renderFileList(application.bylaws_document, "Bylaws Document")}
              {renderFileList(application.conflict_of_interest_policy_document, "Conflict of Interest Policy")}
              {renderFileList(application.financial_statements, "Financial Statements")}
              {renderFileList(application.form_ss4_confirmation, "Form SS-4 Confirmation")}
            </CardContent>
          </Card>
        )}

        {/* Political Activities */}
        {application.political_activities_yes_no && (
          <Card>
            <CardHeader>
              <CardTitle>Political Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Badge className={
                  application.political_activities_yes_no === 'Yes' 
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                }>
                  {application.political_activities_yes_no}
                </Badge>
                {application.political_activities_desc && (
                  <p className="text-base leading-relaxed whitespace-pre-wrap mt-3">{application.political_activities_desc}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Foreign Activities */}
        {application.foreign_activities_yes_no && (
          <Card>
            <CardHeader>
              <CardTitle>Foreign Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Badge className={
                  application.foreign_activities_yes_no === 'Yes' 
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                }>
                  {application.foreign_activities_yes_no}
                </Badge>
                {application.foreign_activities_desc && (
                  <p className="text-base leading-relaxed whitespace-pre-wrap mt-3">{application.foreign_activities_desc}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
