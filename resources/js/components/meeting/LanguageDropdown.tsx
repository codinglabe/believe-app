"use client"

import type React from "react"
import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/frontend/ui/popover"

interface LanguageDropdownProps {
  selectedLanguage: string
  onLanguageChange: (language: string) => void
  trigger: React.ReactNode
}

export default function LanguageDropdown({ selectedLanguage, onLanguageChange, trigger }: LanguageDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  const languages = [
    { code: "auto", name: "Automatic", active: true },
    { code: "en", name: "English" },
    { code: "zh", name: "中文" },
    { code: "de", name: "Deutsch" },
    { code: "fr", name: "Français" },
    { code: "id", name: "Bahasa Indonesia" },
    { code: "ar", name: "العربية" },
    { code: "ru", name: "Русский" },
    { code: "es", name: "Español" },
  ]

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-64 p-0" side="top" align="start">
        <div className="bg-black/90 dark:bg-gray-900/95 text-white rounded-lg p-4">
          <div className="mb-3">
            <h3 className="text-sm font-medium text-white/90">Select AI subtitles</h3>
          </div>

          <div className="space-y-1">
            {languages.map((lang) => (
              <div
                key={lang.code}
                className={`flex items-center space-x-3 p-2 rounded cursor-pointer transition-colors ${
                  selectedLanguage === lang.name ? "bg-white/20" : "hover:bg-white/10"
                }`}
                onClick={() => {
                  onLanguageChange(lang.name)
                  setIsOpen(false)
                }}
              >
                {lang.code === "auto" && <div className="w-2 h-2 bg-green-500 rounded-full" />}
                <span className="text-sm text-white">{lang.name}</span>
                {selectedLanguage === lang.name && <div className="ml-auto text-white">✓</div>}
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
