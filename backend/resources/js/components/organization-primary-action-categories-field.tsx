"use client"

import * as React from "react"
import { MultiSelect } from "@/components/ui/multi-select"

export type PrimaryActionCategoryOption = { id: number; name: string }

type Props = {
  categories: PrimaryActionCategoryOption[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  disabled?: boolean
  error?: string
  /** Defaults to "Causes". Use "Cause" when only one may be selected. */
  label?: string
  /** Set to 1 for single-select (e.g. events). */
  maxSelections?: number
}

/**
 * "Causes" = Primary Action categories the organization selected (Category Grid: Housing, Food, etc.).
 * Options come from org settings / registration, not from this form.
 */
export function OrganizationPrimaryActionCategoriesField({
  categories,
  selectedIds,
  onSelectionChange,
  disabled = false,
  error,
  label = "Causes",
  maxSelections,
}: Props) {
  const options = categories.map((c) => ({ label: c.name, value: String(c.id) }))
  const single = maxSelections === 1

  return (
    <div className="space-y-2 md:col-span-2">
      <label className="text-sm font-medium">{label}</label>
      <p className="text-xs text-muted-foreground">
        Same as your organization&apos;s <span className="font-medium">Category Grid (Primary Action)</span> — e.g.
        Housing, Food. Update your selections in profile settings if you need more options here.
      </p>
      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Your organization has no primary action categories selected yet. Add them under Settings → Profile (Category
          Grid).
        </p>
      ) : (
        <div className={disabled ? "pointer-events-none opacity-60" : undefined}>
          <MultiSelect
            options={options}
            selected={selectedIds}
            onChange={onSelectionChange}
            placeholder={single ? "Select a cause…" : "Select causes…"}
            searchPlaceholder="Search…"
            emptyMessage="No match."
            className={error ? "border-destructive" : undefined}
            maxSelections={maxSelections}
          />
        </div>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
