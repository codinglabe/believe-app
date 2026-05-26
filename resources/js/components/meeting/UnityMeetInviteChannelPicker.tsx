import { Bell, Mail, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type UnityMeetInviteChannel = "email" | "biu" | "both"

type UnityMeetInviteChannelPickerProps = {
  value: UnityMeetInviteChannel
  onChange: (value: UnityMeetInviteChannel) => void
  className?: string
}

export default function UnityMeetInviteChannelPicker({
  value,
  onChange,
  className,
}: UnityMeetInviteChannelPickerProps) {
  const options: { id: UnityMeetInviteChannel; label: string; icon: typeof Mail }[] = [
    { id: "email", label: "Email", icon: Mail },
    { id: "biu", label: "BIU", icon: Bell },
    { id: "both", label: "Both", icon: Send },
  ]

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Send via
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {options.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            type="button"
            variant={value === id ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 gap-1 px-1.5 text-[11px]",
              value === id && "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
            )}
            onClick={() => onChange(id)}
          >
            <Icon className="h-3 w-3 shrink-0" />
            {label}
          </Button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground leading-snug">
        {value === "biu"
          ? "In-app alert and push for Believe In Unity members (no email credit)."
          : value === "both"
            ? "Email plus BIU notification when they have an account."
            : "Uses one email credit per guest."}
      </p>
    </div>
  )
}
