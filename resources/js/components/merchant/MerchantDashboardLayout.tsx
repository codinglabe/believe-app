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
            background: '#1f2937',
            color: '#ffffff',
            border: '1px solid #374151',
            borderRadius: '8px',
            padding: '16px',
          },
          success: {
            duration: 4000,
            style: {
              background: '#10b981',
              color: '#ffffff',
            },
            iconTheme: {
              primary: '#ffffff',
              secondary: '#10b981',
            },
          },
          error: {
            duration: 5000,
            style: {
              background: '#ef4444',
              color: '#ffffff',
            },
            iconTheme: {
              primary: '#ffffff',
              secondary: '#ef4444',
            },
          },
        }}
      />
      <div className="min-h-screen bg-gradient-to-br from-black via-[#1a0a0a] to-[#2d1b1b]">
        <div className="absolute inset-0 bg-gradient-to-r from-[#FF1493]/5 via-[#DC143C]/5 to-[#E97451]/5 pointer-events-none"></div>
        
        {/* Sidebar */}
        <MerchantSidebar />

        {/* Header */}
        <MerchantDashboardHeader />

        {/* Main Content */}
        <main className="lg:pl-64 pt-16 min-h-screen">
          <div className="p-4 sm:p-6">
            {children}
          </div>
        </main>
      </div>
    </>
  )
}

