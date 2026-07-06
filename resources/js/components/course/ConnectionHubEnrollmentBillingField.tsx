import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { hostCanChooseEnrollmentBillingCycle } from "@/lib/enrollment-billing-cycle"
import { isEventsHubType } from "@/lib/connection-hub-type"
import { useEffect } from "react"

type Props = {
  hubType: string
  pricingType: "free" | "paid" | string
  value: string
  onChange: (value: string) => void
  error?: string
}

export default function ConnectionHubEnrollmentBillingField({
  hubType,
  pricingType,
  value,
  onChange,
  error,
}: Props) {
  const visible = pricingType === "paid" && hostCanChooseEnrollmentBillingCycle(hubType)

  useEffect(() => {
    if (!visible && value !== "one_time") {
      onChange("one_time")
    }
  }, [visible, value, onChange])

  if (!visible) {
    return null
  }

  const noun = isEventsHubType(hubType) ? "registration" : "enrollment"

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Billing for participants</Label>
      <Select value={value || "one_time"} onValueChange={onChange}>
        <SelectTrigger className={error ? "border-destructive" : ""}>
          <SelectValue placeholder="Choose billing" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="one_time">One-time payment</SelectItem>
          <SelectItem value="monthly">Monthly subscription</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {value === "monthly"
          ? `Participants pay each month while their ${noun} stays active.`
          : `Participants pay once when they complete ${noun}.`}
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
