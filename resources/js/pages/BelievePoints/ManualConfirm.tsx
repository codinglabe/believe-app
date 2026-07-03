"use client"

import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Head, router, useForm, usePage } from "@inertiajs/react"
import { CheckCircle, Coins } from "lucide-react"
import { ManualPaymentInstructions } from "@/components/payments/manual-payment-instructions"

interface Props {
  purchase: {
    id: number
    amount: number
    points: number
    payment_method: string
    status: string
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
  auth?: { user?: { role?: string } }
}

export default function BelievePointsManualConfirm({ purchase, instructions }: Props) {
  const { auth } = usePage().props as Props
  const isSupporter = auth?.user?.role === "user" || !auth?.user?.role

  const { data, setData, post, processing, errors } = useForm<{ receipt: File | null }>({
    receipt: null,
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    post(route("believe-points.manual.confirm.submit", purchase.id), {
      forceFormData: true,
    })
  }

  const content = (
    <div className="mx-auto max-w-xl py-8 px-4">
      <div className="rounded-2xl border border-purple-200/50 bg-white shadow-lg p-6 dark:border-purple-700/35 dark:bg-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-600 text-white">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Complete Your Purchase</h1>
            <p className="text-gray-600 dark:text-gray-300">
              ${purchase.amount.toFixed(2)} for {purchase.points.toLocaleString()} Believe Points
            </p>
          </div>
        </div>

        <ManualPaymentInstructions
          instructions={instructions}
          paymentMethod={purchase.payment_method}
          actionLabel="purchase"
        />

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          After you confirm, an admin will verify your payment and credit {purchase.points.toLocaleString()} Believe Points to your account.
        </p>

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
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => router.visit(route("believe-points.index"))}
          >
            Back to Believe Points
          </Button>
        </form>
      </div>
    </div>
  )

  if (isSupporter) {
    return (
      <>
        <Head title="Confirm Believe Points Payment" />
        <ProfileLayout title="Confirm Payment" description="Complete your Believe Points purchase">
          {content}
        </ProfileLayout>
      </>
    )
  }

  return (
    <AppSidebarLayout>
      <Head title="Confirm Believe Points Payment" />
      <div className="m-3 md:m-6">{content}</div>
    </AppSidebarLayout>
  )
}
