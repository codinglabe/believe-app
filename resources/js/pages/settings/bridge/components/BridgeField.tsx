import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function BridgeField({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
  readOnly,
  type = "text",
  className,
}: {
  id: string
  label: string
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  hint?: string
  error?: string
  readOnly?: boolean
  type?: string
  className?: string
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        className={cn(readOnly && "bg-muted font-mono text-sm", !readOnly && "font-mono text-sm")}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  )
}
