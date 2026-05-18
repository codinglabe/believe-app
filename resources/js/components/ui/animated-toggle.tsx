import { useState, useEffect } from "react"

interface AnimatedToggleProps {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
  size?: "sm" | "md" | "lg"
}

export function AnimatedToggle({ id, checked, onChange, label, disabled = false, size = "md" }: AnimatedToggleProps) {
  const [isChecked, setIsChecked] = useState(checked)

  useEffect(() => {
    setIsChecked(checked)
  }, [checked])

  const handleToggle = () => {
    if (disabled) return
    const newValue = !isChecked
    setIsChecked(newValue)
    onChange(newValue)
  }

  const sizeClasses = {
    sm: "h-4 w-7",
    md: "h-6 w-11",
    lg: "h-8 w-14",
  }

  const thumbSizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-6 w-6",
  }

  const translateClasses = {
    sm: isChecked ? "translate-x-3" : "translate-x-0.5",
    md: isChecked ? "translate-x-6" : "translate-x-1",
    lg: isChecked ? "translate-x-7" : "translate-x-1",
  }

  return (
    <div
      className={`flex items-center ${label ? "justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200" : ""}`}
    >
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer flex-1">
          {label}
        </label>
      )}
      <button
        type="button"
        id={id}
        onClick={handleToggle}
        disabled={disabled}
        className={`relative inline-flex ${sizeClasses[size]} items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
          isChecked ? "bg-blue-600 shadow-lg shadow-blue-600/25" : "bg-slate-300 dark:bg-slate-600"
        }`}
      >
        <span
          className={`inline-block ${thumbSizeClasses[size]} transform rounded-full bg-white transition-all duration-300 shadow-lg ${
            isChecked ? `${translateClasses[size]} scale-110` : translateClasses[size]
          }`}
        />
      </button>
    </div>
  )
}
