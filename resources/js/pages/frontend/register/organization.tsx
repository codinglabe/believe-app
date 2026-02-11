"use client"
import type React from "react"
import { createPortal } from "react-dom"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { useEffect, useState, useRef, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Building2,
  Mail,
  Phone,
  Search,
  ArrowLeft,
  Heart,
  CheckCircle,
  AlertCircle,
  Send,
  EyeOff,
  Eye,
  ShieldCheck,
  Upload,
  ImageIcon,
  X,
  Briefcase,
  FileText,
  File,
} from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { Textarea } from "@/components/frontend/ui/textarea"
import { Checkbox } from "@/components/frontend/ui/checkbox"
import { Alert, AlertDescription } from "@/components/frontend/ui/alert"
import { Link, router, usePage } from "@inertiajs/react"
import { PageHead } from "@/components/frontend/PageHead"

// Types
interface EINLookupResponse {
  success: boolean
  data?: any
  message?: string
  errors?: Record<string, string[]>
}

interface PossibleMatch {
  id: number
  name: string
  position: string | null
  tax_year: string | null
}

interface RegistrationResponse {
  success: boolean
  message?: string
  organization?: any
  errors?: Record<string, string[]>
  possible_matches?: PossibleMatch[]
}

interface OrganizationRegisterPageProps {
  seo?: { title: string; description?: string }
  referralCode?: string
  ein?: string
  inviteToken?: string
  organizationName?: string
  officers_for_ein_url?: string
}

interface PageProps extends OrganizationRegisterPageProps {
  csrf_token?: string
}

