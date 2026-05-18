import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/frontend/ui/button" // or use a regular <button>

export function ThemeToggle() {
  const [isDark, setIsDark] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.theme === "dark" || (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches)
    }
    return false
  })

  React.useEffect(() => {
    const root = window.document.documentElement
    if (isDark) {
      root.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      root.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }, [isDark])

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setIsDark(!isDark)}
      className="h-9 w-9 px-0 relative"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
