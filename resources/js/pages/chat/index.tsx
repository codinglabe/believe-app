// resources/js/pages/chat/index.tsx
import { ChatLayout } from "@/components/chat/chat-layout"
import AppLayout from "@/layouts/app-layout";
import { ensureMessagingReady } from "@/lib/firebase";
import { syncPushTokenWithServer } from "@/lib/push-token-sync";
import { ChatProvider } from "@/providers/chat-provider"
import { usePage } from "@inertiajs/react";
import { useEffect } from "react";
import toast, { Toaster } from 'react-hot-toast';

export default function ChatPage() {
    const { auth } = usePage().props;

    useEffect(() => {
        const initializePushNotifications = async () => {
            try {
            await ensureMessagingReady()

            window.addEventListener("firebase-notification", (event: Event) => {
                const detail = (event as CustomEvent).detail
                console.log("[ChatPage] Received notification:", detail)
            })
            } catch (err) {
            console.error("[ChatPage] Push initialization error:", err)
            }
        }

        initializePushNotifications()

        return () => {
            window.removeEventListener("firebase-notification", () => {})
        }
    }, [])

    useEffect(() => {
        const saveFCMTokenAfterLogin = async () => {
            if (!auth?.user?.id) return
            try {
                await syncPushTokenWithServer()
            } catch (err) {
                console.error("[ChatPage] FCM token sync error:", err)
            }
        }

        saveFCMTokenAfterLogin()
    }, [auth?.user?.id]);


    const props = usePage();
    useEffect(() => {
        const success = props.props?.success;
        const error = props.props?.error;
        if (typeof success === 'string' && success.trim() !== '') toast.success(success);
        if (typeof error === 'string' && error.trim() !== '') toast.error(error);
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
        <main className="h-screen h-[100dvh] w-full overflow-hidden">
          <ChatLayout />
        </main>
            </ChatProvider>
  )
}
