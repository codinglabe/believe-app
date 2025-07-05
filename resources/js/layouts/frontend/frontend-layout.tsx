import type React from "react"
// import "./globals.css"
import Navbar from "@/components/frontend/layout/navbar"
import Footer from "@/components/frontend/layout/footer"


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
          <Navbar />
          <main>
              {children}
          </main>
          <Footer />
    </div>
  )
}
