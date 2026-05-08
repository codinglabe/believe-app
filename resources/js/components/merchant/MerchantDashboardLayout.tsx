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
      <div
        data-merchant-dashboard
        className="min-h-screen bg-[#0a0c1b] text-white scheme-dark selection:bg-purple-500/30"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.12),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(59,130,246,0.08),transparent_45%)]" />

        {/* Sidebar */}
        <MerchantSidebar />

        {/* Header */}
        <MerchantDashboardHeader />

        {/* Main Content */}
        <main className="min-h-screen pt-[4.25rem] sm:pt-16 lg:pl-64">
          <div className="relative z-10 p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </>
  )
}
