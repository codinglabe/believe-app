import type React from "react"
// import "./globals.css"
import Navbar from "@/components/frontend/layout/navbar"
import Footer from "@/components/frontend/layout/footer"
import { NotificationProvider } from "@/components/frontend/notification-provider"
import SupportWidget from "@/components/frontend/SupportWidget"
import toast, { Toaster } from "react-hot-toast"
import { use, useEffect } from "react"
import { usePage } from "@inertiajs/react"
import { CsrfTokenSync } from "@/components/CsrfTokenSync"
// import { PWAInstallPrompt } from "@/components/PWAInstallPrompt"
// import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt"
import { syncPushTokenWithServer } from "@/lib/push-token-sync"
import { registerServiceWorker } from "@/pwa/register-service-worker"


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
    const { auth } = usePage().props;

    useEffect(() => {
        void registerServiceWorker();
    }, [])

    useEffect(() => {
        const saveFCMTokenAfterLogin = async () => {
            if (!auth?.user?.id) return
            try {
                await syncPushTokenWithServer()
            } catch (err) {
                console.error("[FrontendLayout] FCM token sync error:", err)
            }
        }
        saveFCMTokenAfterLogin()
    }, [auth?.user?.id])


    const page = usePage<{ success?: string; error?: string }>();
    useEffect(() => {
        const success = page.props?.success
        const error = page.props?.error
        if (typeof success === "string" && success.trim() !== "") toast.success(success)
        if (typeof error === "string" && error.trim() !== "") toast.error(error)
    }, [page.props?.success, page.props?.error])
  return (
      <NotificationProvider>
          {/* Keep CSRF meta in sync so 419 never happens on public/org pages */}
          <CsrfTokenSync />
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
                    // Default options for specific types
                    success: {
                        duration: 4000,
                        iconTheme: {
                            primary: "hsl(var(--primary))",
                            secondary: "hsl(var(--primary-foreground))",
                        },
                    },
                    error: {
                        duration: 4000,
                        iconTheme: {
                            primary: "#ef4444",
                            secondary: "#fff",
                        },
                    },
                }}
            />
      <div>
        <Navbar />
        <main>
          {/* <PWAInstallPrompt /> */}
          {/* <PWAUpdatePrompt /> */}
          {children}
        </main>
        <Footer />
        <SupportWidget />
      </div>
    </NotificationProvider>
  )
}
