"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/admin/ui/input"
import { useDebounce } from "@/hooks/useDebounce"

interface ComboboxProps {
  options?: Array<{ value: string; label: string }>
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
  fetchUrl?: string // API endpoint for fetching options
  initialOptions?: Array<{ value: string; label: string }> // Initial options from server
}

export function Combobox({
  options: staticOptions = [],
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyText = "No option found.",
  className,
  disabled = false,
  fetchUrl,
  initialOptions = [],
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [dynamicOptions, setDynamicOptions] = React.useState<Array<{ value: string; label: string }>>(initialOptions)
  const [loading, setLoading] = React.useState(false)
  const [hasMore, setHasMore] = React.useState(true)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [isFetchingMore, setIsFetchingMore] = React.useState(false)
  const comboboxRef = React.useRef<HTMLDivElement>(null)
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const optionsListRef = React.useRef<HTMLDivElement>(null)

  // Use dynamic options if fetchUrl is provided, otherwise use static options
  const options = fetchUrl ? dynamicOptions : staticOptions
  
  // Ensure selected value is always in options (for display purposes)
  // If value exists but not in options, add it from initialOptions or create a placeholder
  const selectedOptionFromOptions = options.find((option) => option.value === value)
  const selectedOptionFromInitial = initialOptions.find((option) => option.value === value)
  
  // If we have a value but it's not in current options, ensure it's available
  const optionsWithSelected = React.useMemo(() => {
    if (value && !selectedOptionFromOptions) {
      // If found in initialOptions, add it
      if (selectedOptionFromInitial) {
        return [selectedOptionFromInitial, ...options]
      }
      // Otherwise, create a placeholder option
      return [{ value: value, label: value }, ...options]
    }
    return options
  }, [options, value, selectedOptionFromOptions, selectedOptionFromInitial])
  
  const selectedOption = optionsWithSelected.find((option) => option.value === value)

  // Fetch options from API
  const fetchOptions = React.useCallback(async (page: number, search: string, reset: boolean = false) => {
    if (!fetchUrl) return

    if (reset) {
      setLoading(true)
    } else {
      setIsFetchingMore(true)
    }

    try {
      // Handle both absolute and relative URLs
      let url: URL
      try {
        url = new URL(fetchUrl)
      } catch {
        url = new URL(fetchUrl, window.location.origin)
      }
      
      url.searchParams.set('page', page.toString())
      url.searchParams.set('per_page', '20')
      // Always send search parameter (backend handles empty string)
      url.searchParams.set('search', search.trim())

      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch options: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (!data || !Array.isArray(data.data)) {
        throw new Error('Invalid response format')
      }

      if (reset) {
        setDynamicOptions(data.data || [])
      } else {
        setDynamicOptions(prev => [...prev, ...(data.data || [])])
      }

      setHasMore(data.has_more || false)
      setCurrentPage(page)
    } catch (error) {
      console.error('Error fetching options:', error)
      // On error, clear options if reset
      if (reset) {
        setDynamicOptions([])
      }
    } finally {
      setLoading(false)
      setIsFetchingMore(false)
    }
  }, [fetchUrl])

  // Debounced search function
  const debouncedFetch = useDebounce((query: string) => {
    if (!fetchUrl || !open) return
    
    // Reset pagination state
    setCurrentPage(1)
    setHasMore(true)
    
    // Fetch with debounced query
    fetchOptions(1, query, true)
  }, 300)

  // Handle search and initial load
  React.useEffect(() => {
    if (!fetchUrl || !open) return

    // If search is cleared, fetch immediately with empty query
    // Otherwise use debounced fetch
    if (searchQuery.trim() === "") {
      setCurrentPage(1)
      setHasMore(true)
      fetchOptions(1, "", true)
    } else {
      debouncedFetch(searchQuery)
    }
  }, [searchQuery, open, fetchUrl, fetchOptions, debouncedFetch])

  // Load more on scroll
  const handleScroll = React.useCallback(() => {
    if (!optionsListRef.current || !fetchUrl || loading || isFetchingMore || !hasMore) return

    const { scrollTop, scrollHeight, clientHeight } = optionsListRef.current
    const threshold = 50 // Load more when 50px from bottom

    if (scrollHeight - (scrollTop + clientHeight) < threshold) {
      fetchOptions(currentPage + 1, searchQuery, false)
    }
  }, [fetchUrl, loading, isFetchingMore, hasMore, currentPage, searchQuery, fetchOptions])

  // Filter static options based on search query (when not using API)
  const filteredOptions = React.useMemo(() => {
    if (fetchUrl) {
      // When using API, use optionsWithSelected to ensure selected value is always available
      const allOption = initialOptions.find(opt => opt.value === '')
      if (allOption) {
        return [allOption, ...optionsWithSelected]
      }
      return optionsWithSelected // Already filtered by API, but includes selected value
    }
    if (!searchQuery.trim()) {
      return staticOptions
    }
    const query = searchQuery.toLowerCase()
    return staticOptions.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        option.value.toLowerCase().includes(query)
    )
  }, [staticOptions, searchQuery, fetchUrl, options, initialOptions])

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        comboboxRef.current &&
        !comboboxRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
        setSearchQuery("")
        if (fetchUrl) {
          // Reset to initial options when closed
          setDynamicOptions(initialOptions)
          setCurrentPage(1)
          setHasMore(true)
        }
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
      // Focus search input when dropdown opens
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open, fetchUrl, initialOptions, dynamicOptions.length, loading, fetchOptions])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false)
      setSearchQuery("")
    }
  }

  const handleSelect = (optionValue: string) => {
    onValueChange(optionValue === value ? "" : optionValue)
    setOpen(false)
    setSearchQuery("")
    // Reset to initial options when closed
    if (fetchUrl) {
      setDynamicOptions(initialOptions)
      setCurrentPage(1)
      setHasMore(true)
    }
  }

  return (
    <div ref={comboboxRef} className="relative w-full">
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen(!open)}
        className={cn(
          "w-full justify-between h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground",
          className
        )}
        disabled={disabled}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
          onKeyDown={handleKeyDown}
        >
          {/* Search Input */}
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-9 px-0"
              onKeyDown={(e) => {
                if (e.key === "Enter" && filteredOptions.length === 1) {
                  handleSelect(filteredOptions[0].value)
                }
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setSearchQuery("")
                  // Reset and fetch initial options immediately
                  if (fetchUrl) {
                    setCurrentPage(1)
                    setHasMore(true)
                    fetchOptions(1, "", true)
                  }
                }}
                className="ml-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div
            ref={optionsListRef}
            className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1"
            onScroll={handleScroll}
          >
            {loading && filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                <span>Loading...</span>
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyText}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                      value === option.value && "bg-accent text-accent-foreground"
                    )}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="flex-1 text-left truncate">{option.label}</span>
                  </button>
                ))}
                {isFetchingMore && (
                  <div className="py-2 text-center text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
