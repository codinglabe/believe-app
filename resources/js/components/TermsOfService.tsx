"use client"

import React, { useState, useRef, useEffect } from 'react'
import { FileCheck, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { showErrorToast } from '@/lib/toast'

interface TermsOfServiceProps {
    tosUrl: string | null
    onAccept: () => void
    onCancel?: () => void
    isAccepted: boolean
    isLoading?: boolean
}

export function TermsOfService({ tosUrl, onAccept, onCancel, isAccepted, isLoading = false }: TermsOfServiceProps) {
    const [showIframe, setShowIframe] = useState(false)
    const [showManualInput, setShowManualInput] = useState(false)
    const [manualAgreementId, setManualAgreementId] = useState('')
    const iframeRef = useRef<HTMLIFrameElement>(null)
    
    // Check if we're on localhost
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    
    // Auto-show iframe when TOS URL is available (after loading)
    useEffect(() => {
        if (tosUrl && !isAccepted && !showIframe && !isLoading) {
            // Automatically show iframe when TOS URL is loaded
            setShowIframe(true)
        }
    }, [tosUrl, isAccepted, showIframe, isLoading])

    useEffect(() => {
        // Listen for messages from Bridge iframe
        const handleMessage = (event: MessageEvent) => {
            // Verify origin for security - allow Bridge domains
            const allowedOrigins = ['bridge.xyz', 'sandbox.bridge.xyz', 'dashboard.bridge.xyz', 'dashboard.sandbox.bridge.xyz']
            const isAllowedOrigin = allowedOrigins.some(origin => event.origin.includes(origin))
            
            if (!isAllowedOrigin) {
                return
            }

            // Handle TOS acceptance from Bridge iframe (if Bridge sends postMessage)
            if (event.data && typeof event.data === 'object') {
                // Bridge might send different message formats
                if (event.data.signedAgreementId || event.data.signed_agreement_id || event.data.type === 'tos_accepted') {
                    const agreementId = event.data.signedAgreementId || event.data.signed_agreement_id
                    if (agreementId && onAccept) {
                        // Dispatch custom event for WalletPopup to handle
                        window.dispatchEvent(new CustomEvent('bridge_tos_accepted', { 
                            detail: { signedAgreementId: agreementId } 
                        }))
                        onAccept()
                        setShowIframe(false)
                    }
                }
            }
        }

        window.addEventListener('message', handleMessage)
        return () => {
            window.removeEventListener('message', handleMessage)
        }
    }, [onAccept])

    const handleAccept = () => {
        if (!tosUrl) {
            showErrorToast('Terms of Service URL not available')
            return
        }
        // Show iframe immediately when Accept is clicked
        // The iframe will either:
        // 1. Redirect to our callback page (if redirect_uri is public URL)
        // 2. Send postMessage directly (if Bridge supports it)
        setShowIframe(true)
    }
    
    // Auto-show iframe when tosUrl is available (after loading)
    useEffect(() => {
        if (tosUrl && !isAccepted && !showIframe) {
            // Automatically show iframe when TOS URL is loaded
            setShowIframe(true)
        }
    }, [tosUrl, isAccepted, showIframe])

    // Hide iframe immediately when accepted
    useEffect(() => {
        if (isAccepted && showIframe) {
            setShowIframe(false)
        }
    }, [isAccepted, showIframe])

    if (isAccepted) {
        return (
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-600">
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm text-green-900 dark:text-green-100">Terms Accepted</h4>
                        <p className="text-xs text-green-700 dark:text-green-300">You have accepted the Terms of Service</p>
                    </div>
                </div>
            </div>
        )
    }

    // If showing iframe, display it
    if (showIframe && tosUrl) {
        return (
            <div className="space-y-3">
                <div className="bg-muted/50 rounded-lg border border-border overflow-hidden shadow-sm" style={{ height: '400px' }}>
                    <iframe
                        ref={iframeRef}
                        src={tosUrl}
                        className="w-full h-full border-0"
                        title="Bridge Terms of Service"
                        allow="clipboard-read; clipboard-write"
                        onLoad={() => {
                            // Check if iframe URL contains signed_agreement_id (for localhost without redirect)
                            try {
                                if (iframeRef.current?.contentWindow) {
                                    // Try to get the current URL from iframe (may fail due to CORS)
                                    const iframeUrl = iframeRef.current.src
                                    const urlParams = new URLSearchParams(iframeUrl.split('?')[1] || '')
                                    const signedAgreementId = urlParams.get('signed_agreement_id')
                                    
                                    if (signedAgreementId) {
                                        // Found signed_agreement_id in URL
                                        window.dispatchEvent(new CustomEvent('bridge_tos_accepted', { 
                                            detail: { signedAgreementId } 
                                        }))
                                        if (onAccept) onAccept()
                                        setShowIframe(false)
                                    }
                                }
                            } catch (error) {
                                // CORS error expected - we'll rely on postMessage instead
                                console.log('Cannot access iframe URL (CORS) - will rely on postMessage')
                            }
                        }}
                    />
                </div>
                {isLocalhost && (
                    <div className="text-xs text-muted-foreground p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                        <p className="font-semibold mb-1">⚠️ Local Development Mode</p>
                        <p className="mb-2">Browsers block redirects from Bridge to localhost. After accepting TOS:</p>
                        <ol className="list-decimal list-inside space-y-1 mb-2">
                            <li>Check the Bridge page URL for <code className="bg-muted px-1 rounded">signed_agreement_id</code></li>
                            <li>Or click "Enter Manually" below to submit the ID</li>
                        </ol>
                        <Button
                            onClick={() => setShowManualInput(true)}
                            variant="outline"
                            size="sm"
                            className="w-full text-xs"
                        >
                            Enter signed_agreement_id Manually
                        </Button>
                    </div>
                )}
                {showManualInput && (
                    <div className="space-y-2 p-3 bg-muted/50 rounded border border-border">
                        <label className="text-xs font-semibold">Enter signed_agreement_id:</label>
                        <input
                            type="text"
                            value={manualAgreementId}
                            onChange={(e) => setManualAgreementId(e.target.value)}
                            placeholder="Paste signed_agreement_id here"
                            className="w-full px-2 py-1.5 text-xs border border-border rounded bg-background"
                        />
                        <div className="flex gap-2">
                            <Button
                                onClick={() => {
                                    if (manualAgreementId.trim()) {
                                        window.dispatchEvent(new CustomEvent('bridge_tos_accepted', { 
                                            detail: { signedAgreementId: manualAgreementId.trim() } 
                                        }))
                                        if (onAccept) onAccept()
                                        setShowIframe(false)
                                        setShowManualInput(false)
                                    }
                                }}
                                size="sm"
                                className="flex-1 text-xs"
                                disabled={!manualAgreementId.trim()}
                            >
                                Submit
                            </Button>
                            <Button
                                onClick={() => {
                                    setShowManualInput(false)
                                    setManualAgreementId('')
                                }}
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}
                {onCancel && !showManualInput && (
                    <Button
                        onClick={() => {
                            setShowIframe(false)
                            if (onCancel) onCancel()
                        }}
                        variant="outline"
                        className="w-full text-xs"
                        size="sm"
                    >
                        Cancel
                    </Button>
                )}
            </div>
        )
    }

    // If TOS URL is available, automatically show iframe (no need for Accept button click)
    if (tosUrl && !showIframe && !isAccepted) {
        // Auto-show iframe when URL is available
        setShowIframe(true)
    }

    return (
        <div className="space-y-3">
            {/* Terms Content - Compact Card - Only show if iframe is not showing */}
            {!showIframe && (
                <>
                    <div 
                        className="bg-muted/50 rounded-lg border border-border overflow-hidden shadow-sm"
                        style={{ height: '200px' }}
                    >
                        <div 
                            className="overflow-y-auto overflow-x-hidden p-3 space-y-2 h-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
                                    <FileCheck className="h-3 w-3 text-white" />
                                </div>
                                <h3 className="text-sm font-bold m-0 text-foreground dark:text-foreground">Bridge Terms of Service</h3>
                            </div>
                            
                            <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                                <p>
                                    By using Bridge services, you agree to our Terms of Service. This includes acceptance of our 
                                    service description, user responsibilities, compliance requirements, fee structure, liability limitations, 
                                    privacy policy, and our right to modify terms. You acknowledge that you have read and understood 
                                    these terms.
                                </p>
                                <p className="text-[10px] italic">
                                    For full terms, visit Bridge's official documentation. By proceeding, you accept all terms and conditions.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        {onCancel && (
                            <Button
                                onClick={onCancel}
                                variant="outline"
                                className="flex-1 text-xs"
                                size="sm"
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                        )}
                        <Button
                            onClick={handleAccept}
                            className={`${onCancel ? 'flex-1' : 'w-full'} bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white dark:text-white text-xs`}
                            disabled={isLoading || !tosUrl}
                            size="sm"
                        >
                            <FileCheck className="h-3 w-3 mr-1.5 text-white" />
                            {isLoading ? 'Processing...' : 'Accept'}
                        </Button>
                    </div>
                </>
            )}
        </div>
    )
}

