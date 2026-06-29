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
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead className="text-right">Running Balance</TableHead>
              <TableHead className="text-right">Processing</TableHead>
              <TableHead className="text-right">Available</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ledger.data.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{fmtDate(row.date)}</TableCell>
                <TableCell className="max-w-[140px] truncate font-mono text-xs" title={row.transaction_number}>
                  {row.transaction_number}
                </TableCell>
                <TableCell className="min-w-[160px] text-sm">{row.description}</TableCell>
                <TableCell className="text-right tabular-nums text-destructive">{fmt(row.debit)}</TableCell>
                <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">{fmt(row.credit)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{fmt(row.running_balance)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{fmt(row.processing_balance)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{fmt(row.available_balance)}</TableCell>
              </TableRow>
            ))}
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
