"use client"

import { Head, Link, router } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  User,
  DollarSign,
  Mail,
  Banknote,
  CheckCircle,
  Clock,
  XCircle,
  Ban,
  Info,
  Send,
  Edit,
  ListChecks,
  Wallet,
} from "lucide-react"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
import { useState } from "react"
import { ConfirmationModal } from "@/components/confirmation-modal"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/admin/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/table"
interface Withdrawal {
  id: number
  user_name: string
  user_email: string
  amount: number
  payment_method: string
  paypal_email: string | null
  status: "pending" | "accepted" | "processing" | "completed" | "rejected" | "failed"
  transaction_id: string | null
  admin_notes: string | null
  created_at: string
  processed_at: string | null
}

interface UserTransaction {
  id: number
  buyer_name: string
  buyer_email: string
  amount_invested: number
  commission_earned: number
  status: string
  sold_at: string
  referral_link: string
}

interface UserEarnings {
  total_earned: number
  transactions: UserTransaction[]
}

interface Props {
  withdrawal: Withdrawal
  userEarnings: UserEarnings
}

export default function WithdrawalShow({ withdrawal, userEarnings }: Props) {
  const [isAccepting, setIsAccepting] = useState(false)
  const [isMakingPayment, setIsMakingPayment] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentType, setPaymentType] = useState<"automatic" | "manual">("manual")
  const [manualTransactionId, setManualTransactionId] = useState("")

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />
      case "accepted":
        return <CheckCircle className="h-4 w-4" />
      case "processing":
        return <Clock className="h-4 w-4" />
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      case "rejected":
        return <Ban className="h-4 w-4" />
      case "failed":
        return <XCircle className="h-4 w-4" />
      default:
        return null
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary"
      case "accepted":
        return "default"
      case "processing":
        return "outline"
      case "completed":
        return "success"
      case "rejected":
      case "failed":
        return "destructive"
      default:
        return "outline"
    }
  }

  const handleAcceptWithdrawal = () => {
    setIsAccepting(true)
    router.post(
      route("withdrawals.accept", withdrawal.id),
      {},
      {
        onSuccess: () => {
          showSuccessToast("Withdrawal request accepted!")
        },
        onError: (errors) => {
          showErrorToast(errors.message || "Failed to accept withdrawal.")
        },
        onFinish: () => setIsAccepting(false),
      },
    )
  }

  const handleMakePayment = () => {
    setIsMakingPayment(true)
    router.post(
      route("withdrawals.makePayment", withdrawal.id),
      { payment_type: paymentType, transaction_id: manualTransactionId },
      {
        onSuccess: () => {
          showSuccessToast("Payment process initiated!")
          setPaymentModalOpen(false)
          setManualTransactionId("")
        },
        onError: (errors) => {
          showErrorToast(errors.message || "Failed to initiate payment.")
        },
        onFinish: () => setIsMakingPayment(false),
      },
    )
  }

  const isPaymentActionDisabled =
    withdrawal.status === "completed" || withdrawal.status === "rejected" || withdrawal.status === "failed"

  return (
    <AppLayout>
      <Head title={`Withdrawal Details - ${withdrawal.user_name}`} />
      <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 m-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top duration-700">
          <div className="flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-green-400" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Withdrawal Details - {withdrawal.user_name}
            </h1>
          </div>
          <Link href={route("withdrawals.index")}>
            <Button
              variant="outline"
              className="w-full sm:w-auto hover:scale-105 transition-all duration-200 bg-transparent cursor-pointer"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Withdrawals
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Information Card */}
          <Card className="bg-gray-900 text-white shadow-lg border border-gray-700 lg:col-span-1">
            <CardHeader className="pb-4 border-b border-gray-800">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <User className="h-5 w-5 text-blue-400" />
                User Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <div className="flex flex-col">
                <span className="text-gray-400 text-sm">Name:</span>
                <span className="font-bold text-white text-xl">{withdrawal.user_name}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-400 text-sm">Email:</span>
                <span className="font-bold text-white text-xl flex items-center gap-1">
                  <Mail className="h-5 w-5 text-gray-500" /> {withdrawal.user_email}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Withdrawal Details Card */}
          <Card className="bg-gray-900 text-white shadow-lg border border-gray-700 lg:col-span-2">
            <CardHeader className="pb-4 border-b border-gray-800">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <Banknote className="h-5 w-5 text-yellow-400" />
                Withdrawal Request
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-gray-400 text-sm">Amount:</span>
                  <span className="font-bold text-green-400 text-2xl">
                    ${Number(withdrawal.amount).toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-400 text-sm">Payment Method:</span>
                  <span className="font-bold text-white text-xl capitalize">
                    {withdrawal.payment_method.replace("_", " ")}
                  </span>
                </div>
                {withdrawal.payment_method === "paypal" && (
                  <div className="flex flex-col sm:col-span-2">
                    <span className="text-gray-400 text-sm">PayPal Email:</span>
                    <span className="font-bold text-white text-xl flex items-center gap-1">
                      <Mail className="h-5 w-5 text-gray-500" /> {withdrawal.paypal_email || "N/A"}
                    </span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="flex flex-col">
                  <span className="text-gray-400 text-sm">Status:</span>
                  <Badge variant={getStatusVariant(withdrawal.status)} className="text-sm px-3 py-1 rounded-full w-fit">
                    {getStatusIcon(withdrawal.status)}
                    <span className="ml-2 capitalize">{withdrawal.status}</span>
                  </Badge>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-400 text-sm">Requested At:</span>
                  <span className="font-medium text-white text-base">
                    {new Date(withdrawal.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {withdrawal.processed_at && (
                  <div className="flex flex-col">
                    <span className="text-gray-400 text-sm">Processed At:</span>
                    <span className="font-medium text-white text-base">
                      {new Date(withdrawal.processed_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
                {withdrawal.transaction_id && (
                  <div className="flex flex-col">
                    <span className="text-gray-400 text-sm">Transaction ID:</span>
                    <span className="font-medium text-white text-base break-all">{withdrawal.transaction_id}</span>
                  </div>
                )}
              </div>
              {withdrawal.admin_notes && (
                <div className="flex flex-col mt-4">
                  <span className="text-gray-400 text-sm">Admin Notes:</span>
                  <Textarea
                    readOnly
                    value={withdrawal.admin_notes}
                    className="bg-gray-800 border-gray-700 text-white text-sm mt-1"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* User Earnings & Transaction History for Verification */}
        <Card className="bg-gray-900 text-white shadow-lg border border-gray-700">
          <CardHeader className="pb-4 border-b border-gray-800">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Wallet className="h-5 w-5 text-purple-400" />
              User Earnings & Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col items-center justify-center text-center space-y-2 bg-purple-800/30 p-4 rounded-lg">
              <DollarSign className="h-8 w-8 text-purple-400" />
              <span className="text-gray-300 text-sm">Total Earned by {withdrawal.user_name}</span>
              <span className="font-bold text-purple-400 text-3xl">
                $
                {Number(userEarnings.total_earned).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mt-6">
              <ListChecks className="h-5 w-5 text-cyan-400" />
              Contributing Transactions ({userEarnings.transactions.length})
            </h3>
            {userEarnings.transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold text-gray-300">Buyer</TableHead>
                      <TableHead className="font-semibold text-gray-300">Invested</TableHead>
                      <TableHead className="font-semibold text-gray-300">Commission</TableHead>
                      <TableHead className="font-semibold text-gray-300">Status</TableHead>
                      <TableHead className="font-semibold text-gray-300">Date</TableHead>
                      <TableHead className="font-semibold text-gray-300">Referral Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userEarnings.transactions.map((transaction) => (
                      <TableRow key={transaction.id} className="hover:bg-gray-800/50 transition-colors duration-200">
                        <TableCell className="font-medium text-white">
                          {transaction.buyer_name}
                          <div className="text-xs text-gray-500">{transaction.buyer_email}</div>
                        </TableCell>
                        <TableCell className="text-green-400 font-semibold">
                          ${Number(transaction.amount_invested).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-blue-400 font-semibold">
                          $
                          {Number(transaction.commission_earned).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(transaction.status)}>
                            {getStatusIcon(transaction.status)}
                            <span className="ml-1 capitalize">{transaction.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {new Date(transaction.sold_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-blue-400 text-sm break-all">
                          <a
                            href={transaction.referral_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-blue-300"
                          >
                            {transaction.referral_link.substring(0, 20)}...
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">No transactions found for this user's earnings.</p>
            )}
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card className="bg-gray-900 text-white shadow-lg border border-gray-700">
          <CardHeader className="pb-4 border-b border-gray-800">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Info className="h-5 w-5 text-cyan-400" />
              Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex flex-wrap gap-4">
            {withdrawal.status === "pending" && (
              <Button
                onClick={handleAcceptWithdrawal}
                disabled={isAccepting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isAccepting ? "Accepting..." : "Accept Withdrawal"}
              </Button>
            )}

            {(withdrawal.status === "accepted" || withdrawal.status === "processing") && (
              <Button
                onClick={() => setPaymentModalOpen(true)}
                disabled={isPaymentActionDisabled}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Send className="mr-2 h-4 w-4" />
                Make Payment
              </Button>
            )}

            <Link href={route("withdrawals.edit", withdrawal.id)}>
              <Button variant="outline" disabled={isPaymentActionDisabled}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Status/Notes
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Payment Confirmation Modal */}
      <ConfirmationModal
        isOpen={paymentModalOpen}
        onChange={setPaymentModalOpen}
        title="Process Withdrawal Payment"
        description="Choose how you want to process this PayPal payment."
        confirmLabel={isMakingPayment ? "Processing..." : "Process Payment"}
        cancelLabel="Cancel"
        onConfirm={handleMakePayment}
        isLoading={isMakingPayment}
      >
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="paymentType">Payment Type</Label>
            <Select value={paymentType} onValueChange={(value: "automatic" | "manual") => setPaymentType(value)}>
              <SelectTrigger className="w-full bg-gray-800 text-white border-gray-700">
                <SelectValue placeholder="Select payment type" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 text-white border-gray-700">
                <SelectItem value="automatic">Automatic (PayPal API)</SelectItem>
                <SelectItem value="manual">Manual (Mark as Completed)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {paymentType === "manual" && (
            <div>
              <Label htmlFor="transactionId">Manual Transaction ID (Optional)</Label>
              <Input
                id="transactionId"
                value={manualTransactionId}
                onChange={(e) => setManualTransactionId(e.target.value)}
                placeholder="Enter transaction ID if manual"
                className="bg-gray-800 text-white border-gray-700"
              />
            </div>
          )}
          <p className={cn("text-sm", paymentType === "automatic" ? "text-yellow-400" : "text-gray-400")}>
            {paymentType === "automatic"
              ? "Note: Automatic payment will attempt to send funds via PayPal API using your configured credentials. Ensure your PayPal account is set up for payouts."
              : "Note: Manual payment will mark the withdrawal as 'completed'. You are responsible for actual fund transfer outside the system."}
          </p>
        </div>
      </ConfirmationModal>
    </AppLayout>
  )
}
