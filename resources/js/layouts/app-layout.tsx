import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import { type BreadcrumbItem, PageProps } from '@/types';
import { type ReactNode, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { CsrfTokenSync } from '@/components/CsrfTokenSync';
import { showSessionFlashToasts } from '@/lib/flash-toast-once';
import { NotificationProvider } from '@/pages/Contexts/NotificationContext';
// import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
// import { PWAUpdatePrompt } from '@/components/PWAUpdatePrompt';
import { syncPushTokenWithServer, startPushTokenRefreshListeners } from '@/lib/push-token-sync';
import { registerServiceWorker } from '@/pwa/register-service-worker';
import { PushNotificationManager } from '@/components/PushNotificationManager';
import { ProximityLocationManager } from '@/components/ProximityLocationManager';
import { shouldAutoPromptForPushPermission } from '@/lib/push-environment';
import { BridgeVerificationGate } from '@/components/organization/BridgeVerificationGate';

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

export default ({ children, breadcrumbs, ...props }: AppLayoutProps) => {

    const { auth } = usePage<PageProps>().props;

     useEffect(() => {
        void registerServiceWorker();
      }, [])

    const authUserId = auth?.user?.id;

    useEffect(() => {
        if (!authUserId) return;

        const syncToken = async () => {
            try {
                await syncPushTokenWithServer({ prompt: shouldAutoPromptForPushPermission() });
            } catch (err) {
                console.error("[AppLayout] FCM token sync error:", err);
            }
        };

        void syncToken();
    }, [authUserId]);

    useEffect(() => {
        if (!authUserId) return;
        return startPushTokenRefreshListeners(() => Boolean(authUserId));
    }, [authUserId]);

    // Single place for Laravel session flash toasts – use primitives + ref so deps don't churn every render
    const { props: pageProps } = usePage();
    const success = typeof pageProps.success === 'string' ? pageProps.success : '';
    const error = typeof pageProps.error === 'string' ? pageProps.error : '';
    const info = typeof pageProps.info === 'string' ? pageProps.info : '';
    const warning = typeof pageProps.warning === 'string' ? pageProps.warning : '';

    useEffect(() => {
        showSessionFlashToasts({ success, error, info, warning });
    }, [success, error, info, warning]);

    return (
            <NotificationProvider user={auth.user}>
            <CsrfTokenSync />
            <ProximityLocationManager />
            <AppLayoutTemplate breadcrumbs={breadcrumbs} {...props}>
                 {/* <PWAInstallPrompt /> */}
        {/* <PWAUpdatePrompt /> */}
            {auth?.user?.id && !auth.user.has_push_device && Notification.permission !== "denied" && (
                <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-amber-900 dark:text-amber-100">
                        Enable browser notifications to get alerts in real time.
                    </p>
                    <PushNotificationManager userId={auth.user.id} />
                </div>
            )}
            {children}
            <BridgeVerificationGate />
            </AppLayoutTemplate>
         </NotificationProvider>
    );
};
