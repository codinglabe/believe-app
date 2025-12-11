import * as React from "react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/frontend/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/frontend/ui/popover"
import { Button } from "@/components/ui/button"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

type Option = { label: string; value: string }

interface MultiSelectProps {
  options: Option[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
}

export function MultiSelect({ options, selected, onChange, placeholder, className }: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const handleToggle = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter(v => v !== value)
      : [...selected, value]
    onChange(newSelected)
  }

  const selectedLabels = options
    .filter(o => selected.includes(o.value))
    .map(o => o.label)
    .join(", ")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "w-full justify-between h-12 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200",
            className
          )}
        >
          <span className="truncate text-left">
            {selected.length === 0 ? placeholder : selectedLabels || "Select positions..."}
          </span>
          <ChevronsUpDown className="ml-2 h-5 w-5 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 shadow-lg rounded-lg" 
        align="start"
      >
        <Command className="bg-white dark:bg-gray-800">
          <CommandInput 
            placeholder="Search positions..." 
            className="text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 focus:border-blue-500"
          />
          <CommandEmpty className="text-gray-500 dark:text-gray-400 py-4 text-sm">No position found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto p-1">
            {options.map((option) => (
              <CommandItem
                key={option.value}
                onSelect={() => handleToggle(option.value)}
                className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 cursor-pointer rounded-md"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4 text-blue-600 dark:text-blue-400",
                    selected.includes(option.value) ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="text-sm">{option.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
