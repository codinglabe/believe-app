"use client"
import { useCallback } from "react"
import { Input } from "@/components/admin/ui/input"
import { Button } from "@/components/admin/ui/button"
import { Plus, X, GripVertical } from "lucide-react"

interface ArrayInputProps {
  id: string
  label: string
  values: string[]
  onChange: (newValues: string[]) => void
  error?: string
  placeholder?: string
}

export default function ArrayInput({ id, label, values, onChange, error, placeholder }: ArrayInputProps) {
  const handleItemChange = useCallback(
    (index: number, value: string) => {
      const newValues = [...values]
      newValues[index] = value
      onChange(newValues)
    },
    [values, onChange],
  )

  const handleAddItem = useCallback(() => {
    onChange([...values, ""])
  }, [values, onChange])

  const handleRemoveItem = useCallback(
    (index: number) => {
      const newValues = values.filter((_, i) => i !== index)
      onChange(newValues)
    },
    [values, onChange],
  )

  return (
    <div className="space-y-3">
      <label htmlFor={id} className="text-sm font-semibold text-foreground">
        {label}
      </label>

      <div className="space-y-2">
        {values.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-border rounded-lg bg-muted/20">
            <div className="text-muted-foreground text-sm">No items added yet. Click "Add Item" to get started.</div>
          </div>
        )}

        {values.map((item, index) => (
          <div
            key={index}
            className="group flex items-center gap-3 p-3 bg-background border border-border rounded-lg hover:border-ring/50 transition-all duration-200"
          >
            <div className="flex items-center text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="h-4 w-4" />
            </div>

            <div className="flex-1 relative">
              <Input
                id={`${id}-${index}`}
                type="text"
                value={item}
                onChange={(e) => handleItemChange(index, e.target.value)}
                placeholder={placeholder || `Item ${index + 1}`}
                className="border-0 bg-transparent focus:bg-muted/30 transition-colors"
              />
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveItem(index)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Remove item</span>
            </Button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleAddItem}
        className="w-full border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-all duration-200 bg-transparent"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add {label.replace(/s$/, "")}
      </Button>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive flex items-center gap-2">
            <X className="h-4 w-4" />
            {error}
          </p>
        </div>
      )}
    </div>
  )
}
