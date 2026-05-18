import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Download, DownloadCloud, Loader2, Share2, X, CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isLivestockDomain } from '@/lib/livestock-domain';
import { isMerchantDomain } from '@/lib/merchant-domain';

const INSTALL_PARAM = 'install-pwa';

const QR_ROUTE_NAME = 'pwa.install-qr';

type NavigatorExtended = Navigator & {
    share?: (data: ShareData) => Promise<void>;
    standalone?: boolean;
    getInstalledRelatedApps?: () => Promise<unknown[]>;
};

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [installUrl, setInstallUrl] = useState('');
    const [qrUrl, setQrUrl] = useState('');
    const [copied, setCopied] = useState(false);
    const [canShare, setCanShare] = useState(false);
    const [installRequested, setInstallRequested] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [alreadyInstalled, setAlreadyInstalled] = useState(false);
    const [isQrLoading, setIsQrLoading] = useState(true);
    const [hasBeenDismissed, setHasBeenDismissed] = useState(false);
    const installButtonRef = useRef<HTMLButtonElement>(null);
    const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
    const autoTriggerSetupRef = useRef(false);
    const urlParamProcessedRef = useRef(false);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        // Don't show PWA prompt on livestock domain
        if (isLivestockDomain()) {
            return;
        }
        
        // Don't show PWA prompt on merchant domain
        if (isMerchantDomain()) {
            return;
        }

        setInstallUrl(`${window.location.origin}?${INSTALL_PARAM}=1`);

        const supportsShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
        setCanShare(supportsShare);

        // Only process the URL parameter once
        if (!urlParamProcessedRef.current) {
        const params = new URLSearchParams(window.location.search);
        if (params.has(INSTALL_PARAM)) {
            setInstallRequested(true);
                urlParamProcessedRef.current = true;
                
                // Don't remove the parameter immediately to avoid navigation conflicts
                // We'll clean it up after a delay or when install is complete
                // This prevents Inertia.js or other routers from interfering
                setTimeout(() => {
                    // Only clean up if we're still on the same page and install is still requested
                    if (window.location.search.includes(INSTALL_PARAM) && installRequested) {
            params.delete(INSTALL_PARAM);
            const newQuery = params.toString();
            const cleanedUrl = `${window.location.origin}${window.location.pathname}${newQuery ? `?${newQuery}` : ''}${
                window.location.hash ?? ''
            }`;

                        // Use replaceState carefully to avoid navigation issues
                        try {
                            window.history.replaceState(window.history.state, document.title, cleanedUrl);
                        } catch (error) {
                        }
                    }
                }, 2000); // Delay to let page fully load and avoid conflicts
            }
        }

        const mediaQuery = window.matchMedia('(display-mode: standalone)');
        const updateStandalone = () => {
            const navigatorStandalone = (window.navigator as NavigatorExtended).standalone;
            const standalone = mediaQuery.matches || Boolean(navigatorStandalone);
            setIsStandalone(standalone);
            setAlreadyInstalled(standalone);
        };

        updateStandalone();

        const listener = () => updateStandalone();

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', listener);
            return () => mediaQuery.removeEventListener('change', listener);
        }

        // addListener is supported in older browsers (fallback)
        if (typeof mediaQuery.addListener === 'function') {
            mediaQuery.addListener(listener);
            return () => {
                if (typeof mediaQuery.removeListener === 'function') {
                    mediaQuery.removeListener(listener);
                }
            };
        }

        return () => {
            // Cleanup handled above
        };
    }, []);

    useEffect(() => {
        if (typeof navigator === 'undefined') {
            return;
        }

        const nav = navigator as NavigatorExtended;
        if (!nav.getInstalledRelatedApps) {
            return;
        }

        let cancelled = false;

        nav
            .getInstalledRelatedApps()
            .then((apps) => {
                if (cancelled) {
                    return;
                }

                setAlreadyInstalled(Array.isArray(apps) && apps.length > 0);
            })
            .catch(() => undefined);

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (alreadyInstalled) {
            setIsVisible(false);
        }
    }, [alreadyInstalled]);

    useEffect(() => {
        if (!installUrl) {
            return;
        }

        setIsQrLoading(true);
        const baseUrl = typeof route === 'function' ? route(QR_ROUTE_NAME) : '/pwa/install-qr';
        const separator = baseUrl.includes('?') ? '&' : '?';
        setQrUrl(`${baseUrl}${separator}target=${encodeURIComponent(installUrl)}`);
    }, [installUrl]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const handler = (event: Event) => {
            event.preventDefault();
            const promptEvent = event as BeforeInstallPromptEvent;
            setDeferredPrompt(promptEvent);
            deferredPromptRef.current = promptEvent;
            setHasBeenDismissed(false);
            
            // If install was requested via share link/QR code, set up auto-trigger now
            // Check if installRequested is true (we need to check this from the component state)
            // We'll handle this in a separate useEffect that watches both values
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const handler = () => {
            setAlreadyInstalled(true);
            setIsVisible(false);
            setDeferredPrompt(null);
            deferredPromptRef.current = null;
            autoTriggerSetupRef.current = false;
        };

        window.addEventListener('appinstalled', handler);

        return () => {
            window.removeEventListener('appinstalled', handler);
        };
    }, []);

    // When install is requested via QR code or share link, show the panel immediately
    useEffect(() => {
        if (installRequested) {
            setIsVisible(true);
        }
    }, [installRequested]);

    // When prompt becomes available and install was requested, set up auto-trigger
    useEffect(() => {
        if (installRequested && deferredPrompt && !autoTriggerSetupRef.current) {
            // The auto-trigger useEffect will handle setting up the listener
        }
    }, [installRequested, deferredPrompt]);

    // Auto-trigger install prompt on first user interaction when arriving via share link/QR code
    // This makes the install feel automatic - first click/touch anywhere triggers it
    useEffect(() => {
        // Only set up if install was requested, panel is visible, and prompt is available
        if (!installRequested || !isVisible || !deferredPrompt) {
            if (installRequested && !deferredPrompt) {
            }
            return;
        }

        // Set up auto-trigger listener only once
        if (autoTriggerSetupRef.current) {
            return;
        }

        let hasTriggered = false;
        let timeoutId: NodeJS.Timeout | null = null;

        const triggerInstall = (event: Event) => {
            // Get current deferredPrompt from ref (always use ref for event handlers)
            const currentPrompt = deferredPromptRef.current;
            if (hasTriggered || !currentPrompt) {
                return;
            }

            // Don't trigger on clicks inside the install panel (let panel click handler take over)
            const target = event.target as HTMLElement;
            const panel = target.closest('[data-pwa-install-panel]');
            if (panel) {
                // User clicked inside panel, let the panel click handler take over
                return;
            }

            // Don't trigger on form inputs or other critical UI elements
            const isFormElement = target.closest('form, input, textarea, select, [contenteditable="true"]');
            if (isFormElement) {
                return;
            }

            hasTriggered = true;

            // CRITICAL: Call prompt() synchronously within the user gesture event handler
            // Do NOT await anything before calling prompt() - it must be called immediately
            try {
                // Call prompt() immediately - this must be synchronous
                currentPrompt.prompt();
                
                // Handle the result asynchronously after prompt() is called
                currentPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        setIsVisible(false);
                    }
                    
                    setDeferredPrompt(null);
                    deferredPromptRef.current = null;
                    setInstallRequested(false);
                    autoTriggerSetupRef.current = false;
                    
                    // Clean up URL parameter when install is complete
                    cleanupUrlParameter();
                }).catch(() => {
                    setDeferredPrompt(null);
                    deferredPromptRef.current = null;
                    setInstallRequested(false);
                    autoTriggerSetupRef.current = false;
                });
            } catch (error) {
                autoTriggerSetupRef.current = false;
            }

            // Clean up all listeners
            document.removeEventListener('click', triggerInstall, true);
            document.removeEventListener('touchstart', triggerInstall, true);
            document.removeEventListener('mousedown', triggerInstall, true);
            document.removeEventListener('pointerdown', triggerInstall, true);
            document.removeEventListener('pointerup', triggerInstall, true);
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };

        autoTriggerSetupRef.current = true;

        // Listen for ANY possible user interaction to trigger install as soon as possible
        // We'll try multiple event types to catch the earliest possible interaction
        const setupListeners = () => {
            
            // Primary interactions (most reliable)
            document.addEventListener('click', triggerInstall, { capture: true, once: true });
            document.addEventListener('touchstart', triggerInstall, { capture: true, once: true });
            document.addEventListener('mousedown', triggerInstall, { capture: true, once: true });
            
            // Secondary interactions (to catch earlier gestures)
            document.addEventListener('pointerdown', triggerInstall, { capture: true, once: true });
            document.addEventListener('pointerup', triggerInstall, { capture: true, once: true });
            
            // Try to catch focus events (when user interacts with page)
            window.addEventListener('focus', () => {
                // Focus alone isn't enough, but we can try a delayed trigger
                // This won't work for security, but we'll keep the listener ready
            }, { once: true });
        };

        // Set up listeners immediately (no delay) to catch earliest possible interaction
        setupListeners();

        return () => {
            document.removeEventListener('click', triggerInstall, true);
            document.removeEventListener('touchstart', triggerInstall, true);
            document.removeEventListener('mousedown', triggerInstall, true);
            document.removeEventListener('pointerdown', triggerInstall, true);
            document.removeEventListener('pointerup', triggerInstall, true);
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            autoTriggerSetupRef.current = false;
        };
    }, [installRequested, isVisible, deferredPrompt]);

    // Auto-trigger install prompt when user clicks on the panel after QR code/share link
    // This makes the install feel automatic - clicking anywhere on the panel triggers it
    const handlePanelClick = (event: React.MouseEvent) => {
        // Only auto-trigger if install was requested via QR code/share link
        if (!installRequested) {
            return;
        }

        // Get current prompt from ref (might be available even if state hasn't updated)
        const currentPrompt = deferredPromptRef.current || deferredPrompt;
        if (!currentPrompt) {
            return;
        }

        // Don't trigger on clicks on interactive elements (buttons, inputs, links)
        const target = event.target as HTMLElement;
        const isInteractive = target.closest('button, input, a, [role="button"]');
        
        if (isInteractive) {
            // Let the specific button handler take over
            return;
        }

        // Prevent event bubbling
        event.stopPropagation();

        // CRITICAL: Call prompt() synchronously within the user gesture event handler
        try {
            currentPrompt.prompt();
            
            // Handle the result asynchronously after prompt() is called
            currentPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    setIsVisible(false);
                }
                
                setDeferredPrompt(null);
                deferredPromptRef.current = null;
                setInstallRequested(false);
                autoTriggerSetupRef.current = false;
                
                // Clean up URL parameter
                cleanupUrlParameter();
            }).catch(() => {
                setDeferredPrompt(null);
                deferredPromptRef.current = null;
                setInstallRequested(false);
                autoTriggerSetupRef.current = false;
            });
        } catch (error) {
            // Silent fail
        }
    };

    // Show prompt panel when deferredPrompt is available (if not auto-installing)
    useEffect(() => {
        if (!deferredPrompt) {
            return;
        }

        if (!installRequested) {
            setIsVisible(true);
        }
    }, [deferredPrompt, installRequested]);

    useEffect(() => {
        if (isStandalone) {
            setIsVisible(false);
        }
    }, [isStandalone]);

    // Clean up URL parameter helper function
    const cleanupUrlParameter = () => {
        if (typeof window === 'undefined') return;

        const params = new URLSearchParams(window.location.search);
        if (params.has(INSTALL_PARAM)) {
            params.delete(INSTALL_PARAM);
            const newQuery = params.toString();
            const cleanedUrl = `${window.location.origin}${window.location.pathname}${newQuery ? `?${newQuery}` : ''}${
                window.location.hash ?? ''
            }`;
            
            try {
                window.history.replaceState(window.history.state, document.title, cleanedUrl);
            } catch (error) {
            }
        }
    };

    // Handle install button click - must be called synchronously within user gesture
    const handleInstallClick = (event?: React.MouseEvent) => {
        if (event) {
            // Stop propagation to prevent panel click handler from also firing
            event.stopPropagation();
        }

        if (!deferredPrompt) {
            return;
        }

        // CRITICAL: Call prompt() synchronously within the user gesture event handler
        try {
            deferredPrompt.prompt();
            
            // Handle the result asynchronously after prompt() is called
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    setIsVisible(false);
                }
                
                setDeferredPrompt(null);
                deferredPromptRef.current = null;
                setInstallRequested(false);
                autoTriggerSetupRef.current = false;
                
                // Clean up URL parameter
                cleanupUrlParameter();
            }).catch(() => {
                setDeferredPrompt(null);
                deferredPromptRef.current = null;
                setInstallRequested(false);
                autoTriggerSetupRef.current = false;
                
                // Clean up URL parameter even on error
                cleanupUrlParameter();
            });
        } catch (error) {
            setDeferredPrompt(null);
            deferredPromptRef.current = null;
            setInstallRequested(false);
            autoTriggerSetupRef.current = false;
            
            // Clean up URL parameter even on error
            cleanupUrlParameter();
        }
    };

    const shareLabel = canShare ? 'Share install link' : 'Copy link';

    const handleShare = async () => {
        if (!installUrl) {
            return;
        }

        if (canShare) {
            const shareNavigator = navigator as NavigatorExtended;

            try {
                await shareNavigator.share?.({
                    title: document.title,
                    text: 'Install the Believe App PWA on your device.',
                    url: installUrl,
                });
            } catch (error) {
            }
        } else {
            await handleCopy();
        }
    };

    const handleCopy = async () => {
        if (!installUrl || typeof document === 'undefined') {
            return;
        }

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(installUrl);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = installUrl;
                textArea.style.position = 'fixed';
                textArea.style.top = '-9999px';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }

            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            window.prompt('Copy this install link', installUrl);
        }
    };

    const qrDownloadUrl = useMemo(() => {
        if (!qrUrl) {
            return '';
        }

        return `${qrUrl}${qrUrl.includes('?') ? '&' : '?'}download=1`;
    }, [qrUrl]);

    const canShowLauncher = useMemo(
        () =>
            !alreadyInstalled &&
            !isStandalone &&
            deferredPrompt !== null &&
            !isVisible &&
            !hasBeenDismissed,
        [alreadyInstalled, deferredPrompt, isStandalone, isVisible, hasBeenDismissed]
    );

    // Don't show PWA prompt on livestock domain
    if (isLivestockDomain()) {
        return null;
    }
    
    // Don't show PWA prompt on merchant domain - check early and return null immediately
    const isMerchant = isMerchantDomain();
    if (isMerchant) {
        return null;
    }

    // Show panel if visible OR if install was requested (to show install button immediately)
    const shouldRenderPanel = (isVisible || installRequested) && !isStandalone && !alreadyInstalled;

    if (alreadyInstalled || isStandalone) {
        return null;
    }

    return (
        <>
            {shouldRenderPanel && (
                <div 
                    data-pwa-install-panel
                    onClick={handlePanelClick}
                    className={`fixed bottom-4 right-4 z-40 w-[calc(100%-2rem)] max-w-sm rounded-lg p-4 shadow-xl backdrop-blur transition-all sm:bottom-6 sm:right-6 sm:w-full ${
                        isMerchantDomain() 
                            ? `border-2 border-[#FF1493]/50 bg-gradient-to-br from-[#FF1493]/20 via-[#DC143C]/20 to-[#E97451]/20 dark:border-[#FF1493]/40 dark:from-[#FF1493]/30 dark:via-[#DC143C]/30 dark:to-[#E97451]/30 ${installRequested ? 'cursor-pointer animate-pulse ring-2 ring-[#FF1493] ring-offset-2' : ''}`
                            : `border border-primary/40 bg-primary/10 dark:border-primary/30 dark:bg-primary/20 ${installRequested ? 'cursor-pointer animate-pulse ring-2 ring-primary ring-offset-2' : ''}`
                    }`}
                >
                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                        <div>
                            <h2 className={`text-base font-semibold ${isMerchantDomain() ? 'text-white' : 'text-primary'}`}>
                                Install { import.meta.env.VITE_APP_NAME}
                            </h2>
                            <p className={`mt-1 text-sm ${isMerchantDomain() ? 'text-gray-200' : 'text-muted-foreground'}`}>
                                {installRequested
                                    ? 'Click anywhere on this page or panel to start installing the app on your device.'
                                    : 'Scan the QR code or use the link below to install the Believe App on your device.'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setIsVisible(false);
                                setHasBeenDismissed(true);
                            }}
                            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        >
                            <X className="size-4" />
                            <span className="sr-only">Close</span>
                        </button>
                    </div>

                    {qrUrl && (
                        <div className="mt-4 flex justify-center">
                            <div className="relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-md border border-primary/30 p-1 shadow-sm dark:border-primary/40">
                                {isQrLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Loader2 className="size-8 animate-spin text-primary dark:text-primary-foreground" />
                                    </div>
                                )}
                                <img
                                    src={qrUrl}
                                    alt="Believe App install QR code"
                                    onLoad={() => setIsQrLoading(false)}
                                    onError={() => setIsQrLoading(false)}
                                    className={`h-full w-full rounded-sm object-cover transition-opacity duration-300 ${
                                        isQrLoading ? 'opacity-0' : 'opacity-100'
                                    }`}
                                />
                            </div>
                        </div>
                    )}

                    <div className="mt-4 grid gap-2">
                        <span className={`text-sm font-medium ${isMerchantDomain() ? 'text-white' : 'text-primary'}`}>
                            Shareable install link
                        </span>
                        <div className="flex items-center gap-2">
                            <Input
                                value={installUrl}
                                readOnly
                                className="font-mono text-xs bg-background/95 text-foreground dark:bg-slate-900/80 dark:text-foreground"
                            />
                        <Button
                                type="button"
                                variant="outline"
                                onClick={handleCopy}
                                className="shrink-0"
                                title={copied ? 'Copied!' : 'Copy link'}
                            >
                                {copied ? (
                                    <CheckCircle2 className="size-4 text-green-600 dark:text-green-400 transition-all duration-300" />
                                ) : (
                                    <Copy className="size-4 transition-all duration-300" />
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-1">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleShare}
                            className={`justify-center gap-2 ${
                                isMerchantDomain()
                                    ? 'border-2 border-[#FF1493]/50 bg-gradient-to-r from-[#FF1493]/30 via-[#DC143C]/30 to-[#E97451]/30 text-white hover:from-[#FF1493]/40 hover:via-[#DC143C]/40 hover:to-[#E97451]/40'
                                    : 'border border-primary/30 bg-primary/20 text-primary hover:bg-primary/30'
                            }`}
                        >
                            <Share2 className="size-4" />
                            {shareLabel}
                        </Button>
                        {qrDownloadUrl && (
                            <Button variant="outline" asChild className="justify-center gap-2">
                                <a href={qrDownloadUrl} download>
                                    <DownloadCloud className="size-4" />
                                    Download QR
                                </a>
                            </Button>
                        )}
                        <Button
                            ref={installButtonRef}
                            type="button"
                            onClick={handleInstallClick}
                            disabled={deferredPrompt === null}
                            className={`inline-flex items-center justify-center gap-2 ${
                                isMerchantDomain()
                                    ? `bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] text-white hover:from-[#FF1493]/90 hover:via-[#DC143C]/90 hover:to-[#E97451]/90 ${installRequested ? 'animate-pulse ring-2 ring-[#FF1493] ring-offset-2' : ''}`
                                    : `${installRequested ? 'animate-pulse ring-2 ring-primary ring-offset-2' : ''}`
                            }`}
                        >
                            <Download className="size-4" />
                            {installRequested ? 'Click to Install' : 'Install now'}
                        </Button>
                    </div>
                </div>
            )}

            {canShowLauncher && (
                <div className="fixed bottom-4 right-4 z-30 sm:bottom-6 sm:right-6">
                    <Button
                        onClick={() => {
                            setIsVisible(true);
                        }}
                        className="shadow-lg"
                    >
                        Install App
                    </Button>
                </div>
            )}
        </>
    );
}

