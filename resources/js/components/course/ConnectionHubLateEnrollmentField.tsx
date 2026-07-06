import { Label } from "@/components/ui/label"
import { Switch } from "@/components/admin/ui/switch"
import { isEventsHubType } from "@/lib/connection-hub-type"

type Props = {
  hubType: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  error?: string
}

export default function ConnectionHubLateEnrollmentField({
  hubType,
  checked,
  onCheckedChange,
  error,
}: Props) {
  const joinVerb = isEventsHubType(hubType) ? "register" : "join"

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-gray-800 dark:bg-gray-900/40">
      <div className="space-y-1">
        <Label htmlFor="allow_enrollment_after_start" className="text-sm font-medium leading-snug">
          Allow participants to {joinVerb} after the start date
        </Label>
        <p className="text-xs text-muted-foreground">
          When enabled, new participants can {joinVerb} even after the listing has started. When disabled,{" "}
          {joinVerb === "register" ? "registration" : "enrollment"} closes at the start date and time.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <Switch
        id="allow_enrollment_after_start"
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={`Allow participants to ${joinVerb} after the start date`}
      />
    </div>
  )
}
