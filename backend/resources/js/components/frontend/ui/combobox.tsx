"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/frontend/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/frontend/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/frontend/ui/command"

type Option = { value: string; label: string }

interface ComboboxProps {
  options: Option[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
}

export function Combobox({
  options,
  value = "",
  onChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  emptyText = "No option found.",
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedOption = options.find((option) => option.value === value)

  const handleSelect = (optionValue: string) => {
    const nextValue = optionValue === value ? "" : optionValue
    onChange(nextValue)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-12 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200",
            !selectedOption && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate text-left">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-5 w-5 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto min-w-full sm:min-w-(--radix-popover-trigger-width) max-w-md max-h-80 p-0 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 shadow-lg rounded-lg"
        align="start"
        sideOffset={4}
      >
        <Command className="bg-white dark:bg-gray-800">
          <CommandInput
            placeholder={searchPlaceholder}
            className="text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 focus:border-blue-500"
          />
          <CommandEmpty className="text-gray-500 dark:text-gray-400 py-4 text-sm">
            {emptyText}
          </CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto p-1">
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.label}
                onSelect={() => handleSelect(option.value)}
                className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 cursor-pointer rounded-md"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4 text-blue-600 dark:text-blue-400",
                    value === option.value ? "opacity-100" : "opacity-0"
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

