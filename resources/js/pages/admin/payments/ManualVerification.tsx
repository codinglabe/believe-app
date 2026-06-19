"use client"

import { Head, router } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/table"
import { CheckCircle, XCircle } from "lucide-react"
import { useState } from "react"

interface TransactionRow {
  id: number
  user_name: string | null
  user_email: string | null
  organization_name: string | null
  amount: number
  payment_method: string
  status: string
  receipt_image_url: string | null
  transaction_type?: string
  believe_point_purchase_id?: number | null
  admin_notes: string | null
  created_at: string | null
}

interface Props {
  transactions: {
    data: TransactionRow[]
    links: Array<{ url: string | null; label: string; active: boolean }>
  }
  filters: { status: string }
}

export default function ManualVerification({ transactions, filters }: Props) {
  const [notes, setNotes] = useState<Record<number, string>>({})

  const approve = (id: number) => {
    router.post(route("admin.payments.manual.approve", id), { admin_notes: notes[id] ?? "" })
  }

  const reject = (id: number) => {
    const note = notes[id]?.trim()
    if (!note) {
      alert("Admin notes are required to reject a payment.")
      return
    }
    router.post(route("admin.payments.manual.reject", id), { admin_notes: note })
  }

  return (
    <AppLayout>
      <Head title="Manual Payment Verification" />
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Manual Payment Verification</h1>
          <p className="text-muted-foreground">Review Cash App, Zelle, and Venmo payments pending admin approval (donations and Believe Points purchases).</p>
        </div>

        <div className="flex gap-2">
          {["pending", "completed", "rejected", "all"].map((s) => (
            <Button
              key={s}
              variant={filters.status === s ? "default" : "outline"}
              size="sm"
              onClick={() => router.get(route("admin.payments.manual.index"), { status: s })}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Donor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.data.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    <div className="font-medium">{tx.user_name}</div>
                    <div className="text-xs text-muted-foreground">{tx.user_email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {tx.transaction_type === "believe_points_purchase" ? "Believe Points" : "Donation"}
                    </Badge>
                  </TableCell>
                  <TableCell>{tx.organization_name ?? (tx.believe_point_purchase_id ? "Platform" : "—")}</TableCell>
                  <TableCell>${tx.amount.toFixed(2)}</TableCell>
                  <TableCell className="capitalize">{tx.payment_method}</TableCell>
                  <TableCell>
                    <Badge variant={tx.status === "pending" ? "secondary" : tx.status === "completed" ? "default" : "destructive"}>
                      {tx.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {tx.receipt_image_url ? (
                      <a href={tx.receipt_image_url} target="_blank" rel="noreferrer" className="text-purple-600 underline text-sm">
                        View
                      </a>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    {tx.status === "pending" && (
                      <div className="space-y-2 min-w-[200px]">
                        <textarea
                          className="w-full text-xs border rounded p-2 dark:bg-gray-900"
                          placeholder="Admin notes"
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
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  )
}
