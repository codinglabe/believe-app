"use client"

import React, { useState, useEffect, useRef } from 'react'
import { X, Wallet, Copy, Check, RefreshCw, ChevronDown, Settings, Activity, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, ArrowLeft, QrCode, CheckCircle2, Search, Building2, User, Plus, AlertCircle, Shield, FileCheck, Clock, ExternalLink, Upload, FileImage } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { showSuccessToast, showErrorToast } from '@/lib/toast'
import { TermsOfService } from './TermsOfService'
import { ImageUploadDropzone } from './ImageUploadDropzone'
import { DocumentUploadDropzone } from './DocumentUploadDropzone'
import { SubscriptionRequiredModal } from './SubscriptionRequiredModal'

interface WalletPopupProps {
    isOpen: boolean
    onClose: () => void
    organizationName?: string
}

// Helper function to get CSRF token with multiple fallbacks
const getCsrfToken = (): string => {
    // Method 1: From meta tag (most common)
    const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    if (metaToken) return metaToken
    
    // Method 2: From cookie (XSRF-TOKEN)
    const cookieToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('XSRF-TOKEN='))
        ?.split('=')[1]
    if (cookieToken) return decodeURIComponent(cookieToken)
    
    return ''
}

export function WalletPopup({ isOpen, onClose, organizationName }: WalletPopupProps) {
    const [walletBalance, setWalletBalance] = useState<number | null>(null)
    const [walletAddress, setWalletAddress] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
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
    // Bridge KYC/KYB Link statuses: not_started, incomplete, under_review, awaiting_questionnaire, awaiting_ubo, approved, rejected, paused, offboarded
    const [kycStatus, setKycStatus] = useState<'not_started' | 'incomplete' | 'under_review' | 'awaiting_questionnaire' | 'awaiting_ubo' | 'approved' | 'rejected' | 'paused' | 'offboarded'>('not_started')
    const [kybStatus, setKybStatus] = useState<'not_started' | 'incomplete' | 'under_review' | 'awaiting_questionnaire' | 'awaiting_ubo' | 'approved' | 'rejected' | 'paused' | 'offboarded'>('not_started')
    const [kycLinkUrl, setKycLinkUrl] = useState<string | null>(null)
    const [kybLinkUrl, setKybLinkUrl] = useState<string | null>(null)
    const [kycWidgetUrl, setKycWidgetUrl] = useState<string | null>(null)
    const [kybWidgetUrl, setKybWidgetUrl] = useState<string | null>(null)
    const [tosLinkUrl, setTosLinkUrl] = useState<string | null>(null)
    const [tosStatus, setTosStatus] = useState<'pending' | 'accepted' | 'rejected'>('pending')
    const [requiresVerification, setRequiresVerification] = useState(false)
    const [verificationType, setVerificationType] = useState<'kyc' | 'kyb' | null>(null)
    const [showVerificationIframe, setShowVerificationIframe] = useState(false)
    const [useCustomKyc, setUseCustomKyc] = useState(true) // Toggle between custom form and iframe
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
        // Debug logging (remove in production)
        if (process.env.NODE_ENV === 'development') {
            if (requestedFields.length > 0 && !shouldShow && fieldPath.includes('control_person') || fieldPath.includes('business')) {
                console.log(`Field "${fieldPath}" not in requestedFields:`, requestedFields)
            }
        }
        return shouldShow
    }

    // Auto-switch to correct KYB step when business-related fields are requested
    useEffect(() => {
        if (!requestedFields || requestedFields.length === 0) {
            return
        }
        
        console.log('Auto-switching step based on requestedFields:', requestedFields, 'Current verificationType:', verificationType, 'Current kybStep:', kybStep)
        
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
                console.log('Switching to control_person step')
                setKybStep('control_person')
            } else if (hasBusinessDocumentFields || hasOnlyBusinessInfoFields) {
                console.log('Switching to business_documents step')
                setKybStep('business_documents')
            }
            // Note: Step 3 (kyc_verification) is typically triggered after documents are approved
        }
    }, [requestedFields, verificationType])

    // Check Bridge status and fetch balance - moved outside useEffect so it can be called from other functions
    const checkBridgeAndFetchBalance = async () => {
            setIsLoading(true)
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
                    cache: 'no-cache',
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
                        setKybStep(statusData.kyb_step)
                        // If we're past step 1, mark control person as submitted
                        if (statusData.kyb_step !== 'control_person') {
                            setControlPersonSubmitted(true)
                        }
                        // If step is kyc_verification, also mark business documents as submitted
                        if (statusData.kyb_step === 'kyc_verification') {
                            setBusinessDocumentsSubmitted(true)
                            // If we just moved to kyc_verification step and don't have KYC link yet, fetch it automatically
                            if (previousStep !== 'kyc_verification' && !controlPersonKycIframeUrl && !controlPersonKycLink && kybFormData.control_person.email) {
                                // Automatically fetch KYC link when step becomes active (silent mode - no loading spinner)
                                handleControlPersonKyc(true)
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
                    }
                    
                    // Load requested fields and refill message from admin
                    if (statusData.requested_fields && Array.isArray(statusData.requested_fields)) {
                        console.log('Loading requested fields from admin:', statusData.requested_fields)
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
                        cache: 'no-cache',
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
                        cache: 'no-cache',
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
                        cache: 'no-cache',
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
            }
    }

    // Check Bridge status and fetch balance on mount
    useEffect(() => {
        if (!isOpen) return
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
                        const response = await fetch('/wallet/tos-callback', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                                'X-CSRF-TOKEN': getCsrfToken(),
                                'X-Requested-With': 'XMLHttpRequest',
                            },
                            credentials: 'include',
                            body: JSON.stringify({ signed_agreement_id: agreementId }),
                        })
                        
                        const data = await response.json()
                        
                        if (response.ok && data.success) {
                            // Hide TOS iframe immediately when accepted
                            setTosIframeUrl(null)
                            
                            // If action is checkStatus, it means success screen was already shown and hidden
                            // Just check the status without showing toast again
                            if (action === 'checkStatus' && hideSuccess) {
                                // Success screen was already shown, now just check status
                                // Update TOS status first, then check full status
                                setTosStatus('accepted')
                                setTosIframeUrl(null) // Hide iframe immediately
                                checkBridgeAndFetchBalance()
                            } else {
                                // First time - show success message
                                showSuccessToast('Terms of Service accepted successfully')
                                
                                // Update status immediately
                                setTosStatus('accepted')
                                setTosIframeUrl(null) // Hide iframe immediately
                                
                                // After 2 seconds (when success screen hides), check status again
                                setTimeout(() => {
                                    // Re-check status to ensure everything is synced
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
                    console.log('Verification status update:', event.data)
                    
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
                                cache: 'no-cache',
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
                    cache: 'no-cache',
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
                        cache: 'no-cache',
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
                cache: 'no-cache',
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
                    setKybStep(statusData.kyb_step)
                    // If we're past step 1, mark control person as submitted
                    if (statusData.kyb_step !== 'control_person') {
                        setControlPersonSubmitted(true)
                    }
                    // If step is kyc_verification, also mark business documents as submitted
                    if (statusData.kyb_step === 'kyc_verification') {
                        setBusinessDocumentsSubmitted(true)
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
                    cache: 'no-cache',
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
            // Always get a fresh TOS link from Bridge (refresh=1 ensures new link is fetched and saved to database)
            const response = await fetch('/wallet/bridge/tos-link?refresh=1', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
            })

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
            // Only require ID images if they are rejected or not yet uploaded
            if (documentStatuses.id_front === 'rejected' || !documentStatuses.id_front) {
                if (!kybFormData.control_person.id_front_image) {
                    errors.id_front_image = kybFormData.control_person.id_type === 'drivers_license' 
                        ? 'ID front image is required' 
                        : 'Passport image is required'
                }
            }
            // Only require back image for Driver's License
            if (kybFormData.control_person.id_type === 'drivers_license') {
                if (documentStatuses.id_back === 'rejected' || !documentStatuses.id_back) {
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
                        id_back_image: kybFormData.control_person.id_back_image || null,
                    },
                }),
            })

            const data = await response.json()

            if (data.success) {
                showSuccessToast('Control Person information submitted. Please upload business documents next.')
                setControlPersonSubmitted(true)
                setKybStep('business_documents')
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
                if (!kycFormData.id_front_image || !kycFormData.id_back_image) {
                    showErrorToast('Please upload both front and back images of your ID')
                    return
                }

                // id_front_image and id_back_image are already base64 strings
                const idFrontBase64 = typeof kycFormData.id_front_image === 'string' 
                    ? kycFormData.id_front_image 
                    : await convertImageToBase64(kycFormData.id_front_image as File)
                const idBackBase64 = typeof kycFormData.id_back_image === 'string'
                    ? kycFormData.id_back_image
                    : await convertImageToBase64(kycFormData.id_back_image as File)

                const response = await fetch('/wallet/bridge/create-customer-kyc', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': getCsrfToken(),
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'include',
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
                        id_back_image: idBackBase64,
                    }),
                })

                const data = await response.json()

                if (data.success) {
                    showSuccessToast('KYC data submitted successfully. Verification is pending.')
                    setKycStatus('pending')
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
                            cache: 'no-cache',
                        })
                        .then(res => res.json())
                        .then(statusData => {
                            if (statusData.success) {
                                if (statusData.kyc_status) {
                                    setKycStatus(statusData.kyc_status)
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
                cache: 'no-cache',
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

    const formatAddress = (address: string | null) => {
        if (!address) return ''
        return `${address.slice(0, 6)}...${address.slice(-4)}`
    }

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

    // Fetch deposit instructions when addMoney view is shown
    useEffect(() => {
        if (actionView === 'addMoney' && !depositInstructions) {
            const fetchDepositInstructions = async () => {
                setIsLoadingDepositInstructions(true)
                try {
                    const response = await fetch('/wallet/bridge/deposit-instructions', {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'X-CSRF-TOKEN': getCsrfToken(),
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                        credentials: 'include',
                        cache: 'no-cache',
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
        }
    }, [actionView, depositInstructions])

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
                    cache: 'no-cache',
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
                        cache: 'no-cache',
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
                            cache: 'no-cache',
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
                            cache: 'no-cache',
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

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop - No blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 z-50"
                    />

                    {/* Popup - MetaMask style structure */}
                    <motion.div
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
                                    className={`relative flex-1 px-4 py-2.5 text-sm font-medium rounded-md z-10 ${
                                        activeTab === 'account'
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
                                    className={`relative flex-1 px-4 py-2.5 text-sm font-medium rounded-md z-10 ${
                                        activeTab === 'activity'
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
                            {/* Success Animation Overlay */}
                            <AnimatePresence>
                                {showSuccess && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        transition={{ duration: 0.3 }}
                                        className="absolute inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm rounded-b-xl"
                                    >
                                        <div className="text-center space-y-4 p-6">
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
                                                className="mx-auto w-20 h-20 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center shadow-lg"
                                            >
                                                <CheckCircle2 className="h-12 w-12 text-white" />
                                            </motion.div>
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.2 }}
                                                className="space-y-2"
                                            >
                                                <h3 className="text-xl font-bold">
                                                    {successType === 'send' && 'Transaction Sent!'}
                                                    {successType === 'receive' && 'Address Copied!'}
                                                    {successType === 'swap' && 'Swap Completed!'}
                                                    {successType === 'addMoney' && 'Money Added!'}
                                                </h3>
                                                <p className="text-sm text-muted-foreground">{successMessage}</p>
                                            </motion.div>
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.4 }}
                                            >
                                                <div className="w-12 h-1 bg-primary/20 rounded-full mx-auto overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: '100%' }}
                                                        transition={{ duration: 3, ease: 'linear' }}
                                                        className="h-full bg-gradient-to-r from-purple-600 to-blue-600"
                                                    />
                                                </div>
                                            </motion.div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Balance Display - Show at top for all action views */}
                            {(actionView === 'send' || actionView === 'receive' || actionView === 'swap' || actionView === 'addMoney' || actionView === 'transfer_from_external') && !showSuccess && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="p-4 pb-2 border-b border-border"
                                >
                                    <div className="text-center py-4">
                                        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Balance</p>
                                        <div className="flex items-center justify-center gap-2">
                                            <motion.span
                                                key={walletBalance}
                                                initial={{ scale: 1.2 }}
                                                animate={{ scale: 1 }}
                                                transition={{ duration: 0.3 }}
                                                className="text-3xl font-bold"
                                            >
                                                ${walletBalance !== null 
                                                    ? walletBalance.toLocaleString('en-US', { 
                                                        minimumFractionDigits: 2, 
                                                        maximumFractionDigits: 2 
                                                    })
                                                    : '0.00'
                                                }
                                            </motion.span>
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
                                </motion.div>
                            )}

                            {!showSuccess && actionView === 'send' ? (
                                /* Send View */
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="p-4 space-y-4"
                                >
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs text-muted-foreground mb-1.5 block">Send Amount</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10">$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max={walletBalance || undefined}
                                                    value={sendAmount}
                                                    onChange={(e) => setSendAmount(e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full pl-8 pr-4 py-2.5 bg-muted border border-border rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                                                />
                                            </div>
                                            {walletBalance !== null && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Available: ${walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </p>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <label className="text-xs text-muted-foreground mb-1.5 block">Send To</label>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <input
                                                    ref={searchInputRef}
                                                    type="text"
                                                    value={recipientSearch}
                                                    onChange={(e) => {
                                                        setRecipientSearch(e.target.value)
                                                        setShowDropdown(true)
                                                        if (!e.target.value) {
                                                            setSelectedRecipient(null)
                                                            setSendAddress('')
                                                        }
                                                    }}
                                                    onFocus={() => {
                                                        if (searchResults.length > 0) {
                                                            setShowDropdown(true)
                                                        }
                                                    }}
                                                    placeholder="Search by name or email..."
                                                    className="w-full pl-10 pr-4 py-2.5 bg-muted border border-border rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 text-sm"
                                                />
                                                {isLoadingSearch && (
                                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                        <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Dropdown Results */}
                                            <AnimatePresence>
                                                {showDropdown && searchResults.length > 0 && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        transition={{ duration: 0.2 }}
                                                        ref={dropdownRef}
                                                        className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                                                        style={{
                                                            scrollbarWidth: 'none',
                                                            msOverflowStyle: 'none',
                                                        }}
                                                    >
                                                        {searchResults.map((result) => (
                                                            <button
                                                                key={result.id}
                                                                type="button"
                                                                onClick={() => handleSelectRecipient(result)}
                                                                className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-muted transition-colors text-left border-b border-border last:border-b-0 ${
                                                                    selectedRecipient?.id === result.id ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                                                                }`}
                                                            >
                                                                <div className={`p-2 rounded-lg ${
                                                                    result.type === 'organization' 
                                                                        ? 'bg-blue-500/10 text-blue-500' 
                                                                        : 'bg-green-500/10 text-green-500'
                                                                }`}>
                                                                    {result.type === 'organization' ? (
                                                                        <Building2 className="h-4 w-4" />
                                                                    ) : (
                                                                        <User className="h-4 w-4" />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium truncate">{result.name}</p>
                                                                    {result.email && (
                                                                        <p className="text-xs text-muted-foreground truncate">{result.email}</p>
                                                                    )}
                                                                </div>
                                                                <span className={`text-xs px-2 py-1 rounded ${
                                                                    result.type === 'organization'
                                                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                                }`}>
                                                                    {result.type === 'organization' ? 'Organization' : 'User'}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                            
                                            {selectedRecipient && (
                                                <div className="mt-2 p-2 sm:p-2.5 bg-muted/50 rounded-lg flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                                                        <span className="text-muted-foreground flex-shrink-0">Selected:</span>
                                                        <span className="font-medium truncate min-w-0">{selectedRecipient.display_name}</span>
                                                    </div>
                                                    <span className="text-muted-foreground font-mono text-[10px] sm:ml-auto flex-shrink-0">
                                                        {formatAddress(selectedRecipient.address)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleSend}
                                        disabled={isLoading || !sendAmount || (!selectedRecipient && !sendAddress)}
                                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                                    >
                                        {isLoading ? (
                                            <>
                                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            'Send'
                                        )}
                                    </Button>
                                </motion.div>
                            ) : !showSuccess && actionView === 'external_accounts' ? (
                                /* External Accounts View */
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="p-4 space-y-4"
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-semibold">Linked Bank Accounts</h3>
                                            <Button
                                                onClick={fetchExternalAccounts}
                                                disabled={isLoadingExternalAccounts}
                                                size="sm"
                                                variant="outline"
                                            >
                                                <RefreshCw className={`h-3 w-3 mr-1 ${isLoadingExternalAccounts ? 'animate-spin' : ''}`} />
                                                Refresh
                                            </Button>
                                        </div>

                                        {isLoadingExternalAccounts ? (
                                            <div className="text-center py-8">
                                                <RefreshCw className="h-6 w-6 text-muted-foreground mx-auto mb-3 animate-spin" />
                                                <p className="text-xs text-muted-foreground">Loading accounts...</p>
                                            </div>
                                        ) : externalAccounts.length === 0 ? (
                                            <div className="text-center py-8 border border-dashed border-border rounded-lg">
                                                <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                                                <p className="text-sm font-medium mb-1">No bank accounts linked</p>
                                                <p className="text-xs text-muted-foreground mb-4">Link a bank account to start transferring funds</p>
                                                <Button
                                                    onClick={() => {
                                                        const routingNumber = prompt('Enter routing number:')
                                                        const accountNumber = prompt('Enter account number:')
                                                        const accountType = prompt('Account type (checking/savings):') as 'checking' | 'savings'
                                                        const accountHolderName = prompt('Account holder name:')
                                                        
                                                        if (routingNumber && accountNumber && accountType && accountHolderName) {
                                                            handleLinkExternalAccount({
                                                                routing_number: routingNumber,
                                                                account_number: accountNumber,
                                                                account_type: accountType,
                                                                account_holder_name: accountHolderName,
                                                            })
                                                        }
                                                    }}
                                                    size="sm"
                                                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                                                >
                                                    <Plus className="h-3 w-3 mr-1" />
                                                    Link Bank Account
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {externalAccounts.map((account) => (
                                                    <div
                                                        key={account.id}
                                                        className="p-3 bg-muted rounded-lg border border-border"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex-1">
                                                                <p className="text-sm font-medium">{account.account_holder_name}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1)} • 
                                                                    ••••{account.account_number.slice(-4)}
                                                                </p>
                                                            </div>
                                                            <span className={`text-xs px-2 py-1 rounded ${
                                                                account.status === 'verified' 
                                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                                            }`}>
                                                                {account.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                                <Button
                                                    onClick={() => {
                                                        const routingNumber = prompt('Enter routing number:')
                                                        const accountNumber = prompt('Enter account number:')
                                                        const accountType = prompt('Account type (checking/savings):') as 'checking' | 'savings'
                                                        const accountHolderName = prompt('Account holder name:')
                                                        
                                                        if (routingNumber && accountNumber && accountType && accountHolderName) {
                                                            handleLinkExternalAccount({
                                                                routing_number: routingNumber,
                                                                account_number: accountNumber,
                                                                account_type: accountType,
                                                                account_holder_name: accountHolderName,
                                                            })
                                                        }
                                                    }}
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full"
                                                >
                                                    <Plus className="h-3 w-3 mr-1" />
                                                    Link Another Account
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ) : !showSuccess && actionView === 'transfer_from_external' ? (
                                /* Transfer from External Account View */
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="p-4 space-y-4"
                                >
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs text-muted-foreground mb-1.5 block">Select Bank Account</label>
                                            <select
                                                value={selectedExternalAccount}
                                                onChange={(e) => setSelectedExternalAccount(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                                            >
                                                <option value="">Select an account...</option>
                                                {externalAccounts
                                                    .filter(acc => acc.status === 'verified')
                                                    .map((account) => (
                                                        <option key={account.id} value={account.id}>
                                                            {account.account_holder_name} • ••••{account.account_number.slice(-4)}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-xs text-muted-foreground mb-1.5 block">Amount</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10">$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    value={transferAmount}
                                                    onChange={(e) => setTransferAmount(e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full pl-8 pr-4 py-2.5 bg-muted border border-border rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                                                />
                                            </div>
                                        </div>

                                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                            <p className="text-xs text-blue-900 dark:text-blue-100">
                                                <strong>Note:</strong> Transfers from external accounts may take 1-3 business days to process.
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleTransferFromExternal}
                                        disabled={isLoading || !selectedExternalAccount || !transferAmount || parseFloat(transferAmount) <= 0}
                                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                                    >
                                        {isLoading ? (
                                            <>
                                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            'Initiate Transfer'
                                        )}
                                    </Button>
                                </motion.div>
                            ) : !showSuccess && actionView === 'receive' ? (
                                /* Receive View */
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="p-4 space-y-4"
                                >
                                    <div className="text-center py-4">
                                        <div className="inline-block p-4 bg-muted rounded-xl mb-4">
                                            <QrCode className="h-16 w-16 text-muted-foreground" />
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-4">Share this address to receive funds</p>
                                        {walletAddress && (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border">
                                                    <code className="text-sm font-mono flex-1 text-left break-all">
                                                        {walletAddress}
                                                    </code>
                                                    <button
                                                        onClick={handleCopyReceiveAddress}
                                                        className="p-2 rounded-lg hover:bg-background transition-colors flex-shrink-0 ml-2"
                                                        title="Copy address"
                                                    >
                                                        {copied ? (
                                                            <Check className="h-4 w-4 text-green-500" />
                                                        ) : (
                                                            <Copy className="h-4 w-4 text-muted-foreground" />
                                                        )}
                                                    </button>
                                                </div>
                                                <Button
                                                    onClick={handleCopyReceiveAddress}
                                                    variant="outline"
                                                    className="w-full"
                                                >
                                                    <Copy className="h-4 w-4 mr-2" />
                                                    Copy Address
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ) : !showSuccess && actionView === 'swap' ? (
                                /* Swap View - Coming Soon */
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="p-4 space-y-4"
                                >
                                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                        <div className="p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full">
                                            <ArrowRightLeft className="h-8 w-8 text-white" />
                                        </div>
                                        <div className="text-center">
                                            <h3 className="text-xl font-bold mb-2">Coming Soon</h3>
                                            <p className="text-sm text-muted-foreground">
                                                The swap feature is under development and will be available soon.
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : !showSuccess && actionView === 'addMoney' ? (
                                /* Add Money View */
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="p-4 space-y-4"
                                >
                                    {isLoadingDepositInstructions ? (
                                        <div className="flex items-center justify-center py-8">
                                            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : depositInstructions ? (
                                        <div className="space-y-4">
                                            {/* Payment Method Tabs - Only show if multiple payment methods available */}
                                            {(() => {
                                                const hasAch = (depositInstructions.payment_rails && depositInstructions.payment_rails.includes('ach_push')) || depositInstructions.payment_rail === 'ach_push'
                                                const hasWire = (depositInstructions.payment_rails && depositInstructions.payment_rails.includes('wire')) || depositInstructions.payment_rail === 'wire'
                                                const hasMultiple = (hasAch && hasWire) || (depositInstructions.payment_rails && depositInstructions.payment_rails.length > 1)
                                                
                                                return hasMultiple ? (
                                                    <div className="relative flex gap-2 p-1 bg-muted rounded-lg">
                                                        {/* Animated background indicator */}
                                                        <motion.div
                                                            className="absolute inset-y-1 rounded-md bg-gradient-to-r from-purple-600 to-blue-600 shadow-md"
                                                            initial={false}
                                                            animate={{
                                                                x: selectedPaymentMethod === 'ach' ? 0 : '100%',
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
                                                        
                                                        {hasAch && (
                                                            <motion.button
                                                                onClick={() => setSelectedPaymentMethod('ach')}
                                                                className={`relative flex-1 px-4 py-2 text-sm font-medium rounded-md z-10 ${
                                                                    selectedPaymentMethod === 'ach'
                                                                        ? 'text-white'
                                                                        : 'text-muted-foreground hover:text-foreground'
                                                                }`}
                                                                whileHover={{ scale: 1.02 }}
                                                                whileTap={{ scale: 0.98 }}
                                                            >
                                                                <motion.span
                                                                    animate={{
                                                                        scale: selectedPaymentMethod === 'ach' ? 1.05 : 1,
                                                                    }}
                                                                    transition={{
                                                                        type: 'spring',
                                                                        stiffness: 400,
                                                                        damping: 25,
                                                                    }}
                                                                >
                                                                    ACH
                                                                </motion.span>
                                                            </motion.button>
                                                        )}
                                                        {hasWire && (
                                                            <motion.button
                                                                onClick={() => setSelectedPaymentMethod('wire')}
                                                                className={`relative flex-1 px-4 py-2 text-sm font-medium rounded-md z-10 ${
                                                                    selectedPaymentMethod === 'wire'
                                                                        ? 'text-white'
                                                                        : 'text-muted-foreground hover:text-foreground'
                                                                }`}
                                                                whileHover={{ scale: 1.02 }}
                                                                whileTap={{ scale: 0.98 }}
                                                            >
                                                                <motion.span
                                                                    animate={{
                                                                        scale: selectedPaymentMethod === 'wire' ? 1.05 : 1,
                                                                    }}
                                                                    transition={{
                                                                        type: 'spring',
                                                                        stiffness: 400,
                                                                        damping: 25,
                                                                    }}
                                                                >
                                                                    WIRE
                                                                </motion.span>
                                                            </motion.button>
                                                        )}
                                                    </div>
                                                ) : null
                                            })()}

                                            {/* Bank Details Section */}
                                            <div className="p-4 bg-gradient-to-br from-purple-600/10 via-blue-600/10 to-purple-600/10 dark:from-purple-900/30 dark:via-blue-900/30 dark:to-purple-900/30 rounded-xl border border-purple-200/50 dark:border-purple-800/50 backdrop-blur-sm">
                                                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-purple-200/30 dark:border-purple-700/30">
                                                    <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
                                                        <Building2 className="h-4 w-4 text-white" />
                                                    </div>
                                                    <h3 className="text-base font-bold text-foreground">
                                                        {selectedPaymentMethod === 'ach' ? 'ACH Deposit Details' : 'Wire Transfer Details'}
                                                    </h3>
                                                </div>
                                                
                                                <div className="space-y-3.5">
                                                    {depositInstructions.bank_name && (
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bank Name</p>
                                                            <p className="text-sm font-semibold text-foreground">{depositInstructions.bank_name}</p>
                                                        </div>
                                                    )}
                                                    
                                                    {depositInstructions.bank_address && (
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bank Address</p>
                                                            <p className="text-sm text-foreground break-words">{depositInstructions.bank_address}</p>
                                                        </div>
                                                    )}
                                                    
                                                    {depositInstructions.bank_routing_number && (
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Routing Number</p>
                                                            <div className="flex items-center gap-2">
                                                                <code className="flex-1 px-3 py-2 bg-background/50 dark:bg-background/30 border border-border rounded-lg font-mono text-sm font-semibold text-foreground">
                                                                    {depositInstructions.bank_routing_number}
                                                                </code>
                                                                <button
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(depositInstructions.bank_routing_number || '')
                                                                        showSuccessToast('Routing number copied!')
                                                                    }}
                                                                    className="p-2 hover:bg-background/50 rounded-lg border border-border transition-colors"
                                                                    title="Copy routing number"
                                                                >
                                                                    <Copy className="h-4 w-4 text-muted-foreground" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    {depositInstructions.bank_account_number && (
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Account Number</p>
                                                            <div className="flex items-center gap-2">
                                                                <code className="flex-1 px-3 py-2 bg-background/50 dark:bg-background/30 border border-border rounded-lg font-mono text-sm font-semibold text-foreground">
                                                                    {depositInstructions.bank_account_number}
                                                                </code>
                                                                <button
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(depositInstructions.bank_account_number || '')
                                                                        showSuccessToast('Account number copied!')
                                                                    }}
                                                                    className="p-2 hover:bg-background/50 rounded-lg border border-border transition-colors"
                                                                    title="Copy account number"
                                                                >
                                                                    <Copy className="h-4 w-4 text-muted-foreground" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    {depositInstructions.bank_beneficiary_name && (
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Beneficiary Name</p>
                                                            <p className="text-sm font-semibold text-foreground break-words">{depositInstructions.bank_beneficiary_name}</p>
                                                        </div>
                                                    )}
                                                    
                                                    {depositInstructions.bank_beneficiary_address && (
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Beneficiary Address</p>
                                                            <p className="text-sm text-foreground break-words">{depositInstructions.bank_beneficiary_address}</p>
                                                        </div>
                                                    )}
                                                    
                                                </div>
                                            </div>

                                            {/* Instructions Card */}
                                            <div className="p-3.5 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-lg">
                                                <div className="flex items-start gap-2.5">
                                                    <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1.5">
                                                            How to Deposit via {selectedPaymentMethod === 'ach' ? 'ACH' : 'Wire Transfer'}
                                                        </p>
                                                        <p className="text-xs leading-relaxed text-blue-700 dark:text-blue-300">
                                                            {selectedPaymentMethod === 'ach' 
                                                                ? 'Use the bank details above to make an ACH deposit. ACH transfers typically take 1-3 business days to process. Funds will be credited to your wallet once the transfer is processed.'
                                                                : 'Use the bank details above to make a wire transfer. Wire transfers are typically processed same-day or within 1 business day. Funds will be credited to your wallet once the transfer is processed.'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                            <p className="text-sm text-muted-foreground">No deposit instructions available</p>
                                        </div>
                                    )}
                                </motion.div>
                            ) : isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : activeTab === 'account' ? (
                                (() => {
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
                                })() === 'wallet_screen' ? (
                                    /* Wallet Screen - Show when wallet/virtual account exists */
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
                                                <span className="font-medium">{isSandbox ? 'Sandbox Virtual Account' : 'Organization Wallet'}</span>
                                            </div>
                                        </div>
                                    </div>
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
                                    /* Approved but No Wallet Screen */
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ duration: 0.3 }}
                                        className="flex-1 flex flex-col items-center justify-center p-6 space-y-6 relative z-10"
                                    >
                                        <div className="text-center space-y-4 w-full">
                                            {/* Success Icon */}
                                            <motion.div
                                                initial={{ scale: 0.8 }}
                                                animate={{ scale: 1 }}
                                                transition={{ duration: 0.3, delay: 0.1 }}
                                                className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-xl relative"
                                            >
                                                <CheckCircle2 className="h-12 w-12 text-white" />
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
                                                    className="absolute inset-0 rounded-full bg-green-400/30"
                                                />
                                            </motion.div>

                                            {/* Title and Description */}
                                            <div className="space-y-2">
                                                <h3 className="text-2xl font-bold">Account Approved!</h3>
                                                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                                                    Your {verificationType === 'kyb' ? 'business verification (KYB)' : 'identity verification (KYC)'} has been approved.
                                                </p>
                                            </div>

                                            {/* Create Wallet Button - Works in both sandbox and production */}
                                            <div className="w-full max-w-sm mx-auto space-y-4 relative z-10">
                                                <Button
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        if (!isLoading) {
                                                            handleCreateWallet()
                                                        }
                                                    }}
                                                    disabled={isLoading}
                                                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
                                                    size="lg"
                                                    type="button"
                                                >
                                                    {isLoading ? (
                                                        <>
                                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                            {isSandbox ? 'Creating Virtual Account...' : 'Creating Wallet...'}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Wallet className="h-4 w-4 mr-2" />
                                                            {isSandbox ? 'Create Virtual Account' : 'Create Wallet'}
                                                        </>
                                                    )}
                                                </Button>

                                                {/* Sandbox Info */}
                                                {isSandbox && (
                                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                                        <div className="flex items-start gap-2">
                                                            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                                            <div className="text-left">
                                                                <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                                                                    Sandbox Mode
                                                                </p>
                                                                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                                                    In sandbox mode, a virtual account will be created instead of a wallet. This allows you to test deposits and transfers.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Info */}
                                                {!isSandbox && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Your wallet and virtual account will be created automatically
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (() => {
                                    // Check if we should show Connect Wallet
                                    if (!bridgeInitialized && !isLoading) {
                                        return 'connect_wallet'
                                    }
                                    return 'other'
                                })() === 'connect_wallet' ? (
                                    /* Connect Wallet View */
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ duration: 0.3 }}
                                        className="flex-1 flex flex-col items-center justify-center p-6 space-y-6 relative z-10"
                                    >
                                        <div className="text-center space-y-4 w-full">
                                            <div className="mx-auto w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                                                <Wallet className="h-10 w-10 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold mb-2">Connect Your Wallet</h3>
                                                <p className="text-sm text-muted-foreground max-w-sm">
                                                    Connect your wallet to Bridge to start managing your funds, making transactions, and accessing all wallet features.
                                                </p>
                                            </div>
                                            {organizationName && (
                                                <div className="p-4 bg-muted rounded-lg border border-border">
                                                    <div className="flex items-center gap-3">
                                                        <Building2 className="h-5 w-5 text-primary" />
                                                        <div className="text-left">
                                                            <p className="text-xs text-muted-foreground mb-1">Organization</p>
                                                            <p className="text-sm font-medium">{organizationName}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            <Button
                                                onClick={handleConnectWallet}
                                                disabled={isLoading}
                                                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                                                size="lg"
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                        Connecting...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Wallet className="h-4 w-4 mr-2" />
                                                        Connect Wallet
                                                    </>
                                                )}
                                            </Button>
                                            <p className="text-xs text-muted-foreground">
                                                Your organization information will be used to create your Bridge account
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
                                                    className={`py-3 sm:py-4 pl-2 sm:pl-3 pr-3 sm:pr-4 rounded-lg border-2 transition-all w-full ${
                                                        tosStatus === 'accepted' 
                                                            ? 'bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-600' 
                                                            : 'bg-muted border-border'
                                                    }`}
                                                >
                                                    {/* Title Section - Flex Layout */}
                                                    <div className="flex items-start gap-2 sm:gap-3 mb-3">
                                                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                                            tosStatus === 'accepted' 
                                                                ? 'bg-green-500 text-white' 
                                                                : 'bg-muted-foreground/20 text-muted-foreground'
                                                        }`}>
                                                            {tosStatus === 'accepted' ? (
                                                                <CheckCircle2 className="h-5 w-5" />
                                                            ) : (
                                                                <span className="text-sm font-bold">1</span>
                                                            )}
                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <h4 className="font-semibold text-sm text-foreground">Accept Terms of Service</h4>
                                                                {tosStatus === 'accepted' && (
                                                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground dark:text-muted-foreground mb-0 text-left">
                                                                Review and accept Bridge's terms of service to proceed
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* TOS Content - Full Width */}
                                                    {tosStatus !== 'accepted' && (
                                                        <div className="w-full">
                                                            {tosIframeUrl ? (
                                                                <TermsOfService
                                                                    tosUrl={tosIframeUrl}
                                                                    onAccept={handleConfirmTosAcceptance}
                                                                    onCancel={() => setTosIframeUrl(null)}
                                                                    isAccepted={tosStatus === 'accepted'}
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
                                                    className={`py-3 sm:py-4 pl-2 sm:pl-3 pr-3 sm:pr-4 rounded-lg border-2 transition-all w-full ${
                                                        (verificationType === 'kyb' ? kybStatus : kycStatus) === 'approved' 
                                                            ? 'bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-600' 
                                                            : tosStatus === 'accepted'
                                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-600'
                                                            : 'bg-muted border-border opacity-60'
                                                    }`}
                                                >
                                                    {/* Title Section - Flex Layout */}
                                                    <div className="flex items-start gap-2 sm:gap-3 mb-3">
                                                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                                            (verificationType === 'kyb' ? kybStatus : kycStatus) === 'approved'
                                                                ? 'bg-green-500 text-white' 
                                                                : tosStatus === 'accepted'
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
                                                    {tosStatus === 'accepted' && (verificationType === 'kyb' ? kybStatus : kycStatus) !== 'approved' && (
                                                        // For KYB multi-step flow, always show form (user is completing steps)
                                                        verificationType === 'kyb' ||
                                                        // For regular KYC, hide if status is in progress (not not_started, approved, or rejected)
                                                        (verificationType === 'kyc' && kycStatus !== 'not_started' && kycStatus !== 'approved' && kycStatus !== 'rejected')
                                                    ) && (
                                                        <div className="space-y-2 sm:space-y-3 w-full mt-3">
                                                                    {/* Toggle between custom form and iframe */}
                                                                    <div className="flex gap-2 w-full">
                                                                        <Button
                                                                            size="sm"
                                                                            variant={useCustomKyc ? "default" : "outline"}
                                                                            onClick={() => setUseCustomKyc(true)}
                                                                            className={`flex-1 text-xs ${
                                                                                useCustomKyc 
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
                                                                            className={`flex-1 text-xs ${
                                                                                !useCustomKyc 
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
                                                                            {verificationType === 'kyb' ? (
                                                                                /* Business KYB Multi-Step Form */
                                                                                <>
                                                                                    {/* Step Indicator with Labels */}
                                                                                    <div className="mb-3 space-y-2">
                                                                                        <div className="flex items-center gap-1">
                                                                                            {/* Step 1 */}
                                                                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-200 ${
                                                                                                    kybStep === 'control_person' 
                                                                                                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' 
                                                                                                        : kybStep === 'business_documents' || kybStep === 'kyc_verification'
                                                                                                        ? 'bg-green-500 text-white'
                                                                                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                                                                                }`}>
                                                                                                    {kybStep === 'business_documents' || kybStep === 'kyc_verification' ? (
                                                                                                        <CheckCircle2 className="h-3 w-3" />
                                                                                                    ) : (
                                                                                                        '1'
                                                                                                    )}
                                                                                                </div>
                                                                                                <span className={`text-[10px] font-medium whitespace-nowrap hidden sm:inline ${
                                                                                                    kybStep === 'control_person' 
                                                                                                        ? 'text-blue-600 dark:text-blue-400' 
                                                                                                        : kybStep === 'business_documents' || kybStep === 'kyc_verification'
                                                                                                        ? 'text-green-600 dark:text-green-400'
                                                                                                        : 'text-gray-500 dark:text-gray-400'
                                                                                                }`}>
                                                                                                    Control Person
                                                                                                </span>
                                                                                            </div>
                                                                                            
                                                                                            {/* Connector 1 */}
                                                                                            <div className={`flex-1 h-0.5 rounded-full transition-all duration-200 ${
                                                                                                kybStep === 'business_documents' || kybStep === 'kyc_verification' 
                                                                                                    ? 'bg-green-500' 
                                                                                                    : 'bg-gray-200 dark:bg-gray-700'
                                                                                            }`}></div>
                                                                                            
                                                            {/* Step 2 */}
                                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-200 ${
                                                                    kybStep === 'business_documents' 
                                                                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' 
                                                                        : (kybStep === 'kyc_verification' || businessDocumentsSubmitted)
                                                                        ? 'bg-green-500 text-white'
                                                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                                                }`}>
                                                                    {(kybStep === 'kyc_verification' || businessDocumentsSubmitted) ? (
                                                                        <CheckCircle2 className="h-3 w-3" />
                                                                    ) : (
                                                                        '2'
                                                                    )}
                                                                </div>
                                                                <span className={`text-[10px] font-medium whitespace-nowrap hidden sm:inline ${
                                                                    kybStep === 'business_documents' 
                                                                        ? 'text-blue-600 dark:text-blue-400' 
                                                                        : (kybStep === 'kyc_verification' || businessDocumentsSubmitted)
                                                                        ? 'text-green-600 dark:text-green-400'
                                                                        : 'text-gray-500 dark:text-gray-400'
                                                                }`}>
                                                                    Documents
                                                                </span>
                                                                                            </div>
                                                                                            
                                                            {/* Connector 2 */}
                                                            <div className={`flex-1 h-0.5 rounded-full transition-all duration-200 ${
                                                                kybStep === 'kyc_verification' 
                                                                    ? 'bg-green-500' 
                                                                    : (kybSubmissionStatus === 'approved' || businessDocumentsSubmitted) 
                                                                    ? 'bg-green-500' 
                                                                    : 'bg-gray-200 dark:bg-gray-700'
                                                            }`}></div>
                                                                                            
                                                                                            {/* Step 3 */}
                                                                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-200 ${
                                                                                                    kybStep === 'kyc_verification' 
                                                                                                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' 
                                                                                                        : (kybSubmissionStatus === 'approved')
                                                                                                        ? 'bg-green-500 text-white'
                                                                                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                                                                                }`}>
                                                                                                    {kybSubmissionStatus === 'approved' && kybStep !== 'kyc_verification' ? (
                                                                                                        <CheckCircle2 className="h-3 w-3" />
                                                                                                    ) : (
                                                                                                        '3'
                                                                                                    )}
                                                                                                </div>
                                                                                                <span className={`text-[10px] font-medium whitespace-nowrap hidden sm:inline ${
                                                                                                    kybStep === 'kyc_verification' 
                                                                                                        ? 'text-blue-600 dark:text-blue-400' 
                                                                                                        : (kybSubmissionStatus === 'approved')
                                                                                                        ? 'text-green-600 dark:text-green-400'
                                                                                                        : 'text-gray-500 dark:text-gray-400'
                                                                                                }`}>
                                                                                                    KYC Verify
                                                                                                </span>
                                                                                            </div>
                                                                                        </div>
                                                                                        
                                                                                        {/* Step Labels (Mobile) */}
                                                                                        <div className="sm:hidden text-center">
                                                                                            <p className={`text-[10px] font-medium ${
                                                                                                kybStep === 'control_person' 
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
                                                                                                    <div className="flex items-start gap-2">
                                                                                                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                                                                                        <div className="flex-1">
                                                                                                            <p className="text-xs font-semibold text-amber-900 dark:text-amber-100 mb-1">
                                                                                                                Admin Request: Please Re-fill the Following Fields
                                                                                                            </p>
                                                                                                            {refillMessage && (
                                                                                                                <p className="text-xs text-amber-800 dark:text-amber-200 mb-2">
                                                                                                                {refillMessage}
                                                                                                            </p>
                                                                                                            )}
                                                                                                            {requestedFields && requestedFields.length > 0 && (
                                                                                                                <div className="mt-2">
                                                                                                                    <p className="text-xs font-medium text-amber-900 dark:text-amber-100 mb-1">
                                                                                                                        Requested Fields ({requestedFields.length}):
                                                                                                                    </p>
                                                                                                                    <div className="flex flex-wrap gap-1">
                                                                                                                        {requestedFields.map((field, idx) => (
                                                                                                                            <span key={idx} className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 rounded">
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
                                                                                                <p className="text-xs font-semibold mb-2 text-left">Step 1: Control Person (Beneficial Owner) Information *</p>
                                                                                                <p className="text-xs text-muted-foreground mb-3 text-left">
                                                                                                    {requestedFields.length > 0 
                                                                                                        ? 'Please re-fill the requested fields below.' 
                                                                                                        : 'Required by Bridge for business verification'}
                                                                                                </p>
                                                                                        
                                                                                        {/* Control Person Fields */}
                                                                                        <div className="space-y-2 sm:space-y-3">
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
                                                                                                                control_person: {...kybFormData.control_person, first_name: e.target.value}
                                                                                                            })
                                                                                                            // Clear error when user starts typing
                                                                                                            if (controlPersonErrors.first_name) {
                                                                                                                setControlPersonErrors(prev => {
                                                                                                                    const newErrors = {...prev}
                                                                                                                    delete newErrors.first_name
                                                                                                                    return newErrors
                                                                                                                })
                                                                                                            }
                                                                                                        }}
                                                                                                        className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground ${
                                                                                                            controlPersonErrors.first_name ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'
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
                                                                                                                control_person: {...kybFormData.control_person, last_name: e.target.value}
                                                                                                            })
                                                                                                            if (controlPersonErrors.last_name) {
                                                                                                                setControlPersonErrors(prev => {
                                                                                                                    const newErrors = {...prev}
                                                                                                                    delete newErrors.last_name
                                                                                                                    return newErrors
                                                                                                                })
                                                                                                            }
                                                                                                        }}
                                                                                                        className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground ${
                                                                                                            controlPersonErrors.last_name ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'
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
                                                                                                            control_person: {...kybFormData.control_person, email: e.target.value}
                                                                                                        })
                                                                                                        if (controlPersonErrors.email) {
                                                                                                            setControlPersonErrors(prev => {
                                                                                                                const newErrors = {...prev}
                                                                                                                delete newErrors.email
                                                                                                                return newErrors
                                                                                                            })
                                                                                                        }
                                                                                                    }}
                                                                                                    className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground ${
                                                                                                        controlPersonErrors.email ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'
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
                                                                                                                control_person: {...kybFormData.control_person, birth_date: e.target.value}
                                                                                                            })
                                                                                                            if (controlPersonErrors.birth_date) {
                                                                                                                setControlPersonErrors(prev => {
                                                                                                                    const newErrors = {...prev}
                                                                                                                    delete newErrors.birth_date
                                                                                                                    return newErrors
                                                                                                                })
                                                                                                            }
                                                                                                        }}
                                                                                                        className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground ${
                                                                                                            controlPersonErrors.birth_date ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'
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
                                                                                                                control_person: {...kybFormData.control_person, ssn: e.target.value}
                                                                                                            })
                                                                                                            if (controlPersonErrors.ssn) {
                                                                                                                setControlPersonErrors(prev => {
                                                                                                                    const newErrors = {...prev}
                                                                                                                    delete newErrors.ssn
                                                                                                                    return newErrors
                                                                                                                })
                                                                                                            }
                                                                                                        }}
                                                                                                        className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground ${
                                                                                                            controlPersonErrors.ssn ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'
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
                                                                                                                control_person: {...kybFormData.control_person, title: e.target.value}
                                                                                                            })
                                                                                                            if (controlPersonErrors.title) {
                                                                                                                setControlPersonErrors(prev => {
                                                                                                                    const newErrors = {...prev}
                                                                                                                    delete newErrors.title
                                                                                                                    return newErrors
                                                                                                                })
                                                                                                            }
                                                                                                        }}
                                                                                                        className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground ${
                                                                                                            controlPersonErrors.title ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'
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
                                                                                                                control_person: {...kybFormData.control_person, ownership_percentage: e.target.value}
                                                                                                            })
                                                                                                            if (controlPersonErrors.ownership_percentage) {
                                                                                                                setControlPersonErrors(prev => {
                                                                                                                    const newErrors = {...prev}
                                                                                                                    delete newErrors.ownership_percentage
                                                                                                                    return newErrors
                                                                                                                })
                                                                                                            }
                                                                                                        }}
                                                                                                        className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground ${
                                                                                                            controlPersonErrors.ownership_percentage ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'
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
                                                                                                                control_person: {...kybFormData.control_person, street_line_1: e.target.value}
                                                                                                            })
                                                                                                            if (controlPersonErrors.street_line_1) {
                                                                                                                setControlPersonErrors(prev => {
                                                                                                                    const newErrors = {...prev}
                                                                                                                    delete newErrors.street_line_1
                                                                                                                    return newErrors
                                                                                                                })
                                                                                                            }
                                                                                                        }}
                                                                                                        className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground mb-2 ${
                                                                                                            controlPersonErrors.street_line_1 ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'
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
                                                                                                                    control_person: {...kybFormData.control_person, city: e.target.value}
                                                                                                                })
                                                                                                                if (controlPersonErrors.city) {
                                                                                                                    setControlPersonErrors(prev => {
                                                                                                                        const newErrors = {...prev}
                                                                                                                        delete newErrors.city
                                                                                                                        return newErrors
                                                                                                                    })
                                                                                                                }
                                                                                                            }}
                                                                                                            className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground ${
                                                                                                                controlPersonErrors.city ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'
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
                                                                                                                    control_person: {...kybFormData.control_person, state: e.target.value}
                                                                                                                })
                                                                                                                if (controlPersonErrors.state) {
                                                                                                                    setControlPersonErrors(prev => {
                                                                                                                        const newErrors = {...prev}
                                                                                                                        delete newErrors.state
                                                                                                                        return newErrors
                                                                                                                    })
                                                                                                                }
                                                                                                            }}
                                                                                                            className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground ${
                                                                                                                controlPersonErrors.state ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'
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
                                                                                                                    control_person: {...kybFormData.control_person, postal_code: e.target.value}
                                                                                                                })
                                                                                                                if (controlPersonErrors.postal_code) {
                                                                                                                    setControlPersonErrors(prev => {
                                                                                                                        const newErrors = {...prev}
                                                                                                                        delete newErrors.postal_code
                                                                                                                        return newErrors
                                                                                                                    })
                                                                                                                }
                                                                                                            }}
                                                                                                            className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground ${
                                                                                                                controlPersonErrors.postal_code ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'
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
                                                                                            {shouldShowField('control_person.id_type') && (
                                                                                            <div>
                                                                                                <label className="text-xs font-medium mb-1 block text-left">ID Type *</label>
                                                                                                <select
                                                                                                    value={kybFormData.control_person.id_type}
                                                                                                    onChange={(e) => {
                                                                                                        const newIdType = e.target.value
                                                                                                        
                                                                                                        // Update id_type and clear id_back_image if switching away from drivers_license
                                                                                                        setKybFormData(prev => ({
                                                                                                            ...prev,
                                                                                                            control_person: {
                                                                                                                ...prev.control_person, 
                                                                                                                id_type: newIdType,
                                                                                                                // Clear back image when switching to passport
                                                                                                                id_back_image: newIdType !== 'drivers_license' ? '' : prev.control_person.id_back_image
                                                                                                            }
                                                                                                        }))
                                                                                                        
                                                                                                        // Clear id_back_image error if switching away from drivers_license
                                                                                                        if (newIdType !== 'drivers_license' && controlPersonErrors.id_back_image) {
                                                                                                            setControlPersonErrors(prev => {
                                                                                                                const newErrors = {...prev}
                                                                                                                delete newErrors.id_back_image
                                                                                                                return newErrors
                                                                                                            })
                                                                                                        }
                                                                                                        
                                                                                                        // Clear id_type error when user selects
                                                                                                        if (controlPersonErrors.id_type) {
                                                                                                            setControlPersonErrors(prev => {
                                                                                                                const newErrors = {...prev}
                                                                                                                delete newErrors.id_type
                                                                                                                return newErrors
                                                                                                            })
                                                                                                        }
                                                                                                    }}
                                                                                                    className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground ${
                                                                                                        controlPersonErrors.id_type ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'
                                                                                                    }`}
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
                                                                                                            control_person: {...kybFormData.control_person, id_number: e.target.value}
                                                                                                        })
                                                                                                        if (controlPersonErrors.id_number) {
                                                                                                            setControlPersonErrors(prev => {
                                                                                                                const newErrors = {...prev}
                                                                                                                delete newErrors.id_number
                                                                                                                return newErrors
                                                                                                            })
                                                                                                        }
                                                                                                    }}
                                                                                                    className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground ${
                                                                                                        controlPersonErrors.id_number ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'
                                                                                                    }`}
                                                                                                    placeholder="ID Number"
                                                                                                />
                                                                                                {controlPersonErrors.id_number && (
                                                                                                    <p className="text-xs text-red-500 mt-1">{controlPersonErrors.id_number}</p>
                                                                                                )}
                                                                                            </div>
                                                                                            )}
                                                                                            {(shouldShowField('control_person.id_front_image') || shouldShowField('control_person.id_back_image')) && (
                                                                                            <div className={kybFormData.control_person.id_type === 'drivers_license' ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "space-y-3"}>
                                                                                                {/* Only show ID Front upload if rejected or not uploaded */}
                                                                                                {shouldShowField('control_person.id_front_image') && (documentStatuses.id_front === 'rejected' || !documentStatuses.id_front || documentStatuses.id_front === 'pending') && (
                                                                                                <div>
                                                                                                    {documentStatuses.id_front === 'rejected' && (
                                                                                                        <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-800 dark:text-red-200">
                                                                                                            <strong>Document Rejected:</strong> {documentRejectionReasons.id_front || 'Please re-upload the ' + (kybFormData.control_person.id_type === 'drivers_license' ? 'ID Front Image' : 'Passport Image') + '.'}
                                                                                                        </div>
                                                                                                    )}
                                                                                                    {documentStatuses.id_front === 'approved' ? (
                                                                                                        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                                                                                            <div className="flex items-center gap-2">
                                                                                                                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                                                                                <p className="text-xs text-green-900 dark:text-green-100">
                                                                                                                    {kybFormData.control_person.id_type === 'drivers_license' ? 'ID Front Image' : 'Passport Image'} has been approved.
                                                                                                                </p>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    ) : (
                                                                                                        <>
                                                                                                            <ImageUploadDropzone
                                                                                                                label={kybFormData.control_person.id_type === 'drivers_license' ? "ID Front Image *" : "Passport Image *"}
                                                                                                                value={kybFormData.control_person.id_front_image}
                                                                                                                onChange={(base64) => {
                                                                                                                    setKybFormData({
                                                                                                                        ...kybFormData,
                                                                                                                        control_person: {...kybFormData.control_person, id_front_image: base64}
                                                                                                                    })
                                                                                                                    if (controlPersonErrors.id_front_image) {
                                                                                                                        setControlPersonErrors(prev => {
                                                                                                                            const newErrors = {...prev}
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
                                                                                                        </>
                                                                                                    )}
                                                                                                </div>
                                                                                                )}
                                                                                                {/* Only show back image field for Driver's License - and only if rejected or not uploaded */}
                                                                                                {shouldShowField('control_person.id_back_image') && kybFormData.control_person.id_type === 'drivers_license' && (documentStatuses.id_back === 'rejected' || !documentStatuses.id_back || documentStatuses.id_back === 'pending') && (
                                                                                                    <div>
                                                                                                        {documentStatuses.id_back === 'rejected' && (
                                                                                                            <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-800 dark:text-red-200">
                                                                                                                <strong>Document Rejected:</strong> {documentRejectionReasons.id_back || 'Please re-upload the ID Back Image.'}
                                                                                                            </div>
                                                                                                        )}
                                                                                                        {documentStatuses.id_back === 'approved' ? (
                                                                                                            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                                                                                                <div className="flex items-center gap-2">
                                                                                                                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                                                                                    <p className="text-xs text-green-900 dark:text-green-100">
                                                                                                                        ID Back Image has been approved.
                                                                                                                    </p>
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        ) : (
                                                                                                            <>
                                                                                                                <ImageUploadDropzone
                                                                                                                    label="ID Back Image *"
                                                                                                                    value={kybFormData.control_person.id_back_image}
                                                                                                                    onChange={(base64) => {
                                                                                                                        setKybFormData({
                                                                                                                            ...kybFormData,
                                                                                                                            control_person: {...kybFormData.control_person, id_back_image: base64}
                                                                                                                        })
                                                                                                                        if (controlPersonErrors.id_back_image) {
                                                                                                                            setControlPersonErrors(prev => {
                                                                                                                                const newErrors = {...prev}
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
                                                                                                            </>
                                                                                                        )}
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                        </>
                                                                                    )}

                                                                                    {/* Step 2: Business Documents */}
                                                                                    {kybStep === 'business_documents' && (
                                                                                        <>
                                                                                            {/* Show refill message banner if admin requested re-fill */}
                                                                                            {(refillMessage || (requestedFields && requestedFields.length > 0)) && (
                                                                                                <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                                                                                    <div className="flex items-start gap-2">
                                                                                                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                                                                                        <div className="flex-1">
                                                                                                            <p className="text-xs font-semibold text-amber-900 dark:text-amber-100 mb-1">
                                                                                                                Admin Request: Please Re-fill the Following Fields
                                                                                                            </p>
                                                                                                            {refillMessage && (
                                                                                                                <p className="text-xs text-amber-800 dark:text-amber-200 mb-2">
                                                                                                                {refillMessage}
                                                                                                            </p>
                                                                                                            )}
                                                                                                            {requestedFields && requestedFields.length > 0 && (
                                                                                                                <div className="mt-2">
                                                                                                                    <p className="text-xs font-medium text-amber-900 dark:text-amber-100 mb-1">
                                                                                                                        Requested Fields ({requestedFields.length}):
                                                                                                                    </p>
                                                                                                                    <div className="flex flex-wrap gap-1">
                                                                                                                        {requestedFields.map((field, idx) => (
                                                                                                                            <span key={idx} className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 rounded">
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
                                                                                                
                                                                                                // Show waiting screen if:
                                                                                                // 1. Documents have been submitted (initial or re-upload)
                                                                                                // 2. NO documents are currently rejected (all are pending/approved/not set)
                                                                                                // 3. NO requested fields (normal flow)
                                                                                                // This means: if submitted and no rejected docs and no requested fields, show waiting screen
                                                                                                const shouldShowWaiting = businessDocumentsSubmitted && !hasRejectedDocuments && requestedFields.length === 0
                                                                                                
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
                                                                                                    {/* Only show header if there are rejected documents or if form hasn't been submitted */}
                                                                                                    {(documentStatuses.business_formation === 'rejected' || 
                                                                                                      documentStatuses.business_ownership === 'rejected' || 
                                                                                                      documentStatuses.proof_of_address === 'rejected' ||
                                                                                                      !businessDocumentsSubmitted) && (
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
                                                                                                {/* Business Formation Document - Only show if rejected (in re-upload mode) or not uploaded yet (initial submission) or requested */}
                                                                                                {shouldShowField('business_formation_document') && (() => {
                                                                                                    const hasRejectedDocuments = documentStatuses.business_formation === 'rejected' || 
                                                                                                                                documentStatuses.business_ownership === 'rejected' || 
                                                                                                                                documentStatuses.proof_of_address === 'rejected'
                                                                                                    const formationStatus = documentStatuses.business_formation
                                                                                                    // In re-upload mode: only show if explicitly rejected
                                                                                                    if (hasRejectedDocuments) {
                                                                                                        return formationStatus === 'rejected'
                                                                                                    }
                                                                                                    // In initial submission: show if not uploaded yet (undefined or null)
                                                                                                    return !formationStatus || formationStatus === 'pending'
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
                                                                                                                setKybFormData({...kybFormData, business_formation_document: base64})
                                                                                                                if (businessDocumentErrors.business_formation_document) {
                                                                                                                    setBusinessDocumentErrors(prev => {
                                                                                                                        const newErrors = {...prev}
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
                                                                                                        <div className="flex items-center gap-2">
                                                                                                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                                                                            <p className="text-xs text-green-900 dark:text-green-100">
                                                                                                                Business Formation Document has been approved.
                                                                                                            </p>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}
                                                                                                
                                                                                                {/* Business Ownership Document - Only show if rejected (in re-upload mode) or not uploaded yet (initial submission) or requested */}
                                                                                                {shouldShowField('business_ownership_document') && (() => {
                                                                                                    const hasRejectedDocuments = documentStatuses.business_formation === 'rejected' || 
                                                                                                                                documentStatuses.business_ownership === 'rejected' || 
                                                                                                                                documentStatuses.proof_of_address === 'rejected'
                                                                                                    const ownershipStatus = documentStatuses.business_ownership
                                                                                                    // In re-upload mode: only show if explicitly rejected
                                                                                                    if (hasRejectedDocuments) {
                                                                                                        return ownershipStatus === 'rejected'
                                                                                                    }
                                                                                                    // In initial submission: show if not uploaded yet (undefined or null)
                                                                                                    return !ownershipStatus || ownershipStatus === 'pending'
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
                                                                                                                setKybFormData({...kybFormData, business_ownership_document: base64})
                                                                                                                if (businessDocumentErrors.business_ownership_document) {
                                                                                                                    setBusinessDocumentErrors(prev => {
                                                                                                                        const newErrors = {...prev}
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
                                                                                                        <div className="flex items-center gap-2">
                                                                                                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                                                                            <p className="text-xs text-green-900 dark:text-green-100">
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
                                                                                                                setKybFormData({...kybFormData, proof_of_address_document: base64})
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
                                                                                                                setKybFormData({...kybFormData, proof_of_nature_of_business: base64})
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
                                                                                                                setKybFormData({...kybFormData, determination_letter_501c3: base64})
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

                                                                                                {/* Only show Business Information and Enhanced KYB sections if no documents are rejected (initial form or all approved) or if fields are requested */}
                                                                                                {((documentStatuses.business_formation !== 'rejected' && 
                                                                                                 documentStatuses.business_ownership !== 'rejected' && 
                                                                                                 documentStatuses.proof_of_address !== 'rejected') || 
                                                                                                 (shouldShowField('entity_type') || shouldShowField('business_description') || shouldShowField('business_industry') || shouldShowField('primary_website'))) && (
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
                                                                                                                    setKybFormData({...kybFormData, entity_type: e.target.value})
                                                                                                                    if (businessDocumentErrors.entity_type) {
                                                                                                                        setBusinessDocumentErrors(prev => {
                                                                                                                            const newErrors = {...prev}
                                                                                                                            delete newErrors.entity_type
                                                                                                                            return newErrors
                                                                                                                        })
                                                                                                                    }
                                                                                                                }}
                                                                                                                className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground ${
                                                                                                                    businessDocumentErrors.entity_type ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'
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
                                                                                                                onChange={(e) => setKybFormData({...kybFormData, dao_status: e.target.checked})}
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
                                                                                                                    setKybFormData({...kybFormData, business_description: e.target.value})
                                                                                                                    if (businessDocumentErrors.business_description) {
                                                                                                                        setBusinessDocumentErrors(prev => {
                                                                                                                            const newErrors = {...prev}
                                                                                                                            delete newErrors.business_description
                                                                                                                            return newErrors
                                                                                                                        })
                                                                                                                    }
                                                                                                                }}
                                                                                                                className={`w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground ${
                                                                                                                    businessDocumentErrors.business_description ? 'border-red-500 dark:border-red-500' : 'border-border dark:border-gray-700'
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
                                                                                                                onChange={(e) => setKybFormData({...kybFormData, primary_website: e.target.value})}
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
                                                                                                                onChange={(e) => setKybFormData({...kybFormData, business_industry: e.target.value})}
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
                                                                                                                            physical_address: {...kybFormData.physical_address, street_line_1: e.target.value}
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
                                                                                                                                physical_address: {...kybFormData.physical_address, city: e.target.value}
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
                                                                                                                                physical_address: {...kybFormData.physical_address, subdivision: e.target.value}
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
                                                                                                                                physical_address: {...kybFormData.physical_address, postal_code: e.target.value}
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
                                                                                                                                physical_address: {...kybFormData.physical_address, country: e.target.value}
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
                                                                                                                onChange={(e) => setKybFormData({...kybFormData, source_of_funds: e.target.value})}
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
                                                                                                                onChange={(e) => setKybFormData({...kybFormData, annual_revenue: e.target.value})}
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
                                                                                                                onChange={(e) => setKybFormData({...kybFormData, transaction_volume: e.target.value})}
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
                                                                                                                onChange={(e) => setKybFormData({...kybFormData, account_purpose: e.target.value})}
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
                                                                                                                onChange={(e) => setKybFormData({...kybFormData, high_risk_activities: e.target.value})}
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
                                                                                                                onChange={(e) => setKybFormData({...kybFormData, high_risk_geographies: e.target.value})}
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
                                                                                /* Individual KYC Form */
                                                                                <>
                                                                                    <div className="grid grid-cols-2 gap-2">
                                                                                        <div>
                                                                                            <label className="text-xs font-medium mb-1 block">First Name *</label>
                                                                                            <input
                                                                                                type="text"
                                                                                                value={kycFormData.first_name}
                                                                                                onChange={(e) => setKycFormData({...kycFormData, first_name: e.target.value})}
                                                                                                className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                                                                                                placeholder="John"
                                                                                            />
                                                                                        </div>
                                                                                        <div>
                                                                                            <label className="text-xs font-medium mb-1 block">Last Name *</label>
                                                                                            <input
                                                                                                type="text"
                                                                                                value={kycFormData.last_name}
                                                                                                onChange={(e) => setKycFormData({...kycFormData, last_name: e.target.value})}
                                                                                                className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                                                                                                placeholder="Doe"
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="text-xs font-medium mb-1 block text-left">Email *</label>
                                                                                        <input
                                                                                            type="email"
                                                                                            value={kycFormData.email}
                                                                                            onChange={(e) => setKycFormData({...kycFormData, email: e.target.value})}
                                                                                            className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                                                                                            placeholder="john@example.com"
                                                                                        />
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="text-xs font-medium mb-1 block">Date of Birth *</label>
                                                                                        <input
                                                                                            type="date"
                                                                                            value={kycFormData.birth_date}
                                                                                            onChange={(e) => setKycFormData({...kycFormData, birth_date: e.target.value})}
                                                                                            className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                                                                                        />
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="text-xs font-medium mb-1 block text-left">Street Address *</label>
                                                                                        <input
                                                                                            type="text"
                                                                                            value={kycFormData.street_line_1}
                                                                                            onChange={(e) => setKycFormData({...kycFormData, street_line_1: e.target.value})}
                                                                                            className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                                                                                            placeholder="123 Main St"
                                                                                        />
                                                                                    </div>
                                                                                    <div className="grid grid-cols-2 gap-2">
                                                                                        <div>
                                                                                            <label className="text-xs font-medium mb-1 block text-left">City *</label>
                                                                                            <input
                                                                                                type="text"
                                                                                                value={kycFormData.city}
                                                                                                onChange={(e) => setKycFormData({...kycFormData, city: e.target.value})}
                                                                                                className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                                                                                                placeholder="New York"
                                                                                            />
                                                                                        </div>
                                                                                        <div>
                                                                                            <label className="text-xs font-medium mb-1 block text-left">State *</label>
                                                                                            <input
                                                                                                type="text"
                                                                                                value={kycFormData.subdivision}
                                                                                                onChange={(e) => setKycFormData({...kycFormData, subdivision: e.target.value})}
                                                                                                className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                                                                                                placeholder="NY"
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="grid grid-cols-2 gap-2">
                                                                                        <div>
                                                                                            <label className="text-xs font-medium mb-1 block text-left">ZIP Code *</label>
                                                                                            <input
                                                                                                type="text"
                                                                                                value={kycFormData.postal_code}
                                                                                                onChange={(e) => setKycFormData({...kycFormData, postal_code: e.target.value})}
                                                                                                className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                                                                                                placeholder="10001"
                                                                                            />
                                                                                        </div>
                                                                                        <div>
                                                                                            <label className="text-xs font-medium mb-1 block text-left">Country *</label>
                                                                                            <input
                                                                                                type="text"
                                                                                                value={kycFormData.country}
                                                                                                onChange={(e) => setKycFormData({...kycFormData, country: e.target.value})}
                                                                                                className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                                                                                                placeholder="USA"
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="text-xs font-medium mb-1 block">SSN *</label>
                                                                                        <input
                                                                                            type="text"
                                                                                            value={kycFormData.ssn}
                                                                                            onChange={(e) => setKycFormData({...kycFormData, ssn: e.target.value})}
                                                                                            className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                                                                                            placeholder="xxx-xx-xxxx"
                                                                                        />
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="text-xs font-medium mb-1 block">ID Type *</label>
                                                                                <select
                                                                                            value={kycFormData.id_type}
                                                                                            onChange={(e) => setKycFormData({...kycFormData, id_type: e.target.value})}
                                                                                            className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                                                                                        >
                                                                                            <option value="drivers_license">Driver's License</option>
                                                                                            <option value="passport">Passport</option>
                                                                                            <option value="state_id">State ID</option>
                                                                                </select>
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="text-xs font-medium mb-1 block">ID Number *</label>
                                                                                <input
                                                                                    type="text"
                                                                                            value={kycFormData.id_number}
                                                                                            onChange={(e) => setKycFormData({...kycFormData, id_number: e.target.value})}
                                                                                            className="w-full px-3 py-2 text-sm bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-foreground placeholder:text-muted-foreground"
                                                                                            placeholder="DL123456"
                                                                                />
                                                                            </div>
                                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                                        <div>
                                                                                            <ImageUploadDropzone
                                                                                                label="ID Front Image"
                                                                                                value={typeof kycFormData.id_front_image === 'string' ? kycFormData.id_front_image : ''}
                                                                                                onChange={(base64) => setKycFormData({...kycFormData, id_front_image: base64 as any})}
                                                                                                required={true}
                                                                                                maxSizeMB={5}
                                                                                            />
                                                                                        </div>
                                                                                        <div>
                                                                                            <ImageUploadDropzone
                                                                                                label="ID Back Image"
                                                                                                value={typeof kycFormData.id_back_image === 'string' ? kycFormData.id_back_image : ''}
                                                                                                onChange={(base64) => setKycFormData({...kycFormData, id_back_image: base64 as any})}
                                                                                                required={true}
                                                                                                maxSizeMB={5}
                                                                                            />
                                    </div>
                                                                                    </div>
                                                                                </>
                                                                            )}
                                    {/* Hide button when the Step 2 waiting screen is shown, BUT always show it if admin requested refill */}
                                    {((requestedFields && requestedFields.length > 0) || 
                                      !(verificationType === 'kyb' &&
                                       kybStep === 'business_documents' &&
                                       businessDocumentsSubmitted &&
                                       (documentStatuses.business_formation !== 'rejected' &&
                                        documentStatuses.business_ownership !== 'rejected' &&
                                         documentStatuses.proof_of_address !== 'rejected'))) && (
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
                                                    {tosStatus !== 'accepted' && (
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
                                /* Activity Tab */
                                <div 
                                    className="flex-1 overflow-y-auto p-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:h-[350px] sm:max-h-[350px] sm:min-h-[350px]"
                                    onScroll={handleActivityScroll}
                                >
                                    {isLoadingActivities ? (
                                        <div className="text-center py-8">
                                            <RefreshCw className="h-6 w-6 text-muted-foreground mx-auto mb-3 animate-spin" />
                                            <p className="text-sm text-muted-foreground">Loading activity...</p>
                                        </div>
                                    ) : activities.length === 0 ? (
                                        <div className="text-center py-12">
                                            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                                            <p className="text-sm text-muted-foreground">No transactions yet</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-2">
                                                {activities.map((activity) => {
                                                    const isTransferSent = activity.type === 'transfer_sent'
                                                    const isTransferReceived = activity.type === 'transfer_received'
                                                    const isDonation = activity.type === 'donation'
                                                    const isDeposit = activity.type === 'deposit'
                                                    
                                                    return (
                                                        <motion.div
                                                            key={activity.id}
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3 flex-1 min-w-0 w-full sm:w-auto">
                                                                <div className={`p-2 rounded-lg flex-shrink-0 ${
                                                                    isTransferSent 
                                                                        ? 'bg-red-500/10' 
                                                                        : isTransferReceived 
                                                                        ? 'bg-blue-500/10'
                                                                        : isDeposit
                                                                        ? 'bg-emerald-500/10'
                                                                        : 'bg-green-500/10'
                                                                }`}>
                                                                    {isTransferSent ? (
                                                                        <ArrowUpRight className="h-4 w-4 text-red-500" />
                                                                    ) : isTransferReceived ? (
                                                                        <ArrowDownLeft className="h-4 w-4 text-blue-500" />
                                                                    ) : isDeposit ? (
                                                                        <Plus className="h-4 w-4 text-emerald-500" />
                                                                    ) : (
                                                                        <ArrowDownLeft className="h-4 w-4 text-green-500" />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0 w-full sm:w-auto">
                                                                    <p className="text-sm font-medium break-words sm:truncate">
                                                                        {isTransferSent 
                                                                            ? `Sent to ${activity.donor_name}`
                                                                            : isTransferReceived
                                                                            ? `Received from ${activity.donor_name}`
                                                                            : isDeposit
                                                                            ? `Deposit - ${activity.donor_name}`
                                                                            : `Donation from ${activity.donor_name}`
                                                                        }
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground mt-1">
                                                                        {new Date(activity.date).toLocaleDateString('en-US', {
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            year: 'numeric',
                                                                            hour: '2-digit',
                                                                            minute: '2-digit'
                                                                        })}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end sm:flex-col sm:items-end gap-2 sm:ml-3 sm:text-right">
                                                                <p className={`text-base sm:text-sm font-semibold ${
                                                                    isTransferSent 
                                                                        ? 'text-red-600'
                                                                        : isTransferReceived || isDeposit
                                                                        ? 'text-green-600'
                                                                        : 'text-green-600'
                                                                }`}>
                                                                    {isTransferSent ? '-' : '+'}${activity.amount.toLocaleString('en-US', {
                                                                        minimumFractionDigits: 2,
                                                                        maximumFractionDigits: 2
                                                                    })}
                                                                </p>
                                                                <div className="flex flex-col items-end sm:items-end gap-1">
                                                                {isDonation && activity.frequency !== 'one-time' && (
                                                                    <p className="text-xs text-muted-foreground capitalize">
                                                                        {activity.frequency}
                                                                    </p>
                                                                )}
                                                                {isTransferSent && activity.recipient_type && (
                                                                    <p className="text-xs text-muted-foreground capitalize">
                                                                        {activity.recipient_type}
                                                                    </p>
                                                                )}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )
                                                })}
                                            </div>
                                            {isLoadingMore && (
                                                <div className="text-center py-4">
                                                    <RefreshCw className="h-5 w-5 text-muted-foreground mx-auto animate-spin" />
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer Actions - MetaMask style */}
                        <div className="border-t border-border p-3 bg-muted/30">
                            <Button
                                variant="ghost"
                                className="w-full justify-start text-sm"
                                onClick={() => {
                                    // Open settings or wallet options
                                    window.location.href = '/chat'
                                }}
                            >
                                <Settings className="h-4 w-4 mr-2" />
                                Wallet Settings
                            </Button>
                        </div>
                    </motion.div>
                </>
            )}

            {/* Subscription Required Modal */}
            <SubscriptionRequiredModal
                isOpen={showSubscriptionModal}
                onClose={() => {
                    setShowSubscriptionModal(false)
                    onClose() // Also close the wallet popup
                }}
                feature="wallet"
            />
        </AnimatePresence>
    )
}

