import React from 'react'

interface MerchantFooterProps {
  className?: string
  showLinks?: boolean
}

export function MerchantFooter({ className = '', showLinks = true }: MerchantFooterProps) {
  const currentYear = new Date().getFullYear()

  return (
    <footer className={`bg-black/25 border-t border-[#2563EB]/15 backdrop-blur ${className}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0">
          <div className="flex items-center gap-2">
            <img
              src="/merchant/merchant.png"
              alt={`${import.meta.env.VITE_APP_NAME || 'Believe'} Merchant`}
              className="w-8 h-8 object-contain"
            />
            <span className="font-semibold text-white text-sm sm:text-base">
              {import.meta.env.VITE_APP_NAME || 'Believe'} Merchant
            </span>
          </div>

          <p className="text-xs sm:text-sm text-white/70 text-center sm:text-right">
            © {currentYear} {import.meta.env.VITE_APP_NAME || 'Believe'} Merchant Program. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
