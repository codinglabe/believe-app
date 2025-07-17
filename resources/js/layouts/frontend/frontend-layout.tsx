import type React from "react"
// import "./globals.css"
import Navbar from "@/components/frontend/layout/navbar"
import Footer from "@/components/frontend/layout/footer"
import { NotificationProvider } from "@/components/frontend/notification-provider"


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <NotificationProvider>
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