function OfficerIdDropzone({
  file,
  onFileChange,
  accept = ".pdf,.jpg,.jpeg,.png",
  maxSizeMB = 5,
  error,
  emptyLabel = "Drag & drop your ID here",
}: {
  file: File | null
  onFileChange: (file: File | null) => void
  accept?: string
  maxSizeMB?: number
  error?: string
  emptyLabel?: string
}) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateAndSet = (f: File) => {
    const validTypes = accept.split(",").map((t) => t.trim().toLowerCase())
    const ext = "." + (f.name.split(".").pop()?.toLowerCase() ?? "")
    const valid = validTypes.some((t) => ext === t || f.type.toLowerCase().includes(t.replace(".", "")))
    if (!valid) return
    if (f.size > maxSizeMB * 1024 * 1024) return
    onFileChange(f)
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) validateAndSet(f)
  }
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) validateAndSet(f)
  }
  const remove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onFileChange(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  const isUploaded = !!file
  const isPdf = file?.type === "application/pdf"

  return (
    <div className="w-full">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative w-full border-2 border-dashed rounded-lg transition-all cursor-pointer min-h-[140px] flex items-center justify-center
          ${error ? "border-red-500/60 bg-red-50/30 dark:bg-red-950/20" : ""}
          ${!error && isDragging ? "border-primary bg-primary/10" : ""}
          ${!error && !isDragging && isUploaded ? "border-green-500/50 bg-green-50/50 dark:bg-green-900/10 hover:border-green-500" : ""}
          ${!error && !isDragging && !isUploaded ? "border-border hover:border-primary/50 bg-muted/30" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={onInputChange}
          className="hidden"
        />
        <AnimatePresence mode="wait">
          {isUploaded ? (
            <motion.div
              key="uploaded"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center gap-3 w-full p-4"
            >
              <div className="flex-shrink-0 p-2.5 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                {isPdf ? <FileText className="h-8 w-8" /> : <File className="h-8 w-8" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <p className="text-sm font-medium text-foreground truncate">{file?.name ?? "Document uploaded"}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Click to change or drag a new file</p>
              </div>
              <button
                type="button"
                onClick={remove}
                className="flex-shrink-0 p-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center p-6 py-8 space-y-3"
            >
              <div
                className={`p-4 rounded-full transition-colors ${isDragging ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
              >
                {isDragging ? <Upload className="h-8 w-8" /> : <FileText className="h-8 w-8" />}
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {isDragging ? "Drop file here" : emptyLabel}
                </p>
                <p className="text-xs text-muted-foreground">or click to browse</p>
                <p className="text-xs text-muted-foreground">PDF, JPG or PNG · Max {maxSizeMB}MB</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function OrganizationRegisterPage({ seo, referralCode = '', ein: prefilledEin, inviteToken, organizationName, officers_for_ein_url }: OrganizationRegisterPageProps) {
  const { csrf_token, officers_for_ein_url: officersUrlFromPage } = usePage<PageProps>().props
  const officersForEinUrl = officers_for_ein_url ?? officersUrlFromPage ?? '/register/organization/officers-for-ein'
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [einError, setEinError] = useState("")
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [isManualEntry, setIsManualEntry] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [csrfToken, setCsrfToken] = useState(csrf_token || "")
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form data state (must be before useEffects that use formData)
  const [einData, setEinData] = useState({ ein: "" })
  const [formData, setFormData] = useState({
    ein: "",
    name: "",
    ico: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    classification: "",
    ruling: "",
    deductibility: "",
    organization: "",
    status: "",
    tax_period: "",
    filing_req: "",
    ntee_code: "",
    email: "",
    phone: "",
    contact_name: "",
    contact_title: "",
    password: "",
    password_confirmation: "",
    website: "",
    description: "",
    mission: "",
    image: null as File | null,
    officer_id: null as File | null,
    legal_name_confirmation: "",
    doc_501c3: null as File | null,
    doc_articles: null as File | null,
    doc_bylaws: null as File | null,
    doc_state_registration: null as File | null,
    doc_board_list: null as File | null,
    doc_signer_resolution: null as File | null,
    doc_bank_account: null as File | null,
    agree_to_terms: false,
    attestation_officer_on_990: false,
    has_edited_irs_data: false,
    selected_irs_board_member_id: null as number | null,
    referralCode: referralCode,
    invite_token: "",
  })

  const OFFICER_TITLES = ["President", "Treasurer", "Secretary", "Director", "Executive Director", "CEO", "Other"] as const
  const VERIFICATION_DOC_KEYS = ["doc_501c3", "doc_articles", "doc_bylaws", "doc_state_registration", "doc_board_list", "doc_signer_resolution", "doc_bank_account"] as const
  const VERIFICATION_DOC_OPTIONS: { key: typeof VERIFICATION_DOC_KEYS[number]; label: string }[] = [
    { key: "doc_501c3", label: "IRS 501(c)(3) Determination Letter (CP-575 or equivalent)" },
    { key: "doc_articles", label: "Articles of Incorporation (stamped/approved)" },
    { key: "doc_bylaws", label: "Bylaws (current)" },
    { key: "doc_state_registration", label: "State nonprofit registration / Certificate of Good Standing" },
    { key: "doc_board_list", label: "Board of Directors list (names + titles)" },
    { key: "doc_signer_resolution", label: "Authorized signer resolution (or board resolution)" },
    { key: "doc_bank_account", label: "Proof of nonprofit bank account (voided check or bank letter)" },
  ]
  const [selectedDocType, setSelectedDocType] = useState<typeof VERIFICATION_DOC_KEYS[number] | "">("")

  const [possibleOfficerMatches, setPossibleOfficerMatches] = useState<Array<PossibleMatch>>([])
  const [showOfficerSelector, setShowOfficerSelector] = useState(false)
  const [selectedOfficerId, setSelectedOfficerId] = useState<number | null>(null)
  const [realtimeOfficers, setRealtimeOfficers] = useState<PossibleMatch[]>([])
  const [realtimeOfficersLoading, setRealtimeOfficersLoading] = useState(false)
  const [contactNameDropdownOpen, setContactNameDropdownOpen] = useState(false)
  const [contactNameDropdownRect, setContactNameDropdownRect] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null)
  const contactNameDropdownRef = useRef<HTMLDivElement>(null)

  // Measure dropdown anchor when open so we can render in a portal and avoid clipping
  useEffect(() => {
    if (!contactNameDropdownOpen || !contactNameDropdownRef.current) {
      setContactNameDropdownRect(null)
      return
    }
    const update = () => {
      const el = contactNameDropdownRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const gap = 4
      const padding = 24
      const maxHeight = Math.min(224, Math.max(120, window.innerHeight - r.bottom - gap - padding))
      setContactNameDropdownRect({ top: r.bottom, left: r.left, width: r.width, maxHeight })
    }
    update()
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [contactNameDropdownOpen])

  useEffect(() => {
    if (prefilledEin) {
        setEinData({ ein: prefilledEin.replace(/\D/g, '').slice(0, 9) })
        // formData.ein = prefilledEin.replace(/\D/g, '').slice(0, 9)
      // Optional: Auto trigger lookup after 1 sec
    //   const timer = setTimeout(() => {
    //     handleEINLookup()
    //   }, 1000)
    }
  }, [prefilledEin])

  useEffect(() => {
    if (referralCode) {
      setFormData((prev) => ({
        ...prev,
        referralCode: referralCode,
      }))
    }
  }, [referralCode])

  // Real-time fetch officers for EIN when on step 3 or 4 (no submit needed)
  useEffect(() => {
    const ein = (formData.ein || "").replace(/\D/g, "")
    if (ein.length !== 9 || (step !== 3 && step !== 4) || !officersForEinUrl) return
    let cancelled = false
    setRealtimeOfficersLoading(true)
    const url = officersForEinUrl.includes("?") ? `${officersForEinUrl}&ein=${ein}` : `${officersForEinUrl}?ein=${ein}`
    fetch(url, { headers: { Accept: "application/json" } })
      .then((res) => res.json())
      .then((data: { officers?: PossibleMatch[] }) => {
        if (!cancelled && Array.isArray(data.officers)) setRealtimeOfficers(data.officers)
      })
      .catch(() => {
        if (!cancelled) setRealtimeOfficers([])
      })
      .finally(() => {
        if (!cancelled) setRealtimeOfficersLoading(false)
      })
    return () => { cancelled = true }
  }, [formData.ein, step, officersForEinUrl])

  // Capture invite token from URL if not provided in props
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlInviteToken = params.get('invite')
    const tokenToUse = inviteToken || urlInviteToken

    if (tokenToUse) {
      setFormData((prev) => ({
        ...prev,
        invite_token: tokenToUse,
      }))
    }
  }, [inviteToken])

  const passwordRequirements = useMemo(() => {
    const password = formData.password || ""
    return [
      {
        id: "length",
        label: "At least 8 characters",
        met: password.length >= 8,
      },
      {
        id: "lowercase",
        label: "At least one lowercase letter",
        met: /[a-z]/.test(password),
      },
      {
        id: "uppercase",
        label: "At least one uppercase letter",
        met: /[A-Z]/.test(password),
      },
      {
        id: "number",
        label: "At least one number",
        met: /[0-9]/.test(password),
      },
      {
        id: "symbol",
        label: "At least one symbol",
        met: /[^A-Za-z0-9]/.test(password),
      },
    ]
  }, [formData.password])

  const allPasswordRequirementsMet = useMemo(() => passwordRequirements.every((requirement) => requirement.met), [passwordRequirements])

  const passwordsMatch = useMemo(() => {
    if (!formData.password && !formData.password_confirmation) {
      return false
    }
    return formData.password === formData.password_confirmation
  }, [formData.password, formData.password_confirmation])

  // Multiple methods to get CSRF token
  const getCsrfToken = () => {
    // Method 1: From Inertia props (most reliable)
    if (csrf_token) {
      return csrf_token
    }

    // Method 2: From state
    if (csrfToken) {
      return csrfToken
    }

    // Method 3: From meta tag (fallback)
    const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content")
    if (metaToken) {
      setCsrfToken(metaToken)
      return metaToken
    }

    // Method 4: From cookie (if using cookie-based CSRF)
    const cookieToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("XSRF-TOKEN="))
      ?.split("=")[1]

    if (cookieToken) {
      const decodedToken = decodeURIComponent(cookieToken)
      setCsrfToken(decodedToken)
      return decodedToken
    }

    console.error("CSRF token not found!")
    return ""
  }

  // Ensure CSRF token is available on component mount
  useEffect(() => {
    const token = getCsrfToken()
    if (token && !csrfToken) {
      setCsrfToken(token)
    }
  }, [csrf_token])

  const handleInputChange = (field: string, value: string | boolean | File | null) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))

    // Clear specific field error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    if (file) {
      // Check file type and size
      if (!file.type.startsWith('image/')) {
        setErrors({ image: 'Please select an image file' })
        return
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setErrors({ image: 'Image size should be less than 5MB' })
        return
      }

      handleInputChange("image", file)

      // Create preview
      const reader = new FileReader()
      reader.onload = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Clear error if any
      if (errors.image) {
        setErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors.image
          return newErrors
        })
      }
    }
  }

  const removeImage = () => {
    handleInputChange("image", null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleEinInputChange = (field: string, value: string) => {
    setEinData((prev) => ({
      ...prev,
      [field]: value,
    }))

    // Clear EIN error when user types
    setEinError("")
  }

  const formatEIN = (value: string) => {
    const digits = value.replace(/\D/g, "")
    if (digits.length <= 2) return digits
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2)}`
    return `${digits.slice(0, 2)}-${digits.slice(2, 9)}`
  }

  const handleEINChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatEIN(e.target.value)
    const cleanEin = formatted.replace("-", "")
    handleEinInputChange("ein", cleanEin)
  }

  const handleEINLookup = async () => {
  if (!einData.ein || einData.ein.length !== 9) {
    setEinError("Please enter a valid 9-digit EIN")
    return
  }

  console.log("Starting EIN lookup for:", einData.ein)
  setIsLoading(true)
  setEinError("")
  setLookupStatus('loading')

  const token = getCsrfToken()
  if (!token) {
    setEinError("Security token not available. Please refresh the page.")
    setIsLoading(false)
    setLookupStatus('error')
    return
  }

  // Reset editable fields before lookup
  setFormData((prev) => ({
    ...prev,
    ein: einData.ein,
    name: "",
    ico: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    classification: "",
    ruling: "",
    deductibility: "",
    organization: "",
    status: "",
    tax_period: "",
    filing_req: "",
    ntee_code: "",
    has_edited_irs_data: false,
  }))
  setIsManualEntry(false)

  try {
    const response = await fetch("/register/organization/lookup-ein", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-CSRF-TOKEN": getCsrfToken(),
      },
      body: JSON.stringify({ ein: einData.ein }),
    })

    const data: EINLookupResponse = await response.json()

    console.log("EIN lookup response status:", response.status)
    console.log("EIN lookup response data:", data)

    if (!response.ok) {
      // Handle HTTP errors (4xx, 5xx)
      if (response.status === 422) {
        // Validation error
        setEinError(data.message || data.errors?.ein?.[0] || "This organization is already registered")
        setLookupStatus('error')
        setIsManualEntry(false)
        return
      }

      if (response.status === 404) {
        // EIN not found
        const cleanEin = einData.ein
        setFormData((prev) => ({
          ...prev,
          ein: cleanEin,
          name: "",
          ico: "",
          street: "",
          city: "",
          state: "",
          zip: "",
          classification: "",
          ruling: "",
          deductibility: "",
          organization: "",
          status: "",
          tax_period: "",
          filing_req: "",
          ntee_code: "",
          has_edited_irs_data: true,
        }))
        setLookupStatus('success')
        setIsManualEntry(true)
        setStep(2)
        return
      }

      // Other errors
      setEinError(data.message || "Error looking up EIN. Please try again.")
      setLookupStatus('error')
      setIsManualEntry(true)
      return
    }

    if (data.success && data.data) {
      // Update form data with IRS data
      const irsData = data.data

      setFormData((prev) => ({
        ...prev,
        ein: einData.ein,
        name: irsData.name || "",
        ico: irsData.ico || "",
        street: irsData.street || "",
        city: irsData.city || "",
        state: irsData.state || "",
        zip: irsData.zip || "",
        classification: irsData.classification || "",
        ruling: irsData.ruling || "",
        deductibility: irsData.deductibility || "",
        organization: irsData.organization || "",
        status: irsData.status || "",
        tax_period: irsData.tax_period || "",
        filing_req: irsData.filing_req || "",
        ntee_code: irsData.ntee_code || "",
        has_edited_irs_data: false,
      }))

      setLookupStatus('success')
      setIsManualEntry(false)
      setStep(2)
    } else {
      // EIN not found in database
      const cleanEin = einData.ein
      setFormData((prev) => ({
        ...prev,
        ein: cleanEin,
        name: "",
        ico: "",
        street: "",
        city: "",
        state: "",
        zip: "",
        classification: "",
        ruling: "",
        deductibility: "",
        organization: "",
        status: "",
        tax_period: "",
        filing_req: "",
        ntee_code: "",
        has_edited_irs_data: true,
      }))
      setLookupStatus('success')
      setIsManualEntry(true)
      setStep(2)
    }
  } catch (error: any) {
    console.error("EIN lookup network error:", error)

    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      setEinError("Network error. Please check your internet connection.")
    } else {
      setEinError("Error looking up EIN. Please try again.")
    }

    setLookupStatus('error')
    setIsManualEntry(true)
  } finally {
    setIsLoading(false)
  }
}

  const handleFinalSubmit = async (selectedOfficerIdForSubmit?: number) => {
    if (!formData.agree_to_terms || !formData.description || !formData.mission) {
      return
    }
    if (!formData.attestation_officer_on_990 && selectedOfficerIdForSubmit == null) {
      setErrors((e) => ({ ...e, attestation_officer_on_990: "You must certify that you are a current officer of this organization." }))
      return
    }

    setIsLoading(true)
    setErrors({})

    const token = getCsrfToken()
    if (!token) {
      setEinError("Security token not available. Please refresh the page.")
      setIsLoading(false)
      return
    }

    try {
      // Create FormData object for file upload
      const formDataToSend = new FormData()

      // Append all form fields
      Object.keys(formData).forEach(key => {
        if (key === 'image' && formData.image) {
          formDataToSend.append('image', formData.image)
        } else if (key === 'officer_id' && formData.officer_id) {
          formDataToSend.append('officer_id', formData.officer_id)
        } else if (key === 'invite_token' && formData.invite_token) {
          formDataToSend.append('invite_token', formData.invite_token)
        } else if (key === 'attestation_officer_on_990') {
          formDataToSend.append(key, formData.attestation_officer_on_990 ? '1' : '0')
        } else if (key === 'selected_irs_board_member_id') {
          const id = selectedOfficerIdForSubmit ?? formData.selected_irs_board_member_id
          const numId = id != null && id !== '' && !Number.isNaN(Number(id)) ? Number(id) : null
          if (numId != null) formDataToSend.append(key, String(numId))
        } else if (key !== 'selected_irs_board_member_id' && key !== 'officer_id' && !VERIFICATION_DOC_KEYS.includes(key as typeof VERIFICATION_DOC_KEYS[number])) {
          const val = formData[key as keyof typeof formData]
          if (val != null && val !== '') formDataToSend.append(key, val as string | Blob)
        }
      })
      if (formData.legal_name_confirmation) formDataToSend.append('legal_name_confirmation', formData.legal_name_confirmation)
      VERIFICATION_DOC_KEYS.forEach((k) => { const f = formData[k]; if (f) formDataToSend.append(k, f) })

      const response = await fetch("/register/organization", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
        body: formDataToSend,
      })

      const data: RegistrationResponse = await response.json()

      console.log("Registration response:", data)

      if (data.success) {
        setRegistrationSuccess(true)
        setSuccessMessage(data.message || "Organization registered successfully!")
        setStep(5)
        // Organization registration: redirect to dashboard (user is already logged in)
        router.visit(route("dashboard"))
      } else {
        const res = data as RegistrationResponse
        const possibleMatches = Array.isArray(res.possible_matches) ? res.possible_matches : []
        const isMultipleMatchesResponse = response.status === 422 && (possibleMatches.length > 0 || res.message?.toLowerCase().includes('select your name') || res.errors?.selected_irs_board_member_id)

        // Multiple 990 officer matches: show list so user can select one
        if (isMultipleMatchesResponse) {
          setPossibleOfficerMatches(possibleMatches)
          setShowOfficerSelector(true)
          setSelectedOfficerId(null)
          setErrors((res.errors ? Object.fromEntries(
            Object.entries(res.errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
          ) : {}) as Record<string, string>)
          setIsLoading(false)
          return
        }
        // Other validation errors
        if (data.errors) {
          const formattedErrors: Record<string, string> = {}
          Object.entries(data.errors).forEach(([key, value]) => {
            formattedErrors[key] = Array.isArray(value) ? value[0] : value
          })
          setErrors(formattedErrors)
        }
      }
    } catch (error) {
      console.error("Registration error:", error)
      setErrors({ general: "Registration failed. Please try again." })
    } finally {
      setIsLoading(false)
    }
  }

  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        return einData.ein.length === 9
      case 2:
        return isManualEntry
          ? !!(formData.name && formData.street && formData.city && formData.state && formData.zip)
          : lookupStatus === 'success'
      case 3:
        return !!(
          formData.image &&
          formData.email &&
          formData.phone &&
          formData.contact_name &&
          formData.contact_title &&
          formData.password &&
          formData.password_confirmation
        )
      case 4: {
        const docCount = VERIFICATION_DOC_KEYS.filter((k) => formData[k]).length
        return !!(
          formData.agree_to_terms &&
          formData.attestation_officer_on_990 &&
          formData.description &&
          formData.mission &&
          formData.legal_name_confirmation?.trim() &&
          formData.officer_id &&
          docCount >= 6
        )
      }
      default:
        return false
    }
  }

  const goToStep = (targetStep: number) => {
    // Allow going back or forward if current step is valid
    if (targetStep < step || validateStep(step)) {
      setStep(targetStep)
    }
  }

  // Success state
  if (registrationSuccess || step === 5) {
    return (
      <FrontendLayout>
        <PageHead title={seo?.title ?? "Register Your Nonprofit"} description={seo?.description} />
        <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-purple-600 via-blue-600 to-purple-700 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
          {/* Background Image Overlay */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
            style={{
              backgroundImage: 'url(/images/believe-hero.png)'
            }}
          >
            {/* Dark overlay for better content readability */}
            <div className="absolute inset-0 bg-purple-900/70 dark:bg-purple-900/80"></div>
          </div>

          {/* Subtle Pattern Overlay */}
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-12 sm:py-16 md:py-20">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="max-w-md mx-auto"
            >
              <Card className="border-0 shadow-2xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-md overflow-hidden text-center">
                <CardContent className="p-6 sm:p-8">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Registration Completed!</h2>

                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    {successMessage || `${formData.name} has been successfully registered with ${import.meta.env.VITE_APP_NAME}!`}
                  </p>

                  <Alert className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                    <Send className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-700 dark:text-blue-400">
                      We've sent a confirmation email to {formData.email}. Your organization is now active on our
                      platform!
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <Link href="/login">
                      <Button className="w-full h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300">Go to Sign In</Button>
                    </Link>
                  </div>

                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                    Questions about your registration?{" "}
                    <Link href="/contact" className="text-blue-600 hover:underline">
                      Contact our support team
                    </Link>
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </FrontendLayout>
    )
  }

  return (
    <FrontendLayout>
      <PageHead title={seo?.title ?? "Register Your Nonprofit"} description={seo?.description} />
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-purple-600 via-blue-600 to-purple-700 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
        {/* Background Image Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{
            backgroundImage: 'url(/images/believe-hero.png)'
          }}
        >
          {/* Dark overlay for better content readability */}
          <div className="absolute inset-0 bg-purple-900/70 dark:bg-purple-900/80"></div>
        </div>

        {/* Subtle Pattern Overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-12 sm:py-16 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            {/* Back Button */}
            <Link
              href={referralCode ? `/register?ref=${referralCode}` : "/register"}
              className="inline-flex items-center text-white/90 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to registration options
            </Link>

            {/* Progress Indicator */}
            <div className="mb-8">
              <div className="flex items-center justify-between px-4 sm:justify-center sm:space-x-4">
                {[1, 2, 3, 4].map((stepNumber) => (
                  <div key={stepNumber} className="flex items-center">
                    <button
                      onClick={() => goToStep(stepNumber)}
                      disabled={stepNumber > step && !validateStep(step)}
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-200 border-2 ${
                        step >= stepNumber
                          ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg border-green-400"
                          : "bg-white/10 dark:bg-gray-700/50 text-white/70 dark:text-gray-400 border-white/20 dark:border-gray-600 hover:bg-white/20 dark:hover:bg-gray-600"
                        } ${stepNumber <= step ? "cursor-pointer" : "cursor-not-allowed"}`}
                    >
                      {step > stepNumber ? <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" /> : stepNumber}
                    </button>
                    {stepNumber < 4 && (
                      <div
                        className={`w-8 sm:w-16 h-1 mx-1 sm:mx-2 transition-all duration-200 rounded-full ${
                          step > stepNumber
                            ? "bg-gradient-to-r from-green-500 to-green-600"
                            : "bg-white/20 dark:bg-gray-700/50"
                          }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-center mt-3 sm:mt-4">
                <span className="text-xs sm:text-sm text-white/90 dark:text-white/80 text-center px-4">
                  Step {step} of 4:{" "}
                  {step === 1
                    ? "EIN Verification"
                    : step === 2
                      ? "Organization Details"
                      : step === 3
                        ? "Contact Information"
                        : "Final Details"}
                </span>
              </div>
            </div>

            <Card className="border-0 shadow-2xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-md overflow-hidden">
              {/* Gradient Header */}
              <div className="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 p-4 sm:p-5">
                <div className="flex flex-col items-center text-center">
                  <div className="mx-auto bg-white rounded-xl w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mb-2 shadow-lg p-2.5">
                    <img
                      src="/favicon-96x96.png"
                      alt="Believe In Unity Logo"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <CardTitle className="text-xl sm:text-2xl font-bold text-white mb-1">Register Your Organization</CardTitle>
                  <CardDescription className="text-sm text-white/90 max-w-sm">
                    {step === 1 && "Enter your EIN to verify your organization with the IRS"}
                    {step === 2 && "Review your organization details"}
                    {step === 3 && "Provide contact information and create account"}
                    {step === 4 && "Complete your registration"}
                  </CardDescription>
                </div>
              </div>

              <CardContent className="p-6 sm:p-8 space-y-6">
                {/* General Error Alert */}
                {errors.general && (
                  <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-700 dark:text-red-400">{errors.general}</AlertDescription>
                  </Alert>
                )}

                {/* Step 1: EIN Lookup */}
                {step === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-6"
                  >

                    {referralCode && (
                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          Referral Code Applied
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          <div className="flex items-center justify-center">
                            <ShieldCheck className="h-4 w-4 text-green-600" />
                            <span className="font-bold text-green-600">{referralCode}</span>
                          </div>
                        </p>
                      </div>
                    )}
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        IRS Employer Identification Number (EIN)
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        We'll verify your organization's tax-exempt status with the IRS
                      </p>
                    </div>

                    <div className="max-w-sm sm:max-w-md mx-auto">
                      <Label htmlFor="ein" className="text-base font-medium">
                        EIN (9 digits) *
                      </Label>
                      <div className="relative mt-2">
                        <Input
                          id="ein"
                          type="text"
                          placeholder="XX-XXXXXXX"
                          value={formatEIN(einData.ein)}
                          onChange={handleEINChange}
                          className={`h-12 sm:h-14 text-base sm:text-lg text-center font-mono tracking-wider ${errors.ein ? "border-red-500" : ""}`}
                          maxLength={10}
                        />
                        <Search className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
                      </div>

                      {errors.ein && <p className="mt-2 text-sm text-red-600">{errors.ein}</p>}

                      {einError && (
                        <Alert className="mt-4 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-700 dark:text-red-400">{einError}</AlertDescription>
                        </Alert>
                      )}

                      <Button
                        onClick={handleEINLookup}
                        disabled={isLoading || !validateStep(1)}
                        className="w-full mt-6 h-12 sm:h-14 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold text-base sm:text-lg rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100"
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Verifying with IRS...
                          </>
                        ) : (
                          "Verify Organization"
                        )}
                      </Button>
                    </div>

                    <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                      <p>
                        Don't have an EIN?{" "}
                        <a
                          href="https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Apply for one here
                        </a>
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: IRS Data Review */}
                {step === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-6"
                  >
                    <div className="space-y-4">
                      {isManualEntry ? (
                        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                          <AlertDescription className="text-amber-700 dark:text-amber-400">
                            This EIN isn’t in the IRS file we have on record. Please enter your organization details so we can continue the tax exemption review.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-700 dark:text-green-400">
                            Organization verified! Please review the information below.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    {isManualEntry ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="org-name">Legal Name *</Label>
                          <Input
                            id="org-name"
                            value={formData.name}
                            onChange={(e) => handleInputChange("name", e.target.value)}
                            placeholder="Organization legal name"
                          />
                          {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
                        </div>

                        <div>
                          <Label htmlFor="org-ico">In Care Of</Label>
                          <Input
                            id="org-ico"
                            value={formData.ico ?? ""}
                            onChange={(e) => handleInputChange("ico", e.target.value)}
                            placeholder="c/o person or department"
                          />
                        </div>

                        <div>
                          <Label htmlFor="org-street">Street *</Label>
                          <Input
                            id="org-street"
                            value={formData.street}
                            onChange={(e) => handleInputChange("street", e.target.value)}
                            placeholder="Street address"
                          />
                          {errors.street && <p className="text-red-600 text-sm mt-1">{errors.street}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <Label htmlFor="org-city">City *</Label>
                            <Input
                              id="org-city"
                              value={formData.city}
                              onChange={(e) => handleInputChange("city", e.target.value)}
                              placeholder="City"
                            />
                            {errors.city && <p className="text-red-600 text-sm mt-1">{errors.city}</p>}
                          </div>
                          <div>
                            <Label htmlFor="org-state">State *</Label>
                            <Input
                              id="org-state"
                              value={formData.state}
                              onChange={(e) => handleInputChange("state", e.target.value)}
                              placeholder="State"
                            />
                            {errors.state && <p className="text-red-600 text-sm mt-1">{errors.state}</p>}
                          </div>
                          <div>
                            <Label htmlFor="org-zip">ZIP *</Label>
                            <Input
                              id="org-zip"
                              value={formData.zip}
                              onChange={(e) => handleInputChange("zip", e.target.value)}
                              placeholder="ZIP"
                            />
                            {errors.zip && <p className="text-red-600 text-sm mt-1">{errors.zip}</p>}
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="org-classification">Classification</Label>
                          <Input
                            id="org-classification"
                            value={formData.classification ?? ""}
                            onChange={(e) => handleInputChange("classification", e.target.value)}
                            placeholder="Classification"
                          />
                        </div>

                        <div>
                          <Label htmlFor="org-deductibility">Deductibility</Label>
                          <Input
                            id="org-deductibility"
                            value={formData.deductibility ?? ""}
                            onChange={(e) => handleInputChange("deductibility", e.target.value)}
                            placeholder="Deductibility"
                          />
                        </div>

                        <div>
                          <Label htmlFor="org-ruling">Ruling Year</Label>
                          <Input
                            id="org-ruling"
                            value={formData.ruling ?? ""}
                            onChange={(e) => handleInputChange("ruling", e.target.value)}
                            placeholder="YYYY"
                          />
                        </div>

                        <div>
                          <Label htmlFor="org-type">Organization Type</Label>
                          <Input
                            id="org-type"
                            value={formData.organization ?? ""}
                            onChange={(e) => handleInputChange("organization", e.target.value)}
                            placeholder="Type"
                          />
                        </div>

                        <div>
                          <Label htmlFor="org-status">Status</Label>
                          <Input
                            id="org-status"
                            value={formData.status ?? ""}
                            onChange={(e) => handleInputChange("status", e.target.value)}
                            placeholder="Status"
                          />
                        </div>

                        <div>
                          <Label htmlFor="org-ntee">NTEE Code</Label>
                          <Input
                            id="org-ntee"
                            value={formData.ntee_code ?? ""}
                            onChange={(e) => handleInputChange("ntee_code", e.target.value)}
                            placeholder="NTEE"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Legal Name *</Label>
                            <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <p className="font-medium">{formData.name || "No data available"}</p>
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">In Care Of</Label>
                            <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <p>{formData.ico || "N/A"}</p>
                            </div>
                          </div>

                          <div className="md:col-span-2">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Address *</Label>
                            <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <p>{formData.street || "No street address"}</p>
                              <p>
                                {formData.city || "No city"}, {formData.state || "No state"} {formData.zip || "No ZIP"}
                              </p>
                            </div>
                          </div>

                          {[
                            { key: "classification", label: "Classification" },
                            { key: "deductibility", label: "Tax Deductible" },
                            { key: "ruling", label: "Ruling Year" },
                            { key: "organization", label: "Organization Type" },
                            { key: "status", label: "Status" },
                            { key: "ntee_code", label: "NTEE Code" },
                          ].map(({ key, label }) => (
                            <div key={key}>
                              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</Label>
                              <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <p className={key === "status" ? "text-green-600 font-medium" : ""}>
                                  {(formData[key as keyof typeof formData] as string) || "N/A"}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <Button
                        onClick={() => {
                          setStep(1)
                          setIsManualEntry(false)
                          setLookupStatus('idle')
                        }}
                        variant="outline"
                        className="w-full sm:flex-1 h-12 sm:h-14 order-2 sm:order-1"
                      >
                        Back to EIN
                      </Button>
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:flex-1 order-1 sm:order-2">
                        <Button
                          onClick={() => setStep(3)}
                          disabled={!validateStep(2)}
                          className="w-full h-12 sm:h-14 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold text-base sm:text-lg rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:transform-none"
                        >
                          Continue
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Contact Information */}
                {step === 3 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Contact Information & Account
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Provide contact details and create your account
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <Label htmlFor="image">Your Photo*</Label>
                        <div className="mt-2 flex items-center justify-center w-full">
                          <label
                            htmlFor="image-upload"
                            className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600"
                          >
                            {imagePreview ? (
                              <div className="relative w-full h-full">
                                <img
                                  src={imagePreview}
                                  alt="Preview"
                                  className="w-full h-full object-contain rounded-lg"
                                />
                                <button
                                  type="button"
                                  onClick={removeImage}
                                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-10 h-10 mb-3 text-gray-400" />
                                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                                  <span className="font-semibold">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  PNG, JPG, GIF up to 5MB
                                </p>
                              </div>
                            )}
                            <input
                              id="image-upload"
                              ref={fileInputRef}
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handleImageChange}
                            />
                          </label>
                        </div>
                        {errors.image && <p className="text-red-600 text-sm mt-1">{errors.image}</p>}
                      </div>

                      <div>
                        <Label htmlFor="email">Organization Email *</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="contact@yourorganization.org"
                            value={formData.email}
                            onChange={(e) => handleInputChange("email", e.target.value)}
                            className="pl-10 h-12"
                            required
                          />
                        </div>
                        {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
                      </div>

                      <div>
                        <Label htmlFor="phone">Phone Number *</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="+1 (555) 123-4567"
                            value={formData.phone}
                            onChange={(e) => handleInputChange("phone", e.target.value)}
                            className="pl-10 h-12"
                            required
                          />
                        </div>
                        {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
                      </div>

                      <div className="relative" ref={contactNameDropdownRef}>
                        <Label htmlFor="contact_name">Primary Contact Name *</Label>
                        <Input
                          id="contact_name"
                          type="text"
                          name="contact_name"
                          autoComplete="nope"
                          data-lpignore="true"
                          data-form-type="other"
                          placeholder="Type or select your name from IRS filing"
                          value={formData.contact_name}
                          onChange={(e) => handleInputChange("contact_name", e.target.value)}
                          onFocus={() => setContactNameDropdownOpen(true)}
                          onBlur={() => setTimeout(() => setContactNameDropdownOpen(false), 200)}
                          className="h-12"
                          required
                        />
                        {/* Dropdown is rendered via portal so it is not clipped by Card overflow-hidden */}
                        {contactNameDropdownOpen &&
                          contactNameDropdownRect &&
                          createPortal(
                            realtimeOfficersLoading ? (
                              <div
                                className="fixed z-[100] rounded-md border bg-background shadow-lg p-2 flex items-center gap-2 text-sm text-muted-foreground"
                                style={{ top: contactNameDropdownRect.top + 4, left: contactNameDropdownRect.left, width: contactNameDropdownRect.width }}
                              >
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                                Loading names from IRS filing…
                              </div>
                            ) : realtimeOfficers.length > 0 ? (
                              <div
                                className="contact-name-officers-dropdown fixed z-[100] rounded-md border bg-background shadow-lg overflow-y-auto"
                                style={{
                                  top: contactNameDropdownRect.top + 4,
                                  left: contactNameDropdownRect.left,
                                  width: contactNameDropdownRect.width,
                                  maxHeight: contactNameDropdownRect.maxHeight,
                                }}
                              >
                                <p className="text-xs text-muted-foreground px-3 py-2 border-b">
                                  Select your name from this organization&apos;s IRS Form 990
                                </p>
                                <div className="p-1.5 space-y-1">
                                  {realtimeOfficers
                                    .filter((m) => !formData.contact_name || m.name.toLowerCase().includes(formData.contact_name.toLowerCase()))
                                    .map((m, index) => (
                                      <motion.button
                                        key={m.id}
                                        type="button"
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2, delay: index * 0.03 }}
                                        whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full text-left rounded-lg border border-border bg-card shadow-sm hover:shadow-md hover:border-primary/30 hover:bg-muted/50 focus:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 px-3 py-1.5 flex flex-col gap-0 transition-colors cursor-pointer"
                                        onMouseDown={(e) => {
                                          e.preventDefault()
                                          setFormData((prev) => ({
                                            ...prev,
                                            contact_name: m.name,
                                            contact_title: m.position || prev.contact_title,
                                            selected_irs_board_member_id: m.id,
                                          }))
                                          setSelectedOfficerId(m.id)
                                          setContactNameDropdownOpen(false)
                                        }}
                                      >
                                        <span className="font-medium text-foreground">{m.name}</span>
                                        {m.position && (
                                          <span className="inline-flex items-center gap-1 mt-0.5 text-[11px] text-muted-foreground bg-muted/80 dark:bg-muted/50 rounded px-1.5 py-0 w-fit">
                                            <Briefcase className="h-2.5 w-2.5 shrink-0" />
                                            <span>{m.position}</span>
                                          </span>
                                        )}
                                      </motion.button>
                                    ))}
                                </div>
                                {realtimeOfficers.filter((m) => !formData.contact_name || m.name.toLowerCase().includes(formData.contact_name.toLowerCase())).length === 0 && (
                                  <p className="px-3 py-2 text-sm text-muted-foreground">No matching name. You can type your name above.</p>
                                )}
                              </div>
                            ) : null,
                            document.body
                          )}
                        {errors.contact_name && <p className="text-red-600 text-sm mt-1">{errors.contact_name}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contact_title">Officer Title *</Label>
                        <select
                          id="contact_title"
                          value={formData.contact_title === "" ? "" : (OFFICER_TITLES.includes(formData.contact_title as typeof OFFICER_TITLES[number]) ? formData.contact_title : "Other")}
                          onChange={(e) => {
                            const v = e.target.value
                            handleInputChange("contact_title", v === "Other" ? "" : v)
                          }}
                          className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          required
                        >
                          <option value="">Select your role</option>
                          {OFFICER_TITLES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        {(formData.contact_title === "" || !OFFICER_TITLES.includes(formData.contact_title as typeof OFFICER_TITLES[number])) && (
                          <Input
                            placeholder="Enter your title"
                            value={formData.contact_title}
                            onChange={(e) => handleInputChange("contact_title", e.target.value)}
                            className="h-12"
                          />
                        )}
                        {errors.contact_title && <p className="text-red-600 text-sm mt-1">{errors.contact_title}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">Password *</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a strong password"
                            value={formData.password}
                            onChange={(e) => handleInputChange("password", e.target.value)}
                            className={errors.password ? "border-red-500" : ""}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {errors.password && <p className="text-red-600 text-sm">{errors.password}</p>}
                        {formData.password && !allPasswordRequirementsMet && (
                          <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 p-3 text-xs">
                            <p className="mb-2 font-medium text-primary">Your password must include:</p>
                            <div className="space-y-1">
                              {passwordRequirements.map((requirement) => (
                                <div
                                  key={requirement.id}
                                  className={`flex items-center gap-2 ${requirement.met ? "text-emerald-600" : "text-muted-foreground"}`}
                                >
                                  {requirement.met ? (
                                    <CheckCircle className="h-4 w-4" />
                                  ) : (
                                    <AlertCircle className="h-4 w-4" />
                                  )}
                                  <span>{requirement.label}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {formData.password && allPasswordRequirementsMet && (
                          <div className="flex items-center gap-2 text-xs font-medium text-emerald-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>Password meets all requirements</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password_confirmation">Confirm Password *</Label>
                        <div className="relative">
                          <Input
                            id="password_confirmation"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your password"
                            value={formData.password_confirmation}
                            onChange={(e) => handleInputChange("password_confirmation", e.target.value)}
                            className={errors.password_confirmation ? "border-red-500" : ""}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {errors.password_confirmation && (
                          <p className="text-red-600 text-sm">{errors.password_confirmation}</p>
                        )}
                        {formData.password_confirmation && (
                          <div
                            className={`flex items-center gap-2 text-xs ${
                              passwordsMatch ? "text-emerald-600" : "text-red-500"
                            }`}
                          >
                            {passwordsMatch ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                            <span>{passwordsMatch ? "Passwords match" : "Passwords do not match"}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <Button
                        onClick={() => setStep(2)}
                        variant="outline"
                        className="w-full sm:flex-1 h-12 sm:h-14 order-2 sm:order-1"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={() => setStep(4)}
                        disabled={!validateStep(3)}
                        className="w-full sm:flex-1 h-12 sm:h-14 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold text-base sm:text-lg rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 order-1 sm:order-2 disabled:opacity-50 disabled:transform-none"
                      >
                        Continue
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Final Details */}
                {step === 4 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Additional Information
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Help supporters learn more about your organization
                      </p>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <Label htmlFor="website">Website (Optional)</Label>
                        <Input
                          id="website"
                          type="url"
                          placeholder="https://yourorganization.org"
                          value={formData.website}
                          onChange={(e) => handleInputChange("website", e.target.value)}
                          className="h-12"
                        />
                        {errors.website && <p className="text-red-600 text-sm mt-1">{errors.website}</p>}
                      </div>

                      <div>
                        <Label htmlFor="description">Organization Description *</Label>
                        <Textarea
                          id="description"
                          placeholder="Brief description of your organization and its work..."
                          value={formData.description}
                          onChange={(e) => handleInputChange("description", e.target.value)}
                          className="min-h-[120px] resize-none"
                          required
                        />
                        <div className="text-right text-sm text-gray-500 mt-1">{formData.description.length}/2000</div>
                        {errors.description && <p className="text-red-600 text-sm mt-1">{errors.description}</p>}
                      </div>

                      <div>
                        <Label htmlFor="mission">Mission Statement *</Label>
                        <Textarea
                          id="mission"
                          placeholder="Your organization's mission and goals..."
                          value={formData.mission}
                          onChange={(e) => handleInputChange("mission", e.target.value)}
                          className="min-h-[120px] resize-none"
                          required
                        />
                        <div className="text-right text-sm text-gray-500 mt-1">{formData.mission.length}/2000</div>
                        {errors.mission && <p className="text-red-600 text-sm mt-1">{errors.mission}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label>Legal organization name (from IRS filing)</Label>
                        <p className="text-sm font-medium text-foreground rounded-md border bg-muted/50 px-3 py-2">{formData.name || "—"}</p>
                        <Label htmlFor="legal_name_confirmation">Re-enter legal name to confirm *</Label>
                        <Input
                          id="legal_name_confirmation"
                          type="text"
                          placeholder="Type the exact legal name above"
                          value={formData.legal_name_confirmation}
                          onChange={(e) => handleInputChange("legal_name_confirmation", e.target.value)}
                          className="h-12"
                        />
                        {errors.legal_name_confirmation && <p className="text-red-600 text-sm mt-1">{errors.legal_name_confirmation}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label>Government-issued ID (officer verification) *</Label>
                        <OfficerIdDropzone
                          file={formData.officer_id}
                          onFileChange={(file) => setFormData((prev) => ({ ...prev, officer_id: file }))}
                          accept=".pdf,.jpg,.jpeg,.png"
                          maxSizeMB={5}
                          error={errors.officer_id}
                        />
                        <p className="text-xs text-muted-foreground">PDF, JPG or PNG. Max 5MB. Used to verify officer identity.</p>
                        {errors.officer_id && <p className="text-red-600 text-sm mt-1">{errors.officer_id}</p>}
                      </div>

                      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
                          <h4 className="font-medium text-foreground">Verification documents (6 of 7 required)</h4>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Select a document type, then attach the file. Form 990 is not needed — we have it on file.
                        </p>
                        {(() => {
                          const docCount = VERIFICATION_DOC_KEYS.filter((k) => formData[k]).length
                          return (
                            <p className={`text-sm font-medium ${docCount >= 6 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                              {docCount} of 7 uploaded {docCount >= 6 ? "— you can proceed" : "— at least 6 required"}
                            </p>
                          )
                        })()}
                        {VERIFICATION_DOC_OPTIONS.filter((o) => formData[o.key]).length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm">Attached documents</Label>
                            <ul className="space-y-1.5">
                              {VERIFICATION_DOC_OPTIONS.filter((o) => formData[o.key]).map((o) => (
                                <li key={o.key} className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm">
                                  <span className="min-w-0 truncate text-foreground">{o.label}</span>
                                  <span className="shrink-0 text-muted-foreground">{formData[o.key]?.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => setFormData((prev) => ({ ...prev, [o.key]: null }))}
                                    className="shrink-0 rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                    aria-label="Remove"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label className="text-sm">Add a document</Label>
                          <div className="flex flex-col gap-3">
                            <div className="space-y-1">
                              <select
                                value={selectedDocType}
                                onChange={(e) => setSelectedDocType(e.target.value as typeof VERIFICATION_DOC_KEYS[number] | "")}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                              >
                                <option value="">Select document type…</option>
                                {VERIFICATION_DOC_OPTIONS.filter((o) => !formData[o.key]).map((o) => (
                                  <option key={o.key} value={o.key}>{o.label}</option>
                                ))}
                              </select>
                            </div>
                            {selectedDocType && (
                              <>
                                <p className="text-xs text-muted-foreground">Attach a file for: {VERIFICATION_DOC_OPTIONS.find((o) => o.key === selectedDocType)?.label}</p>
                                <OfficerIdDropzone
                                  file={null}
                                  onFileChange={(file) => {
                                    if (file && selectedDocType) {
                                      setFormData((prev) => ({ ...prev, [selectedDocType]: file }))
                                      setSelectedDocType("")
                                    }
                                  }}
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  maxSizeMB={5}
                                  emptyLabel="Drag & drop your document here"
                                />
                              </>
                            )}
                          </div>
                        </div>
                        {errors.verification_documents && (
                          <p className="text-red-600 text-sm mt-1">{errors.verification_documents}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id="terms"
                          checked={formData.agree_to_terms}
                          onCheckedChange={(checked) => handleInputChange("agree_to_terms", checked as boolean)}
                        />
                        <Label htmlFor="terms" className="text-sm leading-relaxed">
                          I agree to the{" "}
                          <Link href="/terms" className="text-green-600 hover:underline">
                            Terms of Service
                          </Link>
                          ,{" "}
                          <Link href="/privacy" className="text-green-600 hover:underline">
                            Privacy Policy
                          </Link>
                          , and{" "}
                          <Link href="/organization-terms" className="text-green-600 hover:underline">
                            Organization Agreement
                          </Link>
                          . I confirm that I have the authority to register this organization and that all information
                          provided is accurate.
                        </Label>
                      </div>
                      {errors.agree_to_terms && <p className="text-red-600 text-sm">{errors.agree_to_terms}</p>}

                      <div className="space-y-2">
                        <div className="flex items-start space-x-2">
                          <Checkbox
                            id="attestation_990"
                            checked={formData.attestation_officer_on_990 === true}
                            onCheckedChange={(checked) => handleInputChange("attestation_officer_on_990", checked === true)}
                          />
                          <Label htmlFor="attestation_990" className="text-sm leading-relaxed cursor-pointer">
                            I certify I am a current officer of this organization.
                          </Label>
                        </div>
                        {formData.attestation_officer_on_990 && (
                          <p className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                            <CheckCircle className="h-4 w-4 shrink-0" />
                            Confirmed. You can proceed to complete registration.
                          </p>
                        )}
                        {errors.attestation_officer_on_990 && <p className="text-red-600 text-sm">{errors.attestation_officer_on_990}</p>}
                      </div>
                    </div>

                    {showOfficerSelector && (
                      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertDescription asChild>
                          <div>
                            <p className="font-medium text-amber-800 dark:text-amber-200 mb-2">
                              {possibleOfficerMatches.length > 0
                                ? "We found multiple possible matches on your organization's IRS filing. Please select your name."
                                : "Please select your name from your organization's IRS filing below, or contact support if you don't see it."}
                            </p>
                            {possibleOfficerMatches.length > 0 && (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {possibleOfficerMatches.map((m) => (
                                <label
                                  key={m.id}
                                  className="flex items-center gap-2 p-2 rounded border border-amber-200 dark:border-amber-800 cursor-pointer hover:bg-amber-100/50 dark:hover:bg-amber-900/20"
                                >
                                  <input
                                    type="radio"
                                    name="selected_officer"
                                    value={m.id}
                                    checked={selectedOfficerId === m.id}
                                    onChange={() => setSelectedOfficerId(m.id)}
                                    className="text-green-600"
                                  />
                                  <span>
                                    {m.name}
                                    {m.position && <span className="text-muted-foreground"> — {m.position}</span>}
                                    {m.tax_year && <span className="text-muted-foreground text-xs"> ({m.tax_year})</span>}
                                  </span>
                                </label>
                              ))}
                            </div>
                            )}
                            {errors.selected_irs_board_member_id && <p className="text-red-600 text-sm mt-1">{errors.selected_irs_board_member_id}</p>}
                            <div className="flex gap-2 mt-3">
                              {possibleOfficerMatches.length > 0 ? (
                                <Button
                                  type="button"
                                  onClick={() => {
                                    if (!selectedOfficerId) {
                                      setErrors((e) => ({ ...e, selected_irs_board_member_id: "Please select your name from the list." }))
                                      return
                                    }
                                    setShowOfficerSelector(false)
                                    setErrors((e) => ({ ...e, selected_irs_board_member_id: undefined }))
                                    handleFinalSubmit(selectedOfficerId)
                                  }}
                                  disabled={!selectedOfficerId}
                                >
                                  Confirm and submit
                                </Button>
                              ) : (
                                <Button type="button" variant="outline" onClick={() => { setShowOfficerSelector(false); setErrors((e) => ({ ...e, selected_irs_board_member_id: undefined })) }}>
                                  Close — I&apos;ll try again
                                </Button>
                              )}
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <Button
                        onClick={() => setStep(3)}
                        variant="outline"
                        className="w-full sm:flex-1 h-12 sm:h-14 order-2 sm:order-1"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={handleFinalSubmit}
                        className="w-full sm:flex-1 h-12 sm:h-14 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold text-base sm:text-lg rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:transform-none"
                        disabled={!validateStep(4) || isLoading}
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Completing Registration...
                          </>
                        ) : (
                          "Complete Registration"
                        )}
                      </Button>
                    </div>

                    <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                      <p>Your organization will be active immediately after registration completion.</p>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </FrontendLayout>
  )
}
