import type React from "react"
// import "./globals.css"
import Navbar from "@/components/frontend/layout/navbar"
import Footer from "@/components/frontend/layout/footer"
import { NotificationProvider } from "@/components/frontend/notification-provider"
import toast, { Toaster } from "react-hot-toast"
import { use, useEffect } from "react"
import { usePage } from "@inertiajs/react"


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
    }) {
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
      <NotificationProvider>
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
          {children}
        </main>
        <Footer />
      </div>
    </NotificationProvider>
  )
}
