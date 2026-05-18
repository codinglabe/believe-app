"use client"

interface LanguageSelectorProps {
  selectedLanguage: string
  onLanguageChange: (language: string) => void
}

export default function LanguageSelector({ selectedLanguage, onLanguageChange }: LanguageSelectorProps) {
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
    <div className="w-48 bg-black/90 text-white p-4 flex flex-col rounded-lg">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-white/90 mb-3">Select AI subtitles</h3>
      </div>

      <div className="space-y-1">
        {languages.map((lang) => (
          <div
            key={lang.code}
            className={`flex items-center space-x-3 p-2 rounded cursor-pointer transition-colors ${
              selectedLanguage === lang.name ? "bg-white/20" : "hover:bg-white/10"
            }`}
            onClick={() => onLanguageChange(lang.name)}
          >
            {lang.code === "auto" && <div className="w-2 h-2 bg-green-500 rounded-full" />}
            <span className="text-sm text-white">{lang.name}</span>
            {selectedLanguage === lang.name && <div className="ml-auto text-white">✓</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
