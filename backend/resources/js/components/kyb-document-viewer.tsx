"use client"

import { useState, useEffect } from "react"
import { router } from "@inertiajs/react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { showSuccessToast, showErrorToast } from "@/lib/toast"

// Global route helper (provided by Laravel/Inertia)
declare global {
  function route(name: string, params?: any): string
}
import {
  X,
  CheckCircle2,
  XCircle,
  ZoomIn,
  ZoomOut,
  Download,
  AlertTriangle,
  FileText,
  Shield,
  Eye,
  Activity,
  AlertCircle,
  CheckCircle,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building,
  Hash,
  TrendingUp,
} from "lucide-react"

type KybDocumentViewerProps = {
  isOpen: boolean
  onClose: () => void
  document: {
    id: string
    type: string
    name: string
    url?: string
    status?: string
    verified?: boolean
    rejectionReason?: string
  }
  businessInfo?: {
    id: number
    business_name: string
    business_email: string
    ein: string
    business_address?: {
      street_line_1?: string
      city?: string
      subdivision?: string
      postal_code?: string
      country?: string
    }
    bridge_customer_id?: string
    submission_status: string
    submittedAt: string
    reviewedAt?: string
    reviewedBy?: string
    rejectionReason?: string
    approvalNotes?: string
  }
  controlPerson?: {
    first_name: string
    last_name: string
    email: string
    birth_date?: string
    ssn?: string
    title: string
    ownership_percentage: number
    street_line_1?: string
    city?: string
    state?: string
    postal_code?: string
    country?: string
    id_type?: string
    id_number?: string
  }
  allDocuments?: Array<{
    id: string
    type: string
    name: string
    url?: string
    status?: string
    verified?: boolean
    rejectionReason?: string
  }>
  onDocumentAction?: () => void
}

