import React from 'react'
import { MerchantSidebar } from './MerchantSidebar'
import { MerchantDashboardHeader } from './MerchantDashboardHeader'

interface MerchantDashboardLayoutProps {
  children: React.ReactNode
}

export function MerchantDashboardLayout({ children }: MerchantDashboardLayoutProps) {
  return (
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
  )
}

