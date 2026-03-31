import React from 'react'
import { Toaster } from 'react-hot-toast'
import { MerchantSidebar } from './MerchantSidebar'
import { MerchantDashboardHeader } from './MerchantDashboardHeader'

interface MerchantDashboardLayoutProps {
  children: React.ReactNode
}

export function MerchantDashboardLayout({ children }: MerchantDashboardLayoutProps) {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0A2540',
            color: '#ffffff',
            border: '1px solid rgba(37, 99, 235, 0.25)',
            borderRadius: '8px',
            padding: '16px',
          },
          success: {
            duration: 4000,
            style: {
              background: '#0b2a12',
              color: '#ffffff',
              border: '1px solid #16a34a',
            },
            iconTheme: {
              primary: '#16a34a',
              secondary: '#ffffff',
            },
          },
          error: {
            duration: 5000,
            style: {
              background: '#2b0b0b',
              color: '#ffffff',
              border: '1px solid #ef4444',
            },
            iconTheme: {
              primary: '#ffffff',
              secondary: '#ef4444',
            },
          },
        }}
      />
      <div className="min-h-screen bg-gradient-to-br from-[#0A2540] via-[#061a2f] to-black text-white">
        <div className="absolute inset-0 bg-gradient-to-r from-[#2563EB]/10 via-transparent to-transparent pointer-events-none" />

        {/* Sidebar */}
        <MerchantSidebar />

        {/* Header */}
        <MerchantDashboardHeader />

        {/* Main Content */}
        <main className="lg:pl-64 pt-16 min-h-screen">
          <div className="p-4 sm:p-6 relative z-10">{children}</div>
        </main>
      </div>
    </>
  )
}
