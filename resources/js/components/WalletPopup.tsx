"use client"

import React, { useState, useEffect, useRef } from 'react'
import { X, Wallet, Copy, Check, RefreshCw, ChevronDown, Activity, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, ArrowLeft, QrCode, CheckCircle2, Search, Building2, User, Plus, AlertCircle, Shield, FileCheck, Clock, ExternalLink, Upload, FileImage, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { showSuccessToast, showErrorToast } from '@/lib/toast'
import { TermsOfService } from './TermsOfService'
import { ImageUploadDropzone } from './ImageUploadDropzone'
import { DocumentUploadDropzone } from './DocumentUploadDropzone'
import { SubscriptionRequiredModal } from './SubscriptionRequiredModal'
import { usePage } from '@inertiajs/react'
import {
    SuccessMessage,
    BalanceDisplay,
    SwapView,
    ReceiveMoney,
    AddMoney,
    SendMoney,
    WalletScreen,
    ActivityList,
    ConnectWallet,
    CreateWallet,
    ExternalAccounts,
    TransferFromExternal,
    KYCForm,
    KYBForm,
    SplashScreen,
    BalanceSkeleton,
    WalletAddressSkeleton,
    SearchResultsSkeleton,
    ActivitySkeleton,
    QRCodeSkeleton,
    DepositInstructionsSkeleton,
    getCsrfToken as getWalletCsrfToken,
    formatAddress as formatWalletAddress
} from './wallet'

interface WalletPopupProps {
    isOpen: boolean
    onClose: () => void
    organizationName?: string
}

// Use the getCsrfToken from wallet utils
const getCsrfToken = getWalletCsrfToken

interface SharedData {
    auth: {
        user: {
            id: number
            name: string
            email: string
        } | null
    }
}

export function WalletPopup({ isOpen, onClose, organizationName }: WalletPopupProps) {
    const { auth } = usePage<SharedData>().props
    const [walletBalance, setWalletBalance] = useState<number | null>(null)
    const [walletAddress, setWalletAddress] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isInitialLoading, setIsInitialLoading] = useState(true) // Track initial load for splash screen
    const [hasSubscription, setHasSubscription] = useState<boolean | null>(null)
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
    const [copied, setCopied] = useState(false)
    const [activeTab, setActiveTab] = useState<'account' | 'activity'>('account')
    const [actionView, setActionView] = useState<'main' | 'send' | 'receive' | 'swap' | 'addMoney' | 'external_accounts' | 'transfer_from_external'>('main')
    const [externalAccounts, setExternalAccounts] = useState<Array<{
        id: string;
        account_number: string;
        routing_number: string;
        account_type: string;
        account_holder_name: string;
        status: string;
    }>>([])
    const [isLoadingExternalAccounts, setIsLoadingExternalAccounts] = useState(false)
    const [transferAmount, setTransferAmount] = useState('')
    const [selectedExternalAccount, setSelectedExternalAccount] = useState<string>('')
    const [sendAmount, setSendAmount] = useState('')
    const [addMoneyAmount, setAddMoneyAmount] = useState('')
    const [sendAddress, setSendAddress] = useState('')
    const [recipientSearch, setRecipientSearch] = useState('')
    const [selectedRecipient, setSelectedRecipient] = useState<{ id: string; type: string; name: string; email?: string; display_name: string; address: string } | null>(null)
    const [searchResults, setSearchResults] = useState<Array<{ id: string; type: string; name: string; email?: string; display_name: string; address: string }>>([])
    const [isLoadingSearch, setIsLoadingSearch] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const [swapAmount, setSwapAmount] = useState('')
    const [swapFrom, setSwapFrom] = useState('USD')
    const [swapTo, setSwapTo] = useState('USD')
    const [showSuccess, setShowSuccess] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')
    const [successType, setSuccessType] = useState<'send' | 'receive' | 'swap' | 'addMoney' | null>(null)
    const [activities, setActivities] = useState<Array<{
        id: string | number;
        type: string;
        amount: number;
        date: string;
        status: string;
        donor_name: string;
        donor_email?: string;
        frequency: string;
        message?: string;
        transaction_id?: string;
        is_outgoing?: boolean;
        recipient_type?: string;
    }>>([])
    const [isLoadingActivities, setIsLoadingActivities] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [hasMoreActivities, setHasMoreActivities] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [bridgeInitialized, setBridgeInitialized] = useState(false)
    const [hasWallet, setHasWallet] = useState(false)
    const [isSandbox, setIsSandbox] = useState(false)
    const [depositInstructions, setDepositInstructions] = useState<{
        bank_name?: string;
        bank_address?: string;
        bank_routing_number?: string;
        bank_account_number?: string;
        bank_beneficiary_name?: string;
        bank_beneficiary_address?: string;
        payment_rail?: string;
        payment_rails?: string[];
        currency?: string;
    } | null>(null)
    const [isLoadingDepositInstructions, setIsLoadingDepositInstructions] = useState(false)
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'ach' | 'wire'>('ach')
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
    const [receiveDepositInstructions, setReceiveDepositInstructions] = useState<{
        bank_name?: string;
        bank_address?: string;
        bank_routing_number?: string;
        bank_account_number?: string;
        bank_beneficiary_name?: string;
        bank_beneficiary_address?: string;
        payment_rail?: string;
        payment_rails?: string[];
        currency?: string;
    } | null>(null)
    const [isLoadingReceiveData, setIsLoadingReceiveData] = useState(false)
    // Bridge KYC/KYB Link statuses: not_started, incomplete, under_review, awaiting_questionnaire, awaiting_ubo, approved, rejected, paused, offboarded
    const [kycStatus, setKycStatus] = useState<'not_started' | 'incomplete' | 'under_review' | 'awaiting_questionnaire' | 'awaiting_ubo' | 'approved' | 'rejected' | 'paused' | 'offboarded'>('not_started')
    const [kybStatus, setKybStatus] = useState<'not_started' | 'incomplete' | 'under_review' | 'awaiting_questionnaire' | 'awaiting_ubo' | 'approved' | 'rejected' | 'paused' | 'offboarded'>('not_started')
    const [kycLinkUrl, setKycLinkUrl] = useState<string | null>(null)
    const [kybLinkUrl, setKybLinkUrl] = useState<string | null>(null)
    const [kycWidgetUrl, setKycWidgetUrl] = useState<string | null>(null)
    const [kybWidgetUrl, setKybWidgetUrl] = useState<string | null>(null)
    const [tosLinkUrl, setTosLinkUrl] = useState<string | null>(null)
    const [tosStatus, setTosStatus] = useState<'pending' | 'accepted' | 'approved' | 'rejected'>('pending')
    const [requiresVerification, setRequiresVerification] = useState(false)
    const [verificationType, setVerificationType] = useState<'kyc' | 'kyb' | null>(null)
    const [showVerificationIframe, setShowVerificationIframe] = useState(false)
    const [useCustomKyc, setUseCustomKyc] = useState(true) // Toggle between custom form and iframe
    const [kycSubmitted, setKycSubmitted] = useState(false) // Track if KYC has been submitted
    const [showTosIframe, setShowTosIframe] = useState(false)
    const [tosIframeUrl, setTosIframeUrl] = useState<string | null>(null)
    const [signedAgreementId, setSignedAgreementId] = useState<string | null>(null)

    // Custom KYC form state
    const [kycFormData, setKycFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        birth_date: '',
        street_line_1: '',
        city: '',
        subdivision: '',
        postal_code: '',
        country: 'USA',
        ssn: '',
        id_type: '',
        id_number: '',
        id_front_image: '' as string, // Store as base64 string
        id_back_image: '' as string, // Store as base64 string
    })

    // Business KYB form state - business info comes from organization, only need control person
    const [kybFormData, setKybFormData] = useState({
        business_name: '',
        email: '',
        street_line_1: '',
        city: '',
        subdivision: '',
        postal_code: '',
        country: 'USA',
        ein: '',
        business_description: '',
        business_industry: '',
        primary_website: '',
        // Bridge "business_type" (must be one of: cooperative, corporation, llc, other, partnership, sole_prop, trust)
        business_type: '' as '' | 'cooperative' | 'corporation' | 'llc' | 'other' | 'partnership' | 'sole_prop' | 'trust',
        // Standard KYB Requirements
        entity_type: '', // LLC, Corp, Partnership, etc.
        dao_status: false, // Is this a DAO?
        // Principal Operating Address (separate from registered address)
        physical_address: {
            street_line_1: '',
            street_line_2: '',
            city: '',
            subdivision: '',
            postal_code: '',
            country: 'USA',
        },
        // Enhanced KYB Requirements
        source_of_funds: '',
        annual_revenue: '',
        transaction_volume: '', // Expected Monthly Transaction Volume (USD)
        account_purpose: '',
        high_risk_activities: '',
        high_risk_geographies: '',
        // Control Person (Beneficial Owner) - required by Bridge
        control_person: {
            first_name: '',
            last_name: '',
            email: '',
            birth_date: '',
            ssn: '',
            title: '',
            ownership_percentage: '',
            street_line_1: '',
            city: '',
            state: '',
            postal_code: '',
            country: 'USA',
            id_type: '',
            id_number: '',
            id_front_image: '',
            id_back_image: '',
        },
        // Business Documents
        business_formation_document: '', // Base64 PDF
        business_ownership_document: '', // Base64 PDF
        proof_of_address_document: '', // Base64 PDF (conditional)
        proof_of_nature_of_business: '', // Base64 PDF (for Bridge verification)
        determination_letter_501c3: '', // Base64 PDF (stored only for us, not sent to Bridge)
    })

    // KYB Step tracking: 'control_person' | 'business_documents' | 'kyc_verification'
    const [kybStep, setKybStep] = useState<'control_person' | 'business_documents' | 'kyc_verification'>('control_person')
    const [controlPersonSubmitted, setControlPersonSubmitted] = useState(false)
    const [controlPersonKycLink, setControlPersonKycLink] = useState<string | null>(null)
    const [controlPersonKycIframeUrl, setControlPersonKycIframeUrl] = useState<string | null>(null)
    const [kybSubmissionStatus, setKybSubmissionStatus] = useState<string | null>(null)
    const [businessDocumentsSubmitted, setBusinessDocumentsSubmitted] = useState(false)
    const [documentStatuses, setDocumentStatuses] = useState<Record<string, 'pending' | 'approved' | 'rejected'>>({})
    const [documentRejectionReasons, setDocumentRejectionReasons] = useState<Record<string, string>>({})

    // Validation errors for Control Person fields
    const [controlPersonErrors, setControlPersonErrors] = useState<Record<string, string>>({})
    const [businessDocumentErrors, setBusinessDocumentErrors] = useState<Record<string, string>>({})

    // Admin requested fields for re-fill
    const [requestedFields, setRequestedFields] = useState<string[]>([])
    const [refillMessage, setRefillMessage] = useState<string | null>(null)

    // Helper function to check if a field should be shown
    const shouldShowField = (fieldPath: string): boolean => {
        // If no requested fields, show all fields (normal flow)
        if (!requestedFields || requestedFields.length === 0) {
            return true
        }
        // If requested fields exist, only show those fields
        const shouldShow = requestedFields.includes(fieldPath)
        return shouldShow
    }

    // Pre-fill KYC form with user data when popup opens (only if fields are empty)
    useEffect(() => {
        if (isOpen && auth?.user) {
            const userName = auth.user.name || ''
            const userEmail = auth.user.email || ''

            // Only populate if fields are currently empty
            if (!kycFormData.first_name && !kycFormData.email && userName && userEmail) {
                // Split name into first_name and last_name
                const nameParts = userName.trim().split(/\s+/)
                const firstName = nameParts[0] || ''
                const lastName = nameParts.slice(1).join(' ') || ''

                setKycFormData(prev => ({
                    ...prev,
                    first_name: firstName,
                    last_name: lastName,
                    email: userEmail,
                }))
            }
        }
    }, [isOpen, auth?.user])

    // Auto-switch to correct KYB step when business-related fields are requested
    useEffect(() => {
        if (!requestedFields || requestedFields.length === 0) {
            return
        }

        // Step 1 (control_person) fields
        const controlPersonFields = [
            'control_person.first_name', 'control_person.last_name', 'control_person.email',
            'control_person.birth_date', 'control_person.ssn', 'control_person.title',
            'control_person.ownership_percentage', 'control_person.street_line_1',
            'control_person.city', 'control_person.state', 'control_person.postal_code',
            'control_person.country', 'control_person.id_type', 'control_person.id_number',
            'control_person.id_front_image', 'control_person.id_back_image'
        ]

        // Step 2 (business_documents) fields
        const businessDocumentFields = [
            'business_formation_document', 'business_ownership_document',
            'proof_of_address_document', 'proof_of_nature_of_business',
            'determination_letter_501c3', 'entity_type', 'business_description',
            'business_industry', 'primary_website', 'source_of_funds',
            'annual_revenue', 'transaction_volume', 'account_purpose',
            'high_risk_activities', 'high_risk_geographies', 'dao_status'
        ]

        // Physical address fields (part of Step 2)
        const physicalAddressFields = [
            'physical_address.street_line_1', 'physical_address.street_line_2',
            'physical_address.city', 'physical_address.subdivision',
            'physical_address.postal_code', 'physical_address.country'
        ]

        // Business info fields that can appear in Step 1 (read-only) or Step 2
        const businessInfoFields = ['business_name', 'ein', 'email', 'street_line_1']

        // Check which step the requested fields belong to
        const hasControlPersonFields = requestedFields.some((field: string) =>
            controlPersonFields.includes(field) || field.startsWith('control_person.')
        )

        const hasBusinessDocumentFields = requestedFields.some((field: string) =>
            businessDocumentFields.includes(field) ||
            physicalAddressFields.includes(field) ||
            field.startsWith('physical_address.')
        )

        // Only check business info fields if they're not part of control person step
        const hasOnlyBusinessInfoFields = requestedFields.some((field: string) =>
            businessInfoFields.includes(field)
        ) && !hasControlPersonFields && !hasBusinessDocumentFields

        // Auto-switch to KYB if business fields are detected
        const shouldBeKyb = hasControlPersonFields || hasBusinessDocumentFields || hasOnlyBusinessInfoFields
        if (shouldBeKyb && verificationType !== 'kyb') {
            setVerificationType('kyb')
        }

        // Auto-switch to the correct step within KYB
        // Check the condition directly instead of relying on state (which updates asynchronously)
        if (shouldBeKyb || verificationType === 'kyb') {
            if (hasControlPersonFields) {
                setKybStep('control_person')
            } else if (hasBusinessDocumentFields || hasOnlyBusinessInfoFields) {
                setKybStep('business_documents')
            }
            // Note: Step 3 (kyc_verification) is typically triggered after documents are approved
        }
    }, [requestedFields, verificationType])

    // Check Bridge status and fetch balance - moved outside useEffect so it can be called from other functions
    const checkBridgeAndFetchBalance = async () => {
        if (isInitialLoading) {
            setIsInitialLoading(true)
        } else {
            setIsLoading(true)
        }
        try {
            // First, check if Bridge wallet is initialized (without fetching balance)
            const statusResponse = await fetch(`/wallet/bridge/status?t=${Date.now()}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
                cache: 'no-store',
            })

            const statusData = await statusResponse.json()

            // Pre-fill form with organization data if available
            // Only repopulate if there are no requested fields from backend (to avoid repopulating after refill submission)
            // Check statusData.requested_fields first (from backend), then fall back to state
            const hasRequestedFields = (statusData.requested_fields && Array.isArray(statusData.requested_fields) && statusData.requested_fields.length > 0) ||
                (requestedFields && requestedFields.length > 0)

            if (statusData.organization_data && !hasRequestedFields) {
                setKybFormData(prev => ({
                    ...prev,
                    business_name: statusData.organization_data.business_name || prev.business_name || '',
                    email: statusData.organization_data.email || prev.email || '',
                    ein: statusData.organization_data.ein || prev.ein || '',
                    street_line_1: statusData.organization_data.street_line_1 || prev.street_line_1 || '',
                    city: statusData.organization_data.city || prev.city || '',
                    subdivision: statusData.organization_data.state || prev.subdivision || '',
                    postal_code: statusData.organization_data.postal_code || prev.postal_code || '',
                    country: statusData.organization_data.country || prev.country || 'USA',
                }))
            }

            if (statusData.success && statusData.initialized) {
                // Bridge is initialized (customer exists)
                setBridgeInitialized(true)

                // Update verification status if provided
                if (statusData.requires_verification !== undefined) {
                    setRequiresVerification(statusData.requires_verification)
                }
                if (statusData.kyc_status) {
                    setKycStatus(statusData.kyc_status)
                }
                if (statusData.kyb_status) {
                    setKybStatus(statusData.kyb_status)
                }
                if (statusData.tos_status) {
                    setTosStatus(statusData.tos_status)
                    // If TOS is accepted, hide the iframe immediately
                    if (statusData.tos_status === 'accepted' || statusData.tos_status === 'approved') {
                        setTosIframeUrl(null)
                        // If TOS is accepted but we don't have signedAgreementId, try to get it
                        if (!signedAgreementId) {
                            // The signed_agreement_id should be in bridge_metadata, but if not, backend will handle it
                            // Just ensure we know TOS is accepted
                        }
                    }
                }
                if (statusData.tos_link) {
                    setTosLinkUrl(statusData.tos_link)
                }
                if (statusData.kyc_link) {
                    setKycLinkUrl(statusData.kyc_link)
                }
                if (statusData.kyb_link) {
                    setKybLinkUrl(statusData.kyb_link)
                }
                if (statusData.kyc_widget_url) {
                    setKycWidgetUrl(statusData.kyc_widget_url)
                }
                if (statusData.kyb_widget_url) {
                    setKybWidgetUrl(statusData.kyb_widget_url)
                }
                if (statusData.verification_type) {
                    setVerificationType(statusData.verification_type)
                }

                // Load KYB step progress from backend
                if (statusData.kyb_step && statusData.verification_type === 'kyb') {
                    const previousStep = kybStep

                    // Only move to kyc_verification if documents are approved
                    // Otherwise, stay on business_documents step to show waiting screen
                    if (statusData.kyb_step === 'kyc_verification') {
                        // Check if documents are actually approved before moving to step 3
                        const documentsApproved = statusData.kyb_submission_status === 'approved' ||
                            (statusData.document_statuses &&
                                (statusData.document_statuses.business_formation === 'approved' ||
                                    statusData.document_statuses.business_ownership === 'approved'))

                        if (documentsApproved) {
                            setKybStep('kyc_verification')
                            setBusinessDocumentsSubmitted(true)
                            // If we just moved to kyc_verification step and don't have KYC link yet, fetch it automatically
                            if (previousStep !== 'kyc_verification' && !controlPersonKycIframeUrl && !controlPersonKycLink && kybFormData.control_person.email) {
                                // Automatically fetch KYC link when step becomes active (silent mode - no loading spinner)
                                handleControlPersonKyc(true)
                            }
                        } else {
                            // Documents not approved yet, stay on business_documents step
                            setKybStep('business_documents')
                            setBusinessDocumentsSubmitted(true)
                        }
                    } else {
                        // For control_person or business_documents steps, set normally
                        setKybStep(statusData.kyb_step)
                        // If we're past step 1, mark control person as submitted
                        if (statusData.kyb_step !== 'control_person') {
                            setControlPersonSubmitted(true)
                        }
                    }
                }
                if (statusData.control_person_kyc_link) {
                    setControlPersonKycLink(statusData.control_person_kyc_link)
                }
                if (statusData.control_person_kyc_iframe_url) {
                    setControlPersonKycIframeUrl(statusData.control_person_kyc_iframe_url)
                }
                if (statusData.kyb_submission_status) {
                    setKybSubmissionStatus(statusData.kyb_submission_status)
                }
                // Check if business documents have been submitted
                if (statusData.business_documents_submitted !== undefined) {
                    setBusinessDocumentsSubmitted(statusData.business_documents_submitted)
                }
                // Load document statuses and rejection reasons
                if (statusData.document_statuses) {
                    const statuses: Record<string, 'pending' | 'approved' | 'rejected'> = {}
                    const rejectionReasons: Record<string, string> = {}

                    // Extract statuses and rejection reasons
                    Object.keys(statusData.document_statuses).forEach(key => {
                        if (key.endsWith('_rejection_reason')) {
                            // This is a rejection reason
                            const docType = key.replace('_rejection_reason', '')
                            rejectionReasons[docType] = statusData.document_statuses[key]
                        } else if (['pending', 'approved', 'rejected'].includes(statusData.document_statuses[key])) {
                            // This is a status - only include direct status keys (not metadata like _rejected_at, _approved_by, etc.)
                            // Direct status keys are: business_formation, business_ownership, proof_of_address, proof_of_nature_of_business, id_front, id_back
                            const directStatusKeys = ['business_formation', 'business_ownership', 'proof_of_address', 'proof_of_nature_of_business', 'determination_letter_501c3', 'id_front', 'id_back']
                            if (directStatusKeys.includes(key)) {
                                statuses[key] = statusData.document_statuses[key]
                            }
                        }
                    })

                    setDocumentStatuses(statuses)
                    setDocumentRejectionReasons(rejectionReasons)
                    
                    // If control person documents (id_front or id_back) are rejected, switch back to control_person step
                    if (statuses.id_front === 'rejected' || statuses.id_back === 'rejected') {
                        setKybStep('control_person')
                        setControlPersonSubmitted(false) // Show form for re-upload
                    } else if ((statuses.id_front === 'pending' || statuses.id_back === 'pending') && 
                               statuses.id_front !== 'rejected' && statuses.id_back !== 'rejected') {
                        // If documents are pending (submitted but not rejected), show waiting screen
                        setControlPersonSubmitted(true)
                        setKybStep('control_person')
                    }
                }

                // Load requested fields and refill message from admin
                if (statusData.requested_fields && Array.isArray(statusData.requested_fields)) {
                    setRequestedFields(statusData.requested_fields)

                    // Step 1 (control_person) fields
                    const controlPersonFields = [
                        'control_person.first_name', 'control_person.last_name', 'control_person.email',
                        'control_person.birth_date', 'control_person.ssn', 'control_person.title',
                        'control_person.ownership_percentage', 'control_person.street_line_1',
                        'control_person.city', 'control_person.state', 'control_person.postal_code',
                        'control_person.country', 'control_person.id_type', 'control_person.id_number',
                        'control_person.id_front_image', 'control_person.id_back_image'
                    ]

                    // Step 2 (business_documents) fields
                    const businessDocumentFields = [
                        'business_formation_document', 'business_ownership_document',
                        'proof_of_address_document', 'proof_of_nature_of_business',
                        'determination_letter_501c3', 'entity_type', 'business_description',
                        'business_industry', 'primary_website', 'source_of_funds',
                        'annual_revenue', 'transaction_volume', 'account_purpose',
                        'high_risk_activities', 'high_risk_geographies', 'dao_status'
                    ]

                    const physicalAddressFields = [
                        'physical_address.street_line_1', 'physical_address.street_line_2',
                        'physical_address.city', 'physical_address.subdivision',
                        'physical_address.postal_code', 'physical_address.country'
                    ]

                    const businessInfoFields = ['business_name', 'ein', 'email', 'street_line_1']

                    const hasControlPersonFields = statusData.requested_fields.some((field: string) =>
                        controlPersonFields.includes(field) || field.startsWith('control_person.')
                    )

                    const hasBusinessDocumentFields = statusData.requested_fields.some((field: string) =>
                        businessDocumentFields.includes(field) ||
                        physicalAddressFields.includes(field) ||
                        field.startsWith('physical_address.')
                    )

                    const hasOnlyBusinessInfoFields = statusData.requested_fields.some((field: string) =>
                        businessInfoFields.includes(field)
                    ) && !hasControlPersonFields && !hasBusinessDocumentFields

                    // Auto-switch to KYB if business fields are detected
                    if ((hasControlPersonFields || hasBusinessDocumentFields || hasOnlyBusinessInfoFields) && statusData.verification_type !== 'kyb') {
                        setVerificationType('kyb')
                    }

                    // Auto-switch to the correct step within KYB
                    if (statusData.verification_type === 'kyb' || (hasControlPersonFields || hasBusinessDocumentFields || hasOnlyBusinessInfoFields)) {
                        if (hasControlPersonFields) {
                            setKybStep('control_person')
                        } else if (hasBusinessDocumentFields || hasOnlyBusinessInfoFields) {
                            setKybStep('business_documents')
                        }
                    }
                } else {
                    setRequestedFields([])
                }
                if (statusData.refill_message) {
                    setRefillMessage(statusData.refill_message)
                } else {
                    setRefillMessage(null)
                }

                // Load control person data for pre-filling form (especially for ID-only rejections)
                if (statusData.control_person_data) {
                    setKybFormData(prev => ({
                        ...prev,
                        control_person: {
                            ...prev.control_person,
                            // Only update fields that exist in the response, preserve others
                            id_type: statusData.control_person_data.id_type || prev.control_person.id_type || '',
                            id_number: statusData.control_person_data.id_number || prev.control_person.id_number || '',
                            first_name: statusData.control_person_data.first_name || prev.control_person.first_name || '',
                            last_name: statusData.control_person_data.last_name || prev.control_person.last_name || '',
                            email: statusData.control_person_data.email || prev.control_person.email || '',
                            birth_date: statusData.control_person_data.birth_date || prev.control_person.birth_date || '',
                            ssn: statusData.control_person_data.ssn || prev.control_person.ssn || '',
                            title: statusData.control_person_data.title || prev.control_person.title || '',
                            ownership_percentage: statusData.control_person_data.ownership_percentage?.toString() || prev.control_person.ownership_percentage || '',
                            street_line_1: statusData.control_person_data.street_line_1 || prev.control_person.street_line_1 || '',
                            city: statusData.control_person_data.city || prev.control_person.city || '',
                            state: statusData.control_person_data.state || prev.control_person.state || '',
                            postal_code: statusData.control_person_data.postal_code || prev.control_person.postal_code || '',
                            country: statusData.control_person_data.country || prev.control_person.country || '',
                        }
                    }))
                }

                // Track if wallet exists
                if (statusData.has_wallet !== undefined) {
                    setHasWallet(statusData.has_wallet)
                }

                // Track if we're in sandbox mode
                if (statusData.is_sandbox !== undefined) {
                    setIsSandbox(statusData.is_sandbox)
                }

                // Set wallet address if available
                if (statusData.wallet_address) {
                    setWalletAddress(statusData.wallet_address)
                }

                // Always fetch balance from user/organization table, not Bridge wallet
                const balanceResponse = await fetch(`/wallet/balance?t=${Date.now()}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': getCsrfToken(),
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'include',
                    cache: 'no-store',
                })

                if (balanceResponse.ok) {
                    const balanceData = await balanceResponse.json()
                    if (balanceData.success) {
                        // Use balance from user/organization table
                        setWalletBalance(balanceData.balance || balanceData.organization_balance || balanceData.local_balance || 0)
                        setHasSubscription(balanceData.has_subscription ?? null)

                        // If no subscription, show subscription modal instead
                        if (balanceData.has_subscription === false) {
                            setShowSubscriptionModal(true)
                            setIsLoading(false)
                            return
                        }
                    }
                }
                setIsLoading(false)
                setIsInitialLoading(false)
                return
            } else {
                // Wallet not initialized
                setBridgeInitialized(false)

                const fallbackResponse = await fetch(`/wallet/balance?t=${Date.now()}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': getCsrfToken(),
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'include',
                    cache: 'no-store',
                })

                if (fallbackResponse.ok) {
                    const fallbackData = await fallbackResponse.json()
                    if (fallbackData.success) {
                        setWalletBalance(fallbackData.balance || fallbackData.organization_balance || fallbackData.local_balance || 0)
                        setHasSubscription(fallbackData.has_subscription ?? null)

                        // If no subscription, show subscription modal instead
                        if (fallbackData.has_subscription === false) {
                            setShowSubscriptionModal(true)
                            return
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Failed to check Bridge status:', error)
            setBridgeInitialized(false)
            setIsInitialLoading(false)
            // Try to get regular balance as fallback
            try {
                const fallbackResponse = await fetch(`/wallet/balance?t=${Date.now()}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': getCsrfToken(),
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'include',
                    cache: 'no-store',
                })
                if (fallbackResponse.ok) {
                    const fallbackData = await fallbackResponse.json()
                    if (fallbackData.success) {
                        setWalletBalance(fallbackData.balance || fallbackData.organization_balance || fallbackData.local_balance || 0)
                        setHasSubscription(fallbackData.has_subscription ?? null)

                        // If no subscription, show subscription modal instead
                        if (fallbackData.has_subscription === false) {
                            setShowSubscriptionModal(true)
                            return
                        }
                    }
                }
            } catch (fallbackError) {
                console.error('Failed to fetch fallback balance:', fallbackError)
                setWalletBalance(0)
            }
        } finally {
            setIsLoading(false)
            setIsInitialLoading(false)
        }
    }

    // Check Bridge status and fetch balance on mount
    useEffect(() => {
        if (!isOpen) {
            // Reset initial loading when popup closes
            setIsInitialLoading(true)
            return
        }
        checkBridgeAndFetchBalance()
    }, [isOpen])


    // Listen for iframe messages from Bridge verification widget
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // Verify origin for security - allow Bridge domains and our own origin
            const allowedOrigins = ['bridge.withpersona.com', 'bridge.xyz', 'sandbox.bridge.xyz', window.location.origin]
            const isAllowedOrigin = allowedOrigins.some(origin => event.origin.includes(origin))

            if (!isAllowedOrigin) {
                return
            }

            // Handle TOS acceptance from iframe callback
            if (event.data && typeof event.data === 'object' && event.data.signedAgreementId) {
                const agreementId = event.data.signedAgreementId
                const action = event.data.action
                const hideSuccess = event.data.hideSuccess

                setSignedAgreementId(agreementId)

                // Submit the signed agreement ID to backend first
                const submitTosAcceptance = async () => {
                    try {
                        // Get fresh CSRF token before making the request
                        let csrfToken = getCsrfToken()

                        // If token is missing, try to refresh it by making a GET request first
                        if (!csrfToken) {
                            try {
                                const tokenResponse = await fetch('/wallet/bridge/status', {
                                    method: 'GET',
                                    headers: {
                                        'Accept': 'application/json',
                                        'X-Requested-With': 'XMLHttpRequest',
                                    },
                                    credentials: 'include',
                                    cache: 'no-store',
                                })
                                // After the request, try to get token again
                                csrfToken = getCsrfToken()
                            } catch (e) {
                                console.warn('Failed to refresh CSRF token:', e)
                            }
                        }

                        if (!csrfToken) {
                            showErrorToast('CSRF token not found. Please refresh the page and try again.')
                            // Refresh page to get new CSRF token
                            setTimeout(() => {
                                window.location.reload()
                            }, 2000)
                            return
                        }

                        const response = await fetch('/wallet/tos-callback', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                                'X-CSRF-TOKEN': csrfToken,
                                'X-Requested-With': 'XMLHttpRequest',
                            },
                            credentials: 'include',
                            cache: 'no-store',
                            body: JSON.stringify({ signed_agreement_id: agreementId }),
                        })

                        // Handle CSRF token mismatch
                        if (response.status === 419 || response.status === 403) {
                            const errorData = await response.json().catch(() => ({ message: 'CSRF token mismatch' }))
                            showErrorToast('Session expired. Refreshing page...')
                            setTimeout(() => {
                                window.location.reload()
                            }, 2000)
                            return
                        }

                        if (!response.ok) {
                            const errorData = await response.json().catch(() => ({ message: 'Request failed' }))
                            showErrorToast(errorData.message || 'Failed to accept Terms of Service')
                            return
                        }

                        const data = await response.json()

                        if (data.success) {
                            // Hide TOS iframe immediately when accepted
                            setTosIframeUrl(null)

                            // Update TOS status from backend response if available, otherwise use 'accepted'
                            const backendTosStatus = data.tos_status || 'accepted'
                            setTosStatus(backendTosStatus === 'approved' ? 'approved' : 'accepted')

                            // If action is checkStatus, it means success screen was already shown and hidden
                            // Just check the status without showing toast again
                            if (action === 'checkStatus' && hideSuccess) {
                                // Success screen was already shown, now just check status
                                // Status already updated above, now sync with backend
                                checkBridgeAndFetchBalance()
                            } else {
                                // First time - show success message
                                showSuccessToast('Terms of Service accepted successfully')

                                // Status already updated above, now sync with backend after delay
                                // After 2 seconds (when success screen hides), check status again to ensure sync
                                setTimeout(() => {
                                    // Re-check status to ensure everything is synced with backend
                                    checkBridgeAndFetchBalance()
                                }, 2000)
                            }
                        } else {
                            showErrorToast(data.message || 'Failed to accept Terms of Service')
                        }
                    } catch (error) {
                        console.error('Error submitting TOS acceptance:', error)
                        showErrorToast('Failed to accept Terms of Service')
                    }
                }

                submitTosAcceptance()

                // Handle close action from iframe
                if (action === 'close') {
                    // Hide the TOS iframe immediately
                    setTosIframeUrl(null)
                    // Iframe is closing, ensure we check status
                    setTimeout(() => {
                        checkBridgeAndFetchBalance()
                    }, 500)
                }
                return
            }

            // Handle verification status updates from iframe
            if (event.data && typeof event.data === 'object') {
                if (event.data.type === 'persona:inquiry:complete' || event.data.type === 'persona:inquiry:status') {
                    // Verification completed or status updated

                    // Refresh status from backend
                    const refreshStatus = async () => {
                        try {
                            const statusResponse = await fetch(`/wallet/bridge/status?t=${Date.now()}`, {
                                method: 'GET',
                                headers: {
                                    'Accept': 'application/json',
                                    'X-CSRF-TOKEN': getCsrfToken(),
                                    'X-Requested-With': 'XMLHttpRequest',
                                },
                                credentials: 'include',
                                cache: 'no-store',
                            })

                            if (statusResponse.ok) {
                                const statusData = await statusResponse.json()
                                if (statusData.success) {
                                    if (statusData.kyc_status) {
                                        setKycStatus(statusData.kyc_status)
                                    }
                                    if (statusData.kyb_status) {
                                        setKybStatus(statusData.kyb_status)
                                    }
                                    if (statusData.tos_status) {
                                        setTosStatus(statusData.tos_status)
                                    }

                                    // If verification is approved, refresh balance
                                    if ((statusData.kyc_status === 'approved' || statusData.kyb_status === 'approved') && statusData.has_wallet) {
                                        window.location.reload() // Reload to show wallet
                                    }
                                }
                            }
                        } catch (error) {
                            console.error('Failed to refresh verification status:', error)
                        }
                    }

                    refreshStatus()
                }
            }
        }

        window.addEventListener('message', handleMessage)
        return () => {
            window.removeEventListener('message', handleMessage)
        }
    }, [])

    // Fetch wallet activity when Activity tab is active
    useEffect(() => {
        if (!isOpen || activeTab !== 'activity') return

        const fetchActivities = async (page: number = 1, append: boolean = false) => {
            if (append) {
                setIsLoadingMore(true)
            } else {
                setIsLoadingActivities(true)
            }

            try {
                // Fetch 10 activities per page
                const response = await fetch(`/wallet/activity?page=${page}&per_page=10&t=${Date.now()}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': getCsrfToken(),
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'include',
                    cache: 'no-store',
                })

                if (response.ok) {
                    const data = await response.json()
                    if (data.success) {
                        if (append) {
                            // Append new activities
                            setActivities(prev => [...prev, ...(data.activities || [])])
                        } else {
                            // First load: show all activities from backend
                            setActivities(data.activities || [])
                        }
                        setHasMoreActivities(data.has_more || false)
                        setCurrentPage(page)
                    }
                }
            } catch (error) {
                console.error('Failed to fetch wallet activity:', error)
            } finally {
                setIsLoadingActivities(false)
                setIsLoadingMore(false)
            }
        }

        // Reset and fetch first page when tab is opened
        setCurrentPage(1)
        setHasMoreActivities(false)
        fetchActivities(1, false)
    }, [isOpen, activeTab])

    // Handle scroll to load more activities
    const handleActivityScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget
        const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight

        // Load more when scrolled near bottom (within 50px) and there are more activities
        if (scrollBottom < 50 && hasMoreActivities && !isLoadingMore && !isLoadingActivities) {
            const nextPage = currentPage + 1
            const fetchActivities = async (page: number) => {
                setIsLoadingMore(true)
                try {
                    const response = await fetch(`/wallet/activity?page=${page}&per_page=10&t=${Date.now()}`, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'X-CSRF-TOKEN': getCsrfToken(),
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                        credentials: 'include',
                        cache: 'no-store',
                    })

                    if (response.ok) {
                        const data = await response.json()
                        if (data.success) {
                            // Append new activities
                            setActivities(prev => [...prev, ...(data.activities || [])])
                            setHasMoreActivities(data.has_more || false)
                            setCurrentPage(page)
                        }
                    }
                } catch (error) {
                    console.error('Failed to fetch more wallet activity:', error)
                } finally {
                    setIsLoadingMore(false)
                }
            }

            fetchActivities(nextPage)
        }
    }

    const handleCopyAddress = () => {
        if (walletAddress) {
            navigator.clipboard.writeText(walletAddress)
            setCopied(true)
            showSuccessToast('Wallet address copied to clipboard')
            setTimeout(() => setCopied(false), 2000)
        }
    }

    // Fetch external accounts
    const fetchExternalAccounts = async () => {
        setIsLoadingExternalAccounts(true)
        try {
            const response = await fetch('/wallet/bridge/external-accounts', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
                cache: 'no-store',
            })

            const data = await response.json()
            if (data.success && data.data) {
                setExternalAccounts(Array.isArray(data.data) ? data.data : [])
            } else {
                setExternalAccounts([])
            }
        } catch (error) {
            console.error('Failed to fetch external accounts:', error)
            setExternalAccounts([])
        } finally {
            setIsLoadingExternalAccounts(false)
        }
    }

    // Link external account
    const handleLinkExternalAccount = async (accountData: {
        routing_number: string;
        account_number: string;
        account_type: 'checking' | 'savings';
        account_holder_name: string;
    }) => {
        setIsLoading(true)
        try {
            const response = await fetch('/wallet/bridge/external-account', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
                cache: 'no-store',
                body: JSON.stringify({
                    account_data: accountData,
                }),
            })

            const data = await response.json()
            if (data.success) {
                showSuccessToast('Bank account linked successfully!')
                await fetchExternalAccounts()
                setActionView('external_accounts')
            } else {
                showErrorToast(data.message || 'Failed to link bank account')
            }
        } catch (error) {
            console.error('Failed to link external account:', error)
            showErrorToast('Failed to link bank account. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    // Transfer from external account
    const handleTransferFromExternal = async () => {
        if (!selectedExternalAccount || !transferAmount || parseFloat(transferAmount) <= 0) {
            showErrorToast('Please select an account and enter a valid amount')
            return
        }

        if (!hasWallet) {
            showErrorToast('Wallet is required for transfers')
            return
        }

        setIsLoading(true)
        try {
            // Get wallet ID from status or use bridge_wallet_id
            let walletId = null
            if (bridgeInitialized) {
                // Try to get from status response or use a placeholder
                const statusResponse = await fetch('/wallet/bridge/status', {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': getCsrfToken(),
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'include',
                    cache: 'no-store',
                })

                if (statusResponse.ok) {
                    const statusData = await statusResponse.json()
                    if (statusData.success && statusData.wallet_id) {
                        walletId = statusData.wallet_id
                    }
                }
            }

            if (!walletId) {
                showErrorToast('Wallet not found. Please create a wallet first.')
                return
            }

            const response = await fetch('/wallet/bridge/transfer-from-external', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
                cache: 'no-store',
                body: JSON.stringify({
                    external_account_id: selectedExternalAccount,
                    wallet_id: walletId,
                    amount: parseFloat(transferAmount),
                    currency: 'USD',
                }),
            })

            const data = await response.json()
            if (data.success) {
                showSuccessToast('Transfer initiated successfully!')
                setTransferAmount('')
                setSelectedExternalAccount('')
                setActionView('main')
                await checkBridgeAndFetchBalance()
            } else {
                showErrorToast(data.message || 'Failed to initiate transfer')
            }
        } catch (error) {
            console.error('Failed to transfer from external account:', error)
            showErrorToast('Failed to initiate transfer. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    // Handle wallet creation after approval
    const handleCreateWallet = async () => {
        setIsLoading(true)
        try {
            const response = await fetch('/wallet/bridge/create-wallet', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
                cache: 'no-store',
                body: JSON.stringify({
                    chain: 'solana', // Default chain
                }),
            })

            const data = await response.json()

            if (data.success) {
                // Check if it's sandbox mode (virtual account created)
                if (data.data?.is_sandbox) {
                    // Check if it was already existing or newly created
                    const message = data.message || 'Virtual account'
                    if (message.includes('already exists')) {
                        showSuccessToast('Virtual account retrieved successfully!')
                    } else {
                        showSuccessToast('Virtual account created successfully!')
                    }
                    // In sandbox, we have a virtual account which acts like a wallet
                    // Set hasWallet to true if we have an address (virtual account created)
                    if (data.data?.address) {
                        setHasWallet(true) // Treat virtual account as wallet for display purposes
                        setWalletAddress(data.data.address)
                    } else {
                        setHasWallet(false)
                    }
                } else {
                    // Check if it was already existing or newly created
                    const message = data.message || 'Wallet'
                    if (message.includes('already exists')) {
                        showSuccessToast('Wallet retrieved successfully!')
                    } else {
                        showSuccessToast('Wallet and virtual account created successfully!')
                    }
                    setHasWallet(true)

                    // Set wallet address if provided
                    if (data.data?.address) {
                        setWalletAddress(data.data.address)
                    }
                }

                // Refresh status to get updated info (this will also update hasWallet from backend)
                await checkBridgeAndFetchBalance()

                // After wallet creation, also create Card Account and Liquidation Address
                // Note: Virtual Account is already created by the backend create-wallet endpoint
                // These calls are non-blocking and won't affect wallet creation success
                try {
                    // Get customer ID from status check
                    const statusResponse = await fetch('/wallet/bridge/status', {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'X-CSRF-TOKEN': getCsrfToken(),
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                        credentials: 'include',
                        cache: 'no-store',
                    })

                    if (statusResponse.ok) {
                        const statusData = await statusResponse.json()
                        const customerId = statusData.data?.customer_id

                        if (customerId) {
                            // Create Card Account (if not exists) - Non-blocking
                            fetch('/wallet/bridge/card-account', {
                                method: 'POST',
                                headers: {
                                    'Accept': 'application/json',
                                    'Content-Type': 'application/json',
                                    'X-CSRF-TOKEN': getCsrfToken(),
                                    'X-Requested-With': 'XMLHttpRequest',
                                },
                                credentials: 'include',
                                cache: 'no-store',
                                body: JSON.stringify({}),
                            })
                                .then(res => res.json())
                                .then(cardData => {
                                    if (cardData.success) {
                                        console.log('Card account created/verified successfully')
                                    }
                                })
                                .catch(cardError => {
                                    console.warn('Card account creation (non-critical):', cardError)
                                })

                            // Create Liquidation Address (if not exists) - Non-blocking
                            fetch('/wallet/bridge/liquidation-address', {
                                method: 'POST',
                                headers: {
                                    'Accept': 'application/json',
                                    'Content-Type': 'application/json',
                                    'X-CSRF-TOKEN': getCsrfToken(),
                                    'X-Requested-With': 'XMLHttpRequest',
                                },
                                credentials: 'include',
                                cache: 'no-store',
                                body: JSON.stringify({
                                    chain: 'ethereum', // Default chain
                                    currency: 'usdc', // Default currency
                                }),
                            })
                                .then(res => res.json())
                                .then(liquidationData => {
                                    if (liquidationData.success) {
                                        console.log('Liquidation address created/verified successfully')
                                    }
                                })
                                .catch(liquidationError => {
                                    console.warn('Liquidation address creation (non-critical):', liquidationError)
                                })
                        }
                    }
                } catch (additionalError) {
                    console.warn('Additional account creation (non-critical):', additionalError)
                    // Non-critical errors, wallet creation was successful
                }

                // Ensure we're showing the wallet screen by switching to account tab
                setActiveTab('account')
                setActionView('main')
            } else {
                showErrorToast(data.message || 'Failed to create wallet/virtual account')
            }
        } catch (error) {
            console.error('Failed to create wallet:', error)
            showErrorToast('Failed to create wallet. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleConnectWallet = async () => {
        setIsLoading(true)
        try {
            // Get fresh CSRF token
            const csrfToken = getCsrfToken()

            if (!csrfToken) {
                showErrorToast('CSRF token not found. Please refresh the page and try again.')
                setIsLoading(false)
                return
            }

            const response = await fetch('/wallet/bridge/initialize', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
                cache: 'no-store',
            })

            // Handle CSRF token mismatch (419 error)
            if (response.status === 419) {
                showErrorToast('Session expired. Refreshing page...')
                setTimeout(() => {
                    window.location.reload()
                }, 1500)
                setIsLoading(false)
                return
            }

            const data = await response.json()

            if (!response.ok || !data.success) {
                // Check if it's a CSRF error in the response
                if (data.message && (data.message.includes('CSRF') || data.message.includes('419') || data.message.includes('token'))) {
                    showErrorToast('Session expired. Refreshing page...')
                    setTimeout(() => {
                        window.location.reload()
                    }, 1500)
                    setIsLoading(false)
                    return
                }
                throw new Error(data.message || 'Failed to connect wallet')
            }

            // Successfully connected
            setBridgeInitialized(true)
            showSuccessToast('Wallet connected successfully!')

            // Check status first, then fetch balance only if wallet exists
            const statusCsrfToken = getCsrfToken()
            const statusResponse = await fetch(`/wallet/bridge/status?t=${Date.now()}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': statusCsrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
                cache: 'no-store',
            })

            // Handle CSRF token mismatch for status request
            if (statusResponse.status === 419) {
                showErrorToast('Session expired. Refreshing page...')
                setTimeout(() => {
                    window.location.reload()
                }, 1500)
                setIsLoading(false)
                return
            }

            const statusData = await statusResponse.json()

            if (statusData.success && statusData.initialized) {
                // Update verification status if provided
                if (statusData.requires_verification !== undefined) {
                    setRequiresVerification(statusData.requires_verification)
                }
                if (statusData.kyc_status) {
                    setKycStatus(statusData.kyc_status)
                }
                if (statusData.kyb_status) {
                    setKybStatus(statusData.kyb_status)
                }
                if (statusData.tos_status) {
                    setTosStatus(statusData.tos_status)
                }
                if (statusData.tos_link) {
                    setTosLinkUrl(statusData.tos_link)
                }
                if (statusData.kyc_link) {
                    setKycLinkUrl(statusData.kyc_link)
                }
                if (statusData.kyb_link) {
                    setKybLinkUrl(statusData.kyb_link)
                }
                if (statusData.kyc_widget_url) {
                    setKycWidgetUrl(statusData.kyc_widget_url)
                }
                if (statusData.kyb_widget_url) {
                    setKybWidgetUrl(statusData.kyb_widget_url)
                }
                if (statusData.verification_type) {
                    setVerificationType(statusData.verification_type)
                }

                // Load KYB step progress from backend
                if (statusData.kyb_step && statusData.verification_type === 'kyb') {
                    // Only move to kyc_verification if documents are approved
                    if (statusData.kyb_step === 'kyc_verification') {
                        // Check if documents are actually approved before moving to step 3
                        const documentsApproved = statusData.kyb_submission_status === 'approved' ||
                            (statusData.document_statuses &&
                                (statusData.document_statuses.business_formation === 'approved' ||
                                    statusData.document_statuses.business_ownership === 'approved'))

                        if (documentsApproved) {
                            setKybStep('kyc_verification')
                            setBusinessDocumentsSubmitted(true)
                        } else {
                            // Documents not approved yet, stay on business_documents step to show waiting screen
                            setKybStep('business_documents')
                            setBusinessDocumentsSubmitted(true)
                        }
                    } else {
                        // For control_person or business_documents steps, set normally
                        setKybStep(statusData.kyb_step)
                        // If we're past step 1, mark control person as submitted
                        if (statusData.kyb_step !== 'control_person') {
                            setControlPersonSubmitted(true)
                        }
                    }
                }
                if (statusData.control_person_kyc_link) {
                    setControlPersonKycLink(statusData.control_person_kyc_link)
                }
                if (statusData.control_person_kyc_iframe_url) {
                    setControlPersonKycIframeUrl(statusData.control_person_kyc_iframe_url)
                }

                // Always fetch balance from user/organization table, not Bridge wallet
                const balanceResponse = await fetch(`/wallet/balance?t=${Date.now()}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': getCsrfToken(),
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'include',
                    cache: 'no-store',
                })

                if (balanceResponse.ok) {
                    const balanceData = await balanceResponse.json()
                    if (balanceData.success) {
                        // Use balance from user/organization table
                        setWalletBalance(balanceData.balance || balanceData.organization_balance || balanceData.local_balance || 0)
                        setHasSubscription(balanceData.has_subscription ?? null)
                    }
                }
            }

            // Handle verification links if provided in the response
            if (data.data) {
                if (data.data.tos_link) {
                    setTosLinkUrl(data.data.tos_link)
                }
                if (data.data.kyc_link) {
                    setKycLinkUrl(data.data.kyc_link)
                }
                if (data.data.kyb_link) {
                    setKybLinkUrl(data.data.kyb_link)
                }
                if (data.data.kyc_widget_url) {
                    setKycWidgetUrl(data.data.kyc_widget_url)
                }
                if (data.data.kyb_widget_url) {
                    setKybWidgetUrl(data.data.kyb_widget_url)
                }
                if (data.data.tos_status) {
                    setTosStatus(data.data.tos_status)
                }
                if (data.data.kyc_status) {
                    setKycStatus(data.data.kyc_status)
                }
                if (data.data.kyb_status) {
                    setKybStatus(data.data.kyb_status)
                }
                if (data.data.requires_verification) {
                    setRequiresVerification(data.data.requires_verification)
                }
            }
        } catch (error) {
            console.error('Connect wallet error:', error)
            const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet. Please try again.'
            showErrorToast(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    // Convert image file to base64
    const convertImageToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
                const result = reader.result as string
                resolve(result) // Already includes data:image/jpeg;base64, prefix
            }
            reader.onerror = reject
            reader.readAsDataURL(file)
        })
    }

    // Convert PDF file to base64
    const convertPdfToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
                const result = reader.result as string
                resolve(result) // Already includes data:application/pdf;base64, prefix
            }
            reader.onerror = reject
            reader.readAsDataURL(file)
        })
    }

    // Handle TOS acceptance - show custom modal
    const handleAcceptTos = async () => {
        try {
            setIsLoading(true)

            // Get CSRF token with validation - try multiple times if needed
            let csrfToken = getCsrfToken()

            // If token is missing, try to get it from a fresh request
            if (!csrfToken) {
                try {
                    // Make a simple GET request to refresh the session and get CSRF token
                    await fetch('/wallet/bridge/status', {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                        credentials: 'include',
                        cache: 'no-store',
                    })
                    // Try to get token again after the request
                    csrfToken = getCsrfToken()
                } catch (e) {
                    console.warn('Failed to refresh CSRF token:', e)
                }
            }

            if (!csrfToken) {
                showErrorToast('CSRF token not found. Please refresh the page and try again.')
                setIsLoading(false)
                setTimeout(() => {
                    window.location.reload()
                }, 2000)
                return
            }

            // Always get a fresh TOS link from Bridge (refresh=1 ensures new link is fetched and saved to database)
            const response = await fetch('/wallet/bridge/tos-link?refresh=1', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include', // Important: Include cookies for session/CSRF
                cache: 'no-store',
            })

            // Check if response is OK - handle CSRF token mismatch
            if (!response.ok) {
                // If CSRF token mismatch (419) or forbidden (403), refresh page
                if (response.status === 419 || response.status === 403) {
                    const errorData = await response.json().catch(() => ({ message: 'CSRF token mismatch' }))
                    showErrorToast('Session expired. Refreshing page...')
                    setIsLoading(false)
                    // Refresh the page after a short delay to get a new CSRF token
                    setTimeout(() => {
                        window.location.reload()
                    }, 1500)
                    return
                }
                const errorData = await response.json().catch(() => ({ message: 'Request failed' }))
                showErrorToast(errorData.message || 'Failed to load Terms of Service')
                setIsLoading(false)
                return
            }

            const data = await response.json()

            if (data.success) {
                // Check if TOS is already accepted
                if (data.data?.already_accepted) {
                    setTosStatus('accepted')
                    setTosIframeUrl(null) // Hide iframe immediately
                    showSuccessToast('Terms of Service already accepted')
                    // Still set the URL if available for reference
                    if (data.data.tos_url) {
                        setTosIframeUrl(data.data.tos_url)
                    }
                } else if (data.data?.tos_url) {
                    // Set the TOS URL - this will automatically show the TermsOfService component with iframe
                    setTosIframeUrl(data.data.tos_url)
                    // Don't show success toast - the iframe will appear automatically
                } else {
                    showErrorToast(data.message || 'Failed to get TOS link')
                }
            } else {
                showErrorToast(data.message || 'Failed to get TOS link')
            }
        } catch (error) {
            console.error('Failed to get TOS link:', error)
            showErrorToast('Failed to get TOS link')
        } finally {
            setIsLoading(false)
        }
    }

    // Handle TOS acceptance confirmation - now handled by TermsOfService component with iframe
    const handleConfirmTosAcceptance = async () => {
        // The TermsOfService component will show the iframe
        // We just need to ensure we have a TOS URL
        if (!tosIframeUrl) {
            await handleAcceptTos()
        }
    }

    // Handle Control Person submission (Step 1 of KYB)
    const handleSubmitControlPerson = async () => {
        try {
            setIsLoading(true)

            if (tosStatus !== 'accepted' && tosStatus !== 'approved' && !signedAgreementId) {
                showErrorToast('Please accept Terms of Service first')
                setIsLoading(false)
                return
            }

            // Validate control person fields
            const errors: Record<string, string> = {}

            if (!kybFormData.control_person.first_name?.trim()) {
                errors.first_name = 'First name is required'
            }
            if (!kybFormData.control_person.last_name?.trim()) {
                errors.last_name = 'Last name is required'
            }
            if (!kybFormData.control_person.email?.trim()) {
                errors.email = 'Email is required'
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(kybFormData.control_person.email)) {
                errors.email = 'Please enter a valid email address'
            }
            if (!kybFormData.control_person.birth_date) {
                errors.birth_date = 'Date of birth is required'
            }
            if (!kybFormData.control_person.ssn?.trim()) {
                errors.ssn = 'SSN is required'
            } else if (!/^\d{9}$/.test(kybFormData.control_person.ssn.replace(/\D/g, ''))) {
                errors.ssn = 'SSN must be 9 digits'
            }
            if (!kybFormData.control_person.title?.trim()) {
                errors.title = 'Title is required'
            }
            if (!kybFormData.control_person.ownership_percentage?.trim()) {
                errors.ownership_percentage = 'Ownership percentage is required'
            } else {
                const ownership = parseFloat(kybFormData.control_person.ownership_percentage)
                if (isNaN(ownership) || ownership < 0 || ownership > 100) {
                    errors.ownership_percentage = 'Ownership percentage must be between 0 and 100'
                }
            }
            if (!kybFormData.control_person.street_line_1?.trim()) {
                errors.street_line_1 = 'Street address is required'
            }
            if (!kybFormData.control_person.city?.trim()) {
                errors.city = 'City is required'
            }
            if (!kybFormData.control_person.state?.trim()) {
                errors.state = 'State is required'
            }
            if (!kybFormData.control_person.postal_code?.trim()) {
                errors.postal_code = 'Postal code is required'
            }
            if (!kybFormData.control_person.id_type?.trim()) {
                errors.id_type = 'ID type is required'
            }
            if (!kybFormData.control_person.id_number?.trim()) {
                errors.id_number = 'ID number is required'
            }
            // Only require ID images if they are rejected OR if field is in requestedFields
            if (documentStatuses.id_front === 'rejected' || shouldShowField('control_person.id_front_image')) {
                if (!kybFormData.control_person.id_front_image) {
                    errors.id_front_image = kybFormData.control_person.id_type === 'drivers_license'
                        ? 'ID front image is required'
                        : 'Passport image is required'
                }
            }
            // Only require back image for Driver's License if rejected OR if field is in requestedFields
            if (kybFormData.control_person.id_type === 'drivers_license') {
                if (documentStatuses.id_back === 'rejected' || shouldShowField('control_person.id_back_image')) {
                    if (!kybFormData.control_person.id_back_image) {
                        errors.id_back_image = 'ID back image is required for Driver\'s License'
                    }
                }
            }

            setControlPersonErrors(errors)

            if (Object.keys(errors).length > 0) {
                showErrorToast('Please fix the validation errors below')
                setIsLoading(false)
                return
            }

            const response = await fetch('/wallet/bridge/create-customer-kyc', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
                cache: 'no-store',
                body: JSON.stringify({
                    signed_agreement_id: signedAgreementId,
                    step: 'control_person', // Indicate this is step 1
                    business_name: kybFormData.business_name,
                    email: kybFormData.email,
                    ein: kybFormData.ein,
                    business_address: {
                        street_line_1: kybFormData.street_line_1,
                        city: kybFormData.city,
                        subdivision: kybFormData.subdivision,
                        postal_code: kybFormData.postal_code,
                        country: kybFormData.country,
                    },
                    control_person: {
                        first_name: kybFormData.control_person.first_name,
                        last_name: kybFormData.control_person.last_name,
                        email: kybFormData.control_person.email,
                        birth_date: kybFormData.control_person.birth_date,
                        ssn: kybFormData.control_person.ssn,
                        title: kybFormData.control_person.title,
                        ownership_percentage: parseFloat(kybFormData.control_person.ownership_percentage),
                        street_line_1: kybFormData.control_person.street_line_1,
                        city: kybFormData.control_person.city,
                        state: kybFormData.control_person.state,
                        postal_code: kybFormData.control_person.postal_code,
                        country: kybFormData.control_person.country,
                        id_type: kybFormData.control_person.id_type,
                        id_number: kybFormData.control_person.id_number,
                        id_front_image: kybFormData.control_person.id_front_image,
                        // Only send id_back_image if ID type is drivers_license (not for passport)
                        ...(kybFormData.control_person.id_type === 'drivers_license' && kybFormData.control_person.id_back_image
                            ? { id_back_image: kybFormData.control_person.id_back_image }
                            : {}),
                    },
                }),
            })

            const data = await response.json()

            if (data.success) {
                // Check if this was an ID-only submission (only ID fields were rejected/requested)
                const idRelatedFields = [
                    'control_person.id_type',
                    'control_person.id_number',
                    'control_person.id_front_image',
                    'control_person.id_back_image'
                ]
                const hasRejectedIdDocs = documentStatuses.id_front === 'rejected' || documentStatuses.id_back === 'rejected'
                const hasOnlyIdFieldsRequested = requestedFields.length > 0 && 
                    requestedFields.every((field: string) => idRelatedFields.includes(field))
                const isOnlyIdRejection = hasRejectedIdDocs && 
                    (!requestedFields || requestedFields.length === 0 || hasOnlyIdFieldsRequested)

                if (isOnlyIdRejection) {
                    // For ID-only submissions, stay on control_person step and show waiting screen
                    showSuccessToast('ID documents have been submitted and are awaiting admin review.')
                    setControlPersonSubmitted(true)
                    // Update document statuses to 'pending' to trigger waiting screen
                    setDocumentStatuses(prev => ({
                        ...prev,
                        id_front: documentStatuses.id_front === 'rejected' ? 'pending' : prev.id_front,
                        id_back: documentStatuses.id_back === 'rejected' ? 'pending' : prev.id_back,
                    }))
                    // Stay on control_person step
                    setKybStep('control_person')
                } else {
                    // For full control person submission, move to next step
                    showSuccessToast('Control Person information submitted. Please upload business documents next.')
                    setControlPersonSubmitted(true)
                    setKybStep('business_documents')
                }
                
                setControlPersonErrors({})

                // Store requested fields before clearing
                const fieldsToClear = [...requestedFields]

                // Clear requested fields after successful submission
                setRequestedFields([])
                setRefillMessage(null)

                // Clear form data for requested fields to prevent them from showing
                if (fieldsToClear.length > 0) {
                    setKybFormData(prev => {
                        const updated = { ...prev }
                        const updatedControlPerson = { ...prev.control_person }

                        fieldsToClear.forEach(field => {
                            if (field.startsWith('control_person.')) {
                                const fieldName = field.replace('control_person.', '') as keyof typeof updatedControlPerson
                                if (fieldName in updatedControlPerson) {
                                    if (fieldName === 'id_front_image' || fieldName === 'id_back_image') {
                                        (updatedControlPerson as any)[fieldName] = ''
                                    } else {
                                        (updatedControlPerson as any)[fieldName] = ''
                                    }
                                }
                            } else if (field === 'business_name' || field === 'email' || field === 'ein' || field === 'street_line_1' || field === 'city' || field === 'subdivision' || field === 'postal_code' || field === 'country') {
                                (updated as any)[field] = ''
                            }
                        })

                        updated.control_person = updatedControlPerson
                        return updated
                    })
                }

                // If backend returns KYC link for control person, store it
                if (data.data?.control_person_kyc_link) {
                    setControlPersonKycLink(data.data.control_person_kyc_link)
                }
                if (data.data?.control_person_kyc_iframe_url) {
                    setControlPersonKycIframeUrl(data.data.control_person_kyc_iframe_url)
                }
            } else {
                showErrorToast(data.message || 'Failed to submit Control Person information')
            }
        } catch (error) {
            console.error('Failed to submit Control Person:', error)
            showErrorToast('Failed to submit Control Person information')
        } finally {
            setIsLoading(false)
        }
    }

    // Handle Business Documents submission (Step 2 of KYB)
    const handleSubmitBusinessDocuments = async () => {
        try {
            setIsLoading(true)

            const errors: Record<string, string> = {}

            // Check if we're in re-upload mode (some documents are rejected)
            const hasRejectedDocuments = documentStatuses.business_formation === 'rejected' ||
                documentStatuses.business_ownership === 'rejected' ||
                documentStatuses.proof_of_address === 'rejected'

            // Only require documents that are explicitly rejected (for re-upload)
            // If a document is approved or pending, don't require it
            if (documentStatuses.business_formation === 'rejected') {
                // Re-upload required for rejected document
                if (!kybFormData.business_formation_document) {
                    errors.business_formation_document = 'Business formation document is required (e.g., Articles of Incorporation)'
                }
            } else if (!hasRejectedDocuments && !documentStatuses.business_formation) {
                // Only require if no documents are rejected AND this document hasn't been uploaded yet (initial submission)
                if (!kybFormData.business_formation_document) {
                    errors.business_formation_document = 'Business formation document is required (e.g., Articles of Incorporation)'
                }
            }

            if (documentStatuses.business_ownership === 'rejected') {
                // Re-upload required for rejected document
                if (!kybFormData.business_ownership_document) {
                    errors.business_ownership_document = 'Business ownership document is required (e.g., Cap table, Operating Agreement)'
                }
            } else if (!hasRejectedDocuments && !documentStatuses.business_ownership) {
                // Only require if no documents are rejected AND this document hasn't been uploaded yet (initial submission)
                if (!kybFormData.business_ownership_document) {
                    errors.business_ownership_document = 'Business ownership document is required (e.g., Cap table, Operating Agreement)'
                }
            }

            // Only validate other fields if this is the initial submission (not re-upload mode)
            if (!hasRejectedDocuments && !businessDocumentsSubmitted) {
                if (!kybFormData.business_description?.trim()) {
                    errors.business_description = 'Business description is required'
                }
                if (!kybFormData.entity_type) {
                    errors.entity_type = 'Entity type is required'
                }
            }

            setBusinessDocumentErrors(errors)

            if (Object.keys(errors).length > 0) {
                showErrorToast('Please complete all required fields')
                setIsLoading(false)
                return
            }

            const response = await fetch('/wallet/bridge/create-customer-kyc', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
                cache: 'no-store',
                body: JSON.stringify({
                    step: 'business_documents', // Indicate this is step 2
                    business_formation_document: kybFormData.business_formation_document,
                    business_ownership_document: kybFormData.business_ownership_document,
                    proof_of_nature_of_business: kybFormData.proof_of_nature_of_business || null,
                    determination_letter_501c3: kybFormData.determination_letter_501c3 || null,
                    business_description: kybFormData.business_description,
                    business_industry: kybFormData.business_industry,
                    primary_website: kybFormData.primary_website,
                    // Standard KYB Requirements
                    entity_type: kybFormData.entity_type,
                    business_type: kybFormData.entity_type || null, // Use entity_type as business_type for Bridge
                    dao_status: kybFormData.dao_status,
                    physical_address: kybFormData.physical_address.street_line_1 ? kybFormData.physical_address : null,
                    // Enhanced KYB Requirements
                    source_of_funds: kybFormData.source_of_funds || null,
                    annual_revenue: kybFormData.annual_revenue || null,
                    transaction_volume: kybFormData.transaction_volume || null,
                    account_purpose: kybFormData.account_purpose || null,
                    high_risk_activities: kybFormData.high_risk_activities || null,
                    high_risk_geographies: kybFormData.high_risk_geographies || null,
                    proof_of_address_document: kybFormData.proof_of_address_document || null,
                }),
            })

            const data = await response.json()

            if (data.success) {
                showSuccessToast('Business documents submitted successfully. Please wait for admin approval before proceeding to KYC verification.')
                // Don't automatically move to step 3 - wait for admin approval
                // Stay on business_documents step until approved
                setKybStep('business_documents')
                setBusinessDocumentErrors({})
                setBusinessDocumentsSubmitted(true) // Mark documents as submitted

                // Store requested fields before clearing
                const fieldsToClear = [...requestedFields]

                // Clear requested fields after successful submission
                setRequestedFields([])
                setRefillMessage(null)

                // Store which documents were just submitted before clearing form data
                const submittedFormation = !!kybFormData.business_formation_document
                const submittedOwnership = !!kybFormData.business_ownership_document
                const submittedProofOfAddress = !!kybFormData.proof_of_address_document

                // Immediately update document statuses to 'pending' for re-uploaded documents
                // This ensures the waiting screen shows right away instead of the form
                setDocumentStatuses(prev => {
                    const updated = { ...prev }
                    // If a document was rejected and we just submitted it, change status to 'pending'
                    if (prev.business_formation === 'rejected' && submittedFormation) {
                        updated.business_formation = 'pending'
                    }
                    if (prev.business_ownership === 'rejected' && submittedOwnership) {
                        updated.business_ownership = 'pending'
                    }
                    if (prev.proof_of_address === 'rejected' && submittedProofOfAddress) {
                        updated.proof_of_address = 'pending'
                    }
                    // Also set to pending if it was the initial submission (status was undefined/null)
                    if (!prev.business_formation && submittedFormation) {
                        updated.business_formation = 'pending'
                    }
                    if (!prev.business_ownership && submittedOwnership) {
                        updated.business_ownership = 'pending'
                    }
                    return updated
                })

                // Clear the form data for re-uploaded documents to prevent showing the form again
                setKybFormData(prev => {
                    const updated = {
                        ...prev,
                        business_formation_document: '',
                        business_ownership_document: '',
                        proof_of_address_document: '',
                        proof_of_nature_of_business: '',
                        determination_letter_501c3: '',
                    }

                    // Clear form data for requested fields to prevent them from showing
                    if (fieldsToClear.length > 0) {
                        fieldsToClear.forEach(field => {
                            if (field === 'entity_type') updated.entity_type = ''
                            else if (field === 'business_description') updated.business_description = ''
                            else if (field === 'business_industry') updated.business_industry = ''
                            else if (field === 'primary_website') updated.primary_website = ''
                            else if (field === 'dao_status') updated.dao_status = false
                            else if (field === 'source_of_funds') updated.source_of_funds = ''
                            else if (field === 'annual_revenue') updated.annual_revenue = ''
                            else if (field === 'transaction_volume') updated.transaction_volume = ''
                            else if (field === 'account_purpose') updated.account_purpose = ''
                            else if (field === 'high_risk_activities') updated.high_risk_activities = ''
                            else if (field === 'high_risk_geographies') updated.high_risk_geographies = ''
                            else if (field.startsWith('physical_address.')) {
                                const fieldName = field.replace('physical_address.', '')
                                updated.physical_address = {
                                    ...updated.physical_address,
                                    [fieldName]: ''
                                }
                            }
                        })
                    }

                    return updated
                })

                // Refresh status to get updated submission status and document statuses from backend
                await checkBridgeAndFetchBalance()
            } else {
                showErrorToast(data.message || 'Failed to submit business documents')
            }
        } catch (error) {
            console.error('Failed to submit business documents:', error)
            showErrorToast('Failed to submit business documents')
        } finally {
            setIsLoading(false)
        }
    }

    // Handle Control Person KYC verification (Step 3 of KYB)
    const handleControlPersonKyc = async (silent = false) => {
        try {
            if (!silent) {
                setIsLoading(true)
            }

            // If we already have an iframe URL, don't fetch again
            if (controlPersonKycIframeUrl) {
                if (!silent) {
                    setIsLoading(false)
                }
                return
            }

            // If we already have a KYC link but no iframe, try to convert it to iframe URL
            if (controlPersonKycLink && !controlPersonKycIframeUrl) {
                // Convert link to iframe URL if possible
                const iframeUrl = controlPersonKycLink.replace('/verify', '/widget')
                const separator = iframeUrl.includes('?') ? '&' : '?'
                const fullIframeUrl = `${iframeUrl}${separator}iframe-origin=${encodeURIComponent(window.location.origin)}`
                setControlPersonKycIframeUrl(fullIframeUrl)
                if (!silent) {
                    setIsLoading(false)
                }
                return
            }

            // Request KYC link for control person
            const response = await fetch('/wallet/bridge/control-person-kyc-link', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
                cache: 'no-store',
                body: JSON.stringify({
                    control_person_email: kybFormData.control_person.email,
                }),
            })

            const data = await response.json()

            if (data.success) {
                if (data.data?.kyc_link) {
                    setControlPersonKycLink(data.data.kyc_link)
                }
                if (data.data?.iframe_kyc_link || data.data?.kyc_iframe_url) {
                    setControlPersonKycIframeUrl(data.data.iframe_kyc_link || data.data.kyc_iframe_url)
                } else if (data.data?.kyc_link) {
                    // Convert link to iframe URL if iframe URL not provided
                    const iframeUrl = data.data.kyc_link.replace('/verify', '/widget')
                    const separator = iframeUrl.includes('?') ? '&' : '?'
                    const fullIframeUrl = `${iframeUrl}${separator}iframe-origin=${encodeURIComponent(window.location.origin)}`
                    setControlPersonKycIframeUrl(fullIframeUrl)
                }
                // Only show toast if not silent (user-initiated)
                if (!silent) {
                    if (data.data?.iframe_kyc_link || data.data?.kyc_iframe_url || data.data?.kyc_link) {
                        showSuccessToast('KYC verification iframe loaded')
                    } else {
                        showErrorToast('KYC verification link not available')
                    }
                }
            } else {
                if (!silent) {
                    showErrorToast(data.message || 'Failed to get KYC verification link')
                }
            }
        } catch (error) {
            console.error('Failed to get Control Person KYC link:', error)
            if (!silent) {
                showErrorToast('Failed to get KYC verification link')
            }
        } finally {
            if (!silent) {
                setIsLoading(false)
            }
        }
    }

    // Handle custom KYC form submission (for individual KYC, not KYB)
    const handleSubmitCustomKyc = async () => {
        try {
            setIsLoading(true)

            if (tosStatus !== 'accepted' && tosStatus !== 'approved' && !signedAgreementId) {
                showErrorToast('Please accept Terms of Service first')
                setIsLoading(false)
                return
            }

            if (verificationType === 'kyb') {
                // KYB is now handled by multi-step flow
                // This should not be called for KYB anymore
                showErrorToast('Please use the KYB multi-step flow')
                setIsLoading(false)
                return
            } else {
                // Individual KYC submission
                // Validate based on ID type
                if (!kycFormData.id_front_image) {
                    const idTypeLabel = kycFormData.id_type === 'passport' ? 'passport' : 'ID front'
                    showErrorToast(`Please upload ${idTypeLabel} image`)
                    setIsLoading(false)
                    return
                }

                // For driver's license and state ID, require back image
                if (kycFormData.id_type !== 'passport' && !kycFormData.id_back_image) {
                    showErrorToast('Please upload ID back image')
                    setIsLoading(false)
                    return
                }

                // id_front_image and id_back_image are already base64 strings
                const idFrontBase64 = typeof kycFormData.id_front_image === 'string'
                    ? kycFormData.id_front_image
                    : await convertImageToBase64(kycFormData.id_front_image as File)
                const idBackBase64 = kycFormData.id_type !== 'passport' && kycFormData.id_back_image
                    ? (typeof kycFormData.id_back_image === 'string'
                        ? kycFormData.id_back_image
                        : await convertImageToBase64(kycFormData.id_back_image as File))
                    : null

                const response = await fetch('/wallet/bridge/create-customer-kyc', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': getCsrfToken(),
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'include',
                    cache: 'no-store',
                    body: JSON.stringify({
                        signed_agreement_id: signedAgreementId,
                        first_name: kycFormData.first_name,
                        last_name: kycFormData.last_name,
                        email: kycFormData.email,
                        birth_date: kycFormData.birth_date,
                        residential_address: {
                            street_line_1: kycFormData.street_line_1,
                            city: kycFormData.city,
                            subdivision: kycFormData.subdivision,
                            postal_code: kycFormData.postal_code,
                            country: kycFormData.country,
                        },
                        ssn: kycFormData.ssn,
                        id_type: kycFormData.id_type,
                        id_number: kycFormData.id_number,
                        id_front_image: idFrontBase64,
                        // Only send id_back_image if ID type is not passport (drivers_license or state_id)
                        ...(idBackBase64 ? { id_back_image: idBackBase64 } : {}),
                    }),
                })

                const data = await response.json()

                if (data.success) {
                    showSuccessToast('KYC data submitted successfully. Verification is pending.')
                    setKycStatus('under_review') // Set status to under_review after submission
                    setKycSubmitted(true) // Mark that KYC has been submitted
                    setRequiresVerification(true)
                    // Refresh status from backend to ensure sync
                    setTimeout(() => {
                        fetch(`/wallet/bridge/status?t=${Date.now()}`, {
                            method: 'GET',
                            headers: {
                                'Accept': 'application/json',
                                'X-CSRF-TOKEN': getCsrfToken(),
                                'X-Requested-With': 'XMLHttpRequest',
                            },
                            credentials: 'include',
                            cache: 'no-store',
                        })
                            .then(res => res.json())
                            .then(statusData => {
                                if (statusData.success) {
                                    if (statusData.kyc_status) {
                                        // If KYC was submitted, don't allow status to go back to not_started (which would show form)
                                        // Keep waiting screen visible until approved or rejected
                                        if (kycSubmitted && statusData.kyc_status === 'not_started') {
                                            // Keep status as under_review to maintain waiting screen
                                            console.log('KYC submitted - keeping status as under_review to show waiting screen')
                                        } else {
                                            setKycStatus(statusData.kyc_status)
                                            // If status becomes approved, clear the submitted flag
                                            if (statusData.kyc_status === 'approved') {
                                                setKycSubmitted(false)
                                            }
                                        }
                                    }
                                    if (statusData.requires_verification !== undefined) {
                                        setRequiresVerification(statusData.requires_verification)
                                    }
                                }
                            })
                            .catch(err => console.error('Failed to refresh KYC status:', err))
                    }, 500)
                } else {
                    showErrorToast(data.message || 'Failed to submit KYC data')
                }
            }
        } catch (error) {
            console.error('Failed to submit KYC data:', error)
            showErrorToast('Failed to submit KYC data')
        } finally {
            setIsLoading(false)
        }
    }

    const handleRefresh = async () => {
        setIsLoading(true)
        try {
            const balanceResponse = await fetch(`/wallet/balance?t=${Date.now()}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
                cache: 'no-store',
            })

            if (balanceResponse.ok) {
                const balanceData = await balanceResponse.json()
                if (balanceData.success) {
                    setWalletBalance(balanceData.balance || balanceData.organization_balance || balanceData.local_balance || 0)
                    setHasSubscription(balanceData.has_subscription ?? null)
                    showSuccessToast('Balance refreshed')
                }
            }
        } catch (error) {
            console.error('Failed to refresh balance:', error)
            showErrorToast('Failed to refresh balance')
        } finally {
            setIsLoading(false)
        }
    }

    // Use formatAddress from wallet utils (imported as formatWalletAddress)
    const formatAddress = formatWalletAddress

    // Debounced search function
    useEffect(() => {
        if (!recipientSearch || recipientSearch.length < 2) {
            setSearchResults([])
            setShowDropdown(false)
            return
        }

        const timeoutId = setTimeout(async () => {
            setIsLoadingSearch(true)
            try {
                const response = await fetch(`/wallet/search-recipients?search=${encodeURIComponent(recipientSearch)}&limit=10`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': getCsrfToken(),
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'include',
                    cache: 'no-store',
                })

                if (response.ok) {
                    const data = await response.json()
                    if (data.success) {
                        setSearchResults(data.results || [])
                        setShowDropdown(data.results && data.results.length > 0)
                    }
                }
            } catch (error) {
                console.error('Search error:', error)
                setSearchResults([])
            } finally {
                setIsLoadingSearch(false)
            }
        }, 300)

        return () => clearTimeout(timeoutId)
    }, [recipientSearch])

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                searchInputRef.current &&
                !searchInputRef.current.contains(event.target as Node)
            ) {
                setShowDropdown(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Reset recipient search when switching away from send view
    useEffect(() => {
        if (actionView !== 'send') {
            setRecipientSearch('')
            setSelectedRecipient(null)
            setSendAddress('')
            setSearchResults([])
            setShowDropdown(false)
        }
    }, [actionView])

    // Reset add money amount and payment method when switching away from addMoney view
    useEffect(() => {
        if (actionView !== 'addMoney') {
            setAddMoneyAmount('')
            setSelectedPaymentMethod('ach') // Reset to default
        }
    }, [actionView])

    // Fetch deposit instructions and QR code when receive view is shown
    useEffect(() => {
        if (actionView === 'receive') {
            const fetchReceiveData = async () => {
                setIsLoadingReceiveData(true)
                try {
                    // Fetch deposit instructions
                    const timestamp = Date.now()
                    const instructionsResponse = await fetch(`/wallet/bridge/deposit-instructions?t=${timestamp}`, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'X-CSRF-TOKEN': getCsrfToken(),
                            'X-Requested-With': 'XMLHttpRequest',
                            'Cache-Control': 'no-cache, no-store, must-revalidate',
                            'Pragma': 'no-cache',
                            'Expires': '0',
                        },
                        credentials: 'include',
                        cache: 'no-store',
                    })

                    if (instructionsResponse.ok) {
                        const data = await instructionsResponse.json()
                        if (data.success && data.data?.deposit_instructions) {
                            const instructions = data.data.deposit_instructions
                            setReceiveDepositInstructions(instructions)

                            // Fetch QR code as blob and convert to data URL
                            try {
                                const qrTimestamp = Date.now()
                                const qrResponse = await fetch(`/wallet/bridge/deposit-qr-code?t=${qrTimestamp}`, {
                                    method: 'GET',
                                    headers: {
                                        'Accept': 'image/svg+xml, image/png, image/*',
                                        'X-CSRF-TOKEN': getCsrfToken(),
                                        'X-Requested-With': 'XMLHttpRequest',
                                    },
                                    credentials: 'include',
                                    cache: 'no-store',
                                })

                                if (qrResponse.ok) {
                                    const blob = await qrResponse.blob()
                                    const reader = new FileReader()
                                    reader.onloadend = () => {
                                        setQrCodeUrl(reader.result as string)
                                    }
                                    reader.readAsDataURL(blob)
                                } else {
                                    console.error('Failed to fetch QR code:', qrResponse.status, qrResponse.statusText)
                                    setQrCodeUrl(null)
                                }
                            } catch (qrError) {
                                console.error('Error fetching QR code:', qrError)
                                setQrCodeUrl(null)
                            }
                        }
                    }
                } catch (error) {
                    console.error('Failed to fetch receive data:', error)
                } finally {
                    setIsLoadingReceiveData(false)
                }
            }

            fetchReceiveData()
        } else if (actionView !== 'receive') {
            // Clear receive data when leaving receive view
            setReceiveDepositInstructions(null)
            setQrCodeUrl(null)
        }
    }, [actionView])

    // Fetch deposit instructions when addMoney view is shown - always fetch fresh (no cache)
    useEffect(() => {
        if (actionView === 'addMoney') {
            const fetchDepositInstructions = async () => {
                setIsLoadingDepositInstructions(true)
                try {
                    // Add timestamp to URL to prevent any caching
                    const timestamp = Date.now()
                    const response = await fetch(`/wallet/bridge/deposit-instructions?t=${timestamp}`, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'X-CSRF-TOKEN': getCsrfToken(),
                            'X-Requested-With': 'XMLHttpRequest',
                            'Cache-Control': 'no-cache, no-store, must-revalidate',
                            'Pragma': 'no-cache',
                            'Expires': '0',
                        },
                        credentials: 'include',
                        cache: 'no-store', // Use no-store instead of no-cache for stricter no-cache behavior
                    })

                    if (response.ok) {
                        const data = await response.json()
                        if (data.success && data.data?.deposit_instructions) {
                            const instructions = data.data.deposit_instructions
                            setDepositInstructions(instructions)

                            // Set default payment method based on available options
                            if (instructions.payment_rails && Array.isArray(instructions.payment_rails)) {
                                // Prefer ACH if available, otherwise use first available
                                if (instructions.payment_rails.includes('ach_push')) {
                                    setSelectedPaymentMethod('ach')
                                } else if (instructions.payment_rails.includes('wire')) {
                                    setSelectedPaymentMethod('wire')
                                }
                            } else if (instructions.payment_rail) {
                                // Fallback to single payment_rail
                                if (instructions.payment_rail === 'ach_push') {
                                    setSelectedPaymentMethod('ach')
                                } else if (instructions.payment_rail === 'wire') {
                                    setSelectedPaymentMethod('wire')
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Failed to fetch deposit instructions:', error)
                } finally {
                    setIsLoadingDepositInstructions(false)
                }
            }

            fetchDepositInstructions()
        } else if (actionView !== 'addMoney') {
            // Clear deposit instructions when leaving addMoney view to ensure fresh fetch next time
            setDepositInstructions(null)
        }
    }, [actionView])

    const handleSelectRecipient = (recipient: { id: string; type: string; name: string; email?: string; display_name: string; address: string }) => {
        setSelectedRecipient(recipient)
        setSendAddress(recipient.address)
        setRecipientSearch(recipient.display_name)
        setShowDropdown(false)
    }

    const handleSend = async () => {
        if (!selectedRecipient) {
            showErrorToast('Please select a recipient')
            return
        }

        const amount = parseFloat(sendAmount)
        if (!sendAmount || isNaN(amount) || amount <= 0) {
            showErrorToast('Please enter a valid amount')
            return
        }

        if (walletBalance !== null && amount > walletBalance) {
            showErrorToast(`Insufficient balance. Available: $${walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
            return
        }

        setIsLoading(true)

        try {
            const response = await fetch('/wallet/bridge/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
                cache: 'no-store',
                body: JSON.stringify({
                    amount: amount,
                    recipient_id: selectedRecipient.id,
                    recipient_address: selectedRecipient.address,
                }),
            })

            const data = await response.json()

            // Check if KYC/KYB verification is required
            if (data.requires_verification) {
                setRequiresVerification(true)
                setVerificationType(data.verification_type || 'kyb')
                showErrorToast(data.message || 'Verification required')
                setIsLoading(false)
                return
            }

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to send money')
            }

            // Update balance from response
            if (data.data?.sender_balance !== undefined) {
                setWalletBalance(data.data.sender_balance)
            } else {
                // Refresh balance
                const balanceResponse = await fetch(`/wallet/balance?t=${Date.now()}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': getCsrfToken(),
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'include',
                    cache: 'no-store',
                })

                if (balanceResponse.ok) {
                    const balanceData = await balanceResponse.json()
                    if (balanceData.success) {
                        setWalletBalance(balanceData.balance || balanceData.organization_balance || balanceData.local_balance || 0)
                    }
                }
            }

            // Show success
            setSuccessType('send')
            setSuccessMessage(data.message || `Successfully sent $${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to ${selectedRecipient.name}`)
            setShowSuccess(true)

            // Refresh activities to show the new transaction
            if (activeTab === 'activity') {
                try {
                    const activityResponse = await fetch(`/wallet/activity?page=1&per_page=5&t=${Date.now()}`, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'X-CSRF-TOKEN': getCsrfToken(),
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                        credentials: 'include',
                        cache: 'no-store',
                    })

                    if (activityResponse.ok) {
                        const activityData = await activityResponse.json()
                        if (activityData.success) {
                            setActivities(activityData.activities || [])
                            setHasMoreActivities(activityData.has_more || false)
                            setCurrentPage(1)
                        }
                    }
                } catch (error) {
                    console.error('Failed to refresh activities:', error)
                }
            }

            // Clear form
            setSendAmount('')
            setSendAddress('')
            setSelectedRecipient(null)
            setRecipientSearch('')
            setIsLoading(false)

            // Hide success and return to main after 3 seconds
            setTimeout(() => {
                setShowSuccess(false)
                setSuccessType(null)
                setActionView('main')
            }, 3000)
        } catch (error) {
            console.error('Send error:', error)
            const errorMessage = error instanceof Error ? error.message : 'Failed to send money. Please try again.'
            showErrorToast(errorMessage)
            setIsLoading(false)
        }
    }

    // const handleSwap = () => {
    //     if (!swapAmount || swapFrom === swapTo) {
    //         showErrorToast('Please enter amount and select different currencies')
    //         return
    //     }
    //     
    //     setIsLoading(true)
    //     
    //     // Simulate API call delay
    //     setTimeout(() => {
    //         setSuccessType('swap')
    //         setSuccessMessage(`Successfully swapped ${swapAmount} ${swapFrom} to ${swapTo}`)
    //         setShowSuccess(true)
    //         setSwapAmount('')
    //         setIsLoading(false)
    //         
    //         // Hide success and return to main after 3 seconds
    //         setTimeout(() => {
    //             setShowSuccess(false)
    //             setSuccessType(null)
    //             setActionView('main')
    //         }, 3000)
    //     }, 1000)
    // }

    const handleSwap = () => {
        showErrorToast('Coming Soon')
    }

    const handleAddMoney = async () => {
        const amount = parseFloat(addMoneyAmount)
        if (!addMoneyAmount || isNaN(amount) || amount <= 0) {
            showErrorToast('Please enter a valid amount')
            return
        }

        setIsLoading(true)

        try {
            // TODO: Replace with actual API endpoint when backend is ready
            // For now, simulate the API call
            const response = await fetch('/wallet/bridge/deposit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
                cache: 'no-store',
                body: JSON.stringify({
                    amount: amount,
                }),
            })

            if (response.ok) {
                const data = await response.json()

                // Check if KYC/KYB verification is required
                if (data.requires_verification) {
                    setRequiresVerification(true)
                    setVerificationType(data.verification_type || 'kyc')
                    showErrorToast(data.message || 'Verification required')
                    setIsLoading(false)
                    return
                }

                if (data.success) {
                    // Update balance from response
                    if (data.data?.balance !== undefined) {
                        setWalletBalance(data.data.balance)
                    } else {
                        // Refresh balance
                        const balanceResponse = await fetch(`/wallet/balance?t=${Date.now()}`, {
                            method: 'GET',
                            headers: {
                                'Accept': 'application/json',
                                'X-CSRF-TOKEN': getCsrfToken(),
                                'X-Requested-With': 'XMLHttpRequest',
                            },
                            credentials: 'include',
                            cache: 'no-store',
                        })

                        if (balanceResponse.ok) {
                            const balanceData = await balanceResponse.json()
                            if (balanceData.success) {
                                setWalletBalance(balanceData.balance || balanceData.organization_balance || balanceData.local_balance || 0)
                            }
                        }
                    }

                    // Show success
                    setSuccessType('addMoney')
                    setSuccessMessage(data.message || `Successfully added $${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to your wallet`)
                    setShowSuccess(true)

                    // Always refresh activities to show the new transaction (regardless of active tab)
                    try {
                        const activityResponse = await fetch(`/wallet/activity?page=1&per_page=10&t=${Date.now()}`, {
                            method: 'GET',
                            headers: {
                                'Accept': 'application/json',
                                'X-CSRF-TOKEN': getCsrfToken(),
                                'X-Requested-With': 'XMLHttpRequest',
                            },
                            credentials: 'include',
                            cache: 'no-store',
                        })

                        if (activityResponse.ok) {
                            const activityData = await activityResponse.json()
                            if (activityData.success) {
                                setActivities(activityData.activities || [])
                                setHasMoreActivities(activityData.has_more || false)
                                setCurrentPage(1)
                            }
                        }
                    } catch (error) {
                        console.error('Failed to refresh activities:', error)
                    }

                    // Clear form
                    setAddMoneyAmount('')
                    setIsLoading(false)

                    // Hide success and return to main after 3 seconds
                    setTimeout(() => {
                        setShowSuccess(false)
                        setSuccessType(null)
                        setActionView('main')
                    }, 3000)
                } else {
                    throw new Error(data.message || 'Failed to add money')
                }
            } else {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.message || 'Failed to add money. Please try again.')
            }
        } catch (error) {
            console.error('Add money error:', error)
            const errorMessage = error instanceof Error ? error.message : 'Failed to add money. Please try again.'
            showErrorToast(errorMessage)
            setIsLoading(false)
        }
    }

    const handleCopyReceiveAddress = () => {
        if (walletAddress) {
            navigator.clipboard.writeText(walletAddress)
            setCopied(true)
            setSuccessType('receive')
            setSuccessMessage('Address copied to clipboard!')
            setShowSuccess(true)
            setTimeout(() => {
                setCopied(false)
                setShowSuccess(false)
                setSuccessType(null)
            }, 2000)
        }
    }

    // Splash Screen and Skeleton components are now imported from './wallet'
    // Removed inline definitions to reduce file size

    return (
        <AnimatePresence>
            {isOpen && (
                <React.Fragment key="wallet-popup">
                    {/* Backdrop - No blur */}
                    <motion.div
                        key="wallet-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 z-50"
                    />

                    {/* Popup - MetaMask style structure */}
                    <motion.div
                        key="wallet-popup-content"
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 sm:inset-x-auto sm:top-16 sm:right-4 sm:inset-y-auto z-50 w-full sm:w-80 md:w-96 h-full sm:h-[600px] bg-card border border-border sm:rounded-xl shadow-2xl overflow-hidden flex flex-col"
                        style={{ maxHeight: '100vh' }}
                    >
                        {/* Header - MetaMask style */}
                        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                            <div className="flex items-center justify-between p-3 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    {actionView !== 'main' && (
                                        <button
                                            onClick={() => setActionView('main')}
                                            className="p-1 rounded-lg hover:bg-white/20 transition-colors mr-1"
                                        >
                                            <ArrowLeft className="h-4 w-4" />
                                        </button>
                                    )}
                                    <div className="p-1.5 bg-white/20 rounded-lg">
                                        <Wallet className="h-4 w-4" />
                                    </div>
                                    <span className="font-semibold text-sm">
                                        {actionView === 'send' ? 'Send' :
                                            actionView === 'receive' ? 'Receive' :
                                                actionView === 'swap' ? 'Swap' :
                                                    actionView === 'addMoney' ? 'Deposit' :
                                                        actionView === 'external_accounts' ? 'Bank Accounts' :
                                                            actionView === 'transfer_from_external' ? 'Transfer from Bank' : 'Account'}
                                    </span>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Account Name - Only show on main view */}
                            {organizationName && actionView === 'main' && (
                                <div className="px-3 py-2 border-b border-white/10">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-white/80">{organizationName}</span>
                                        <ChevronDown className="h-4 w-4 text-white/80" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Tabs - Rounded animated style - Only show on main view */}
                        {actionView === 'main' && (
                            <div className="relative flex gap-2 p-1 bg-muted/30 mx-4 mt-2 rounded-lg">
                                {/* Animated background indicator */}
                                <motion.div
                                    className="absolute inset-y-1 rounded-md bg-gradient-to-r from-purple-600 to-blue-600 shadow-md"
                                    initial={false}
                                    animate={{
                                        x: activeTab === 'account' ? 0 : '100%',
                                    }}
                                    transition={{
                                        type: 'spring',
                                        stiffness: 300,
                                        damping: 30,
                                    }}
                                    style={{
                                        width: 'calc(50% - 0.25rem)',
                                    }}
                                />

                                <motion.button
                                    onClick={() => setActiveTab('account')}
                                    className={`relative flex-1 px-4 py-2.5 text-sm font-medium rounded-md z-10 ${activeTab === 'account'
                                            ? 'text-white'
                                            : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <motion.span
                                        animate={{
                                            scale: activeTab === 'account' ? 1.05 : 1,
                                        }}
                                        transition={{
                                            type: 'spring',
                                            stiffness: 400,
                                            damping: 25,
                                        }}
                                        className="flex items-center justify-center gap-1.5"
                                    >
                                        Account
                                    </motion.span>
                                </motion.button>

                                <motion.button
                                    onClick={() => setActiveTab('activity')}
                                    className={`relative flex-1 px-4 py-2.5 text-sm font-medium rounded-md z-10 ${activeTab === 'activity'
                                            ? 'text-white'
                                            : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <motion.span
                                        animate={{
                                            scale: activeTab === 'activity' ? 1.05 : 1,
                                        }}
                                        transition={{
                                            type: 'spring',
                                            stiffness: 400,
                                            damping: 25,
                                        }}
                                        className="flex items-center justify-center gap-1.5"
                                    >
                                        <Activity className="h-4 w-4" />
                                        Activity
                                    </motion.span>
                                </motion.button>
                            </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            {/* Splash Screen - Show during initial load */}
                            {isInitialLoading ? (
                                <SplashScreen key="splash-screen" />
                            ) : (
                                <motion.div 
                                    key="main-content"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex-1 flex flex-col"
                                >
                                    {/* Success Animation Overlay */}
                                    <AnimatePresence>
                                        {showSuccess && (
                                            <SuccessMessage
                                                key="success-message"
                                                show={showSuccess}
                                                successType={successType}
                                                message={successMessage}
                                            />
                                        )}
                                    </AnimatePresence>

                                    {/* Balance Display - Show at top for all action views */}
                                    {(actionView === 'send' || actionView === 'receive' || actionView === 'swap' || actionView === 'addMoney' || actionView === 'transfer_from_external') && !showSuccess && (
                                        walletBalance === null && isLoading ? (
                                            <BalanceSkeleton />
                                        ) : (
                                            <BalanceDisplay
                                                balance={walletBalance}
                                                isLoading={isLoading}
                                                onRefresh={handleRefresh}
                                            />
                                        )
                                    )}

                                    {!showSuccess && actionView === 'send' ? (
                                        isLoadingSearch && searchResults.length === 0 ? (
                                            <div key="send-loading" className="p-4 space-y-4">
                                                <BalanceSkeleton />
                                                <div className="space-y-3">
                                                    <Skeleton className="h-10 w-full" />
                                                    <Skeleton className="h-10 w-full" />
                                                    <div className="border border-border rounded-lg p-2">
                                                        <SearchResultsSkeleton />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <SendMoney
                                                key="send-money"
                                                sendAmount={sendAmount}
                                                walletBalance={walletBalance}
                                                recipientSearch={recipientSearch}
                                                searchResults={searchResults}
                                                selectedRecipient={selectedRecipient}
                                                sendAddress={sendAddress}
                                                isLoading={isLoading}
                                                isLoadingSearch={isLoadingSearch}
                                                showDropdown={showDropdown}
                                                searchInputRef={searchInputRef}
                                                dropdownRef={dropdownRef}
                                                onAmountChange={setSendAmount}
                                                onSearchChange={(value) => {
                                                    setRecipientSearch(value)
                                                    setShowDropdown(true)
                                                    if (!value) {
                                                        setSelectedRecipient(null)
                                                        setSendAddress('')
                                                    }
                                                }}
                                                onSearchFocus={() => {
                                                    if (searchResults.length > 0) {
                                                        setShowDropdown(true)
                                                    }
                                                }}
                                                onSelectRecipient={handleSelectRecipient}
                                                onSend={handleSend}
                                            />
                                        )
                                    ) : !showSuccess && actionView === 'external_accounts' ? (
                                        isLoadingExternalAccounts && externalAccounts.length === 0 ? (
                                            <div key="external-accounts-loading" className="p-4 space-y-4">
                                                <div className="space-y-3">
                                                    {[1, 2, 3].map((i) => (
                                                        <div key={i} className="p-4 border border-border rounded-lg space-y-2">
                                                            <Skeleton className="h-5 w-32" />
                                                            <Skeleton className="h-4 w-24" />
                                                            <Skeleton className="h-4 w-40" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <ExternalAccounts
                                                key="external-accounts"
                                                externalAccounts={externalAccounts}
                                                isLoading={isLoadingExternalAccounts}
                                                onRefresh={fetchExternalAccounts}
                                                onLinkAccount={handleLinkExternalAccount}
                                            />
                                        )
                                    ) : !showSuccess && actionView === 'transfer_from_external' ? (
                                        <TransferFromExternal
                                            key="transfer-from-external"
                                            externalAccounts={externalAccounts}
                                            selectedExternalAccount={selectedExternalAccount}
                                            transferAmount={transferAmount}
                                            isLoading={isLoading}
                                            onAccountChange={setSelectedExternalAccount}
                                            onAmountChange={setTransferAmount}
                                            onTransfer={handleTransferFromExternal}
                                        />
                                    ) : !showSuccess && actionView === 'receive' ? (
                                        isLoadingReceiveData ? (
                                            <div key="receive-loading" className="p-4 space-y-4">
                                                <BalanceSkeleton />
                                                <QRCodeSkeleton />
                                                <DepositInstructionsSkeleton />
                                            </div>
                                        ) : (
                                            <ReceiveMoney
                                                key="receive-money"
                                                isLoading={isLoadingReceiveData}
                                                qrCodeUrl={qrCodeUrl}
                                                depositInstructions={receiveDepositInstructions}
                                                walletAddress={walletAddress}
                                                copied={copied}
                                                onCopyAddress={handleCopyReceiveAddress}
                                            />
                                        )
                                    ) : !showSuccess && actionView === 'swap' ? (
                                        <SwapView key="swap-view" />
                                    ) : !showSuccess && actionView === 'addMoney' ? (
                                        isLoadingDepositInstructions ? (
                                            <div key="add-money-loading" className="p-4 space-y-4">
                                                <BalanceSkeleton />
                                                <DepositInstructionsSkeleton />
                                            </div>
                                        ) : (
                                            <AddMoney
                                                key="add-money"
                                                isLoading={isLoadingDepositInstructions}
                                                depositInstructions={depositInstructions}
                                                selectedPaymentMethod={selectedPaymentMethod}
                                                onPaymentMethodChange={setSelectedPaymentMethod}
                                            />
                                        )
                                    ) : activeTab === 'account' ? (
                                        (() => {
                                            // Show skeleton while initial loading
                                            if (isInitialLoading || (isLoading && walletBalance === null && walletAddress === null)) {
                                                return 'skeleton'
                                            }

                                            // PRIORITY 1: If we have a wallet/virtual account address, show wallet screen
                                            // In sandbox mode, we might have a virtual account (walletAddress) but hasWallet might be false
                                            // So check for walletAddress first - if we have an address, show the wallet screen
                                            if (walletAddress) {
                                                return 'wallet_screen' // Show wallet screen
                                            }

                                            // PRIORITY 2: Check if account is approved but wallet doesn't exist
                                            const isApproved = verificationType && (
                                                (verificationType === 'kyb' && kybStatus === 'approved') ||
                                                (verificationType === 'kyc' && kycStatus === 'approved')
                                            )

                                            // Only show create wallet screen if approved AND we don't have a wallet address
                                            if (isApproved && !walletAddress) {
                                                return 'create_wallet' // Show Create Wallet screen
                                            }

                                            // PRIORITY 3: Check if bridge is not initialized
                                            if (!bridgeInitialized && !isLoading) {
                                                return 'connect_wallet' // Show Connect Wallet screen
                                            }

                                            return 'other' // Continue to other checks
                                        })() === 'skeleton' ? (
                                            <div key="account-skeleton" className="p-4 space-y-4">
                                                <BalanceSkeleton />
                                                <div className="grid grid-cols-4 gap-2">
                                                    {[1, 2, 3, 4].map((i) => (
                                                        <div key={i} className="flex flex-col items-center space-y-2">
                                                            <Skeleton className="h-12 w-12 rounded-full" />
                                                            <Skeleton className="h-3 w-16" />
                                                        </div>
                                                    ))}
                                                </div>
                                                <WalletAddressSkeleton />
                                            </div>
                                        ) : (() => {
                                            // PRIORITY 1: If we have a wallet/virtual account address, show wallet screen
                                            if (walletAddress) {
                                                return 'wallet_screen'
                                            }

                                            // PRIORITY 2: Check if account is approved but wallet doesn't exist
                                            const isApproved = verificationType && (
                                                (verificationType === 'kyb' && kybStatus === 'approved') ||
                                                (verificationType === 'kyc' && kycStatus === 'approved')
                                            )

                                            if (isApproved && !walletAddress) {
                                                return 'create_wallet'
                                            }

                                            // PRIORITY 3: Check if bridge is not initialized
                                            if (!bridgeInitialized && !isLoading) {
                                                return 'connect_wallet'
                                            }

                                            return 'other'
                                        })() === 'wallet_screen' ? (
                                            <WalletScreen
                                                key="wallet-screen"
                                                walletBalance={walletBalance}
                                                walletAddress={walletAddress}
                                                isLoading={isLoading}
                                                copied={copied}
                                                isSandbox={isSandbox}
                                                onRefresh={handleRefresh}
                                                onCopyAddress={handleCopyAddress}
                                                onActionViewChange={setActionView}
                                            />
                                        ) : (() => {
                                            // PRIORITY 1: Check if account is approved but wallet doesn't exist
                                            const isApproved = verificationType && (
                                                (verificationType === 'kyb' && kybStatus === 'approved') ||
                                                (verificationType === 'kyc' && kycStatus === 'approved')
                                            )

                                            if (isApproved && !hasWallet) {
                                                return 'create_wallet' // Show Create Wallet screen
                                            }

                                            // PRIORITY 2: Check if bridge is not initialized
                                            if (!bridgeInitialized && !isLoading) {
                                                return 'connect_wallet' // Show Connect Wallet screen
                                            }

                                            return 'other' // Continue to other checks
                                        })() === 'create_wallet' ? (
                                            <CreateWallet
                                                key="create-wallet"
                                                isLoading={isLoading}
                                                isSandbox={isSandbox}
                                                verificationType={verificationType}
                                                onCreateWallet={handleCreateWallet}
                                            />
                                        ) : (() => {
                                            // Check if we should show Connect Wallet
                                            if (!bridgeInitialized && !isLoading) {
                                                return 'connect_wallet'
                                            }
                                            return 'other'
                                        })() === 'connect_wallet' ? (
                                            <ConnectWallet
                                                key="connect-wallet"
                                                isLoading={isLoading}
                                                organizationName={organizationName}
                                                onConnect={handleConnectWallet}
                                            />
                                        ) : (() => {
                                            // PRIORITY: If status is approved, ALWAYS show wallet screen (return false)
                                            if (bridgeInitialized && verificationType) {
                                                const isKybApproved = verificationType === 'kyb' && kybStatus === 'approved'
                                                const isKycApproved = verificationType === 'kyc' && kycStatus === 'approved'

                                                if (isKybApproved || isKycApproved) {
                                                    return false // Show wallet screen - status is approved!
                                                }
                                            }

                                            // PRIORITY: For KYC - if submitted and pending, show simple waiting screen instead of full verification screen
                                            if (verificationType === 'kyc' && kycSubmitted && kycStatus !== 'not_started' && kycStatus !== 'approved' && kycStatus !== 'rejected') {
                                                return 'kyc_waiting' // Show simple waiting screen
                                            }

                                            // Show verification screen only if:
                                            // 1. Bridge is initialized
                                            // 2. Verification type is set  
                                            // 3. Status is NOT approved
                                            if (!bridgeInitialized || !verificationType) {
                                                return false // Show wallet screen if not initialized or no verification type
                                            }

                                            // Check if status is NOT approved
                                            const isKybNotApproved = verificationType === 'kyb' && kybStatus && kybStatus !== 'approved'
                                            const isKycNotApproved = verificationType === 'kyc' && kycStatus && kycStatus !== 'approved'

                                            // Show verification screen if status exists and is NOT approved
                                            return isKybNotApproved || isKycNotApproved
                                        })() === 'kyc_waiting' ? (
                                            /* Simple KYC Waiting Screen - No verification wrapper */
                                            <motion.div
                                                key="kyc-waiting-screen"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -20 }}
                                                transition={{ duration: 0.3 }}
                                                className="flex-1 flex flex-col items-center justify-center p-3 sm:p-4 space-y-4"
                                            >
                                                <motion.div
                                                    initial={{ scale: 0.8, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    transition={{ duration: 0.3 }}
                                                    className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center"
                                                >
                                                    <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                                                </motion.div>
                                                <div className="text-center space-y-2">
                                                    <h3 className="text-lg font-bold text-foreground">KYC Verification Pending</h3>
                                                    <p className="text-sm text-muted-foreground max-w-sm">
                                                        Your KYC information has been successfully submitted and is being reviewed.
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-3">
                                                        Please wait while we verify your identity. You will be notified once the verification is complete.
                                                    </p>
                                                </div>
                                            </motion.div>
                                        ) : (() => {
                                            // PRIORITY: If status is approved, ALWAYS show wallet screen (return false)
                                            if (bridgeInitialized && verificationType) {
                                                const isKybApproved = verificationType === 'kyb' && kybStatus === 'approved'
                                                const isKycApproved = verificationType === 'kyc' && kycStatus === 'approved'

                                                if (isKybApproved || isKycApproved) {
                                                    return false // Show wallet screen - status is approved!
                                                }
                                            }

                                            // Show verification screen only if:
                                            // 1. Bridge is initialized
                                            // 2. Verification type is set  
                                            // 3. Status is NOT approved
                                            if (!bridgeInitialized || !verificationType) {
                                                return false // Show wallet screen if not initialized or no verification type
                                            }

                                            // Check if status is NOT approved
                                            const isKybNotApproved = verificationType === 'kyb' && kybStatus && kybStatus !== 'approved'
                                            const isKycNotApproved = verificationType === 'kyc' && kycStatus && kycStatus !== 'approved'

                                            // Show verification screen if status exists and is NOT approved
                                            return isKybNotApproved || isKycNotApproved
                                        })() ? (
                                            /* Verification Required Screen */
                                            <motion.div
                                                key="verification-screen"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -20 }}
                                                transition={{ duration: 0.3 }}
                                                className="flex-1 flex flex-col items-center p-3 sm:p-4 space-y-3 sm:space-y-4 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] w-full"
                                            >
                                                <div className="text-center space-y-3 sm:space-y-4 w-full">
                                                    {/* Icon */}
                                                    <motion.div
                                                        initial={{ scale: 0.8 }}
                                                        animate={{ scale: 1 }}
                                                        transition={{ duration: 0.3, delay: 0.1 }}
                                                        className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center shadow-xl relative flex-shrink-0"
                                                    >
                                                        <Shield className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                                                        <motion.div
                                                            animate={{
                                                                scale: [1, 1.2, 1],
                                                                opacity: [0.5, 0.8, 0.5]
                                                            }}
                                                            transition={{
                                                                duration: 2,
                                                                repeat: Infinity,
                                                                ease: "easeInOut"
                                                            }}
                                                            className="absolute inset-0 rounded-full bg-amber-400/30"
                                                        />
                                                    </motion.div>

                                                    {/* Title and Description */}
                                                    <div className="space-y-1 sm:space-y-2">
                                                        <h3 className="text-lg sm:text-xl font-bold">Verification Required</h3>
                                                        <p className="text-xs sm:text-sm text-muted-foreground">
                                                            {verificationType === 'kyb'
                                                                ? 'Complete your business verification (KYB) to access all wallet features and start making transactions.'
                                                                : 'Complete your identity verification (KYC) to access all wallet features and start making transactions.'}
                                                        </p>
                                                    </div>

                                                    {/* Verification Steps */}
                                                    <div className="space-y-2 sm:space-y-3 w-full">
                                                        {/* Step 1: Terms of Service */}
                                                        <motion.div
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ duration: 0.3, delay: 0.2 }}
                                                            className={`py-3 sm:py-4 pl-2 sm:pl-3 pr-3 sm:pr-4 rounded-lg border-2 transition-all w-full ${(tosStatus === 'accepted' || tosStatus === 'approved')
                                                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-600'
                                                                    : 'bg-muted border-border'
                                                                }`}
                                                        >
                                                            {/* Title Section - Flex Layout */}
                                                            <div className="flex items-start gap-2 sm:gap-3 mb-3">
                                                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${(tosStatus === 'accepted' || tosStatus === 'approved')
                                                                        ? 'bg-green-500 text-white'
                                                                        : 'bg-muted-foreground/20 text-muted-foreground'
                                                                    }`}>
                                                                    {(tosStatus === 'accepted' || tosStatus === 'approved') ? (
                                                                        <CheckCircle2 className="h-5 w-5" />
                                                                    ) : (
                                                                        <span className="text-sm font-bold">1</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <h4 className="font-semibold text-sm text-foreground">Accept Terms of Service</h4>
                                                                        {(tosStatus === 'accepted' || tosStatus === 'approved') && (
                                                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                                        )}
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground dark:text-muted-foreground mb-0 text-left">
                                                                        Review and accept Bridge's terms of service to proceed
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* TOS Content - Full Width */}
                                                            {tosStatus !== 'accepted' && tosStatus !== 'approved' && (
                                                                <div className="w-full">
                                                                    {tosIframeUrl ? (
                                                                        <TermsOfService
                                                                            tosUrl={tosIframeUrl}
                                                                            onAccept={handleConfirmTosAcceptance}
                                                                            onCancel={() => setTosIframeUrl(null)}
                                                                            isAccepted={tosStatus === 'accepted' || tosStatus === 'approved'}
                                                                            isLoading={isLoading}
                                                                        />
                                                                    ) : (
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={handleAcceptTos}
                                                                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white dark:text-white text-xs"
                                                                            disabled={isLoading}
                                                                        >
                                                                            <FileCheck className="h-3 w-3 mr-2 text-white" />
                                                                            {isLoading ? 'Loading...' : 'Terms of Service'}
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </motion.div>

                                                        {/* Step 2: KYC/KYB Verification */}
                                                        <motion.div
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ duration: 0.3, delay: 0.3 }}
                                                            className={`py-3 sm:py-4 pl-2 sm:pl-3 pr-3 sm:pr-4 rounded-lg border-2 transition-all w-full ${(verificationType === 'kyb' ? kybStatus : kycStatus) === 'approved'
                                                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-600'
                                                                    : (tosStatus === 'accepted' || tosStatus === 'approved')
                                                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-600'
                                                                        : 'bg-muted border-border opacity-60'
                                                                }`}
                                                        >
                                                            {/* Title Section - Flex Layout */}
                                                            <div className="flex items-start gap-2 sm:gap-3 mb-3">
                                                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${(verificationType === 'kyb' ? kybStatus : kycStatus) === 'approved'
                                                                        ? 'bg-green-500 text-white'
                                                                        : (tosStatus === 'accepted' || tosStatus === 'approved')
                                                                            ? 'bg-blue-500 text-white'
                                                                            : 'bg-muted-foreground/20 text-muted-foreground'
                                                                    }`}>
                                                                    {(verificationType === 'kyb' ? kybStatus : kycStatus) === 'approved' ? (
                                                                        <CheckCircle2 className="h-5 w-5" />
                                                                    ) : (
                                                                        <span className="text-sm font-bold">2</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <h4 className="font-semibold text-sm">
                                                                            {verificationType === 'kyb' ? 'Business Verification (KYB)' : 'Identity Verification (KYC)'}
                                                                        </h4>
                                                                        {(verificationType === 'kyb' ? kybStatus : kycStatus) === 'approved' && (
                                                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                                        )}
                                                                        {/* Bridge statuses that indicate review in progress */}
                                                                        {(verificationType === 'kyb' ? kybStatus : kycStatus) !== 'approved' &&
                                                                            (verificationType === 'kyb' ? kybStatus : kycStatus) !== 'rejected' &&
                                                                            (verificationType === 'kyb' ? kybStatus : kycStatus) !== 'not_started' && (
                                                                                <Clock className="h-4 w-4 text-blue-500" />
                                                                            )}
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground mb-0 text-left">
                                                                        {verificationType === 'kyb'
                                                                            ? 'Complete business verification to verify your organization'
                                                                            : 'Complete identity verification to verify your identity'}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Form Content - Full Width */}
                                                            {(tosStatus === 'accepted' || tosStatus === 'approved') && (verificationType === 'kyb' ? kybStatus : kycStatus) !== 'approved' && (
                                                                // For KYB multi-step flow, always show form (user is completing steps)
                                                                verificationType === 'kyb' ||
                                                                // For regular KYC, show form when status is not_started, rejected, or in progress (but not approved)
                                                                (verificationType === 'kyc' && kycStatus !== 'approved')
                                                            ) && (
                                                                    <div className="space-y-2 sm:space-y-3 w-full mt-3">
                                                                        {/* Toggle between custom form and iframe */}
                                                                        <div className="flex gap-2 w-full">
                                                                            <Button
                                                                                size="sm"
                                                                                variant={useCustomKyc ? "default" : "outline"}
                                                                                onClick={() => setUseCustomKyc(true)}
                                                                                className={`flex-1 text-xs ${useCustomKyc
                                                                                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
                                                                                        : 'border-border'
                                                                                    }`}
                                                                            >
                                                                                Custom Form
                                                                            </Button>
                                                                            <Button
                                                                                size="sm"
                                                                                variant={!useCustomKyc ? "default" : "outline"}
                                                                                onClick={() => setUseCustomKyc(false)}
                                                                                className={`flex-1 text-xs ${!useCustomKyc
                                                                                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
                                                                                        : 'border-border'
                                                                                    }`}
                                                                            >
                                                                                Bridge Widget
                                                                            </Button>
                                                                        </div>

                                                                        {useCustomKyc ? (
                                                                            /* Custom KYC/KYB Form */
                                                                            <div className="space-y-2 sm:space-y-3 max-h-[250px] sm:max-h-[350px] overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] w-full -mx-0">
                                                                                {verificationType === 'kyc' ? (
                                                                                    // Show waiting screen until KYC is approved
                                                                                    // Show waiting screen if:
                                                                                    // 1. KYC has been submitted (kycSubmitted flag is true), OR
                                                                                    // 2. Status is not not_started, not approved, and not rejected
                                                                                    // Only show form when status is not_started (initial) and NOT submitted, or rejected (needs resubmission)
                                                                                    (kycSubmitted || (kycStatus !== 'not_started' && kycStatus !== 'approved' && kycStatus !== 'rejected')) ? (
                                                                                        /* KYC Waiting Screen */
                                                                                        <div className="flex flex-col items-center justify-center py-8 px-4 space-y-4 w-full">
                                                                                            <motion.div
                                                                                                initial={{ scale: 0.8, opacity: 0 }}
                                                                                                animate={{ scale: 1, opacity: 1 }}
                                                                                                transition={{ duration: 0.3 }}
                                                                                                className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center"
                                                                                            >
                                                                                                <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                                                                                            </motion.div>
                                                                                            <div className="text-center space-y-2">
                                                                                                <h3 className="text-lg font-bold text-foreground">KYC Verification Pending</h3>
                                                                                                <p className="text-sm text-muted-foreground max-w-sm">
                                                                                                    Your KYC information has been successfully submitted and is being reviewed.
                                                                                                </p>
                                                                                                <p className="text-xs text-muted-foreground mt-3">
                                                                                                    Please wait while we verify your identity. You will be notified once the verification is complete.
                                                                                                </p>
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <KYCForm
                                                                                            formData={kycFormData}
                                                                                            isLoading={isLoading}
                                                                                            onFormDataChange={setKycFormData}
                                                                                            onSubmit={handleSubmitCustomKyc}
                                                                                            kycStatus={kycStatus}
                                                                                            kycSubmitted={kycSubmitted}
                                                                                        />
                                                                                    )
                                                                                ) : verificationType === 'kyb' ? (
                                                                                    /* Business KYB Multi-Step Form */
                                                                                    <>
                                                                                        {/* Step Indicator with Labels */}
                                                                                        <div className="mb-3 space-y-2">
                                                                                            <div className="flex items-center gap-1">
                                                                                                {/* Step 1 */}
                                                                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                                                                    {(() => {
                                                                                                        // Check if control person documents are rejected
                                                                                                        const hasRejectedControlPersonDocs = documentStatuses.id_front === 'rejected' || documentStatuses.id_back === 'rejected'
                                                                                                        // Only show checkmark if we've moved past step 1 AND no documents are rejected
                                                                                                        const shouldShowCheckmark = (kybStep === 'business_documents' || kybStep === 'kyc_verification') && !hasRejectedControlPersonDocs
                                                                                                        
                                                                                                        return (
                                                                                                            <>
                                                                                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-200 ${kybStep === 'control_person'
                                                                                                                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                                                                                                                        : shouldShowCheckmark
                                                                                                                            ? 'bg-green-500 text-white'
                                                                                                                            : hasRejectedControlPersonDocs
                                                                                                                                ? 'bg-red-500 text-white'
                                                                                                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                                                                                                    }`}>
                                                                                                                    {shouldShowCheckmark ? (
                                                                                                                        <CheckCircle2 className="h-3 w-3" />
                                                                                                                    ) : hasRejectedControlPersonDocs ? (
                                                                                                                        <AlertCircle className="h-3 w-3" />
                                                                                                                    ) : (
                                                                                                                        '1'
                                                                                                                    )}
                                                                                                                </div>
                                                                                                                <span className={`text-[10px] font-medium whitespace-nowrap hidden sm:inline ${kybStep === 'control_person'
                                                                                                                        ? 'text-blue-600 dark:text-blue-400'
                                                                                                                        : shouldShowCheckmark
                                                                                                                            ? 'text-green-600 dark:text-green-400'
                                                                                                                            : hasRejectedControlPersonDocs
                                                                                                                                ? 'text-red-600 dark:text-red-400'
                                                                                                                                : 'text-gray-500 dark:text-gray-400'
                                                                                                                    }`}>
                                                                                                                    Control Person
                                                                                                                </span>
                                                                                                            </>
                                                                                                        )
                                                                                                    })()}
                                                                                                </div>

                                                                                                {/* Connector 1 */}
                                                                                                <div className={`flex-1 h-0.5 rounded-full transition-all duration-200 ${kybStep === 'business_documents' || kybStep === 'kyc_verification'
                                                                                                        ? 'bg-green-500'
                                                                                                        : 'bg-gray-200 dark:bg-gray-700'
                                                                                                    }`}></div>

                                                                                                {/* Step 2 */}
                                                                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-200 ${kybStep === 'business_documents'
                                                                                                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                                                                                                            : (kybStep === 'kyc_verification' || businessDocumentsSubmitted ||
                                                                                                                (documentStatuses.business_formation === 'pending' ||
                                                                                                                    documentStatuses.business_ownership === 'pending' ||
                                                                                                                    documentStatuses.business_formation === 'approved' ||
                                                                                                                    documentStatuses.business_ownership === 'approved'))
                                                                                                                ? 'bg-green-500 text-white'
                                                                                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                                                                                        }`}>
                                                                                                        {(kybStep === 'kyc_verification' || businessDocumentsSubmitted ||
                                                                                                            documentStatuses.business_formation === 'pending' ||
                                                                                                            documentStatuses.business_ownership === 'pending' ||
                                                                                                            documentStatuses.business_formation === 'approved' ||
                                                                                                            documentStatuses.business_ownership === 'approved') ? (
                                                                                                            <CheckCircle2 className="h-3 w-3" />
                                                                                                        ) : (
                                                                                                            '2'
                                                                                                        )}
                                                                                                    </div>
                                                                                                    <span className={`text-[10px] font-medium whitespace-nowrap hidden sm:inline ${kybStep === 'business_documents'
                                                                                                            ? 'text-blue-600 dark:text-blue-400'
                                                                                                            : (kybStep === 'kyc_verification' || businessDocumentsSubmitted ||
                                                                                                                documentStatuses.business_formation === 'pending' ||
                                                                                                                documentStatuses.business_ownership === 'pending' ||
                                                                                                                documentStatuses.business_formation === 'approved' ||
                                                                                                                documentStatuses.business_ownership === 'approved')
                                                                                                                ? 'text-green-600 dark:text-green-400'
                                                                                                                : 'text-gray-500 dark:text-gray-400'
                                                                                                        }`}>
                                                                                                        Documents
                                                                                                    </span>
                                                                                                </div>

                                                                                                {/* Connector 2 */}
                                                                                                <div className={`flex-1 h-0.5 rounded-full transition-all duration-200 ${kybStep === 'kyc_verification'
                                                                                                        ? 'bg-green-500'
                                                                                                        : (kybSubmissionStatus === 'approved' || businessDocumentsSubmitted ||
                                                                                                            documentStatuses.business_formation === 'pending' ||
                                                                                                            documentStatuses.business_ownership === 'pending' ||
                                                                                                            documentStatuses.business_formation === 'approved' ||
                                                                                                            documentStatuses.business_ownership === 'approved')
                                                                                                            ? 'bg-green-500'
                                                                                                            : 'bg-gray-200 dark:bg-gray-700'
                                                                                                    }`}></div>

                                                                                                {/* Step 3 */}
                                                                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-200 ${kybStep === 'kyc_verification'
                                                                                                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                                                                                                            : (kybSubmissionStatus === 'approved' ||
                                                                                                                (documentStatuses.business_formation === 'approved' &&
                                                                                                                    documentStatuses.business_ownership === 'approved'))
                                                                                                                ? 'bg-green-500 text-white'
                                                                                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                                                                                        }`}>
                                                                                                        {kybStep === 'kyc_verification' ? (
                                                                                                            <CheckCircle2 className="h-3 w-3" />
                                                                                                        ) : (kybSubmissionStatus === 'approved' ||
                                                                                                            (documentStatuses.business_formation === 'approved' &&
                                                                                                                documentStatuses.business_ownership === 'approved')) ? (
                                                                                                            <CheckCircle2 className="h-3 w-3" />
                                                                                                        ) : (
                                                                                                            '3'
                                                                                                        )}
                                                                                                    </div>
                                                                                                    <span className={`text-[10px] font-medium whitespace-nowrap hidden sm:inline ${kybStep === 'kyc_verification'
                                                                                                            ? 'text-blue-600 dark:text-blue-400'
                                                                                                            : (kybSubmissionStatus === 'approved' ||
                                                                                                                (documentStatuses.business_formation === 'approved' &&
                                                                                                                    documentStatuses.business_ownership === 'approved'))
                                                                                                                ? 'text-green-600 dark:text-green-400'
                                                                                                                : 'text-gray-500 dark:text-gray-400'
                                                                                                        }`}>
                                                                                                        KYC Verify
                                                                                                    </span>
                                                                                                </div>
                                                                                            </div>

                                                                                            {/* Step Labels (Mobile) */}
                                                                                            <div className="sm:hidden text-center">
                                                                                                <p className={`text-[10px] font-medium ${kybStep === 'control_person'
                                                                                                        ? 'text-blue-600 dark:text-blue-400'
                                                                                                        : kybStep === 'business_documents'
                                                                                                            ? 'text-blue-600 dark:text-blue-400'
                                                                                                            : 'text-blue-600 dark:text-blue-400'
                                                                                                    }`}>
                                                                                                    {kybStep === 'control_person' && 'Step 1: Control Person'}
                                                                                                    {kybStep === 'business_documents' && 'Step 2: Business Documents'}
                                                                                                    {kybStep === 'kyc_verification' && 'Step 3: KYC Verification'}
                                                                                                </p>
                                                                                            </div>
                                                                                        </div>

                                                                                        {/* Step 1: Control Person */}
                                                                                        {kybStep === 'control_person' && (
                                                                                            <>
                                                                                                {/* Show refill message banner if admin requested re-fill */}
                                                                                                {(refillMessage || (requestedFields && requestedFields.length > 0)) && (
                                                                                                    <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                                                                                        <div className="flex items-start gap-2 text-left">
                                                                                                            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                                                                                            <div className="flex-1 text-left">
                                                                                                                <p className="text-xs font-semibold text-amber-900 dark:text-amber-100 mb-1 text-left">
                                                                                                                    Admin Request: Please Re-fill the Following Fields
                                                                                                                </p>
                                                                                                                {refillMessage && (
                                                                                                                    <p className="text-xs text-amber-800 dark:text-amber-200 mb-2 text-left">
                                                                                                                        {refillMessage}
                                                                                                                    </p>
                                                                                                                )}
                                                                                                                {requestedFields && requestedFields.length > 0 && (
                                                                                                                    <div className="mt-2 text-left">
                                                                                                                        <p className="text-xs font-medium text-amber-900 dark:text-amber-100 mb-1 text-left">
                                                                                                                            Requested Fields ({requestedFields.length}):
                                                                                                                        </p>
                                                                                                                        <div className="flex flex-wrap gap-1 text-left">
                                                                                                                            {requestedFields.map((field, idx) => (
                                                                                                                                <span key={`control-person-field-${idx}-${String(field || 'empty').replace(/\s+/g, '-')}`} className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 rounded">
                                                                                                                                    {field}
                                                                                                                                </span>
                                                                                                                            ))}
                                                                                                                        </div>
                                                                                                                    </div>
                                                                                                                )}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}

                                                                                                {/* Check if ID documents are submitted and pending approval - show waiting screen */}
                                                                                                {(() => {
                                                                                                    // Check if there are any rejected ID documents that need re-upload
                                                                                                    const hasRejectedIdDocs = documentStatuses.id_front === 'rejected' || documentStatuses.id_back === 'rejected'
                                                                                                    
                                                                                                    // Check if ID documents are in pending or approved state (submitted)
                                                                                                    const hasPendingOrApprovedIdDocs = documentStatuses.id_front === 'pending' ||
                                                                                                        documentStatuses.id_back === 'pending' ||
                                                                                                        documentStatuses.id_front === 'approved' ||
                                                                                                        documentStatuses.id_back === 'approved'

                                                                                                    // Show waiting screen if:
                                                                                                    // 1. We're on the control_person step
                                                                                                    // 2. Control person has been submitted (controlPersonSubmitted flag OR documents are pending/approved)
                                                                                                    // 3. No documents are currently rejected (if rejected, show form for re-upload)
                                                                                                    const shouldShowWaitingScreen = controlPersonSubmitted && 
                                                                                                        hasPendingOrApprovedIdDocs && 
                                                                                                        !hasRejectedIdDocs

                                                                                                    if (shouldShowWaitingScreen) {
                                                                                                        return (
                                                                                                            <div className="space-y-4">
                                                                                                                {/* Waiting for Approval Screen */}
                                                                                                                <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-center">
                                                                                                                    <div className="flex flex-col items-center gap-3">
                                                                                                                        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center animate-pulse">
                                                                                                                            <Loader2 className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin" />
                                                                                                                        </div>
                                                                                                                        <div>
                                                                                                                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                                                                                                                Waiting for Admin Review
                                                                                                                            </h3>
                                                                                                                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                                                                                                                Your ID documents have been successfully submitted and are awaiting admin approval.
                                                                                                                            </p>
                                                                                                                        </div>
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        )
                                                                                                    }

                                                                                                    // Show form fields if waiting screen is NOT showing
                                                                                                    return null
                                                                                                })()}

                                                                                                {/* Only show form fields if NOT showing waiting screen */}
                                                                                                {(() => {
                                                                                                    // Check if waiting screen should be shown
                                                                                                    const hasRejectedIdDocs = documentStatuses.id_front === 'rejected' || documentStatuses.id_back === 'rejected'
                                                                                                    const hasPendingOrApprovedIdDocs = documentStatuses.id_front === 'pending' ||
                                                                                                        documentStatuses.id_back === 'pending' ||
                                                                                                        documentStatuses.id_front === 'approved' ||
                                                                                                        documentStatuses.id_back === 'approved'
                                                                                                    const shouldShowWaitingScreen = controlPersonSubmitted && 
                                                                                                        hasPendingOrApprovedIdDocs && 
                                                                                                        !hasRejectedIdDocs
                                                                                                    
                                                                                                    // Don't show form if waiting screen is showing
                                                                                                    if (shouldShowWaitingScreen) {
                                                                                                        return null
                                                                                                    }
                                                                                                    
                                                                                                    return (
                                                                                                        <>
                                                                                                {/* Display business info (read-only) from organization */}
                                                                                                {shouldShowField('business_name') || shouldShowField('email') || shouldShowField('ein') || shouldShowField('street_line_1') ? (
                                                                                                    <div className="mb-3 p-2 bg-muted/50 rounded-lg border border-border">
                                                                                                        <p className="text-xs font-semibold mb-2 text-left">Business Information (from your organization profile)</p>
                                                                                                        <div className="space-y-1 text-xs text-muted-foreground text-left">
                                                                                                            {shouldShowField('business_name') && <p><span className="font-medium">Business Name:</span> {kybFormData.business_name || 'N/A'}</p>}
                                                                                                            {shouldShowField('email') && <p><span className="font-medium">Email:</span> {kybFormData.email || 'N/A'}</p>}
                                                                                                            {shouldShowField('ein') && <p><span className="font-medium">EIN:</span> {kybFormData.ein || 'N/A'}</p>}
                                                                                                            {shouldShowField('street_line_1') && <p><span className="font-medium">Address:</span> {[kybFormData.street_line_1, kybFormData.city, kybFormData.subdivision, kybFormData.postal_code].filter(Boolean).join(', ') || 'N/A'}</p>}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                ) : null}

                                                                                                <div className="border-t border-border pt-3 mt-3">
                                                                                                    {(() => {
                                                                                                        // Check if only ID-related fields are rejected/requested
                                                                                                        const idRelatedFields = [
                                                                                                            'control_person.id_type',
                                                                                                            'control_person.id_number',
                                                                                                            'control_person.id_front_image',
                                                                                                            'control_person.id_back_image'
                                                                                                        ]
                                                                                                        const hasRejectedIdDocs = documentStatuses.id_front === 'rejected' || documentStatuses.id_back === 'rejected'
                                                                                                        const hasOnlyIdFieldsRequested = requestedFields.length > 0 && 
                                                                                                            requestedFields.every((field: string) => idRelatedFields.includes(field))
                                                                                                        const isOnlyIdRejection = hasRejectedIdDocs && 
                                                                                                            (!requestedFields || requestedFields.length === 0 || hasOnlyIdFieldsRequested)
                                                                                                        
                                                                                                        return (
                                                                                                            <>
                                                                                                                <p className="text-xs font-semibold mb-2 text-left">
                                                                                                                    {isOnlyIdRejection 
                                                                                                                        ? 'ID Document Information *' 
                                                                                                                        : 'Step 1: Control Person (Beneficial Owner) Information *'}
                                                                                                                </p>
                                                                                                                <p className="text-xs text-muted-foreground mb-3 text-left">
                                                                                                                    {isOnlyIdRejection
                                                                                                                        ? 'Please update your ID information and re-upload the rejected document(s).'
                                                                                                                        : requestedFields.length > 0
                                                                                                                            ? 'Please re-fill the requested fields below.'
                                                                                                                            : 'Required by Bridge for business verification'}
                                                                                                                </p>
                                                                                                            </>
                                                                                                        )
                                                                                                    })()}

                                                                                                    {/* Control Person Fields */}
                                                                                                    <div className="space-y-2 sm:space-y-3">
                                                                                                        {(() => {
                                                                                                            // Check if only ID-related fields are rejected/requested
                                                                                                            const idRelatedFields = [
                                                                                                                'control_person.id_type',
                                                                                                                'control_person.id_number',
                                                                                                                'control_person.id_front_image',
                                                                                                                'control_person.id_back_image'
                                                                                                            ]
                                                                                                            const hasRejectedIdDocs = documentStatuses.id_front === 'rejected' || documentStatuses.id_back === 'rejected'
                                                                                                            const hasOnlyIdFieldsRequested = requestedFields.length > 0 && 
                                                                                                                requestedFields.every((field: string) => idRelatedFields.includes(field))
                                                                                                            const isOnlyIdRejection = hasRejectedIdDocs && 
                                                                                                                (!requestedFields || requestedFields.length === 0 || hasOnlyIdFieldsRequested)
                                                                                                            
                                                                                                            // If only ID rejection, show only ID fields; otherwise show all requested fields
                                                                                                            if (isOnlyIdRejection) {
                                                                                                                return (
                                                                                                                    <>
                                                                                                                        {/* ID Type - Always show when ID docs are rejected */}
                                                                                                                        <div>
                                                                                                                            <label className="text-xs font-medium mb-1 block text-left">ID Type *</label>
                                                                                                                            <select
                                                                                                                                value={kybFormData.control_person.id_type}
                                                                                                                                onChange={(e) => {
                                                                                                                                    const newIdType = e.target.value
                                                                                                                                    setKybFormData(prev => ({
                                                                                                                                        ...prev,
                                                                                                                                        control_person: {
                                                                                                                                            ...prev.control_person,
                                                                                                                                            id_type: newIdType,
                                                                                                                                            id_back_image: newIdType !== 'drivers_license' ? '' : prev.control_person.id_back_image
                                                                                                                                        }
                                                                                                                                    }))
                                                                                                                                    if (newIdType !== 'drivers_license' && controlPersonErrors.id_back_image) {
                                                                                                                                        setControlPersonErrors(prev => {
                                                                                                                                            const newErrors = { ...prev }
                                                                                                                                            delete newErrors.id_back_image
                                                                                                                                            return newErrors
                                                                                                                                        })
                                                                                                                                    }
                                                                                                                                    if (controlPersonErrors.id_type) {
                                                                                                                                        setControlPersonErrors(prev => {
                                                                                                                                            const newErrors = { ...prev }
                                                                                                                                            delete newErrors.id_type
                                                                                                                                            return newErrors
                                                                                                                                        })
                                                                                                                                    }
                                                                                                                                }}
                                                                                                                                className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground ${controlPersonErrors.id_type ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'}`}
                                                                                                                            >
                                                                                                                                <option value="">Select ID Type...</option>
                                                                                                                                <option value="drivers_license">Driver's License</option>
                                                                                                                                <option value="passport">Passport</option>
                                                                                                                            </select>
                                                                                                                            {controlPersonErrors.id_type && (
                                                                                                                                <p className="text-xs text-red-500 mt-1">{controlPersonErrors.id_type}</p>
                                                                                                                            )}
                                                                                                                        </div>
                                                                                                                        
                                                                                                                        {/* ID Number - Always show when ID docs are rejected */}
                                                                                                                        <div>
                                                                                                                            <label className="text-xs font-medium mb-1 block text-left">ID Number *</label>
                                                                                                                            <input
                                                                                                                                type="text"
                                                                                                                                value={kybFormData.control_person.id_number}
                                                                                                                                onChange={(e) => {
                                                                                                                                    setKybFormData({
                                                                                                                                        ...kybFormData,
                                                                                                                                        control_person: { ...kybFormData.control_person, id_number: e.target.value }
                                                                                                                                    })
                                                                                                                                    if (controlPersonErrors.id_number) {
                                                                                                                                        setControlPersonErrors(prev => {
                                                                                                                                            const newErrors = { ...prev }
                                                                                                                                            delete newErrors.id_number
                                                                                                                                            return newErrors
                                                                                                                                        })
                                                                                                                                    }
                                                                                                                                }}
                                                                                                                                className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground ${controlPersonErrors.id_number ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'}`}
                                                                                                                                placeholder="ID Number"
                                                                                                                            />
                                                                                                                            {controlPersonErrors.id_number && (
                                                                                                                                <p className="text-xs text-red-500 mt-1">{controlPersonErrors.id_number}</p>
                                                                                                                            )}
                                                                                                                        </div>
                                                                                                                        
                                                                                                                        {/* ID Image Upload Fields */}
                                                                                                                        <div className={kybFormData.control_person.id_type === 'drivers_license' ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "space-y-3"}>
                                                                                                                            {/* ID Front Image */}
                                                                                                                            {(shouldShowField('control_person.id_front_image') || documentStatuses.id_front === 'rejected') && (
                                                                                                                                documentStatuses.id_front === 'approved' ? (
                                                                                                                                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                                                                                                                        <div className="flex items-center gap-2">
                                                                                                                                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                                                                                                            <p className="text-xs text-green-900 dark:text-green-100">
                                                                                                                                                {kybFormData.control_person.id_type === 'drivers_license' ? 'ID Front Image' : 'Passport Image'} has been approved.
                                                                                                                                            </p>
                                                                                                                                        </div>
                                                                                                                                    </div>
                                                                                                                                ) : (documentStatuses.id_front === 'rejected' || shouldShowField('control_person.id_front_image')) && (
                                                                                                                                    <div>
                                                                                                                                        {documentStatuses.id_front === 'rejected' && (
                                                                                                                                            <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-800 dark:text-red-200">
                                                                                                                                                <strong>Document Rejected:</strong> {documentRejectionReasons.id_front || 'Please re-upload the ' + (kybFormData.control_person.id_type === 'drivers_license' ? 'ID Front Image' : 'Passport Image') + '.'}
                                                                                                                                            </div>
                                                                                                                                        )}
                                                                                                                                        <ImageUploadDropzone
                                                                                                                                            label={kybFormData.control_person.id_type === 'drivers_license' ? "ID Front Image *" : "Passport Image *"}
                                                                                                                                            value={kybFormData.control_person.id_front_image}
                                                                                                                                            onChange={(base64) => {
                                                                                                                                                setKybFormData({
                                                                                                                                                    ...kybFormData,
                                                                                                                                                    control_person: { ...kybFormData.control_person, id_front_image: base64 }
                                                                                                                                                })
                                                                                                                                                if (controlPersonErrors.id_front_image) {
                                                                                                                                                    setControlPersonErrors(prev => {
                                                                                                                                                        const newErrors = { ...prev }
                                                                                                                                                        delete newErrors.id_front_image
                                                                                                                                                        return newErrors
                                                                                                                                                    })
                                                                                                                                                }
                                                                                                                                            }}
                                                                                                                                            required={true}
                                                                                                                                            maxSizeMB={5}
                                                                                                                                        />
                                                                                                                                        {controlPersonErrors.id_front_image && (
                                                                                                                                            <p className="text-xs text-red-500 mt-1">{controlPersonErrors.id_front_image}</p>
                                                                                                                                        )}
                                                                                                                                    </div>
                                                                                                                                )
                                                                                                                            )}
                                                                                                                            
                                                                                                                            {/* ID Back Image - Only for Driver's License */}
                                                                                                                            {kybFormData.control_person.id_type === 'drivers_license' && (shouldShowField('control_person.id_back_image') || documentStatuses.id_back === 'rejected') && (
                                                                                                                                documentStatuses.id_back === 'approved' ? (
                                                                                                                                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                                                                                                                        <div className="flex items-center gap-2">
                                                                                                                                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                                                                                                            <p className="text-xs text-green-900 dark:text-green-100">
                                                                                                                                                ID Back Image has been approved.
                                                                                                                                            </p>
                                                                                                                                        </div>
                                                                                                                                    </div>
                                                                                                                                ) : (documentStatuses.id_back === 'rejected' || shouldShowField('control_person.id_back_image')) && (
                                                                                                                                    <div>
                                                                                                                                        {documentStatuses.id_back === 'rejected' && (
                                                                                                                                            <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-800 dark:text-red-200">
                                                                                                                                                <strong>Document Rejected:</strong> {documentRejectionReasons.id_back || 'Please re-upload the ID Back Image.'}
                                                                                                                                            </div>
                                                                                                                                        )}
                                                                                                                                        <ImageUploadDropzone
                                                                                                                                            label="ID Back Image *"
                                                                                                                                            value={kybFormData.control_person.id_back_image}
                                                                                                                                            onChange={(base64) => {
                                                                                                                                                setKybFormData({
                                                                                                                                                    ...kybFormData,
                                                                                                                                                    control_person: { ...kybFormData.control_person, id_back_image: base64 }
                                                                                                                                                })
                                                                                                                                                if (controlPersonErrors.id_back_image) {
                                                                                                                                                    setControlPersonErrors(prev => {
                                                                                                                                                        const newErrors = { ...prev }
                                                                                                                                                        delete newErrors.id_back_image
                                                                                                                                                        return newErrors
                                                                                                                                                    })
                                                                                                                                                }
                                                                                                                                            }}
                                                                                                                                            required={true}
                                                                                                                                            maxSizeMB={5}
                                                                                                                                        />
                                                                                                                                        {controlPersonErrors.id_back_image && (
                                                                                                                                            <p className="text-xs text-red-500 mt-1">{controlPersonErrors.id_back_image}</p>
                                                                                                                                        )}
                                                                                                                                    </div>
                                                                                                                                )
                                                                                                                            )}
                                                                                                                        </div>
                                                                                                                    </>
                                                                                                                )
                                                                                                            }
                                                                                                            
                                                                                                            // Otherwise, show all requested fields (normal flow)
                                                                                                            return null
                                                                                                        })()}
                                                                                                        
                                                                                                        {/* Show other control person fields only if NOT an ID-only rejection */}
                                                                                                        {(() => {
                                                                                                            const idRelatedFields = [
                                                                                                                'control_person.id_type',
                                                                                                                'control_person.id_number',
                                                                                                                'control_person.id_front_image',
                                                                                                                'control_person.id_back_image'
                                                                                                            ]
                                                                                                            const hasRejectedIdDocs = documentStatuses.id_front === 'rejected' || documentStatuses.id_back === 'rejected'
                                                                                                            const hasOnlyIdFieldsRequested = requestedFields.length > 0 && 
                                                                                                                requestedFields.every((field: string) => idRelatedFields.includes(field))
                                                                                                            const isOnlyIdRejection = hasRejectedIdDocs && 
                                                                                                                (!requestedFields || requestedFields.length === 0 || hasOnlyIdFieldsRequested)
                                                                                                            
                                                                                                            // Don't show other fields if it's an ID-only rejection
                                                                                                            if (isOnlyIdRejection) {
                                                                                                                return null
                                                                                                            }
                                                                                                            
                                                                                                            return (
                                                                                                                <>
                                                                                                                    {(shouldShowField('control_person.first_name') || shouldShowField('control_person.last_name')) && (
                                                                                                            <div className="grid grid-cols-2 gap-2">
                                                                                                                {shouldShowField('control_person.first_name') && (
                                                                                                                    <div>
                                                                                                                        <label className="text-xs font-medium mb-1 block text-left">First Name *</label>
                                                                                                                        <input
                                                                                                                            type="text"
                                                                                                                            value={kybFormData.control_person.first_name}
                                                                                                                            onChange={(e) => {
                                                                                                                                setKybFormData({
                                                                                                                                    ...kybFormData,
                                                                                                                                    control_person: { ...kybFormData.control_person, first_name: e.target.value }
                                                                                                                                })
                                                                                                                                // Clear error when user starts typing
                                                                                                                                if (controlPersonErrors.first_name) {
                                                                                                                                    setControlPersonErrors(prev => {
                                                                                                                                        const newErrors = { ...prev }
                                                                                                                                        delete newErrors.first_name
                                                                                                                                        return newErrors
                                                                                                                                    })
                                                                                                                                }
                                                                                                                            }}
                                                                                                                            className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground ${controlPersonErrors.first_name ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'
                                                                                                                                }`}
                                                                                                                            placeholder="John"
                                                                                                                        />
                                                                                                                        {controlPersonErrors.first_name && (
                                                                                                                            <p className="text-xs text-red-500 mt-1">{controlPersonErrors.first_name}</p>
                                                                                                                        )}
                                                                                                                    </div>
                                                                                                                )}
                                                                                                                {shouldShowField('control_person.last_name') && (
                                                                                                                    <div>
                                                                                                                        <label className="text-xs font-medium mb-1 block text-left">Last Name *</label>
                                                                                                                        <input
                                                                                                                            type="text"
                                                                                                                            value={kybFormData.control_person.last_name}
                                                                                                                            onChange={(e) => {
                                                                                                                                setKybFormData({
                                                                                                                                    ...kybFormData,
                                                                                                                                    control_person: { ...kybFormData.control_person, last_name: e.target.value }
                                                                                                                                })
                                                                                                                                if (controlPersonErrors.last_name) {
                                                                                                                                    setControlPersonErrors(prev => {
                                                                                                                                        const newErrors = { ...prev }
                                                                                                                                        delete newErrors.last_name
                                                                                                                                        return newErrors
                                                                                                                                    })
                                                                                                                                }
                                                                                                                            }}
                                                                                                                            className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground ${controlPersonErrors.last_name ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'
                                                                                                                                }`}
                                                                                                                            placeholder="Doe"
                                                                                                                        />
                                                                                                                        {controlPersonErrors.last_name && (
                                                                                                                            <p className="text-xs text-red-500 mt-1">{controlPersonErrors.last_name}</p>
                                                                                                                        )}
                                                                                                                    </div>
                                                                                                                )}
                                                                                                            </div>
                                                                                                        )}
                                                                                                        {shouldShowField('control_person.email') && (
                                                                                                            <div>
                                                                                                                <label className="text-xs font-medium mb-1 block text-left">Email *</label>
                                                                                                                <input
                                                                                                                    type="email"
                                                                                                                    value={kybFormData.control_person.email}
                                                                                                                    onChange={(e) => {
                                                                                                                        setKybFormData({
                                                                                                                            ...kybFormData,
                                                                                                                            control_person: { ...kybFormData.control_person, email: e.target.value }
                                                                                                                        })
                                                                                                                        if (controlPersonErrors.email) {
                                                                                                                            setControlPersonErrors(prev => {
                                                                                                                                const newErrors = { ...prev }
                                                                                                                                delete newErrors.email
                                                                                                                                return newErrors
                                                                                                                            })
                                                                                                                        }
                                                                                                                    }}
                                                                                                                    className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground ${controlPersonErrors.email ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'
                                                                                                                        }`}
                                                                                                                    placeholder="john@example.com"
                                                                                                                />
                                                                                                                {controlPersonErrors.email && (
                                                                                                                    <p className="text-xs text-red-500 mt-1">{controlPersonErrors.email}</p>
                                                                                                                )}
                                                                                                            </div>
                                                                                                        )}
                                                                                                        {(shouldShowField('control_person.birth_date') || shouldShowField('control_person.ssn')) && (
                                                                                                            <div className="grid grid-cols-2 gap-2">
                                                                                                                {shouldShowField('control_person.birth_date') && (
                                                                                                                    <div>
                                                                                                                        <label className="text-xs font-medium mb-1 block text-left">Date of Birth *</label>
                                                                                                                        <input
                                                                                                                            type="date"
                                                                                                                            value={kybFormData.control_person.birth_date}
                                                                                                                            onChange={(e) => {
                                                                                                                                setKybFormData({
                                                                                                                                    ...kybFormData,
                                                                                                                                    control_person: { ...kybFormData.control_person, birth_date: e.target.value }
                                                                                                                                })
                                                                                                                                if (controlPersonErrors.birth_date) {
                                                                                                                                    setControlPersonErrors(prev => {
                                                                                                                                        const newErrors = { ...prev }
                                                                                                                                        delete newErrors.birth_date
                                                                                                                                        return newErrors
                                                                                                                                    })
                                                                                                                                }
                                                                                                                            }}
                                                                                                                            className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground ${controlPersonErrors.birth_date ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'
                                                                                                                                }`}
                                                                                                                        />
                                                                                                                        {controlPersonErrors.birth_date && (
                                                                                                                            <p className="text-xs text-red-500 mt-1">{controlPersonErrors.birth_date}</p>
                                                                                                                        )}
                                                                                                                    </div>
                                                                                                                )}
                                                                                                                {shouldShowField('control_person.ssn') && (
                                                                                                                    <div>
                                                                                                                        <label className="text-xs font-medium mb-1 block text-left">SSN *</label>
                                                                                                                        <input
                                                                                                                            type="text"
                                                                                                                            value={kybFormData.control_person.ssn}
                                                                                                                            onChange={(e) => {
                                                                                                                                setKybFormData({
                                                                                                                                    ...kybFormData,
                                                                                                                                    control_person: { ...kybFormData.control_person, ssn: e.target.value }
                                                                                                                                })
                                                                                                                                if (controlPersonErrors.ssn) {
                                                                                                                                    setControlPersonErrors(prev => {
                                                                                                                                        const newErrors = { ...prev }
                                                                                                                                        delete newErrors.ssn
                                                                                                                                        return newErrors
                                                                                                                                    })
                                                                                                                                }
                                                                                                                            }}
                                                                                                                            className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground ${controlPersonErrors.ssn ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'
                                                                                                                                }`}
                                                                                                                            placeholder="123-45-6789"
                                                                                                                        />
                                                                                                                        {controlPersonErrors.ssn && (
                                                                                                                            <p className="text-xs text-red-500 mt-1">{controlPersonErrors.ssn}</p>
                                                                                                                        )}
                                                                                                                    </div>
                                                                                                                )}
                                                                                                            </div>
                                                                                                        )}
                                                                                                        {(shouldShowField('control_person.title') || shouldShowField('control_person.ownership_percentage')) && (
                                                                                                            <div className="grid grid-cols-2 gap-2">
                                                                                                                {shouldShowField('control_person.title') && (
                                                                                                                    <div>
                                                                                                                        <label className="text-xs font-medium mb-1 block text-left">Title *</label>
                                                                                                                        <input
                                                                                                                            type="text"
                                                                                                                            value={kybFormData.control_person.title}
                                                                                                                            onChange={(e) => {
                                                                                                                                setKybFormData({
                                                                                                                                    ...kybFormData,
                                                                                                                                    control_person: { ...kybFormData.control_person, title: e.target.value }
                                                                                                                                })
                                                                                                                                if (controlPersonErrors.title) {
                                                                                                                                    setControlPersonErrors(prev => {
                                                                                                                                        const newErrors = { ...prev }
                                                                                                                                        delete newErrors.title
                                                                                                                                        return newErrors
                                                                                                                                    })
                                                                                                                                }
                                                                                                                            }}
                                                                                                                            className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground ${controlPersonErrors.title ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'
                                                                                                                                }`}
                                                                                                                            placeholder="CEO, President, etc."
                                                                                                                        />
                                                                                                                        {controlPersonErrors.title && (
                                                                                                                            <p className="text-xs text-red-500 mt-1">{controlPersonErrors.title}</p>
                                                                                                                        )}
                                                                                                                    </div>
                                                                                                                )}
                                                                                                                {shouldShowField('control_person.ownership_percentage') && (
                                                                                                                    <div>
                                                                                                                        <label className="text-xs font-medium mb-1 block text-left">Ownership % *</label>
                                                                                                                        <input
                                                                                                                            type="number"
                                                                                                                            min="0"
                                                                                                                            max="100"
                                                                                                                            value={kybFormData.control_person.ownership_percentage}
                                                                                                                            onChange={(e) => {
                                                                                                                                setKybFormData({
                                                                                                                                    ...kybFormData,
                                                                                                                                    control_person: { ...kybFormData.control_person, ownership_percentage: e.target.value }
                                                                                                                                })
                                                                                                                                if (controlPersonErrors.ownership_percentage) {
                                                                                                                                    setControlPersonErrors(prev => {
                                                                                                                                        const newErrors = { ...prev }
                                                                                                                                        delete newErrors.ownership_percentage
                                                                                                                                        return newErrors
                                                                                                                                    })
                                                                                                                                }
                                                                                                                            }}
                                                                                                                            className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground ${controlPersonErrors.ownership_percentage ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'
                                                                                                                                }`}
                                                                                                                            placeholder="50"
                                                                                                                        />
                                                                                                                        {controlPersonErrors.ownership_percentage && (
                                                                                                                            <p className="text-xs text-red-500 mt-1">{controlPersonErrors.ownership_percentage}</p>
                                                                                                                        )}
                                                                                                                    </div>
                                                                                                                )}
                                                                                                            </div>
                                                                                                        )}
                                                                                                        {(shouldShowField('control_person.street_line_1') || shouldShowField('control_person.city') || shouldShowField('control_person.state') || shouldShowField('control_person.postal_code')) && (
                                                                                                            <div>
                                                                                                                <label className="text-xs font-medium mb-1 block text-left">Control Person Address *</label>
                                                                                                                {shouldShowField('control_person.street_line_1') && (
                                                                                                                    <>
                                                                                                                        <input
                                                                                                                            type="text"
                                                                                                                            value={kybFormData.control_person.street_line_1}
                                                                                                                            onChange={(e) => {
                                                                                                                                setKybFormData({
                                                                                                                                    ...kybFormData,
                                                                                                                                    control_person: { ...kybFormData.control_person, street_line_1: e.target.value }
                                                                                                                                })
                                                                                                                                if (controlPersonErrors.street_line_1) {
                                                                                                                                    setControlPersonErrors(prev => {
                                                                                                                                        const newErrors = { ...prev }
                                                                                                                                        delete newErrors.street_line_1
                                                                                                                                        return newErrors
                                                                                                                                    })
                                                                                                                                }
                                                                                                                            }}
                                                                                                                            className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground mb-2 ${controlPersonErrors.street_line_1 ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'
                                                                                                                                }`}
                                                                                                                            placeholder="123 Main St"
                                                                                                                        />
                                                                                                                        {controlPersonErrors.street_line_1 && (
                                                                                                                            <p className="text-xs text-red-500 mt-1 mb-2">{controlPersonErrors.street_line_1}</p>
                                                                                                                        )}
                                                                                                                    </>
                                                                                                                )}
                                                                                                                {(shouldShowField('control_person.city') || shouldShowField('control_person.state') || shouldShowField('control_person.postal_code')) && (
                                                                                                                    <div className="grid grid-cols-3 gap-2">
                                                                                                                        {shouldShowField('control_person.city') && (
                                                                                                                            <div>
                                                                                                                                <input
                                                                                                                                    type="text"
                                                                                                                                    value={kybFormData.control_person.city}
                                                                                                                                    onChange={(e) => {
                                                                                                                                        setKybFormData({
                                                                                                                                            ...kybFormData,
                                                                                                                                            control_person: { ...kybFormData.control_person, city: e.target.value }
                                                                                                                                        })
                                                                                                                                        if (controlPersonErrors.city) {
                                                                                                                                            setControlPersonErrors(prev => {
                                                                                                                                                const newErrors = { ...prev }
                                                                                                                                                delete newErrors.city
                                                                                                                                                return newErrors
                                                                                                                                            })
                                                                                                                                        }
                                                                                                                                    }}
                                                                                                                                    className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground ${controlPersonErrors.city ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'
                                                                                                                                        }`}
                                                                                                                                    placeholder="City"
                                                                                                                                />
                                                                                                                                {controlPersonErrors.city && (
                                                                                                                                    <p className="text-xs text-red-500 mt-1">{controlPersonErrors.city}</p>
                                                                                                                                )}
                                                                                                                            </div>
                                                                                                                        )}
                                                                                                                        {shouldShowField('control_person.state') && (
                                                                                                                            <div>
                                                                                                                                <input
                                                                                                                                    type="text"
                                                                                                                                    value={kybFormData.control_person.state}
                                                                                                                                    onChange={(e) => {
                                                                                                                                        setKybFormData({
                                                                                                                                            ...kybFormData,
                                                                                                                                            control_person: { ...kybFormData.control_person, state: e.target.value }
                                                                                                                                        })
                                                                                                                                        if (controlPersonErrors.state) {
                                                                                                                                            setControlPersonErrors(prev => {
                                                                                                                                                const newErrors = { ...prev }
                                                                                                                                                delete newErrors.state
                                                                                                                                                return newErrors
                                                                                                                                            })
                                                                                                                                        }
                                                                                                                                    }}
                                                                                                                                    className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground ${controlPersonErrors.state ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'
                                                                                                                                        }`}
                                                                                                                                    placeholder="State"
                                                                                                                                />
                                                                                                                                {controlPersonErrors.state && (
                                                                                                                                    <p className="text-xs text-red-500 mt-1">{controlPersonErrors.state}</p>
                                                                                                                                )}
                                                                                                                            </div>
                                                                                                                        )}
                                                                                                                        {shouldShowField('control_person.postal_code') && (
                                                                                                                            <div>
                                                                                                                                <input
                                                                                                                                    type="text"
                                                                                                                                    value={kybFormData.control_person.postal_code}
                                                                                                                                    onChange={(e) => {
                                                                                                                                        setKybFormData({
                                                                                                                                            ...kybFormData,
                                                                                                                                            control_person: { ...kybFormData.control_person, postal_code: e.target.value }
                                                                                                                                        })
                                                                                                                                        if (controlPersonErrors.postal_code) {
                                                                                                                                            setControlPersonErrors(prev => {
                                                                                                                                                const newErrors = { ...prev }
                                                                                                                                                delete newErrors.postal_code
                                                                                                                                                return newErrors
                                                                                                                                            })
                                                                                                                                        }
                                                                                                                                    }}
                                                                                                                                    className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground ${controlPersonErrors.postal_code ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'
                                                                                                                                        }`}
                                                                                                                                    placeholder="ZIP"
                                                                                                                                />
                                                                                                                                {controlPersonErrors.postal_code && (
                                                                                                                                    <p className="text-xs text-red-500 mt-1">{controlPersonErrors.postal_code}</p>
                                                                                                                                )}
                                                                                                                            </div>
                                                                                                                        )}
                                                                                                                    </div>
                                                                                                                )}
                                                                                                            </div>
                                                                                                        )}
                                                                                                        {/* Show ID Type and ID Number in normal flow only if NOT an ID-only rejection */}
                                                                                                        {(() => {
                                                                                                            const idRelatedFields = [
                                                                                                                'control_person.id_type',
                                                                                                                'control_person.id_number',
                                                                                                                'control_person.id_front_image',
                                                                                                                'control_person.id_back_image'
                                                                                                            ]
                                                                                                            const hasRejectedIdDocs = documentStatuses.id_front === 'rejected' || documentStatuses.id_back === 'rejected'
                                                                                                            const hasOnlyIdFieldsRequested = requestedFields.length > 0 && 
                                                                                                                requestedFields.every((field: string) => idRelatedFields.includes(field))
                                                                                                            const isOnlyIdRejection = hasRejectedIdDocs && 
                                                                                                                (!requestedFields || requestedFields.length === 0 || hasOnlyIdFieldsRequested)
                                                                                                            
                                                                                                            // Don't show these fields if it's an ID-only rejection (they're shown in the ID-only section above)
                                                                                                            if (isOnlyIdRejection) {
                                                                                                                return null
                                                                                                            }
                                                                                                            
                                                                                                            return (
                                                                                                                <>
                                                                                                                    {shouldShowField('control_person.id_type') && (
                                                                                                                        <div>
                                                                                                                            <label className="text-xs font-medium mb-1 block text-left">ID Type *</label>
                                                                                                                            <select
                                                                                                                                value={kybFormData.control_person.id_type}
                                                                                                                                onChange={(e) => {
                                                                                                                                    const newIdType = e.target.value
                                                                                                                                    setKybFormData(prev => ({
                                                                                                                                        ...prev,
                                                                                                                                        control_person: {
                                                                                                                                            ...prev.control_person,
                                                                                                                                            id_type: newIdType,
                                                                                                                                            id_back_image: newIdType !== 'drivers_license' ? '' : prev.control_person.id_back_image
                                                                                                                                        }
                                                                                                                                    }))
                                                                                                                                    if (newIdType !== 'drivers_license' && controlPersonErrors.id_back_image) {
                                                                                                                                        setControlPersonErrors(prev => {
                                                                                                                                            const newErrors = { ...prev }
                                                                                                                                            delete newErrors.id_back_image
                                                                                                                                            return newErrors
                                                                                                                                        })
                                                                                                                                    }
                                                                                                                                    if (controlPersonErrors.id_type) {
                                                                                                                                        setControlPersonErrors(prev => {
                                                                                                                                            const newErrors = { ...prev }
                                                                                                                                            delete newErrors.id_type
                                                                                                                                            return newErrors
                                                                                                                                        })
                                                                                                                                    }
                                                                                                                                }}
                                                                                                                                className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground ${controlPersonErrors.id_type ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'}`}
                                                                                                                            >
                                                                                                                                <option value="">Select ID Type...</option>
                                                                                                                                <option value="drivers_license">Driver's License</option>
                                                                                                                                <option value="passport">Passport</option>
                                                                                                                            </select>
                                                                                                                            {controlPersonErrors.id_type && (
                                                                                                                                <p className="text-xs text-red-500 mt-1">{controlPersonErrors.id_type}</p>
                                                                                                                            )}
                                                                                                                        </div>
                                                                                                                    )}
                                                                                                                    {shouldShowField('control_person.id_number') && (
                                                                                                                        <div>
                                                                                                                            <label className="text-xs font-medium mb-1 block text-left">ID Number *</label>
                                                                                                                            <input
                                                                                                                                type="text"
                                                                                                                                value={kybFormData.control_person.id_number}
                                                                                                                                onChange={(e) => {
                                                                                                                                    setKybFormData({
                                                                                                                                        ...kybFormData,
                                                                                                                                        control_person: { ...kybFormData.control_person, id_number: e.target.value }
                                                                                                                                    })
                                                                                                                                    if (controlPersonErrors.id_number) {
                                                                                                                                        setControlPersonErrors(prev => {
                                                                                                                                            const newErrors = { ...prev }
                                                                                                                                            delete newErrors.id_number
                                                                                                                                            return newErrors
                                                                                                                                        })
                                                                                                                                    }
                                                                                                                                }}
                                                                                                                                className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground ${controlPersonErrors.id_number ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'}`}
                                                                                                                                placeholder="ID Number"
                                                                                                                            />
                                                                                                                            {controlPersonErrors.id_number && (
                                                                                                                                <p className="text-xs text-red-500 mt-1">{controlPersonErrors.id_number}</p>
                                                                                                                            )}
                                                                                                                        </div>
                                                                                                                    )}
                                                                                                                </>
                                                                                                            )
                                                                                                        })()}
                                                                                                                </>
                                                                                                            )
                                                                                                        })()}
                                                                                                        
                                                                                                        {/* ID Image Upload Fields - Show in normal flow only if NOT an ID-only rejection */}
                                                                                                        {(() => {
                                                                                                            const idRelatedFields = [
                                                                                                                'control_person.id_type',
                                                                                                                'control_person.id_number',
                                                                                                                'control_person.id_front_image',
                                                                                                                'control_person.id_back_image'
                                                                                                            ]
                                                                                                            const hasRejectedIdDocs = documentStatuses.id_front === 'rejected' || documentStatuses.id_back === 'rejected'
                                                                                                            const hasOnlyIdFieldsRequested = requestedFields.length > 0 && 
                                                                                                                requestedFields.every((field: string) => idRelatedFields.includes(field))
                                                                                                            const isOnlyIdRejection = hasRejectedIdDocs && 
                                                                                                                (!requestedFields || requestedFields.length === 0 || hasOnlyIdFieldsRequested)
                                                                                                            
                                                                                                            // Don't show ID image fields in normal flow if it's an ID-only rejection (they're shown in ID-only section)
                                                                                                            if (isOnlyIdRejection) {
                                                                                                                return null
                                                                                                            }
                                                                                                            
                                                                                                            return (
                                                                                                                (shouldShowField('control_person.id_front_image') || shouldShowField('control_person.id_back_image') || documentStatuses.id_front === 'rejected' || documentStatuses.id_back === 'rejected') && (
                                                                                                            <div className={kybFormData.control_person.id_type === 'drivers_license' ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "space-y-3"}>
                                                                                                                {/* Show ID Front approval message or upload field */}
                                                                                                                {/* Show ONLY if: field is in requestedFields OR document is rejected */}
                                                                                                                {(shouldShowField('control_person.id_front_image') || documentStatuses.id_front === 'rejected') && (
                                                                                                                    documentStatuses.id_front === 'approved' ? (
                                                                                                                        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                                                                                                            <div className="flex items-center gap-2">
                                                                                                                                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                                                                                                <p className="text-xs text-green-900 dark:text-green-100">
                                                                                                                                    {kybFormData.control_person.id_type === 'drivers_license' ? 'ID Front Image' : 'Passport Image'} has been approved.
                                                                                                                                </p>
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                    ) : (documentStatuses.id_front === 'rejected' || shouldShowField('control_person.id_front_image')) && (
                                                                                                                        <div>
                                                                                                                            {documentStatuses.id_front === 'rejected' && (
                                                                                                                                <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-800 dark:text-red-200">
                                                                                                                                    <strong>Document Rejected:</strong> {documentRejectionReasons.id_front || 'Please re-upload the ' + (kybFormData.control_person.id_type === 'drivers_license' ? 'ID Front Image' : 'Passport Image') + '.'}
                                                                                                                                </div>
                                                                                                                            )}
                                                                                                                            <ImageUploadDropzone
                                                                                                                                label={kybFormData.control_person.id_type === 'drivers_license' ? "ID Front Image *" : "Passport Image *"}
                                                                                                                                value={kybFormData.control_person.id_front_image}
                                                                                                                                onChange={(base64) => {
                                                                                                                                    setKybFormData({
                                                                                                                                        ...kybFormData,
                                                                                                                                        control_person: { ...kybFormData.control_person, id_front_image: base64 }
                                                                                                                                    })
                                                                                                                                    if (controlPersonErrors.id_front_image) {
                                                                                                                                        setControlPersonErrors(prev => {
                                                                                                                                            const newErrors = { ...prev }
                                                                                                                                            delete newErrors.id_front_image
                                                                                                                                            return newErrors
                                                                                                                                        })
                                                                                                                                    }
                                                                                                                                }}
                                                                                                                                required={true}
                                                                                                                                maxSizeMB={5}
                                                                                                                            />
                                                                                                                            {controlPersonErrors.id_front_image && (
                                                                                                                                <p className="text-xs text-red-500 mt-1">{controlPersonErrors.id_front_image}</p>
                                                                                                                            )}
                                                                                                                        </div>
                                                                                                                    )
                                                                                                                )}
                                                                                                                {/* Show ID Back approval message or upload field for Driver's License */}
                                                                                                                {/* Show ONLY if: field is in requestedFields OR document is rejected */}
                                                                                                                {kybFormData.control_person.id_type === 'drivers_license' && (shouldShowField('control_person.id_back_image') || documentStatuses.id_back === 'rejected') && (
                                                                                                                    documentStatuses.id_back === 'approved' ? (
                                                                                                                        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                                                                                                            <div className="flex items-center gap-2">
                                                                                                                                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                                                                                                <p className="text-xs text-green-900 dark:text-green-100">
                                                                                                                                    ID Back Image has been approved.
                                                                                                                                </p>
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                    ) : (documentStatuses.id_back === 'rejected' || shouldShowField('control_person.id_back_image')) && (
                                                                                                                        <div>
                                                                                                                            {documentStatuses.id_back === 'rejected' && (
                                                                                                                                <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-800 dark:text-red-200">
                                                                                                                                    <strong>Document Rejected:</strong> {documentRejectionReasons.id_back || 'Please re-upload the ID Back Image.'}
                                                                                                                                </div>
                                                                                                                            )}
                                                                                                                            <ImageUploadDropzone
                                                                                                                                label="ID Back Image *"
                                                                                                                                value={kybFormData.control_person.id_back_image}
                                                                                                                                onChange={(base64) => {
                                                                                                                                    setKybFormData({
                                                                                                                                        ...kybFormData,
                                                                                                                                        control_person: { ...kybFormData.control_person, id_back_image: base64 }
                                                                                                                                    })
                                                                                                                                    if (controlPersonErrors.id_back_image) {
                                                                                                                                        setControlPersonErrors(prev => {
                                                                                                                                            const newErrors = { ...prev }
                                                                                                                                            delete newErrors.id_back_image
                                                                                                                                            return newErrors
                                                                                                                                        })
                                                                                                                                    }
                                                                                                                                }}
                                                                                                                                required={true}
                                                                                                                                maxSizeMB={5}
                                                                                                                            />
                                                                                                                            {controlPersonErrors.id_back_image && (
                                                                                                                                <p className="text-xs text-red-500 mt-1">{controlPersonErrors.id_back_image}</p>
                                                                                                                            )}
                                                                                                                        </div>
                                                                                                                    )
                                                                                                                )}
                                                                                                            </div>
                                                                                                        )
                                                                                                    )
                                                                                                })()}
                                                                                                    </div>
                                                                                                </div>
                                                                                                        </>
                                                                                                    )
                                                                                                })()}
                                                                                            </>
                                                                                        )}

                                                                                        {/* Step 2: Business Documents */}
                                                                                        {kybStep === 'business_documents' && (
                                                                                            <>
                                                                                                {/* Show refill message banner if admin requested re-fill */}
                                                                                                {(refillMessage || (requestedFields && requestedFields.length > 0)) && (
                                                                                                    <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                                                                                        <div className="flex items-start gap-2 text-left">
                                                                                                            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                                                                                            <div className="flex-1 text-left">
                                                                                                                <p className="text-xs font-semibold text-amber-900 dark:text-amber-100 mb-1 text-left">
                                                                                                                    Admin Request: Please Re-fill the Following Fields
                                                                                                                </p>
                                                                                                                {refillMessage && (
                                                                                                                    <p className="text-xs text-amber-800 dark:text-amber-200 mb-2 text-left">
                                                                                                                        {refillMessage}
                                                                                                                    </p>
                                                                                                                )}
                                                                                                                {requestedFields && requestedFields.length > 0 && (
                                                                                                                    <div className="mt-2 text-left">
                                                                                                                        <p className="text-xs font-medium text-amber-900 dark:text-amber-100 mb-1 text-left">
                                                                                                                            Requested Fields ({requestedFields.length}):
                                                                                                                        </p>
                                                                                                                        <div className="flex flex-wrap gap-1 text-left">
                                                                                                                            {requestedFields.map((field, idx) => (
                                                                                                                                <span key={`business-docs-field-${idx}-${String(field || 'empty').replace(/\s+/g, '-')}`} className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 rounded">
                                                                                                                                    {field}
                                                                                                                                </span>
                                                                                                                            ))}
                                                                                                                        </div>
                                                                                                                    </div>
                                                                                                                )}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}

                                                                                                {/* Check if documents are submitted and pending approval - show waiting screen */}
                                                                                                {(() => {
                                                                                                    // Check if there are any rejected documents that need re-upload
                                                                                                    const hasRejectedDocuments = documentStatuses.business_formation === 'rejected' ||
                                                                                                        documentStatuses.business_ownership === 'rejected' ||
                                                                                                        documentStatuses.proof_of_address === 'rejected'

                                                                                                    // Check if documents are in pending or approved state (submitted)
                                                                                                    const hasPendingOrApprovedDocuments = documentStatuses.business_formation === 'pending' ||
                                                                                                        documentStatuses.business_ownership === 'pending' ||
                                                                                                        documentStatuses.business_formation === 'approved' ||
                                                                                                        documentStatuses.business_ownership === 'approved'

                                                                                                    // Check if admin requested re-fill of any fields
                                                                                                    const hasRequestedFields = requestedFields && requestedFields.length > 0
                                                                                                    
                                                                                                    // Show waiting screen if:
                                                                                                    // 1. We're on the business_documents step
                                                                                                    // 2. Documents have been submitted (businessDocumentsSubmitted flag OR documents are pending/approved)
                                                                                                    // 3. NO documents are currently rejected (all are pending/approved/not set)
                                                                                                    // 4. NO requested fields from admin (if admin requested re-fill, show form instead)
                                                                                                    // This means: if submitted and no rejected docs and no requested fields, show waiting screen
                                                                                                    const shouldShowWaiting = kybStep === 'business_documents' &&
                                                                                                        (businessDocumentsSubmitted || hasPendingOrApprovedDocuments) &&
                                                                                                        !hasRejectedDocuments &&
                                                                                                        !hasRequestedFields

                                                                                                    return shouldShowWaiting
                                                                                                })() ? (
                                                                                                    /* Waiting for Approval Screen */
                                                                                                    <div className="flex flex-col items-center justify-center py-8 px-4 space-y-4">
                                                                                                        <motion.div
                                                                                                            initial={{ scale: 0.8, opacity: 0 }}
                                                                                                            animate={{ scale: 1, opacity: 1 }}
                                                                                                            transition={{ duration: 0.3 }}
                                                                                                            className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center"
                                                                                                        >
                                                                                                            <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                                                                                                        </motion.div>
                                                                                                        <div className="text-center space-y-2">
                                                                                                            <h3 className="text-lg font-bold text-foreground">Documents Submitted</h3>
                                                                                                            <p className="text-sm text-muted-foreground max-w-sm">
                                                                                                                Your business documents have been successfully submitted and are awaiting admin approval.
                                                                                                            </p>
                                                                                                            <p className="text-xs text-muted-foreground mt-3">
                                                                                                                Once your documents are approved, you will be able to proceed to Step 3: KYC Verification.
                                                                                                            </p>
                                                                                                        </div>
                                                                                                        <div className="w-full max-w-sm p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                                                                                            <div className="space-y-2">
                                                                                                                <div className="flex items-center gap-2 text-xs">
                                                                                                                    <FileCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                                                                                    <span className="text-blue-900 dark:text-blue-100 font-medium">Status: Pending Review</span>
                                                                                                                </div>
                                                                                                                <p className="text-xs text-blue-800 dark:text-blue-200 pl-6">
                                                                                                                    Our team will review your documents and notify you once the review is complete.
                                                                                                                </p>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    /* Show only rejected documents or initial form if nothing submitted yet */
                                                                                                    <>
                                                                                                        {/* Only show header if there are rejected documents or if form hasn't been submitted and no pending documents */}
                                                                                                        {(() => {
                                                                                                            const hasRejectedDocuments = documentStatuses.business_formation === 'rejected' ||
                                                                                                                documentStatuses.business_ownership === 'rejected' ||
                                                                                                                documentStatuses.proof_of_address === 'rejected'
                                                                                                            const hasPendingDocuments = documentStatuses.business_formation === 'pending' ||
                                                                                                                documentStatuses.business_ownership === 'pending'
                                                                                                            // Show header only if there are rejected docs OR (not submitted AND no pending docs)
                                                                                                            return hasRejectedDocuments || (!businessDocumentsSubmitted && !hasPendingDocuments)
                                                                                                        })() && (
                                                                                                                <div className="mb-3">
                                                                                                                    <p className="text-xs font-semibold mb-2 text-left">Step 2: Business Documents *</p>
                                                                                                                    {(documentStatuses.business_formation === 'rejected' ||
                                                                                                                        documentStatuses.business_ownership === 'rejected' ||
                                                                                                                        documentStatuses.proof_of_address === 'rejected') ? (
                                                                                                                        <p className="text-xs text-muted-foreground mb-3 text-left">Please re-upload the rejected documents below.</p>
                                                                                                                    ) : (
                                                                                                                        <p className="text-xs text-muted-foreground mb-3 text-left">Upload required business formation and ownership documents</p>
                                                                                                                    )}
                                                                                                                </div>
                                                                                                            )}

                                                                                                        <div className="space-y-4">
                                                                                                            {/* Business Formation Document - Only show if rejected (in re-upload mode) or not uploaded yet (initial submission) */}
                                                                                                            {shouldShowField('business_formation_document') && (() => {
                                                                                                                const hasRejectedDocuments = documentStatuses.business_formation === 'rejected' ||
                                                                                                                    documentStatuses.business_ownership === 'rejected' ||
                                                                                                                    documentStatuses.proof_of_address === 'rejected'
                                                                                                                const hasPendingDocuments = documentStatuses.business_formation === 'pending' ||
                                                                                                                    documentStatuses.business_ownership === 'pending'
                                                                                                                const formationStatus = documentStatuses.business_formation

                                                                                                                // Don't show if documents are submitted and pending (waiting screen should show instead)
                                                                                                                if (businessDocumentsSubmitted && hasPendingDocuments && !hasRejectedDocuments) {
                                                                                                                    return false
                                                                                                                }

                                                                                                                // In re-upload mode: only show if explicitly rejected
                                                                                                                if (hasRejectedDocuments) {
                                                                                                                    return formationStatus === 'rejected'
                                                                                                                }
                                                                                                                // In initial submission: show if not uploaded yet (undefined or null) and not pending
                                                                                                                return !formationStatus || (formationStatus !== 'pending' && !businessDocumentsSubmitted)
                                                                                                            })() && (
                                                                                                                    <>
                                                                                                                        {documentStatuses.business_formation === 'rejected' && (
                                                                                                                            <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-800 dark:text-red-200">
                                                                                                                                <strong>Document Rejected:</strong> {documentRejectionReasons.business_formation || 'Please re-upload the Business Formation Document.'}
                                                                                                                            </div>
                                                                                                                        )}
                                                                                                                        <DocumentUploadDropzone
                                                                                                                            label="Business Formation Document"
                                                                                                                            description="e.g., Articles of Incorporation, Certificate of Formation"
                                                                                                                            value={kybFormData.business_formation_document}
                                                                                                                            onChange={async (base64) => {
                                                                                                                                setKybFormData({ ...kybFormData, business_formation_document: base64 })
                                                                                                                                if (businessDocumentErrors.business_formation_document) {
                                                                                                                                    setBusinessDocumentErrors(prev => {
                                                                                                                                        const newErrors = { ...prev }
                                                                                                                                        delete newErrors.business_formation_document
                                                                                                                                        return newErrors
                                                                                                                                    })
                                                                                                                                }
                                                                                                                            }}
                                                                                                                            required={true}
                                                                                                                            accept=".pdf,.jpg,.jpeg,.png"
                                                                                                                            maxSizeMB={10}
                                                                                                                        />
                                                                                                                        {businessDocumentErrors.business_formation_document && (
                                                                                                                            <p className="text-xs text-red-500 -mt-2">{businessDocumentErrors.business_formation_document}</p>
                                                                                                                        )}
                                                                                                                    </>
                                                                                                                )}
                                                                                                            {documentStatuses.business_formation === 'approved' && (
                                                                                                                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                                                                                                    <div className="flex items-center gap-2 text-left">
                                                                                                                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                                                                                                                        <p className="text-xs text-green-900 dark:text-green-100 text-left">
                                                                                                                            Business Formation Document has been approved.
                                                                                                                        </p>
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                            )}

                                                                                                            {/* Business Ownership Document - Only show if rejected (in re-upload mode) or not uploaded yet (initial submission) */}
                                                                                                            {shouldShowField('business_ownership_document') && (() => {
                                                                                                                const hasRejectedDocuments = documentStatuses.business_formation === 'rejected' ||
                                                                                                                    documentStatuses.business_ownership === 'rejected' ||
                                                                                                                    documentStatuses.proof_of_address === 'rejected'
                                                                                                                const hasPendingDocuments = documentStatuses.business_formation === 'pending' ||
                                                                                                                    documentStatuses.business_ownership === 'pending'
                                                                                                                const ownershipStatus = documentStatuses.business_ownership

                                                                                                                // Don't show if documents are submitted and pending (waiting screen should show instead)
                                                                                                                if (businessDocumentsSubmitted && hasPendingDocuments && !hasRejectedDocuments) {
                                                                                                                    return false
                                                                                                                }

                                                                                                                // In re-upload mode: only show if explicitly rejected
                                                                                                                if (hasRejectedDocuments) {
                                                                                                                    return ownershipStatus === 'rejected'
                                                                                                                }
                                                                                                                // In initial submission: show if not uploaded yet (undefined or null) and not pending
                                                                                                                return !ownershipStatus || (ownershipStatus !== 'pending' && !businessDocumentsSubmitted)
                                                                                                            })() && (
                                                                                                                    <>
                                                                                                                        {documentStatuses.business_ownership === 'rejected' && (
                                                                                                                            <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-800 dark:text-red-200">
                                                                                                                                <strong>Document Rejected:</strong> {documentRejectionReasons.business_ownership || 'Please re-upload the Business Ownership Document.'}
                                                                                                                            </div>
                                                                                                                        )}
                                                                                                                        <DocumentUploadDropzone
                                                                                                                            label="Business Ownership Document"
                                                                                                                            description="e.g., Cap table, Shareholder ledger, Operating Agreement"
                                                                                                                            value={kybFormData.business_ownership_document}
                                                                                                                            onChange={async (base64) => {
                                                                                                                                setKybFormData({ ...kybFormData, business_ownership_document: base64 })
                                                                                                                                if (businessDocumentErrors.business_ownership_document) {
                                                                                                                                    setBusinessDocumentErrors(prev => {
                                                                                                                                        const newErrors = { ...prev }
                                                                                                                                        delete newErrors.business_ownership_document
                                                                                                                                        return newErrors
                                                                                                                                    })
                                                                                                                                }
                                                                                                                            }}
                                                                                                                            required={true}
                                                                                                                            accept=".pdf,.jpg,.jpeg,.png"
                                                                                                                            maxSizeMB={10}
                                                                                                                        />
                                                                                                                        {businessDocumentErrors.business_ownership_document && (
                                                                                                                            <p className="text-xs text-red-500 -mt-2">{businessDocumentErrors.business_ownership_document}</p>
                                                                                                                        )}
                                                                                                                    </>
                                                                                                                )}
                                                                                                            {documentStatuses.business_ownership === 'approved' && (
                                                                                                                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                                                                                                    <div className="flex items-center gap-2 text-left">
                                                                                                                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                                                                                                                        <p className="text-xs text-green-900 dark:text-green-100 text-left">
                                                                                                                            Business Ownership Document has been approved.
                                                                                                                        </p>
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                            )}

                                                                                                            {/* Proof of Address Document - Only show if rejected or not uploaded or requested */}
                                                                                                            {shouldShowField('proof_of_address_document') && (documentStatuses.proof_of_address === 'rejected' || (!documentStatuses.proof_of_address && kybFormData.proof_of_address_document)) && (
                                                                                                                <>
                                                                                                                    {documentStatuses.proof_of_address === 'rejected' && (
                                                                                                                        <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-800 dark:text-red-200">
                                                                                                                            <strong>Document Rejected:</strong> {documentRejectionReasons.proof_of_address || 'Please re-upload the Proof of Address Document.'}
                                                                                                                        </div>
                                                                                                                    )}
                                                                                                                    <DocumentUploadDropzone
                                                                                                                        label="Proof of Address Document (Optional)"
                                                                                                                        description="Required if different from registered address"
                                                                                                                        value={kybFormData.proof_of_address_document}
                                                                                                                        onChange={async (base64) => {
                                                                                                                            setKybFormData({ ...kybFormData, proof_of_address_document: base64 })
                                                                                                                        }}
                                                                                                                        required={false}
                                                                                                                        accept=".pdf,.jpg,.jpeg,.png"
                                                                                                                        maxSizeMB={10}
                                                                                                                    />
                                                                                                                </>
                                                                                                            )}
                                                                                                            {documentStatuses.proof_of_address === 'approved' && (
                                                                                                                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                                                                                                    <div className="flex items-center gap-2">
                                                                                                                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                                                                                        <p className="text-xs text-green-900 dark:text-green-100">
                                                                                                                            Proof of Address Document has been approved.
                                                                                                                        </p>
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                            )}

                                                                                                            {/* Proof of Nature of Business Document - For Bridge verification */}
                                                                                                            {shouldShowField('proof_of_nature_of_business') && (documentStatuses.proof_of_nature_of_business === 'rejected' || !documentStatuses.proof_of_nature_of_business) && (
                                                                                                                <>
                                                                                                                    {documentStatuses.proof_of_nature_of_business === 'rejected' && (
                                                                                                                        <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-800 dark:text-red-200">
                                                                                                                            <strong>Document Rejected:</strong> {documentRejectionReasons.proof_of_nature_of_business || 'Please re-upload the Proof of Nature of Business Document.'}
                                                                                                                        </div>
                                                                                                                    )}
                                                                                                                    <DocumentUploadDropzone
                                                                                                                        label="Proof of Nature of Business Document (Optional)"
                                                                                                                        description="Alternative to website verification for Bridge (useful in sandbox mode)"
                                                                                                                        value={kybFormData.proof_of_nature_of_business}
                                                                                                                        onChange={async (base64) => {
                                                                                                                            setKybFormData({ ...kybFormData, proof_of_nature_of_business: base64 })
                                                                                                                        }}
                                                                                                                        required={false}
                                                                                                                        accept=".pdf,.jpg,.jpeg,.png"
                                                                                                                        maxSizeMB={10}
                                                                                                                    />
                                                                                                                </>
                                                                                                            )}
                                                                                                            {shouldShowField('proof_of_nature_of_business') && documentStatuses.proof_of_nature_of_business === 'approved' && (
                                                                                                                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                                                                                                    <div className="flex items-center gap-2">
                                                                                                                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                                                                                        <p className="text-xs text-green-900 dark:text-green-100">
                                                                                                                            Proof of Nature of Business Document has been approved.
                                                                                                                        </p>
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                            )}

                                                                                                            {/* 501c3 Determination Letter - Only for internal use, not sent to Bridge */}
                                                                                                            {shouldShowField('determination_letter_501c3') && (documentStatuses.determination_letter_501c3 === 'rejected' || !documentStatuses.determination_letter_501c3) && (
                                                                                                                <>
                                                                                                                    {documentStatuses.determination_letter_501c3 === 'rejected' && (
                                                                                                                        <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-800 dark:text-red-200">
                                                                                                                            <strong>Document Rejected:</strong> {documentRejectionReasons.determination_letter_501c3 || 'Please re-upload the 501c3 Determination Letter.'}
                                                                                                                        </div>
                                                                                                                    )}
                                                                                                                    <DocumentUploadDropzone
                                                                                                                        label="501c3 Determination Letter"
                                                                                                                        description="For internal use only (not sent to Bridge)"
                                                                                                                        value={kybFormData.determination_letter_501c3}
                                                                                                                        onChange={async (base64) => {
                                                                                                                            setKybFormData({ ...kybFormData, determination_letter_501c3: base64 })
                                                                                                                        }}
                                                                                                                        required={false}
                                                                                                                        accept=".pdf,.jpg,.jpeg,.png"
                                                                                                                        maxSizeMB={10}
                                                                                                                    />
                                                                                                                </>
                                                                                                            )}
                                                                                                            {shouldShowField('determination_letter_501c3') && documentStatuses.determination_letter_501c3 === 'approved' && (
                                                                                                                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                                                                                                    <div className="flex items-center gap-2">
                                                                                                                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                                                                                        <p className="text-xs text-green-900 dark:text-green-100">
                                                                                                                            501c3 Determination Letter has been approved.
                                                                                                                        </p>
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                            )}

                                                                                                            {/* Only show Business Information and Enhanced KYB sections if no documents are rejected and not in waiting state */}
                                                                                                            {(() => {
                                                                                                                const hasRejectedDocuments = documentStatuses.business_formation === 'rejected' ||
                                                                                                                    documentStatuses.business_ownership === 'rejected' ||
                                                                                                                    documentStatuses.proof_of_address === 'rejected'
                                                                                                                const hasPendingDocuments = documentStatuses.business_formation === 'pending' ||
                                                                                                                    documentStatuses.business_ownership === 'pending'
                                                                                                                // Don't show if documents are submitted and pending (waiting screen should show instead)
                                                                                                                if (businessDocumentsSubmitted && hasPendingDocuments && !hasRejectedDocuments) {
                                                                                                                    return false
                                                                                                                }
                                                                                                                // Show if no rejected documents OR if fields are requested
                                                                                                                return !hasRejectedDocuments ||
                                                                                                                    (shouldShowField('entity_type') || shouldShowField('business_description') || shouldShowField('business_industry') || shouldShowField('primary_website'))
                                                                                                            })() && (
                                                                                                                    <>
                                                                                                                        {/* Standard KYB Requirements */}
                                                                                                                        <div className="border-t border-border pt-4 mt-4">
                                                                                                                            <p className="text-xs font-semibold mb-3 text-left">Business Information</p>

                                                                                                                            <div className="space-y-3">
                                                                                                                                {shouldShowField('entity_type') && (
                                                                                                                                    <div>
                                                                                                                                        <label className="text-xs font-medium mb-1 block text-left">Entity Type *</label>
                                                                                                                                        <select
                                                                                                                                            value={kybFormData.entity_type}
                                                                                                                                            onChange={(e) => {
                                                                                                                                                setKybFormData({ ...kybFormData, entity_type: e.target.value })
                                                                                                                                                if (businessDocumentErrors.entity_type) {
                                                                                                                                                    setBusinessDocumentErrors(prev => {
                                                                                                                                                        const newErrors = { ...prev }
                                                                                                                                                        delete newErrors.entity_type
                                                                                                                                                        return newErrors
                                                                                                                                                    })
                                                                                                                                                }
                                                                                                                                            }}
                                                                                                                                            className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground ${businessDocumentErrors.entity_type ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'
                                                                                                                                                }`}
                                                                                                                                        >
                                                                                                                                            <option value="">Select entity type...</option>
                                                                                                                                            {/* Bridge supported business entity types */}
                                                                                                                                            <option value="corporation">corporation</option>
                                                                                                                                            <option value="llc">llc</option>
                                                                                                                                            <option value="partnership">partnership</option>
                                                                                                                                            <option value="sole_prop">sole_prop</option>
                                                                                                                                            <option value="cooperative">cooperative</option>
                                                                                                                                            <option value="trust">trust</option>
                                                                                                                                            <option value="other">other</option>
                                                                                                                                        </select>
                                                                                                                                        {businessDocumentErrors.entity_type && (
                                                                                                                                            <p className="text-xs text-red-500 mt-1">{businessDocumentErrors.entity_type}</p>
                                                                                                                                        )}
                                                                                                                                        <p className="text-[10px] text-muted-foreground mt-1 text-left">
                                                                                                                                            Must be one of: cooperative, corporation, llc, other, partnership, sole_prop, trust.
                                                                                                                                        </p>
                                                                                                                                    </div>
                                                                                                                                )}

                                                                                                                                {shouldShowField('dao_status') && (
                                                                                                                                    <div className="flex items-center gap-2">
                                                                                                                                        <input
                                                                                                                                            type="checkbox"
                                                                                                                                            id="dao_status"
                                                                                                                                            checked={kybFormData.dao_status}
                                                                                                                                            onChange={(e) => setKybFormData({ ...kybFormData, dao_status: e.target.checked })}
                                                                                                                                            className="w-4 h-4 text-purple-600 border-border rounded focus:ring-purple-500"
                                                                                                                                        />
                                                                                                                                        <label htmlFor="dao_status" className="text-xs font-medium text-left cursor-pointer">
                                                                                                                                            This is a DAO (Decentralized Autonomous Organization)
                                                                                                                                        </label>
                                                                                                                                    </div>
                                                                                                                                )}

                                                                                                                                {shouldShowField('business_description') && (
                                                                                                                                    <div>
                                                                                                                                        <label className="text-xs font-medium mb-1 block text-left">Business Description *</label>
                                                                                                                                        <textarea
                                                                                                                                            value={kybFormData.business_description}
                                                                                                                                            onChange={(e) => {
                                                                                                                                                setKybFormData({ ...kybFormData, business_description: e.target.value })
                                                                                                                                                if (businessDocumentErrors.business_description) {
                                                                                                                                                    setBusinessDocumentErrors(prev => {
                                                                                                                                                        const newErrors = { ...prev }
                                                                                                                                                        delete newErrors.business_description
                                                                                                                                                        return newErrors
                                                                                                                                                    })
                                                                                                                                                }
                                                                                                                                            }}
                                                                                                                                            className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground ${businessDocumentErrors.business_description ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'
                                                                                                                                                }`}
                                                                                                                                            rows={3}
                                                                                                                                            placeholder="Brief description of your business operations"
                                                                                                                                        />
                                                                                                                                        {businessDocumentErrors.business_description && (
                                                                                                                                            <p className="text-xs text-red-500 mt-1">{businessDocumentErrors.business_description}</p>
                                                                                                                                        )}
                                                                                                                                    </div>
                                                                                                                                )}

                                                                                                                                {shouldShowField('primary_website') && (
                                                                                                                                    <div>
                                                                                                                                        <label className="text-xs font-medium mb-1 block text-left">Primary Website</label>
                                                                                                                                        <input
                                                                                                                                            type="url"
                                                                                                                                            value={kybFormData.primary_website}
                                                                                                                                            onChange={(e) => setKybFormData({ ...kybFormData, primary_website: e.target.value })}
                                                                                                                                            className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                                                                                                                                            placeholder="https://example.com"
                                                                                                                                        />
                                                                                                                                    </div>
                                                                                                                                )}

                                                                                                                                {shouldShowField('business_industry') && (
                                                                                                                                    <div>
                                                                                                                                        <label className="text-xs font-medium mb-1 block text-left">Business Industry</label>
                                                                                                                                        <input
                                                                                                                                            type="text"
                                                                                                                                            value={kybFormData.business_industry}
                                                                                                                                            onChange={(e) => setKybFormData({ ...kybFormData, business_industry: e.target.value })}
                                                                                                                                            className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                                                                                                                                            placeholder="e.g., Technology, Healthcare, Finance"
                                                                                                                                        />
                                                                                                                                    </div>
                                                                                                                                )}

                                                                                                                                {/* Principal Operating Address */}
                                                                                                                                {(shouldShowField('physical_address.street_line_1') || shouldShowField('physical_address.city') || shouldShowField('physical_address.subdivision') || shouldShowField('physical_address.postal_code') || shouldShowField('physical_address.country')) && (
                                                                                                                                    <div className="border-t border-border pt-3 mt-3">
                                                                                                                                        <p className="text-xs font-semibold mb-2 text-left">Principal Operating Address</p>
                                                                                                                                        <p className="text-xs text-muted-foreground mb-3 text-left">Required if different from registered address</p>

                                                                                                                                        <div className="space-y-2">
                                                                                                                                            {shouldShowField('physical_address.street_line_1') && (
                                                                                                                                                <div>
                                                                                                                                                    <label className="text-xs font-medium mb-1 block text-left">Street Address</label>
                                                                                                                                                    <input
                                                                                                                                                        type="text"
                                                                                                                                                        value={kybFormData.physical_address.street_line_1}
                                                                                                                                                        onChange={(e) => setKybFormData({
                                                                                                                                                            ...kybFormData,
                                                                                                                                                            physical_address: { ...kybFormData.physical_address, street_line_1: e.target.value }
                                                                                                                                                        })}
                                                                                                                                                        className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                                                                                                                                                        placeholder="123 Main St"
                                                                                                                                                    />
                                                                                                                                                </div>
                                                                                                                                            )}
                                                                                                                                            {(shouldShowField('physical_address.city') || shouldShowField('physical_address.subdivision')) && (
                                                                                                                                                <div className="grid grid-cols-2 gap-2">
                                                                                                                                                    {shouldShowField('physical_address.city') && (
                                                                                                                                                        <div>
                                                                                                                                                            <label className="text-xs font-medium mb-1 block text-left">City</label>
                                                                                                                                                            <input
                                                                                                                                                                type="text"
                                                                                                                                                                value={kybFormData.physical_address.city}
                                                                                                                                                                onChange={(e) => setKybFormData({
                                                                                                                                                                    ...kybFormData,
                                                                                                                                                                    physical_address: { ...kybFormData.physical_address, city: e.target.value }
                                                                                                                                                                })}
                                                                                                                                                                className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                                                                                                                                                                placeholder="New York"
                                                                                                                                                            />
                                                                                                                                                        </div>
                                                                                                                                                    )}
                                                                                                                                                    {shouldShowField('physical_address.subdivision') && (
                                                                                                                                                        <div>
                                                                                                                                                            <label className="text-xs font-medium mb-1 block text-left">State</label>
                                                                                                                                                            <input
                                                                                                                                                                type="text"
                                                                                                                                                                value={kybFormData.physical_address.subdivision}
                                                                                                                                                                onChange={(e) => setKybFormData({
                                                                                                                                                                    ...kybFormData,
                                                                                                                                                                    physical_address: { ...kybFormData.physical_address, subdivision: e.target.value }
                                                                                                                                                                })}
                                                                                                                                                                className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                                                                                                                                                                placeholder="NY"
                                                                                                                                                            />
                                                                                                                                                        </div>
                                                                                                                                                    )}
                                                                                                                                                </div>
                                                                                                                                            )}
                                                                                                                                            {(shouldShowField('physical_address.postal_code') || shouldShowField('physical_address.country')) && (
                                                                                                                                                <div className="grid grid-cols-2 gap-2">
                                                                                                                                                    {shouldShowField('physical_address.postal_code') && (
                                                                                                                                                        <div>
                                                                                                                                                            <label className="text-xs font-medium mb-1 block text-left">ZIP Code</label>
                                                                                                                                                            <input
                                                                                                                                                                type="text"
                                                                                                                                                                value={kybFormData.physical_address.postal_code}
                                                                                                                                                                onChange={(e) => setKybFormData({
                                                                                                                                                                    ...kybFormData,
                                                                                                                                                                    physical_address: { ...kybFormData.physical_address, postal_code: e.target.value }
                                                                                                                                                                })}
                                                                                                                                                                className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                                                                                                                                                                placeholder="10001"
                                                                                                                                                            />
                                                                                                                                                        </div>
                                                                                                                                                    )}
                                                                                                                                                    {shouldShowField('physical_address.country') && (
                                                                                                                                                        <div>
                                                                                                                                                            <label className="text-xs font-medium mb-1 block text-left">Country</label>
                                                                                                                                                            <input
                                                                                                                                                                type="text"
                                                                                                                                                                value={kybFormData.physical_address.country}
                                                                                                                                                                onChange={(e) => setKybFormData({
                                                                                                                                                                    ...kybFormData,
                                                                                                                                                                    physical_address: { ...kybFormData.physical_address, country: e.target.value }
                                                                                                                                                                })}
                                                                                                                                                                className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                                                                                                                                                                placeholder="USA"
                                                                                                                                                            />
                                                                                                                                                        </div>
                                                                                                                                                    )}
                                                                                                                                                </div>
                                                                                                                                            )}
                                                                                                                                        </div>
                                                                                                                                    </div>
                                                                                                                                )}
                                                                                                                            </div>
                                                                                                                        </div>

                                                                                                                        {/* Enhanced KYB Requirements */}
                                                                                                                        {(shouldShowField('source_of_funds') || shouldShowField('annual_revenue') || shouldShowField('transaction_volume') || shouldShowField('account_purpose') || shouldShowField('high_risk_activities') || shouldShowField('high_risk_geographies')) && (
                                                                                                                            <div className="border-t border-border pt-4 mt-4">
                                                                                                                                <p className="text-xs font-semibold mb-3 text-left">Enhanced KYB Information</p>

                                                                                                                                <div className="space-y-3">
                                                                                                                                    {shouldShowField('source_of_funds') && (
                                                                                                                                        <div>
                                                                                                                                            <label className="text-xs font-medium mb-1 block text-left">Source of Funds</label>
                                                                                                                                            <select
                                                                                                                                                value={kybFormData.source_of_funds}
                                                                                                                                                onChange={(e) => setKybFormData({ ...kybFormData, source_of_funds: e.target.value })}
                                                                                                                                                className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground"
                                                                                                                                            >
                                                                                                                                                <option value="">Select source of funds...</option>
                                                                                                                                                <option value="business_operations">Business Operations</option>
                                                                                                                                                <option value="investment_income">Investment Income</option>
                                                                                                                                                <option value="loan_proceeds">Loan Proceeds</option>
                                                                                                                                                <option value="sale_of_assets">Sale of Assets</option>
                                                                                                                                                <option value="personal_savings">Personal Savings</option>
                                                                                                                                                <option value="other">Other</option>
                                                                                                                                            </select>
                                                                                                                                        </div>
                                                                                                                                    )}

                                                                                                                                    {shouldShowField('annual_revenue') && (
                                                                                                                                        <div>
                                                                                                                                            <label className="text-xs font-medium mb-1 block text-left">Estimated Annual Revenue (USD)</label>
                                                                                                                                            <select
                                                                                                                                                value={kybFormData.annual_revenue}
                                                                                                                                                onChange={(e) => setKybFormData({ ...kybFormData, annual_revenue: e.target.value })}
                                                                                                                                                className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground"
                                                                                                                                            >
                                                                                                                                                <option value="">Select range...</option>
                                                                                                                                                <option value="0-50000">$0 - $50,000</option>
                                                                                                                                                <option value="50000-100000">$50,000 - $100,000</option>
                                                                                                                                                <option value="100000-500000">$100,000 - $500,000</option>
                                                                                                                                                <option value="500000-1000000">$500,000 - $1,000,000</option>
                                                                                                                                                <option value="1000000-5000000">$1,000,000 - $5,000,000</option>
                                                                                                                                                <option value="5000000+">$5,000,000+</option>
                                                                                                                                            </select>
                                                                                                                                        </div>
                                                                                                                                    )}

                                                                                                                                    {shouldShowField('transaction_volume') && (
                                                                                                                                        <div>
                                                                                                                                            <label className="text-xs font-medium mb-1 block text-left">Expected Monthly Transaction Volume (USD)</label>
                                                                                                                                            <input
                                                                                                                                                type="text"
                                                                                                                                                value={kybFormData.transaction_volume}
                                                                                                                                                onChange={(e) => setKybFormData({ ...kybFormData, transaction_volume: e.target.value })}
                                                                                                                                                className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                                                                                                                                                placeholder="e.g., 10000"
                                                                                                                                            />
                                                                                                                                        </div>
                                                                                                                                    )}

                                                                                                                                    {shouldShowField('account_purpose') && (
                                                                                                                                        <div>
                                                                                                                                            <label className="text-xs font-medium mb-1 block text-left">Primary Account Purpose</label>
                                                                                                                                            <select
                                                                                                                                                value={kybFormData.account_purpose}
                                                                                                                                                onChange={(e) => setKybFormData({ ...kybFormData, account_purpose: e.target.value })}
                                                                                                                                                className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground"
                                                                                                                                            >
                                                                                                                                                <option value="">Select purpose...</option>
                                                                                                                                                <option value="operating_account">Operating Account</option>
                                                                                                                                                <option value="payroll">Payroll</option>
                                                                                                                                                <option value="investment">Investment</option>
                                                                                                                                                <option value="savings">Savings</option>
                                                                                                                                                <option value="payment_processing">Payment Processing</option>
                                                                                                                                                <option value="other">Other</option>
                                                                                                                                            </select>
                                                                                                                                        </div>
                                                                                                                                    )}

                                                                                                                                    {shouldShowField('high_risk_activities') && (
                                                                                                                                        <div>
                                                                                                                                            <label className="text-xs font-medium mb-1 block text-left">High Risk Activities (if applicable)</label>
                                                                                                                                            <textarea
                                                                                                                                                value={kybFormData.high_risk_activities}
                                                                                                                                                onChange={(e) => setKybFormData({ ...kybFormData, high_risk_activities: e.target.value })}
                                                                                                                                                className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground"
                                                                                                                                                rows={2}
                                                                                                                                                placeholder="Describe any high-risk activities your business engages in (if any)"
                                                                                                                                            />
                                                                                                                                        </div>
                                                                                                                                    )}

                                                                                                                                    {shouldShowField('high_risk_geographies') && (
                                                                                                                                        <div>
                                                                                                                                            <label className="text-xs font-medium mb-1 block text-left">High Risk Geographies (if applicable)</label>
                                                                                                                                            <textarea
                                                                                                                                                value={kybFormData.high_risk_geographies}
                                                                                                                                                onChange={(e) => setKybFormData({ ...kybFormData, high_risk_geographies: e.target.value })}
                                                                                                                                                className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground"
                                                                                                                                                rows={2}
                                                                                                                                                placeholder="List any high-risk geographies your business operates in (if any)"
                                                                                                                                            />
                                                                                                                                        </div>
                                                                                                                                    )}
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                        )}
                                                                                                                    </>
                                                                                                                )}
                                                                                                        </div>
                                                                                                    </>
                                                                                                )}
                                                                                            </>
                                                                                        )}

                                                                                        {/* Step 3: Control Person KYC Verification - Show when step is set to kyc_verification */}
                                                                                        {kybStep === 'kyc_verification' && (
                                                                                            <>
                                                                                                <div className="mb-3">
                                                                                                    <p className="text-xs font-semibold mb-2 text-left">Step 3: Control Person KYC Verification *</p>
                                                                                                    <p className="text-xs text-muted-foreground mb-3 text-left">Your business documents have been approved. The Control Person must complete KYC verification to finalize business verification</p>
                                                                                                </div>

                                                                                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
                                                                                                    <p className="text-xs text-blue-900 dark:text-blue-100 mb-2">
                                                                                                        <strong>Control Person:</strong> {kybFormData.control_person.first_name} {kybFormData.control_person.last_name}
                                                                                                    </p>
                                                                                                    <p className="text-xs text-blue-900 dark:text-blue-100 mb-3">
                                                                                                        <strong>Email:</strong> {kybFormData.control_person.email}
                                                                                                    </p>
                                                                                                    <p className="text-xs text-blue-900 dark:text-blue-100 mb-2">
                                                                                                        Complete the KYC verification below. You will need to verify your ID and take a selfie.
                                                                                                    </p>
                                                                                                    <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-900 dark:text-amber-100">
                                                                                                        <p className="font-semibold mb-1">⚠️ Important Note:</p>
                                                                                                        <p className="mb-1">Even though your information was already submitted, Bridge's KYC verification system requires you to complete the verification flow again.</p>
                                                                                                        <p>This is required for <strong>live selfie verification</strong> and additional identity checks that cannot be done via API. Please complete all steps in the verification form.</p>
                                                                                                    </div>
                                                                                                </div>

                                                                                                {/* KYC Verification Iframe */}
                                                                                                {controlPersonKycIframeUrl ? (
                                                                                                    <div className="space-y-3">
                                                                                                        <div className="relative w-full border border-border rounded-lg overflow-hidden" style={{ minHeight: '600px' }}>
                                                                                                            <iframe
                                                                                                                src={controlPersonKycIframeUrl}
                                                                                                                allow="camera; microphone;"
                                                                                                                className="w-full border-0"
                                                                                                                style={{ minHeight: '600px', height: '600px' }}
                                                                                                                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation-by-user-activation"
                                                                                                                title="Control Person KYC Verification"
                                                                                                            />
                                                                                                        </div>
                                                                                                        {controlPersonKycLink && (
                                                                                                            <Button
                                                                                                                size="sm"
                                                                                                                variant="outline"
                                                                                                                onClick={() => window.open(controlPersonKycLink, '_blank')}
                                                                                                                className="w-full text-xs"
                                                                                                            >
                                                                                                                <ExternalLink className="h-3 w-3 mr-2" />
                                                                                                                Open in New Tab
                                                                                                            </Button>
                                                                                                        )}
                                                                                                    </div>
                                                                                                ) : controlPersonKycLink ? (
                                                                                                    <div className="space-y-3">
                                                                                                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                                                                                            <p className="text-xs text-amber-900 dark:text-amber-100 mb-2 font-semibold">
                                                                                                                ⚠️ Iframe verification is not available
                                                                                                            </p>
                                                                                                            <p className="text-xs text-amber-900 dark:text-amber-100 mb-3">
                                                                                                                Please click the button below to open the verification link in a new tab. You will need to complete the verification form again (including selfie) even though your information was already submitted via API.
                                                                                                            </p>
                                                                                                            <Button
                                                                                                                size="sm"
                                                                                                                onClick={() => window.open(controlPersonKycLink, '_blank')}
                                                                                                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs"
                                                                                                            >
                                                                                                                <ExternalLink className="h-3 w-3 mr-2" />
                                                                                                                Open KYC Verification Link
                                                                                                            </Button>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    <div className="p-4 bg-muted rounded-lg border border-border">
                                                                                                        <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-900 dark:text-amber-100">
                                                                                                            <p className="font-semibold mb-1">⏳ Waiting for Ultimate Beneficial Owner (UBO) verification</p>
                                                                                                            <p className="mb-1">Your information has been submitted to Bridge via API. A KYC verification link is being generated for you to complete live selfie verification.</p>
                                                                                                            <p className="text-[10px] mt-1 opacity-90">Note: The KYC link will ask you to enter your information again - this is required for selfie verification and cannot be done via API.</p>
                                                                                                        </div>
                                                                                                        <Button
                                                                                                            size="sm"
                                                                                                            onClick={handleControlPersonKyc}
                                                                                                            disabled={isLoading}
                                                                                                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs"
                                                                                                        >
                                                                                                            {isLoading ? (
                                                                                                                <>
                                                                                                                    <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                                                                                                                    Loading...
                                                                                                                </>
                                                                                                            ) : (
                                                                                                                <>
                                                                                                                    <Shield className="h-3 w-3 mr-2" />
                                                                                                                    Get KYC Verification Link
                                                                                                                </>
                                                                                                            )}
                                                                                                        </Button>
                                                                                                    </div>
                                                                                                )}
                                                                                            </>
                                                                                        )}
                                                                                    </>
                                                                                ) : (
                                                                                    <KYCForm
                                                                                        formData={kycFormData}
                                                                                        isLoading={isLoading}
                                                                                        onFormDataChange={setKycFormData}
                                                                                        onSubmit={handleSubmitCustomKyc}
                                                                                    />
                                                                                )}
                                                                                {/* Hide button when the Step 2 waiting screen is shown, BUT always show it if admin requested refill */}
                                                                                {(() => {
                                                                                    // Check if waiting screen should be shown
                                                                                    const hasRejectedDocuments = documentStatuses.business_formation === 'rejected' ||
                                                                                        documentStatuses.business_ownership === 'rejected' ||
                                                                                        documentStatuses.proof_of_address === 'rejected'
                                                                                    const hasPendingOrApprovedDocuments = documentStatuses.business_formation === 'pending' ||
                                                                                        documentStatuses.business_ownership === 'pending' ||
                                                                                        documentStatuses.business_formation === 'approved' ||
                                                                                        documentStatuses.business_ownership === 'approved'
                                                                                    const hasRequestedFields = requestedFields && requestedFields.length > 0
                                                                                    const shouldShowWaiting = kybStep === 'business_documents' &&
                                                                                        (businessDocumentsSubmitted || hasPendingOrApprovedDocuments) &&
                                                                                        !hasRejectedDocuments &&
                                                                                        !hasRequestedFields

                                                                                    // Show button if:
                                                                                    // 1. Admin requested refill (requestedFields exist), OR
                                                                                    // 2. Waiting screen is NOT showing
                                                                                    return hasRequestedFields || !shouldShowWaiting
                                                                                })() && (
                                                                                        <Button
                                                                                            size="sm"
                                                                                            onClick={
                                                                                                verificationType === 'kyb' && kybStep === 'control_person' ? handleSubmitControlPerson :
                                                                                                    verificationType === 'kyb' && kybStep === 'business_documents' ? handleSubmitBusinessDocuments :
                                                                                                        verificationType === 'kyb' && kybStep === 'kyc_verification' ? handleControlPersonKyc :
                                                                                                            handleSubmitCustomKyc
                                                                                            }
                                                                                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                            disabled={isLoading}
                                                                                        >
                                                                                            {isLoading ? (
                                                                                                <>
                                                                                                    <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                                                                                                    {verificationType === 'kyb' && kybStep === 'kyc_verification' ? 'Opening...' : 'Submitting...'}
                                                                                                </>
                                                                                            ) : (
                                                                                                <>
                                                                                                    <Shield className="h-3 w-3 mr-2" />
                                                                                                    {verificationType === 'kyb' && kybStep === 'control_person' ? 'Submit Control Person' :
                                                                                                        verificationType === 'kyb' && kybStep === 'business_documents' ? 'Submit Business Documents' :
                                                                                                            verificationType === 'kyb' && kybStep === 'kyc_verification' ? 'Open KYC Verification Link' :
                                                                                                                `Submit ${verificationType === 'kyb' ? 'KYB' : 'KYC'} Verification`}
                                                                                                </>
                                                                                            )}
                                                                                        </Button>
                                                                                    )}
                                                                            </div>
                                                                        ) : (
                                                                            /* Bridge Widget Iframe (Fallback) */
                                                                            (showVerificationIframe && (verificationType === 'kyb' ? kybWidgetUrl : kycWidgetUrl)) ? (
                                                                                <div className="space-y-2">
                                                                                    <div className="relative w-full" style={{ minHeight: '600px' }}>
                                                                                        <iframe
                                                                                            src={verificationType === 'kyb' ? kybWidgetUrl : kycWidgetUrl || ''}
                                                                                            allow="camera; microphone;"
                                                                                            className="w-full border border-border rounded-lg"
                                                                                            style={{ minHeight: '600px', height: '600px' }}
                                                                                            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation-by-user-activation"
                                                                                            title={`${verificationType === 'kyb' ? 'KYB' : 'KYC'} Verification`}
                                                                                        />
                                                                                    </div>
                                                                                    <Button
                                                                                        size="sm"
                                                                                        variant="outline"
                                                                                        onClick={() => setShowVerificationIframe(false)}
                                                                                        className="w-full text-xs"
                                                                                    >
                                                                                        Close Verification
                                                                                    </Button>
                                                                                </div>
                                                                            ) : (
                                                                                <Button
                                                                                    size="sm"
                                                                                    onClick={async () => {
                                                                                        try {
                                                                                            const linkType = verificationType || 'kyc'
                                                                                            const widgetUrl = linkType === 'kyb' ? kybWidgetUrl : kycWidgetUrl

                                                                                            if (widgetUrl) {
                                                                                                setShowVerificationIframe(true)
                                                                                                return
                                                                                            }

                                                                                            const response = await fetch(`/wallet/bridge/${linkType}-link`, {
                                                                                                method: 'POST',
                                                                                                headers: {
                                                                                                    'Accept': 'application/json',
                                                                                                    'X-CSRF-TOKEN': getCsrfToken(),
                                                                                                    'X-Requested-With': 'XMLHttpRequest',
                                                                                                },
                                                                                                credentials: 'include',
                                                                                                cache: 'no-store',
                                                                                            })
                                                                                            if (response.ok) {
                                                                                                const data = await response.json()
                                                                                                if (data.success && data.data?.widget_url) {
                                                                                                    if (linkType === 'kyb') {
                                                                                                        setKybWidgetUrl(data.data.widget_url)
                                                                                                    } else {
                                                                                                        setKycWidgetUrl(data.data.widget_url)
                                                                                                    }
                                                                                                    setShowVerificationIframe(true)
                                                                                                } else if (data.success && data.data?.link_url) {
                                                                                                    window.open(data.data.link_url, '_blank')
                                                                                                    showSuccessToast('Verification link opened in a new tab')
                                                                                                }
                                                                                            }
                                                                                        } catch (error) {
                                                                                            console.error('Failed to create verification link:', error)
                                                                                            showErrorToast('Failed to create verification link')
                                                                                        }
                                                                                    }}
                                                                                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs"
                                                                                    disabled={isLoading}
                                                                                >
                                                                                    <Shield className="h-3 w-3 mr-2" />
                                                                                    Start {verificationType === 'kyb' ? 'KYB' : 'KYC'} Verification
                                                                                </Button>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                )}
                                                            {tosStatus !== 'accepted' && tosStatus !== 'approved' && (
                                                                <p className="text-xs text-amber-600 dark:text-amber-400 italic mt-3">
                                                                    Complete step 1 first
                                                                </p>
                                                            )}
                                                        </motion.div>
                                                    </div>

                                                    {/* Status Badge - Show for all "in progress" statuses */}
                                                    {/* Bridge KYC/KYB statuses: not_started, incomplete, under_review, awaiting_questionnaire, awaiting_ubo, approved, rejected, paused, offboarded */}
                                                    {(verificationType === 'kyb' ? kybStatus : kycStatus) !== 'approved' &&
                                                        (verificationType === 'kyb' ? kybStatus : kycStatus) !== 'rejected' &&
                                                        (verificationType === 'kyb' ? kybStatus : kycStatus) !== 'not_started' && (
                                                            <motion.div
                                                                initial={{ opacity: 0 }}
                                                                animate={{ opacity: 1 }}
                                                                transition={{ delay: 0.4 }}
                                                                className="p-2 sm:p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                                                            >
                                                                <div className="flex items-center gap-2 text-xs sm:text-sm">
                                                                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                                                    <span className="text-blue-900 dark:text-blue-100">
                                                                        Verification is being reviewed. This usually takes a few minutes.
                                                                    </span>
                                                                </div>
                                                            </motion.div>
                                                        )}

                                                    {(verificationType === 'kyb' ? kybStatus : kycStatus) === 'rejected' && (
                                                        <motion.div
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            transition={{ delay: 0.4 }}
                                                            className="p-2 sm:p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                                                        >
                                                            <div className="flex items-center gap-2 text-xs sm:text-sm">
                                                                <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                                                                <span className="text-red-900 dark:text-red-100">
                                                                    Verification was rejected. Please try again or contact support.
                                                                </span>
                                                            </div>
                                                        </motion.div>
                                                    )}

                                                    {/* Info */}
                                                    <p className="text-xs text-muted-foreground">
                                                        After completing verification, you'll be able to deposit, send, and receive funds securely.
                                                    </p>
                                                </div>
                                            </motion.div>
                                        ) : (
                                            <div className="p-4 space-y-4">
                                                {/* Balance - Prominent display */}
                                                <div className="text-center py-4">
                                                    <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Balance</p>
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span className="text-3xl font-bold">
                                                            ${walletBalance !== null
                                                                ? walletBalance.toLocaleString('en-US', {
                                                                    minimumFractionDigits: 2,
                                                                    maximumFractionDigits: 2
                                                                })
                                                                : '0.00'
                                                            }
                                                        </span>
                                                        <button
                                                            onClick={handleRefresh}
                                                            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                                                            disabled={isLoading}
                                                            title="Refresh balance"
                                                        >
                                                            <RefreshCw className={`h-4 w-4 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Transfer/Deposit Actions - MetaMask style */}
                                                {hasWallet && (
                                                    <div className="grid grid-cols-4 gap-2 pb-4 border-b border-border">
                                                        <button
                                                            onClick={() => setActionView('addMoney')}
                                                            className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-muted transition-colors group"
                                                        >
                                                            <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-2 group-hover:scale-110 transition-transform">
                                                                <Plus className="h-4 w-4 text-white" />
                                                            </div>
                                                            <span className="text-xs font-medium">Deposit</span>
                                                        </button>
                                                        <button
                                                            onClick={() => setActionView('send')}
                                                            className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-muted transition-colors group"
                                                        >
                                                            <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-2 group-hover:scale-110 transition-transform">
                                                                <ArrowUpRight className="h-4 w-4 text-white" />
                                                            </div>
                                                            <span className="text-xs font-medium">Send</span>
                                                        </button>
                                                        <button
                                                            onClick={() => setActionView('receive')}
                                                            className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-muted transition-colors group"
                                                        >
                                                            <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-2 group-hover:scale-110 transition-transform">
                                                                <ArrowDownLeft className="h-4 w-4 text-white" />
                                                            </div>
                                                            <span className="text-xs font-medium">Receive</span>
                                                        </button>
                                                        <button
                                                            onClick={() => setActionView('swap')}
                                                            className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-muted transition-colors group"
                                                        >
                                                            <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-2 group-hover:scale-110 transition-transform">
                                                                <ArrowRightLeft className="h-4 w-4 text-white" />
                                                            </div>
                                                            <span className="text-xs font-medium">Swap</span>
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Wallet Address - MetaMask style */}
                                                {walletAddress && (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
                                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0">
                                                                    <Wallet className="h-4 w-4 text-white" />
                                                                </div>
                                                                <code className="text-sm font-mono truncate">
                                                                    {formatAddress(walletAddress)}
                                                                </code>
                                                            </div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleCopyAddress()
                                                                }}
                                                                className="p-1.5 rounded-lg hover:bg-background transition-colors flex-shrink-0 ml-2"
                                                                title="Copy address"
                                                            >
                                                                {copied ? (
                                                                    <Check className="h-4 w-4 text-green-500" />
                                                                ) : (
                                                                    <Copy className="h-4 w-4 text-muted-foreground" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Network/Status */}
                                                <div className="flex items-center justify-between p-2 text-xs">
                                                    <span className="text-muted-foreground">Network</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                                                        <span className="font-medium">Organization Wallet</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    ) : (
                                        isLoadingActivities && activities.length === 0 ? (
                                            <ActivitySkeleton />
                                        ) : (
                                            <ActivityList
                                                activities={activities}
                                                isLoading={isLoadingActivities}
                                                hasMore={hasMoreActivities}
                                                isLoadingMore={isLoadingMore}
                                                onScroll={handleActivityScroll}
                                            />
                                        )
                                    )}
                                </motion.div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="border-t border-border p-3 bg-muted/30">
                            <div className="text-xs text-muted-foreground text-center">
                                Secure wallet powered by Believe In Unity
                            </div>
                        </div>

                    </motion.div>
                </React.Fragment>
            )}

            {/* Subscription Required Modal */}
            {showSubscriptionModal && (
                <SubscriptionRequiredModal
                    key="subscription-modal"
                    isOpen={showSubscriptionModal}
                    onClose={() => {
                        setShowSubscriptionModal(false)
                        onClose() // Also close the wallet popup
                    }}
                    feature="wallet"
                />
            )}
        </AnimatePresence>
    )
}

