"use client"

import { router } from "@inertiajs/react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

export interface BpWalletLedgerRow {
  id: string
  date: string
  transaction_number: string
  description: string
  entry_type: string
  debit: number | null
  credit: number | null
  bp_change?: number | null
  processing_balance: number
  available_balance: number
  gifted_balance: number
  running_balance: number
}

export interface BpWalletLedgerPagination {
  data: BpWalletLedgerRow[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

const fmt = (value: number | null | undefined) =>
  value == null
    ? "—"
    : Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

function resolveBpChange(row: BpWalletLedgerRow): number {
  if (row.bp_change != null && !Number.isNaN(Number(row.bp_change))) {
    return Number(row.bp_change)
  }
  if (row.entry_type === "wallet_transfer_refund" || (row.credit != null && row.credit > 0)) {
    return Number(row.credit ?? 0)
  }
  if (row.entry_type === "wallet_transfer" || (row.debit != null && row.debit > 0)) {
    return -Number(row.debit ?? 0)
  }
  if (row.credit != null && row.credit > 0) return Number(row.credit)
  if (row.debit != null && row.debit > 0) return -Number(row.debit)
  return 0
}

function formatSignedBpChange(row: BpWalletLedgerRow): { text: string; className: string } {
  const change = resolveBpChange(row)
  if (change === 0) {
    return { text: "—", className: "text-muted-foreground" }
  }
  const isCredit =
    row.entry_type === "wallet_transfer_refund" ||
    change > 0 ||
    (row.credit != null && row.credit > 0 && !(row.debit != null && row.debit > 0))
  const amount = fmt(Math.abs(change))
  return {
    text: `${isCredit ? "+" : "−"}${amount}`,
    className: isCredit
      ? "font-semibold text-emerald-700 dark:text-emerald-300"
      : "font-semibold text-foreground",
  }
}

function formatDebitCell(row: BpWalletLedgerRow): string {
  if (row.entry_type === "wallet_transfer_refund") return "—"
  return row.debit != null && row.debit > 0 ? fmt(row.debit) : "—"
}

function formatCreditCell(row: BpWalletLedgerRow): string {
  if (row.entry_type === "wallet_transfer" && row.credit == null) return "—"
  return row.credit != null && row.credit > 0 ? fmt(row.credit) : "—"
}

export function BpWalletLedger({ ledger }: { ledger: BpWalletLedgerPagination }) {
  const goToPage = (page: number) => {
    if (page < 1 || page > ledger.last_page) return
    router.get(
      route("believe-points.index"),
      { ledger_page: page, ledger_per_page: ledger.per_page },
      { preserveScroll: true, preserveState: true, only: ["walletLedger"] },
    )
  }

  if (!ledger.data.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Wallet transactions will appear here after you purchase or transfer Believe Points.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Transaction #</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">BP</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead className="text-right">Running Balance</TableHead>
              <TableHead className="text-right">Processing</TableHead>
              <TableHead className="text-right">Available</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ledger.data.map((row) => {
              const signed = formatSignedBpChange(row)
              return (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{fmtDate(row.date)}</TableCell>
                  <TableCell className="max-w-[140px] truncate font-mono text-xs" title={row.transaction_number}>
                    {row.transaction_number}
                  </TableCell>
                  <TableCell className="min-w-[160px] text-sm">{row.description}</TableCell>
                  <TableCell className={cn("text-right tabular-nums", signed.className)}>{signed.text}</TableCell>
                  <TableCell className="text-right tabular-nums text-destructive">{formatDebitCell(row)}</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatCreditCell(row)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{fmt(row.running_balance)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{fmt(row.processing_balance)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{fmt(row.available_balance)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {ledger.last_page > 1 && (
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            {ledger.from ?? 0}–{ledger.to ?? 0} of {ledger.total}
          </span>
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" size="sm" disabled={ledger.current_page <= 1} onClick={() => goToPage(ledger.current_page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 tabular-nums">
              {ledger.current_page} / {ledger.last_page}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={ledger.current_page >= ledger.last_page}
              onClick={() => goToPage(ledger.current_page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
