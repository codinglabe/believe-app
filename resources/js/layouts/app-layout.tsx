import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import { type BreadcrumbItem, PageProps } from '@/types';
import { type ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { CsrfTokenSync } from '@/components/CsrfTokenSync';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
import { NotificationProvider } from '@/pages/Contexts/NotificationContext';
// import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
// import { PWAUpdatePrompt } from '@/components/PWAUpdatePrompt';
import { initializeMessaging, requestNotificationPermission } from '@/lib/firebase';
import axios from 'axios';

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

export default ({ children, breadcrumbs, ...props }: AppLayoutProps) => {

    const { auth } = usePage<PageProps>().props;

    function getDeviceInfo() {
        return {
            device_id: localStorage.getItem('device_id') || generateDeviceId(),
            device_type: 'web',
            device_name: navigator.userAgent,
            browser: navigator.userAgentData?.brands?.[0]?.brand || 'Unknown',
            platform: navigator.platform,
            user_agent: navigator.userAgent
        };
    }

    function generateDeviceId() {
        const deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('device_id', deviceId);
        return deviceId;
    }

     useEffect(() => {
        const initializePushNotifications = async () => {
          try {
            await initializeMessaging()
            // setIsInitialized(true)

            // Listen for firebase notifications in foreground
            window.addEventListener("firebase-notification", (event: any) => {
              console.log("[PushNotificationManager] Received notification:", event.detail)
            })
          } catch (err) {
            console.error("[PushNotificationManager] Initialization error:", err)
            // setError("Failed to initialize push notifications")
          }
        }

        initializePushNotifications()

        return () => {
          window.removeEventListener("firebase-notification", () => {})
        }
      }, [])

    useEffect(() => {
    const saveFCMTokenAfterLogin = async () => {
        if (auth?.user?.id) {
            const fcmToken = await requestNotificationPermission();
            const deviceInfo = getDeviceInfo();

            if (fcmToken) {
                await axios.post("/push-token", {
                    token: fcmToken,
                    device_info: deviceInfo
                });
                console.log("Token saved after login");
            }
        }
    };

    saveFCMTokenAfterLogin();
    }, [auth?.user?.id]);

    // Single place for Laravel session flash toasts (do not duplicate in pages or useFlashMessage)
    const { props: pageProps } = usePage();
    useEffect(() => {
        const success = pageProps.success;
        const error = pageProps.error;
        const info = pageProps.info;
        const warning = pageProps.warning;
        if (typeof success === 'string' && success.trim() !== '') showSuccessToast(success);
        if (typeof error === 'string' && error.trim() !== '') showErrorToast(error);
        if (typeof info === 'string' && info.trim() !== '') showSuccessToast(info);
        if (typeof warning === 'string' && warning.trim() !== '') showErrorToast(warning);
    }, [pageProps.success, pageProps.error, pageProps.info, pageProps.warning]);

    return (
            <NotificationProvider user={auth.user}>
            <CsrfTokenSync />
            <AppLayoutTemplate breadcrumbs={breadcrumbs} {...props}>
                 {/* <PWAInstallPrompt /> */}
        {/* <PWAUpdatePrompt /> */}
            {children}

            {/* Toast Container */}
            <Toaster
                position="top-right"
                reverseOrder={false}
                gutter={8}
                containerClassName=""
                containerStyle={{}}
                toastOptions={{
                    // Define default options
                    className: "",
                    duration: 4000,
                    style: {
                        background: "hsl(var(--background))",
                        color: "hsl(var(--foreground))",
                        border: "1px solid hsl(var(--border))",
                    },
                    // Default options for specific types
                    success: {
                        duration: 4000,
                        iconTheme: {
                            primary: "hsl(var(--primary))",
                            secondary: "hsl(var(--primary-foreground))",
                        },
                    },
                    error: {
                        duration: 5000,
                        iconTheme: {
                            primary: "#ef4444",
                            secondary: "#fff",
                        },
                    },
                }}
            />
            </AppLayoutTemplate>
         </NotificationProvider>
    );
};
