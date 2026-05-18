"use client"

import type React from "react"

import { Head, useForm } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail } from "lucide-react"
import { showSuccessToast, showErrorToast } from "@/lib/toast"

export default function CreateWithdrawal() {
  const { data, setData, post, processing, errors, reset } = useForm({
    amount: "",
    paypal_email: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post(route("withdrawals.store"), {
      onSuccess: () => {
        showSuccessToast("Withdrawal request submitted successfully!")
        reset()
      },
      onError: (formErrors) => {
        showErrorToast("Failed to submit withdrawal request. Please check the form.")
        console.error(formErrors)
      },
    })
  }

  return (
    <AppLayout>
      <Head title="Request Withdrawal" />
      <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 m-10">
        <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900 dark:text-white">
              <Mail className="h-5 w-5 text-blue-600" />
              Request New PayPal Withdrawal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="1"
                  value={data.amount}
                  onChange={(e) => setData("amount", e.target.value)}
                  className="mt-1 block w-full"
                  required
                />
                {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
              </div>

              <div>
                <Label htmlFor="paypal_email">PayPal Email</Label>
                <Input
                  id="paypal_email"
                  type="email"
                  value={data.paypal_email}
                  onChange={(e) => setData("paypal_email", e.target.value)}
                  className="mt-1 block w-full"
                  required
                />
                {errors.paypal_email && <p className="text-red-500 text-xs mt-1">{errors.paypal_email}</p>}
              </div>

              <Button type="submit" disabled={processing} className="w-full">
                {processing ? "Submitting..." : "Submit Withdrawal Request"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
