"use client"

import type React from "react"

import { Head, useForm, Link } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/admin/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
import { Edit, ArrowLeft, User, Info } from "lucide-react"

interface Withdrawal {
  id: number
  user_name: string
  user_email: string
  amount: number
  payment_method: string
  paypal_email: string | null
  bank_account_details: string | null
  status: "pending" | "accepted" | "processing" | "completed" | "rejected" | "failed"
  transaction_id: string | null
  admin_notes: string | null
  created_at: string
  processed_at: string | null
}

interface Props {
  withdrawal: Withdrawal
}

export default function EditWithdrawal({ withdrawal }: Props) {
  const { data, setData, put, processing, errors } = useForm({
    status: withdrawal.status,
    admin_notes: withdrawal.admin_notes || "",
    transaction_id: withdrawal.transaction_id || "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    put(route("withdrawals.update", withdrawal.id), {
      onSuccess: () => {
        showSuccessToast("Withdrawal updated successfully!")
      },
      onError: (formErrors) => {
        showErrorToast("Failed to update withdrawal. Please check the form.")
        console.error(formErrors)
      },
    })
  }

  return (
    <AppLayout>
      <Head title={`Edit Withdrawal - ${withdrawal.user_name}`} />
      <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 m-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top duration-700">
          <div className="flex items-center gap-3">
            <Edit className="h-8 w-8 text-blue-400" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Edit Withdrawal - {withdrawal.user_name}
            </h1>
          </div>
          <Link href={route("withdrawals.show", withdrawal.id)}>
            <Button
              variant="outline"
              className="w-full sm:w-auto hover:scale-105 transition-all duration-200 bg-transparent cursor-pointer"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Details
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User & Amount Info Card */}
          <Card className="bg-gray-900 text-white shadow-lg border border-gray-700 lg:col-span-1">
            <CardHeader className="pb-4 border-b border-gray-800">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <User className="h-5 w-5 text-blue-400" />
                Request Info
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <div className="flex flex-col">
                <span className="text-gray-400 text-sm">User:</span>
                <span className="font-bold text-white text-xl">{withdrawal.user_name}</span>
                <span className="text-gray-500 text-sm">{withdrawal.user_email}</span>
              </div>
              <div className="flex flex-col mt-4">
                <span className="text-gray-400 text-sm">Amount:</span>
                <span className="font-bold text-green-400 text-2xl">${Number(withdrawal.amount).toLocaleString()}</span>
              </div>
              <div className="flex flex-col mt-4">
                <span className="text-gray-400 text-sm">Payment Method:</span>
                <span className="font-bold text-white text-base capitalize">
                  {withdrawal.payment_method.replace("_", " ")}
                </span>
              </div>
              {withdrawal.paypal_email && (
                <div className="flex flex-col mt-2">
                  <span className="text-gray-400 text-sm">PayPal Email:</span>
                  <span className="font-medium text-white text-base break-all">{withdrawal.paypal_email}</span>
                </div>
              )}
              {withdrawal.bank_account_details && (
                <div className="flex flex-col mt-2">
                  <span className="text-gray-400 text-sm">Bank Details:</span>
                  <Textarea
                    readOnly
                    value={withdrawal.bank_account_details}
                    className="bg-gray-800 border-gray-700 text-white text-sm mt-1"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Form Card */}
          <Card className="bg-gray-900 text-white shadow-lg border border-gray-700 lg:col-span-2">
            <CardHeader className="pb-4 border-b border-gray-800">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <Info className="h-5 w-5 text-cyan-400" />
                Update Status & Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={data.status} onValueChange={(value) => setData("status", value as any)}>
                    <SelectTrigger className="w-full mt-1 bg-gray-800 text-white border-gray-700">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 text-white border-gray-700">
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status}</p>}
                </div>

                <div>
                  <Label htmlFor="transaction_id">Transaction ID (if applicable)</Label>
                  <Input
                    id="transaction_id"
                    type="text"
                    value={data.transaction_id}
                    onChange={(e) => setData("transaction_id", e.target.value)}
                    className="mt-1 block w-full bg-gray-800 text-white border-gray-700"
                    placeholder="Enter transaction ID"
                  />
                  {errors.transaction_id && <p className="text-red-500 text-xs mt-1">{errors.transaction_id}</p>}
                </div>

                <div>
                  <Label htmlFor="admin_notes">Admin Notes</Label>
                  <Textarea
                    id="admin_notes"
                    value={data.admin_notes}
                    onChange={(e) => setData("admin_notes", e.target.value)}
                    className="mt-1 block w-full bg-gray-800 text-white border-gray-700"
                    rows={5}
                    placeholder="Add internal notes about this withdrawal"
                  />
                  {errors.admin_notes && <p className="text-red-500 text-xs mt-1">{errors.admin_notes}</p>}
                </div>

                <Button type="submit" disabled={processing} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  {processing ? "Updating..." : "Update Withdrawal"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