export function KybDocumentViewer({ 
  isOpen, 
  onClose, 
  document, 
  businessInfo, 
  controlPerson,
  allDocuments,
  onDocumentAction
}: KybDocumentViewerProps) {
  const [zoom, setZoom] = useState(100)
  const [notes, setNotes] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0)
  const [isLoadingDocument, setIsLoadingDocument] = useState(false)
  const [documentsWithUrls, setDocumentsWithUrls] = useState<any[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
  
  // Helper to ensure URL is absolute
  const ensureAbsoluteUrl = (url: string | undefined): string => {
    if (!url) return ''
    // If already absolute (starts with http:// or https://), return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    // If starts with /, it's already a root-relative URL, return as is
    if (url.startsWith('/')) {
      return url
    }
    // Otherwise, make it root-relative
    return '/' + url.replace(/^\//, '')
  }

  // Get current document (either from allDocuments array or single document)
  const currentDocument = allDocuments && allDocuments.length > 0 
    ? (documentsWithUrls[currentDocumentIndex] || allDocuments[currentDocumentIndex])
    : document
  
  // Ensure current document has absolute URL
  const currentDocumentWithUrl = currentDocument ? {
    ...currentDocument,
    url: ensureAbsoluteUrl(currentDocument.url)
  } : null

  const handleApprove = async () => {
    if (!businessInfo?.id || !currentDocumentWithUrl?.type) {
      showErrorToast("Missing submission ID or document type")
      return
    }

    setIsApproving(true)
    
    try {
      router.post(
        route("admin.kyb-verification.document.approve", {
          id: businessInfo.id,
          documentType: currentDocumentWithUrl.type,
        }),
        { approval_notes: notes },
        {
          preserveScroll: true,
          onSuccess: () => {
            showSuccessToast(`${currentDocumentWithUrl.name} approved successfully`)
            setNotes("")
            setIsApproving(false)
            // Call parent callback to refresh data
            if (onDocumentAction) {
              onDocumentAction()
            }
          },
          onError: (errors) => {
            showErrorToast(
              errors?.message || `Failed to approve ${currentDocumentWithUrl.name}`
            )
            setIsApproving(false)
          },
        }
      )
    } catch (error) {
      showErrorToast(`Failed to approve ${currentDocumentWithUrl.name}`)
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      showErrorToast("Please provide a rejection reason")
      return
    }

    if (!businessInfo?.id || !currentDocumentWithUrl?.type) {
      showErrorToast("Missing submission ID or document type")
      return
    }

    setIsRejecting(true)
    
    try {
      router.post(
        route("admin.kyb-verification.document.reject", {
          id: businessInfo.id,
          documentType: currentDocumentWithUrl.type,
        }),
        { rejection_reason: rejectionReason },
        {
          preserveScroll: true,
          onSuccess: () => {
            showSuccessToast(
              `${currentDocumentWithUrl.name} rejected. User will need to re-upload it.`
            )
            setRejectionReason("")
            setIsRejecting(false)
            // Call parent callback to refresh data
            if (onDocumentAction) {
              onDocumentAction()
            }
          },
          onError: (errors) => {
            showErrorToast(
              errors?.message || `Failed to reject ${currentDocumentWithUrl.name}`
            )
            setIsRejecting(false)
          },
        }
      )
    } catch (error) {
      showErrorToast(`Failed to reject ${currentDocumentWithUrl.name}`)
      setIsRejecting(false)
    }
  }

  const handleDocumentSwitch = async (index: number) => {
    if (!allDocuments || index === currentDocumentIndex) return
    
    setCurrentDocumentIndex(index)
    setZoom(100)
    setImagePosition({ x: 0, y: 0 })
  }

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -10 : 10
    setZoom(prev => Math.max(10, prev + delta))
  }

  // Drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    
    const newX = e.clientX - dragStart.x
    const newY = e.clientY - dragStart.y
    
    setImagePosition({
      x: newX,
      y: newY
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Touch events for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setIsDragging(true)
    setDragStart({ x: touch.clientX - imagePosition.x, y: touch.clientY - imagePosition.y })
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    e.preventDefault()
    const touch = e.touches[0]
    
    const newX = touch.clientX - dragStart.x
    const newY = touch.clientY - dragStart.y
    
    setImagePosition({
      x: newX,
      y: newY
    })
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  // Initialize documents with URLs when component opens
  useEffect(() => {
    if (allDocuments && allDocuments.length > 0) {
      setDocumentsWithUrls(allDocuments)
    }
  }, [allDocuments])

  // Global mouse up listener for drag functionality
  useEffect(() => {
    if (!isDragging) return

    const handleGlobalMouseUp = () => {
      setIsDragging(false)
    }

    const handleGlobalTouchEnd = () => {
      setIsDragging(false)
    }

    try {
      if (typeof window !== 'undefined' && window.document) {
        window.document.addEventListener('mouseup', handleGlobalMouseUp)
        window.document.addEventListener('touchend', handleGlobalTouchEnd)
      }
    } catch (error) {
      // Could not add event listeners
    }

    return () => {
      try {
        if (typeof window !== 'undefined' && window.document) {
          window.document.removeEventListener('mouseup', handleGlobalMouseUp)
          window.document.removeEventListener('touchend', handleGlobalTouchEnd)
        }
      } catch (error) {
        // Could not remove event listeners
      }
    }
  }, [isDragging])

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString))
  }

  const formatAddress = (address: any) => {
    if (!address) return "N/A"
    const parts = [
      address.street_line_1,
      address.city,
      address.subdivision || address.state,
      address.postal_code,
      address.country,
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(", ") : "N/A"
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="fixed inset-4 md:inset-8 bg-card border border-border rounded-lg shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-card">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              Advanced KYB Analysis
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Document: <span className="font-medium text-foreground">{currentDocumentWithUrl?.name || currentDocumentWithUrl?.type || document.name || document.type}</span>
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-muted">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col xl:flex-row bg-background">
          {/* Left Panel - Document Preview & Analysis */}
          <div className="flex-1 overflow-hidden bg-muted/30">
            <div className="w-full h-full">
              {/* Document Image */}
              <div className="h-full flex flex-col bg-background">
                <div className="flex items-center justify-between p-4 border-b border-border bg-card">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setZoom(Math.max(10, zoom - 10))}
                        className="hover:bg-primary hover:text-primary-foreground"
                        disabled={zoom <= 10}
                      >
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground font-mono min-w-[60px] text-center">{zoom}%</span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setZoom(zoom + 10)}
                        className="hover:bg-primary hover:text-primary-foreground"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Document Tabs */}
                    {allDocuments && allDocuments.length > 1 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">Documents:</span>
                        <div className="flex gap-1">
                          {allDocuments.map((doc, index) => (
                            <Button
                              key={doc.id}
                              variant={currentDocumentIndex === index ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleDocumentSwitch(index)}
                              className={`text-xs px-2 py-1 ${
                                currentDocumentIndex === index
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "hover:bg-muted border-border/50"
                              }`}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              {doc.name || doc.type?.replace("_", " ") || `Document ${index + 1}`}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hover:bg-primary hover:text-primary-foreground bg-transparent"
                    onClick={() => {
                      if (currentDocumentWithUrl?.url) {
                        window.open(currentDocumentWithUrl.url, '_blank')
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
                <div 
                  className="bg-muted/20 w-full flex-1 relative overflow-hidden"
                  onWheel={handleWheel}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {isLoadingDocument ? (
                    <div className="flex flex-col items-center gap-3 absolute inset-0 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <p className="text-sm text-muted-foreground">Loading document...</p>
                    </div>
                  ) : (
                    <div className="w-full h-full relative overflow-hidden">
                      {(() => {
                        // Check if document is a PDF by extension or type
                        const url = currentDocumentWithUrl?.url || ''
                        const isPdf = currentDocumentWithUrl?.type === 'pdf' || 
                                     url.toLowerCase().endsWith('.pdf') ||
                                     url.toLowerCase().includes('.pdf')
                        // Business documents can be PDFs or images - check extension
                        const isBusinessDoc = currentDocumentWithUrl?.type === 'business_formation' ||
                                             currentDocumentWithUrl?.type === 'business_ownership' ||
                                             currentDocumentWithUrl?.type === 'proof_of_address'
                        return isPdf || (isBusinessDoc && url.toLowerCase().endsWith('.pdf'))
                      })() ? (
                        <div className="w-full h-full flex flex-col items-center justify-center">
                          <iframe
                            src={currentDocumentWithUrl?.url || "/placeholder.pdf"}
                            style={{
                              width: `${zoom}%`,
                              height: '100%',
                              border: 'none',
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: `translate(calc(-50% + ${imagePosition.x}px), calc(-50% + ${imagePosition.y}px))`,
                              cursor: isDragging ? 'grabbing' : 'grab',
                              userSelect: 'none'
                            }}
                            className="rounded shadow-lg select-none"
                            title="PDF Document"
                            onMouseDown={handleMouseDown}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            draggable={false}
                          />
                          <div className="absolute bottom-4 right-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(currentDocumentWithUrl?.url, '_blank')}
                              className="bg-background/80 backdrop-blur-sm"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download PDF
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={currentDocumentWithUrl?.url || "/placeholder.svg?height=600&width=800"}
                          alt={currentDocumentWithUrl?.type || 'document'}
                          style={{ 
                            width: `${zoom}%`,
                            height: 'auto',
                            objectFit: 'contain',
                            cursor: isDragging ? 'grabbing' : 'grab',
                            userSelect: 'none',
                            maxWidth: 'none',
                            maxHeight: 'none',
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: `translate(calc(-50% + ${imagePosition.x}px), calc(-50% + ${imagePosition.y}px))`
                          }}
                          className="rounded shadow-lg select-none"
                          onMouseDown={handleMouseDown}
                          onTouchStart={handleTouchStart}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={handleTouchEnd}
                          draggable={false}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Actions */}
          <div className="w-full xl:w-96 border-t xl:border-t-0 xl:border-l border-border bg-card flex flex-col h-full">
            {/* Scrollable Content */}
            <div className="flex-1 overflow-auto p-6 bg-background">
              {/* Business Information */}
              {businessInfo && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Business Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Business Name</p>
                        <p className="text-sm font-medium text-foreground">{businessInfo.business_name}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Business Email</p>
                        <p className="text-sm font-medium text-foreground">{businessInfo.business_email}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">EIN</p>
                        <p className="text-sm font-medium text-foreground font-mono">{businessInfo.ein}</p>
                      </div>
                    </div>
                    {businessInfo.business_address && (
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Business Address</p>
                          <p className="text-sm font-medium text-foreground">{formatAddress(businessInfo.business_address)}</p>
                        </div>
                      </div>
                    )}
                    {businessInfo.bridge_customer_id && (
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Bridge Customer ID</p>
                          <p className="text-sm font-medium text-foreground font-mono text-xs">{businessInfo.bridge_customer_id}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Submitted</p>
                        <p className="text-sm font-medium text-foreground">
                          {(() => {
                            try {
                              const date = new Date(businessInfo.submittedAt);
                              if (isNaN(date.getTime())) {
                                return "Invalid Date";
                              }
                              return date.toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              });
                            } catch (error) {
                              return "Invalid Date";
                            }
                          })()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">KYB Status</p>
                        <div className="mt-1">
                          {businessInfo.submission_status === "approved" && (
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approved
                            </Badge>
                          )}
                          {businessInfo.submission_status === "pending" && (
                            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                          {businessInfo.submission_status === "rejected" && (
                            <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
                              <XCircle className="h-3 w-3 mr-1" />
                              Rejected
                            </Badge>
                          )}
                          {businessInfo.submission_status === "in_review" && (
                            <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                              <Eye className="h-3 w-3 mr-1" />
                              Under Review
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {businessInfo.reviewedAt && (
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Reviewed</p>
                          <p className="text-sm font-medium text-foreground">
                            {(() => {
                              try {
                                const date = new Date(businessInfo.reviewedAt);
                                if (isNaN(date.getTime())) {
                                  return "Invalid Date";
                                }
                                return date.toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                });
                              } catch (error) {
                                return "Invalid Date";
                              }
                            })()}
                          </p>
                          {businessInfo.reviewedBy && (
                            <p className="text-xs text-muted-foreground mt-1">
                              by {businessInfo.reviewedBy}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {businessInfo.rejectionReason && (
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Rejection Reason</p>
                          <p className="text-sm text-red-500 mt-1">{businessInfo.rejectionReason}</p>
                        </div>
                      </div>
                    )}
                    {businessInfo.approvalNotes && (
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Approval Notes</p>
                          <p className="text-sm text-green-500 mt-1">{businessInfo.approvalNotes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Control Person Information */}
              {controlPerson && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Control Person (Beneficial Owner)</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Full Name</p>
                        <p className="text-sm font-medium text-foreground">
                          {controlPerson.first_name} {controlPerson.last_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="text-sm font-medium text-foreground">{controlPerson.email}</p>
                      </div>
                    </div>
                    {controlPerson.birth_date && (
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Date of Birth</p>
                          <p className="text-sm font-medium text-foreground">
                            {(() => {
                              try {
                                const date = new Date(controlPerson.birth_date);
                                if (isNaN(date.getTime())) {
                                  return "Invalid Date";
                                }
                                return date.toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                });
                              } catch (error) {
                                return "Invalid Date";
                              }
                            })()}
                          </p>
                        </div>
                      </div>
                    )}
                    {controlPerson.ssn && (
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">SSN</p>
                          <p className="text-sm font-medium text-foreground font-mono">
                            ***-**-{controlPerson.ssn.slice(-4)}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Title</p>
                        <p className="text-sm font-medium text-foreground">{controlPerson.title}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <TrendingUp className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Ownership Percentage</p>
                        <p className="text-sm font-medium text-foreground">{controlPerson.ownership_percentage}%</p>
                      </div>
                    </div>
                    {(controlPerson.street_line_1 || controlPerson.city) && (
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Address</p>
                          <p className="text-sm font-medium text-foreground">
                            {[
                              controlPerson.street_line_1,
                              controlPerson.city,
                              controlPerson.state,
                              controlPerson.postal_code,
                              controlPerson.country,
                            ].filter(Boolean).join(", ") || "N/A"}
                          </p>
                        </div>
                      </div>
                    )}
                    {controlPerson.id_type && (
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">ID Type</p>
                          <p className="text-sm font-medium text-foreground capitalize">
                            {controlPerson.id_type.replace("_", " ")}
                          </p>
                        </div>
                      </div>
                    )}
                    {controlPerson.id_number && (
                      <div className="flex items-start gap-3">
                        <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">ID Number</p>
                          <p className="text-sm font-medium text-foreground font-mono">{controlPerson.id_number}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Document Info */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Document Information</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Document Type</p>
                      <p className="text-sm font-medium text-foreground capitalize">
                        {currentDocumentWithUrl?.name || currentDocumentWithUrl?.type?.replace("_", " ") || "Unknown Document"}
                      </p>
                    </div>
                  </div>
                  {currentDocumentWithUrl?.status && (
                    <div className="flex items-start gap-3">
                      <Activity className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <div className="mt-1">
                          {(currentDocumentWithUrl.status === "verified" || currentDocumentWithUrl.status === "approved") && (
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approved
                            </Badge>
                          )}
                          {currentDocumentWithUrl.status === "pending" && (
                            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                          {currentDocumentWithUrl.status === "rejected" && (
                            <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
                              <XCircle className="h-3 w-3 mr-1" />
                              Rejected
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes Section */}
              {currentDocumentWithUrl && currentDocumentWithUrl.status !== "rejected" && currentDocumentWithUrl.status !== "approved" && (
                <>
                  <div className="mb-6">
                    <Label htmlFor="notes" className="text-sm font-semibold text-foreground mb-2 block">
                      Verification Notes
                    </Label>
                    <Textarea
                      id="notes"
                      placeholder="Add detailed notes about this verification decision..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      className="resize-none bg-background/50 border-border/50"
                    />
                  </div>

                  {/* Rejection Reason */}
                  <div className="mb-6">
                    <Label htmlFor="rejection" className="text-sm font-semibold text-foreground mb-2 block">
                      {currentDocumentWithUrl?.status === "verified" ? "Rejection Reason (rejecting approved document)" : "Rejection Reason (if rejecting)"}
                    </Label>
                    <Textarea
                      id="rejection"
                      placeholder={currentDocumentWithUrl?.status === "verified" ? "Provide a clear reason for rejecting this approved document..." : "Provide a clear reason for rejection..."}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={3}
                      className="resize-none bg-background/50 border-border/50"
                    />
                  </div>
                </>
              )}

              {/* Status Display for Already Processed Documents */}
              {currentDocumentWithUrl && ((currentDocumentWithUrl.status === "verified" || currentDocumentWithUrl.status === "approved") || currentDocumentWithUrl.status === "rejected") && (
                <Card className="p-4 bg-muted/30 border-border">
                  <div className="flex items-center gap-2 mb-2">
                    {(currentDocumentWithUrl.status === "verified" || currentDocumentWithUrl.status === "approved") ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="font-semibold text-foreground capitalize">
                      {currentDocumentWithUrl.status === "verified" || currentDocumentWithUrl.status === "approved" ? "Approved" : currentDocumentWithUrl.status}
                    </span>
                  </div>
                  {currentDocumentWithUrl.rejectionReason && (
                    <p className="text-sm text-foreground mt-2 p-2 bg-card rounded border border-border">{currentDocumentWithUrl.rejectionReason}</p>
                  )}
                </Card>
              )}
            </div>

            {/* Fixed Bottom Action Buttons */}
            {currentDocumentWithUrl && (currentDocumentWithUrl.status !== "rejected" || currentDocumentWithUrl.status === "approved") && (
              <div className="border-t border-border p-6 bg-card">
                <div className="space-y-3">
                  {/* Approve button - only show if not already approved */}
                  {currentDocumentWithUrl.status !== "verified" && currentDocumentWithUrl.status !== "approved" && (
                    <Button
                      onClick={handleApprove}
                      disabled={isApproving || isRejecting}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {isApproving ? "Processing..." : "Approve Document"}
                    </Button>
                  )}
                  
                  {/* Reject button - always show (can reject approved documents) */}
                  <Button
                    onClick={handleReject}
                    disabled={isRejecting || isApproving || !rejectionReason.trim()}
                    variant="destructive"
                    className="w-full"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {isRejecting ? "Processing..." : (currentDocumentWithUrl.status === "verified" || currentDocumentWithUrl.status === "approved") ? "Reject Approved Document" : "Reject Document"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

