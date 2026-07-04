"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { router, useForm } from "@inertiajs/react"
import { PageHead } from "@/components/frontend/PageHead"
import { Gift, CheckCircle } from "lucide-react"
import { ManualPaymentInstructions } from "@/components/payments/manual-payment-instructions"

interface Props {
  donation: {
    id: number
    amount: number
    payment_method: string
    status: string
    organization_name: string
  }
  instructions: {
    type?: string
    username?: string | null
    cashtag?: string | null
    qr_image_url?: string | null
    email?: string | null
    phone?: string | null
    wallet_info?: string | null
  }
  reward_points: number
}

export default function ManualDonationConfirm({ donation, instructions, reward_points }: Props) {
  const { data, setData, post, processing, errors } = useForm<{ receipt: File | null }>({
    receipt: null,
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    post(route("donations.manual.confirm.submit", donation.id), {
      forceFormData: true,
    })
  }

  return (
    <FrontendLayout>
      <PageHead title="Confirm Payment" />
      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="rounded-2xl border border-purple-200/50 bg-white/80 shadow-lg p-6 dark:border-purple-700/35 dark:bg-purple-950/35">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Complete Your Donation</h1>
          <p className="text-gray-600 dark:text-white/70 mb-6">
            ${donation.amount.toFixed(2)} to <strong>{donation.organization_name}</strong>
          </p>

          <ManualPaymentInstructions
            instructions={instructions}
            paymentMethod={donation.payment_method}
            actionLabel="donation"
          />

          <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300 mb-6">
            <Gift className="h-4 w-4" />
            You will receive +{reward_points} BRP (Believe Reward Points) after admin verification
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="receipt">Upload receipt (optional)</Label>
              <Input
                id="receipt"
                type="file"
                accept="image/*"
                className="mt-1"
                onChange={(e) => setData("receipt", e.target.files?.[0] ?? null)}
              />
              {errors.receipt && <p className="text-sm text-red-600 mt-1">{errors.receipt}</p>}
            </div>
            <Button type="submit" disabled={processing} className="w-full bg-purple-600 hover:bg-purple-700">
              {processing ? "Submitting…" : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" /> Payment Confirmed
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </FrontendLayout>
  )
}
