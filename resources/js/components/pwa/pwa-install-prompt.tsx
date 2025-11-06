import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Download, DownloadCloud, Loader2, Share2, X, CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

    // Removed handleInstall callback - using native event listener instead to preserve user gesture

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        setInstallUrl(`${window.location.origin}?${INSTALL_PARAM}=1`);

        const supportsShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
        setCanShare(supportsShare);

        const params = new URLSearchParams(window.location.search);
        if (params.has(INSTALL_PARAM)) {
            console.log('[PWA] Install parameter detected in URL');
            setInstallRequested(true);
            params.delete(INSTALL_PARAM);

            const newQuery = params.toString();
            const cleanedUrl = `${window.location.origin}${window.location.pathname}${newQuery ? `?${newQuery}` : ''}${
                window.location.hash ?? ''
            }`;

            window.history.replaceState({}, document.title, cleanedUrl);
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
            console.log('[PWA] beforeinstallprompt event fired');
            setDeferredPrompt(promptEvent);
            setHasBeenDismissed(false);
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
        };

        window.addEventListener('appinstalled', handler);

        return () => {
            window.removeEventListener('appinstalled', handler);
        };
    }, []);

    // When install is requested via QR code, show the panel immediately
    // Note: We cannot auto-trigger prompt() because it requires a user gesture
    // The user gesture from clicking the QR link expires before React mounts
    // So we show the panel and highlight the install button for user to click
    useEffect(() => {
        if (installRequested && deferredPrompt) {
            console.log('[PWA] Install requested - showing install panel');
            setIsVisible(true);
        }
    }, [installRequested, deferredPrompt]);

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

    // Use native DOM event listener with mousedown to capture gesture EARLIER
    // mousedown fires before click and preserves user gesture better
    useEffect(() => {
        const button = installButtonRef.current;
        if (!button) return;

        const handleMouseDown = () => {
            // Get the current deferredPrompt from ref
            const currentPrompt = deferredPromptRef.current;
            if (!currentPrompt) {
                return;
            }

            // Call prompt() IMMEDIATELY on mousedown - this fires before click
            // This better preserves the user gesture
            try {
                console.log('[PWA] Triggering install prompt (user mousedown - native event)...');
                const promptPromise = currentPrompt.prompt();
                
                // Handle results asynchronously
                promptPromise
                    .then(() => currentPrompt.userChoice)
                    .then((choiceResult: { outcome: 'accepted' | 'dismissed' }) => {
                        console.log('[PWA] User choice:', choiceResult.outcome);
                        setDeferredPrompt(null);
                        setInstallRequested(false);
                    })
                    .catch((error: unknown) => {
                        // Only log if it's not a user gesture error (expected in some cases)
                        if (error instanceof Error && !error.message.includes('user gesture')) {
                            console.error('[PWA] Install prompt failed:', error);
                        }
                        setDeferredPrompt(null);
                        setInstallRequested(false);
                    });
            } catch (error) {
                // Only log if it's not a user gesture error
                if (error instanceof Error && !error.message.includes('user gesture')) {
                    console.error('[PWA] Install prompt failed synchronously:', error);
                }
                setDeferredPrompt(null);
                setInstallRequested(false);
            }
        };

        // Use mousedown instead of click - fires earlier and preserves gesture better
        button.addEventListener('mousedown', handleMouseDown, { capture: true, passive: false });

        return () => {
            button.removeEventListener('mousedown', handleMouseDown, { capture: true });
        };
    }, []); // Empty deps - we use refs to access current values

    // Keep deferredPrompt in a ref for the native event listener
    useEffect(() => {
        deferredPromptRef.current = deferredPrompt;
    }, [deferredPrompt]);

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
                console.error('Sharing failed:', error);
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
            console.error('Copy failed:', error);
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

    // Show panel if visible OR if install was requested (to show install button immediately)
    const shouldRenderPanel = (isVisible || installRequested) && !isStandalone && !alreadyInstalled;

    if (alreadyInstalled || isStandalone) {
        return null;
    }

    return (
        <>
            {shouldRenderPanel && (
                <div className="fixed bottom-4 right-4 z-40 w-[calc(100%-2rem)] max-w-sm rounded-lg border border-primary/40 bg-primary/10 p-4 shadow-xl backdrop-blur transition-all dark:border-primary/30 dark:bg-primary/20 sm:bottom-6 sm:right-6 sm:w-full">
                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                        <div>
                            <h2 className="text-base font-semibold text-primary">Install Believe App</h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {installRequested 
                                    ? 'Click the "Click to Install" button below to install the app on your device.'
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
                        <span className="text-sm font-medium text-primary">Shareable install link</span>
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
                            className="justify-center gap-2 border border-primary/30 bg-primary/20 text-primary hover:bg-primary/30"
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
                        <button
                            ref={installButtonRef}
                            type="button"
                            disabled={deferredPrompt === null}
                            className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${installRequested ? 'animate-pulse ring-2 ring-primary ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
                        >
                            <Download className="size-4" />
                            {installRequested ? 'Click to Install' : 'Install now'}
                        </button>
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

