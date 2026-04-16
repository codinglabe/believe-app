"use client"

import { Head, useForm, usePage } from "@inertiajs/react"
import { useState } from "react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { Gift, Loader2 } from "lucide-react"
import toast from "react-hot-toast"

interface Celebrant {
  id: number
  name: string
  slug: string | null
  image: string | null
}

interface SenderBalances {
  purchased_believe_points: number
  gifted_believe_points: number
}

interface BirthdayGiftPageProps {
  celebrant: Celebrant
  senderBalances: SenderBalances
}

const PRESETS = [10, 25, 50] as const

export default function BirthdayGiftPage() {
  const { celebrant, senderBalances } = usePage().props as unknown as BirthdayGiftPageProps
  const [preset, setPreset] = useState<number | "custom">(10)

  const { data, setData, post, processing, errors, reset } = useForm({
    amount: 10,
    message: `Happy Birthday ${(celebrant.name || "friend").split(" ")[0]}!`,
  })

  const applyPreset = (v: number | "custom") => {
    setPreset(v)
    if (v !== "custom") {
      setData("amount", v)
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    post(route("supporters.birthday-gift.send", celebrant.id), {
      preserveScroll: true,
      onSuccess: () => {
        toast.success("Gift sent!")
        reset()
      },
      onError: () => {
        toast.error("Could not send gift. Check your balance and try again.")
      },
    })
  }

  const purchased = senderBalances.purchased_believe_points
  const gifted = senderBalances.gifted_believe_points

  return (
    <FrontendLayout>
      <Head title="Send birthday gift" />
      <div className="max-w-lg mx-auto py-10 px-4">
        <Card className="border-2 border-violet-500/30 dark:border-violet-400/30 shadow-xl dark:bg-gray-900/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl dark:text-white">
              <Gift className="h-6 w-6 text-amber-500" />
              Send Gift
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-6">
              {celebrant.image ? (
                <img
                  src={celebrant.image}
                  alt=""
                  className="h-14 w-14 rounded-full object-cover border-2 border-violet-500/40"
                />
              ) : (
                <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center text-lg font-semibold">
                  {(celebrant.name || "?")[0]}
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Birthday</p>
                <p className="font-semibold text-lg dark:text-white">{celebrant.name}</p>
              </div>
            </div>

            <form onSubmit={submit} className="space-y-5">
              <div>
                <Label className="dark:text-gray-200">Amount (Believe Points)</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  {PRESETS.map((n) => (
                    <Button
                      key={n}
                      type="button"
                      variant={preset === n ? "default" : "outline"}
                      className={preset === n ? "ring-2 ring-primary" : ""}
                      onClick={() => applyPreset(n)}
                    >
                      {n}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant={preset === "custom" ? "default" : "outline"}
                    onClick={() => applyPreset("custom")}
                  >
                    Custom
                  </Button>
                </div>
                {preset === "custom" && (
                  <Input
                    type="number"
                    step="0.01"
                    min={0.01}
                    className="mt-2 dark:bg-gray-800"
                    value={data.amount}
                    onChange={(e) => setData("amount", parseFloat(e.target.value) || 0)}
                  />
                )}
                {errors.amount && <p className="text-sm text-destructive mt-1">{errors.amount}</p>}
              </div>

              <div>
                <Label className="dark:text-gray-200">Message</Label>
                <Input
                  className="mt-2 dark:bg-gray-800"
                  value={data.message}
                  onChange={(e) => setData("message", e.target.value)}
                  maxLength={500}
                />
              </div>

              <div className="flex items-center justify-between gap-3 text-sm border rounded-lg p-3 bg-amber-500/5 border-amber-500/30">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <Gift className="h-4 w-4" />
                  <span>
                    Purchased balance: <strong>{purchased.toFixed(2)}</strong>
                  </span>
                </div>
                {gifted > 0 && (
                  <span className="text-xs text-muted-foreground text-right">
                    Gifted {gifted.toFixed(2)} cannot be sent to others
                  </span>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-violet-600"
                disabled={processing || data.amount <= 0 || purchased < data.amount}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </FrontendLayout>
  )
}
