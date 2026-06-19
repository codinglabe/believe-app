"use client"

import { router } from "@inertiajs/react"
import SettingsLayout from "@/layouts/settings/layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/table"
import { CheckCircle, XCircle } from "lucide-react"
import { useState } from "react"

interface TransactionRow {
  id: number
  user_name: string | null
  user_email: string | null
  amount: number
  payment_method: string
  status: string
  receipt_image_url: string | null
  donation_id: number | null
  admin_notes: string | null
  created_at: string | null
  verified_at: string | null
}

interface Props {
  organization: { id: number; name: string }
  transactions: {
    data: TransactionRow[]
    links: Array<{ url: string | null; label: string; active: boolean }>
  }
  filters: { status: string }
  flash?: { success?: string; error?: string }
}

const methodLabel = (method: string) => {
  const labels: Record<string, string> = {
    cashapp: "Cash App",
    zelle: "Zelle",
    venmo_manual: "Venmo",
  }
  return labels[method] ?? method
}

export default function ManualPaymentVerification({ organization, transactions, filters, flash }: Props) {
  const [notes, setNotes] = useState<Record<number, string>>({})

  const approve = (id: number) => {
    router.post(route("organization.manual-payments.approve", id), { admin_notes: notes[id] ?? "" })
  }

  const reject = (id: number) => {
    const note = notes[id]?.trim()
    if (!note) {
      alert("A note is required when rejecting a payment.")
      return
    }
    router.post(route("organization.manual-payments.reject", id), { admin_notes: note })
  }

  return (
    <SettingsLayout
      activeTab="manual-payments"
      pageTitle="Manual Payment Verification"
      pageSubtitle={`Review Cash App, Zelle, and Venmo donations for ${organization.name}.`}
    >
      <div className="space-y-6">
        {flash?.success && (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200">
            {flash.success}
          </div>
        )}
        {flash?.error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {flash.error}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {["pending", "completed", "rejected", "all"].map((s) => (
            <Button
              key={s}
              variant={filters.status === s ? "default" : "outline"}
              size="sm"
              onClick={() => router.get(route("organization.manual-payments.index"), { status: s })}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>

        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Donor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No manual payments found for this filter.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.data.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div className="font-medium">{tx.user_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{tx.user_email}</div>
                    </TableCell>
                    <TableCell>${tx.amount.toFixed(2)}</TableCell>
                    <TableCell>{methodLabel(tx.payment_method)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          tx.status === "pending"
                            ? "secondary"
                            : tx.status === "completed"
                              ? "default"
                              : "destructive"
                        }
                      >
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {tx.created_at ?? "—"}
                    </TableCell>
                    <TableCell>
                      {tx.receipt_image_url ? (
                        <a
                          href={tx.receipt_image_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline text-sm"
                        >
                          View
                        </a>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {tx.status === "pending" ? (
                        <div className="space-y-2 min-w-[200px]">
                          <textarea
                            className="w-full text-xs border rounded p-2 dark:bg-gray-900"
                            placeholder="Review notes (required for reject)"
                            value={notes[tx.id] ?? ""}
                            onChange={(e) => setNotes({ ...notes, [tx.id]: e.target.value })}
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => approve(tx.id)}>
                              <CheckCircle className="h-3 w-3 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => reject(tx.id)}>
                              <XCircle className="h-3 w-3 mr-1" /> Reject
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">{tx.admin_notes ?? "—"}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </SettingsLayout>
  )
}
