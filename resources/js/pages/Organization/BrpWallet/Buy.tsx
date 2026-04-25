import React, { useEffect, useState } from 'react'
import { Head, Link, usePage, router } from '@inertiajs/react'
import AppLayout from '@/layouts/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Wallet, Check, CreditCard } from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/toast'

interface Package { brp: number; price: number; label: string }
interface Props {
  wallet: { balance_brp: number; available_brp: number }
  packages: Package[]
  organization: { id: number; name: string }
}

export default function OrgBuyBrp({ wallet, packages, organization }: Props) {
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [processing, setProcessing] = useState(false)

  const { props } = usePage<{ success?: string; error?: string }>()
  useEffect(() => {
    if (props.success) showSuccessToast(props.success)
    if (props.error) showErrorToast(props.error)
  }, [props.success, props.error])

  const effectiveBrp = selectedPackage !== null ? packages[selectedPackage].brp : Number(customAmount) || 0
  const effectivePrice = (effectiveBrp * 0.01).toFixed(2)

  const handlePurchase = () => {
    if (effectiveBrp < 1000) {
      showErrorToast('Minimum purchase is 1,000 BRP ($10)')
      return
    }
    setProcessing(true)
    router.post('/organization/wallet/brp/purchase', { amount_brp: effectiveBrp }, {
      onFinish: () => setProcessing(false),
    })
  }

  return (
    <AppLayout>
      <Head title="Buy BRP — Organization" />
      <div className="container mx-auto py-8 px-4 max-w-2xl space-y-6">

        {/* Header */}
        <div>
          <Link href="/organization/wallet/brp" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
            <ArrowLeft className="h-3.5 w-3.5" />Back to wallet
          </Link>
          <h1 className="text-3xl font-bold mb-1">Buy BRP</h1>
          <p className="text-muted-foreground">{organization.name} — Purchase Believe Reward Points for your campaigns</p>
        </div>

        {/* Current Balance */}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Wallet className="h-5 w-5 text-emerald-500" />
            <span className="text-muted-foreground">Available Balance:</span>
            <span className="font-bold">{wallet.available_brp.toLocaleString()} BRP</span>
            <span className="text-muted-foreground text-sm">(${(wallet.available_brp * 0.01).toFixed(2)})</span>
          </CardContent>
        </Card>

        {/* Packages */}
        <Card>
          <CardHeader>
            <CardTitle>Select a Package</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">1 BRP = $0.01 · Minimum 1,000 BRP</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {packages.map((pkg, index) => (
                <button
                  key={pkg.brp}
                  type="button"
                  onClick={() => { setSelectedPackage(index); setCustomAmount('') }}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectedPackage === index
                      ? 'border-[#FF1493] bg-[#FF1493]/10'
                      : 'border-border hover:border-muted-foreground/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold">{pkg.label}</span>
                    {selectedPackage === index && <Check className="h-5 w-5 text-[#FF1493]" />}
                  </div>
                  <p className="text-2xl font-extrabold text-emerald-500">${pkg.price}</p>
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div className="pt-4 border-t">
              <Label htmlFor="custom_amount">Or enter a custom amount (min 1,000 BRP)</Label>
              <Input
                id="custom_amount"
                type="number"
                min={1000}
                step={100}
                value={customAmount}
                onChange={(e) => { setCustomAmount(e.target.value); setSelectedPackage(null) }}
                placeholder="e.g., 15000"
                className="mt-2"
              />
              {customAmount && Number(customAmount) > 0 && (
                <p className="text-sm text-muted-foreground mt-1">= ${(Number(customAmount) * 0.01).toFixed(2)}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Purchase Summary */}
        {effectiveBrp > 0 && (
          <Card className="border-[#FF1493]/20">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">You'll receive</span>
                <span className="text-2xl font-bold">{effectiveBrp.toLocaleString()} BRP</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total charge</span>
                <span className="text-2xl font-bold text-emerald-500">${effectivePrice}</span>
              </div>
              <Button
                onClick={handlePurchase}
                disabled={processing || effectiveBrp < 1000}
                className="w-full bg-gradient-to-r from-[#FF1493] to-[#DC143C] hover:from-[#FF1493]/90 hover:to-[#DC143C]/90 disabled:opacity-50"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {processing ? 'Processing...' : `Pay $${effectivePrice} with Stripe`}
              </Button>
              <p className="text-xs text-muted-foreground text-center">Secure payment powered by Stripe</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
