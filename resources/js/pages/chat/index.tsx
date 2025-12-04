// resources/js/pages/chat/index.tsx
import { ChatLayout } from "@/components/chat/chat-layout"
import AppLayout from "@/layouts/app-layout";
import { initializeMessaging, requestNotificationPermission } from "@/lib/firebase";
import { ChatProvider } from "@/providers/chat-provider"
import { usePage } from "@inertiajs/react";
import { useEffect } from "react";
import toast, { Toaster } from 'react-hot-toast';

export default function ChatPage() {
    const { auth } = usePage().props;

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


    const props = usePage();
    useEffect(() => {
        console.log("RootLayout props:", props);
        if(props.props?.success) {
            toast.success(props.props?.success)
        }
        if(props.props?.error) {
            toast.error(props.props?.error)
        }
    }, [props.props?.success, props.props?.error])

    return (
      <ChatProvider>
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
        <main className="h-screen w-full overflow-hidden">
          <ChatLayout />
        </main>
            </ChatProvider>
  )
}
