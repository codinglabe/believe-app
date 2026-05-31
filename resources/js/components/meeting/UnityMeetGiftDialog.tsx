"use client"

import { useEffect, useState } from "react"
import { useForm } from "@inertiajs/react"
import { Gift, Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { UnityMeetParticipant } from "@/components/meeting/UnityMeetParticipantPanel"

export type GiftOccasionOption = {
  id: number
  occasion: string
  icon: string | null
  category: string | null
}

type SenderGiftBalances = {
  purchased_believe_points: number
}

type UnityMeetGiftDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipient: UnityMeetParticipant | null
  giftOccasions: GiftOccasionOption[]
  senderBalances: SenderGiftBalances
  livestreamKind: "user" | "organization"
  livestreamId: number
  onSent?: () => void
}

const PRESETS = [10, 25, 50] as const

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
}

export default function UnityMeetGiftDialog({
  open,
  onOpenChange,
  recipient,
  giftOccasions,
  senderBalances,
  livestreamKind,
  livestreamId,
  onSent,
}: UnityMeetGiftDialogProps) {
  const defaultOccasionId = giftOccasions[0]?.id ?? 0
  const [preset, setPreset] = useState<number | "custom">(10)

  const { data, setData, post, processing, errors, clearErrors } = useForm({
    amount: 10,
    gift_occasion_id: defaultOccasionId,
    message: "",
    livestream_kind: livestreamKind,
    livestream_id: livestreamId,
  })

  useEffect(() => {
    if (!open) {
      return
    }
    setPreset(10)
    clearErrors()
    setData({
      amount: 10,
      gift_occasion_id: defaultOccasionId,
      message: "",
      livestream_kind: livestreamKind,
      livestream_id: livestreamId,
    })
  }, [open, defaultOccasionId, livestreamKind, livestreamId, clearErrors, setData])

  if (!recipient?.id) {
    return null
  }

  const purchased = senderBalances.purchased_believe_points

  const applyPreset = (value: number | "custom") => {
    setPreset(value)
    if (value !== "custom") {
      setData("amount", value)
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    post(route("supporters.gift.send", recipient.id), {
      preserveScroll: true,
      preserveState: true,
      onSuccess: () => {
        toast.success(`Gift sent to ${recipient.name}!`)
        onOpenChange(false)
        onSent?.()
      },
      onError: () => {
        toast.error("Could not send gift. Check your balance and try again.")
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0 overflow-hidden">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Gift className="h-5 w-5 text-purple-600" />
            Give Gift
          </DialogTitle>
          <DialogDescription>Send Believe Points without leaving the meeting.</DialogDescription>
        </DialogHeader>

        <div className="px-5 pt-4">
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <Avatar className="h-11 w-11 border border-border">
              {recipient.image ? <AvatarImage src={recipient.image} alt={recipient.name} /> : null}
              <AvatarFallback className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-sm font-medium">
                {initials(recipient.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{recipient.name}</p>
              <p className="truncate text-xs text-muted-foreground">{recipient.email}</p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4 pb-5">
            <div>
              <Label>Occasion</Label>
              <Select
                value={String(data.gift_occasion_id)}
                onValueChange={(value) => setData("gift_occasion_id", Number(value))}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Choose an occasion" />
                </SelectTrigger>
                <SelectContent>
                  {giftOccasions.map((occasion) => (
                    <SelectItem key={occasion.id} value={String(occasion.id)}>
                      {occasion.icon ? `${occasion.icon} ` : ""}
                      {occasion.occasion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.gift_occasion_id ? (
                <p className="mt-1 text-sm text-destructive">{errors.gift_occasion_id}</p>
              ) : null}
            </div>

            <div>
              <Label>Amount (Believe Points)</Label>
              <div className="mt-1.5 grid grid-cols-4 gap-2">
                {PRESETS.map((n) => (
                  <Button
                    key={n}
                    type="button"
                    size="sm"
                    variant={preset === n ? "default" : "outline"}
                    className={preset === n ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white" : ""}
                    onClick={() => applyPreset(n)}
                  >
                    {n}
                  </Button>
                ))}
              </div>
              {preset === "custom" ? (
                <Input
                  type="number"
                  step="0.01"
                  min={0.01}
                  className="mt-2"
                  value={data.amount}
                  onChange={(e) => setData("amount", parseFloat(e.target.value) || 0)}
                />
              ) : (
                <button
                  type="button"
                  className="mt-2 text-xs font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400"
                  onClick={() => applyPreset("custom")}
                >
                  Enter custom amount
                </button>
              )}
              {errors.amount ? <p className="mt-1 text-sm text-destructive">{errors.amount}</p> : null}
            </div>

            <div>
              <Label>Message (optional)</Label>
              <Textarea
                className="mt-1.5"
                placeholder="Write a short note"
                value={data.message}
                onChange={(e) => setData("message", e.target.value)}
                maxLength={500}
              />
              {errors.message ? <p className="mt-1 text-sm text-destructive">{errors.message}</p> : null}
            </div>

            <p className="rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-2 text-xs text-muted-foreground">
              Your purchased balance:{" "}
              <span className="font-semibold text-foreground">{purchased.toFixed(2)} BP</span>
            </p>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
              disabled={processing || data.amount <= 0 || purchased < data.amount}
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                "Send gift"
              )}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
