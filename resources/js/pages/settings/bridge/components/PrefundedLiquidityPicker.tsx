import React from "react"
import { router } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BridgeField } from "@/pages/settings/bridge/components/BridgeField"
import { cn } from "@/lib/utils"
import { AlertCircle, Loader2, RefreshCw } from "lucide-react"

export type PrefundedLiquidityAccount = {
  id: string
  source: "prefunded_account" | "bridge_wallet"
  name: string
  available_balance: string
  currency: string
  bridge_wallet_id: string
  customer_id: string
  chain: string
  address: string
  is_recommended?: boolean
}

export type PrefundedLiquidityOptions = {
  environment: "sandbox" | "live"
  success: boolean
  error: string | null
  accounts: PrefundedLiquidityAccount[]
}

function formatBalance(amount: string, currency: string): string {
  const value = Number.parseFloat(amount)
  if (Number.isNaN(value)) {
    return amount
  }

  if (currency.toLowerCase() === "usd") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
  }

  return `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} ${currency.toUpperCase()}`
}

function accountOptionValue(account: PrefundedLiquidityAccount): string {
  return `${account.source}:${account.id}`
}

export function PrefundedLiquidityPicker({
  environment,
  title,
  className,
  customerId,
  walletId,
  accountId,
  onCustomerIdChange,
  onWalletIdChange,
  onAccountIdChange,
}: {
  environment: "sandbox" | "live"
  title: string
  className?: string
  customerId: string
  walletId: string
  accountId: string
  onCustomerIdChange: (value: string) => void
  onWalletIdChange: (value: string) => void
  onAccountIdChange: (value: string) => void
}) {
  const [options, setOptions] = React.useState<PrefundedLiquidityOptions | null>(null)
  const [loading, setLoading] = React.useState(false)

  const loadAccounts = React.useCallback(() => {
    setLoading(true)
    router.get(
      route("bridge.index"),
      { prefunded_environment: environment },
      {
        preserveState: true,
        preserveScroll: true,
        only: ["prefunded_liquidity_options"],
        onSuccess: (page) => {
          const payload = page.props.prefunded_liquidity_options as PrefundedLiquidityOptions | null
          if (payload?.environment === environment) {
            setOptions(payload)
          }
        },
        onFinish: () => setLoading(false),
      },
    )
  }, [environment])

  const selectedValue = React.useMemo(() => {
    if (!options?.accounts?.length) {
      return accountId ? `prefunded_account:${accountId}` : walletId ? `bridge_wallet:${walletId}` : ""
    }

    const match = options.accounts.find((account) => {
      if (accountId && account.source === "prefunded_account" && account.id === accountId) {
        return true
      }
      if (walletId && account.bridge_wallet_id === walletId) {
        return true
      }
      return false
    })

    return match ? accountOptionValue(match) : ""
  }, [accountId, options?.accounts, walletId])

  const recommendedAccount = React.useMemo(
    () => options?.accounts?.find((account) => account.is_recommended && account.bridge_wallet_id) ?? null,
    [options?.accounts],
  )

  const handleSelect = (value: string) => {
    const account = options?.accounts.find((item) => accountOptionValue(item) === value)
    if (!account || !account.bridge_wallet_id) {
      return
    }

    onWalletIdChange(account.bridge_wallet_id)
    onCustomerIdChange(account.customer_id)
    onAccountIdChange(account.source === "prefunded_account" ? account.id : "")
  }

  return (
    <div className={cn("space-y-4 rounded-xl border border-dashed border-border/80 p-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            For BP → Wallet, choose Believe&apos;s <span className="font-medium">platform liquidity wallet</span> — not
            a member wallet. Load from Bridge, pick the entry marked{" "}
            <span className="font-medium text-purple-600 dark:text-purple-400">Recommended</span>, then save.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={loading} onClick={loadAccounts}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading…
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Load from Bridge
            </>
          )}
        </Button>
      </div>

      {options && !options.success && options.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{options.error}</AlertDescription>
        </Alert>
      )}

      {options?.success && options.accounts.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No prefunded accounts or Bridge wallets were returned for {environment}. Create liquidity in the Bridge
            dashboard first.
          </AlertDescription>
        </Alert>
      )}

      {options?.success && options.accounts.length > 0 && (
        <>
          {recommendedAccount && (
            <Alert className="border-purple-200/70 bg-purple-50/40 dark:border-purple-900/40 dark:bg-purple-950/20">
              <AlertCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <AlertDescription className="text-sm text-foreground">
                <span className="font-medium">Recommended:</span>{" "}
                {recommendedAccount.name} ({formatBalance(recommendedAccount.available_balance, recommendedAccount.currency)}
                ). This should be Believe&apos;s prefunded liquidity pool — it pays members when they move BP to wallet.
                Do not pick a wallet with only a few dollars unless you have confirmed it in the Bridge dashboard.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor={`prefunded-select-${environment}`}>Platform liquidity wallet</Label>
            <Select value={selectedValue || undefined} onValueChange={handleSelect}>
              <SelectTrigger id={`prefunded-select-${environment}`}>
                <SelectValue placeholder="Select platform liquidity wallet" />
              </SelectTrigger>
              <SelectContent>
                {options.accounts.map((account) => (
                  <SelectItem
                    key={accountOptionValue(account)}
                    value={accountOptionValue(account)}
                    disabled={!account.bridge_wallet_id}
                  >
                    <span className="flex flex-col gap-0.5 text-left">
                      <span className="font-medium">
                        {account.is_recommended ? "★ Recommended · " : ""}
                        {account.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatBalance(account.available_balance, account.currency)}
                        {account.source === "prefunded_account" ? " · Prefunded account" : " · Platform wallet"}
                        {account.chain ? ` · ${account.chain}` : ""}
                        {account.bridge_wallet_id
                          ? ` · …${account.bridge_wallet_id.slice(-8)}`
                          : " · No linked Bridge wallet"}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <BridgeField
          id={`${environment}_prefunded_customer_id`}
          label="Customer ID"
          value={customerId}
          onChange={onCustomerIdChange}
          placeholder="cus_…"
          hint="Optional when Bridge wallet ID resolves via GET /wallets/{id}."
        />
        <BridgeField
          id={`${environment}_prefunded_wallet_id`}
          label="Wallet ID"
          value={walletId}
          onChange={onWalletIdChange}
          placeholder="wallet_…"
          hint="Believe platform liquidity wallet ID — not a member wallet."
        />
      </div>
    </div>
  )
}
