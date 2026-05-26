import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import { type BreadcrumbItem, PageProps } from '@/types';
import { type ReactNode, useRef, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { usePage } from '@inertiajs/react';
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

    const authUserId = auth?.user?.id;
    const fcmTokenSavedForUser = useRef<number | null>(null);

    useEffect(() => {
        const saveFCMTokenAfterLogin = async () => {
            if (!authUserId) return;
            if (fcmTokenSavedForUser.current === authUserId) return;
            fcmTokenSavedForUser.current = authUserId;

            const fcmToken = await requestNotificationPermission();
            const deviceInfo = getDeviceInfo();

            if (fcmToken) {
                await axios.post("/push-token", {
                    token: fcmToken,
                    device_info: deviceInfo
                });
                console.log("Token saved after login");
            }
        };

        saveFCMTokenAfterLogin();
    }, [authUserId]);

    // Single place for Laravel session flash toasts – use primitives + ref so deps don't churn every render
    const { props: pageProps } = usePage();
    const success = typeof pageProps.success === 'string' ? pageProps.success : '';
    const error = typeof pageProps.error === 'string' ? pageProps.error : '';
    const info = typeof pageProps.info === 'string' ? pageProps.info : '';
    const warning = typeof pageProps.warning === 'string' ? pageProps.warning : '';
    const lastFlashRef = useRef({ success: '', error: '', info: '', warning: '' });

    useEffect(() => {
        if (success.trim() !== '' && lastFlashRef.current.success !== success) {
            lastFlashRef.current.success = success;
            showSuccessToast(success);
        }
        if (error.trim() !== '' && lastFlashRef.current.error !== error) {
            lastFlashRef.current.error = error;
            showErrorToast(error);
        }
        if (info.trim() !== '' && lastFlashRef.current.info !== info) {
            lastFlashRef.current.info = info;
            showSuccessToast(info);
        }
        if (warning.trim() !== '' && lastFlashRef.current.warning !== warning) {
            lastFlashRef.current.warning = warning;
            showErrorToast(warning);
        }
    }, [success, error, info, warning]);

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
