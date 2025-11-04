import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Download, DownloadCloud, Loader2, Share2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const INSTALL_PARAM = 'install-pwa';

const QR_ROUTE_NAME = 'pwa.install-qr';

type NavigatorExtended = Navigator & {
    share?: (data: ShareData) => Promise<void>;
    standalone?: boolean;
    getInstalledRelatedApps?: () => Promise<unknown[]>;
};

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

    const handleInstall = useCallback(
        async (auto = false) => {
            const prompt = deferredPrompt;

            if (!prompt) {
                if (!auto) {
                    setIsVisible(false);
                }
                return;
            }

            try {
                await prompt.prompt();
                await prompt.userChoice;
            } catch (error) {
                console.error('Install prompt failed:', error);
            } finally {
                setDeferredPrompt(null);
                setInstallRequested(false);
            }
        },
        [deferredPrompt]
    );

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        setInstallUrl(`${window.location.origin}?${INSTALL_PARAM}=1`);

        const supportsShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
        setCanShare(supportsShare);

        const params = new URLSearchParams(window.location.search);
        if (params.has(INSTALL_PARAM)) {
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

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error addListener is supported in older browsers
        mediaQuery.addListener(listener);

        return () => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error removeListener is supported in older browsers
            mediaQuery.removeListener(listener);
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

    useEffect(() => {
        if (!deferredPrompt) {
            return;
        }

        if (installRequested) {
            handleInstall(true);
        } else {
            setIsVisible(true);
        }
    }, [deferredPrompt, installRequested, handleInstall]);

    useEffect(() => {
        if (isStandalone) {
            setIsVisible(false);
        }
    }, [isStandalone]);

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

    const shouldRenderPanel = isVisible && !isStandalone && !alreadyInstalled;

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
                                Scan the QR code or use the link below to install the Believe App on your device.
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
                            >
                                <Copy className="size-4" />
                                {copied ? 'Copied!' : 'Copy'}
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
                        <Button
                            type="button"
                            variant="default"
                            disabled={deferredPrompt === null}
                            onClick={() => handleInstall()}
                            className="justify-center gap-2"
                        >
                            <Download className="size-4" />
                            Install now
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

