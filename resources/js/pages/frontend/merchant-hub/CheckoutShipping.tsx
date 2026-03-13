import React, { useState } from 'react'
import { Link, router, usePage } from '@inertiajs/react'
import { PageHead } from '@/components/frontend/PageHead'
import FrontendLayout from '@/layouts/frontend/frontend-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/frontend/ui/card'
import { Button } from '@/components/frontend/ui/button'
import { Input } from '@/components/frontend/ui/input'
import { Label } from '@/components/frontend/ui/label'
import { ArrowLeft, MapPin, Package } from 'lucide-react'

interface OfferSummary {
  id: string
  title: string
  image: string
  merchantName: string
  amount: number
  currency: string
}

interface Props {
  offer: OfferSummary
}

const COUNTRY_OPTIONS = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'AU', label: 'Australia' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'IN', label: 'India' },
  { value: 'MX', label: 'Mexico' },
  { value: 'BR', label: 'Brazil' },
  { value: 'ES', label: 'Spain' },
  { value: 'IT', label: 'Italy' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'JP', label: 'Japan' },
  { value: 'SG', label: 'Singapore' },
  { value: 'OTHER', label: 'Other' },
]

export default function CheckoutShipping({ offer }: Props) {
  const { errors } = usePage().props as { errors?: Record<string, string> }
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    shipping_name: '',
    shipping_line1: '',
    shipping_line2: '',
    shipping_city: '',
    shipping_state: '',
    shipping_postal_code: '',
    shipping_country: 'US',
  })

  const offerImageSrc = (src: string) => {
    if (!src || src === '/placeholder.jpg') return src || '/placeholder.jpg'
    if (src.startsWith('http') || src.startsWith('//') || src.startsWith('/storage')) return src
    return '/storage/' + src.replace(/^\//, '')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const country = form.shipping_country === 'OTHER' ? 'US' : form.shipping_country
    router.post('/merchant-hub/checkout', {
      offer_id: offer.id,
      ...form,
      shipping_country: country,
    }, {
      preserveScroll: true,
      onFinish: () => setSubmitting(false),
    })
  }

  return (
    <FrontendLayout>
      <PageHead title="Shipping address" description="Enter your shipping address to complete your purchase." />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <Link href={`/merchant-hub/offers/${offer.id}`}>
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to offer
              </Button>
            </Link>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <h1 className="text-2xl font-bold text-foreground mb-2">Shipping address</h1>
          <p className="text-muted-foreground mb-6">Enter where you’d like your order sent before paying.</p>

          {/* Offer summary */}
          <Card className="mb-6 overflow-hidden">
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Order summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-4">
                <img
                  src={offerImageSrc(offer.image)}
                  alt={offer.title}
                  className="w-20 h-20 object-cover rounded-lg border"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{offer.title}</p>
                  <p className="text-sm text-muted-foreground">{offer.merchantName}</p>
                  <p className="text-lg font-bold text-foreground mt-1">
                    {offer.currency} {Number(offer.amount).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping form */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Delivery address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="shipping_name">Full name</Label>
                  <Input
                    id="shipping_name"
                    value={form.shipping_name}
                    onChange={e => setForm(f => ({ ...f, shipping_name: e.target.value }))}
                    placeholder="John Doe"
                    required
                    maxLength={255}
                    className={errors?.shipping_name ? 'border-red-500' : ''}
                  />
                  {errors?.shipping_name && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.shipping_name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipping_line1">Address line 1</Label>
                  <Input
                    id="shipping_line1"
                    value={form.shipping_line1}
                    onChange={e => setForm(f => ({ ...f, shipping_line1: e.target.value }))}
                    placeholder="Street address, P.O. box"
                    required
                    maxLength={255}
                    className={errors?.shipping_line1 ? 'border-red-500' : ''}
                  />
                  {errors?.shipping_line1 && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.shipping_line1}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipping_line2">Address line 2 (optional)</Label>
                  <Input
                    id="shipping_line2"
                    value={form.shipping_line2}
                    onChange={e => setForm(f => ({ ...f, shipping_line2: e.target.value }))}
                    placeholder="Apartment, suite, unit, building, floor, etc."
                    maxLength={255}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shipping_city">City</Label>
                    <Input
                      id="shipping_city"
                      value={form.shipping_city}
                      onChange={e => setForm(f => ({ ...f, shipping_city: e.target.value }))}
                      placeholder="City"
                      required
                      maxLength={100}
                      className={errors?.shipping_city ? 'border-red-500' : ''}
                    />
                    {errors?.shipping_city && (
                      <p className="text-sm text-red-600 dark:text-red-400">{errors.shipping_city}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shipping_state">State / Province (optional)</Label>
                    <Input
                      id="shipping_state"
                      value={form.shipping_state}
                      onChange={e => setForm(f => ({ ...f, shipping_state: e.target.value }))}
                      placeholder="State or Province"
                      maxLength={100}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shipping_postal_code">Postal code</Label>
                    <Input
                      id="shipping_postal_code"
                      value={form.shipping_postal_code}
                      onChange={e => setForm(f => ({ ...f, shipping_postal_code: e.target.value }))}
                      placeholder="ZIP / Postal code"
                      required
                      maxLength={20}
                      className={errors?.shipping_postal_code ? 'border-red-500' : ''}
                    />
                    {errors?.shipping_postal_code && (
                      <p className="text-sm text-red-600 dark:text-red-400">{errors.shipping_postal_code}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shipping_country">Country</Label>
                    <select
                      id="shipping_country"
                      value={form.shipping_country}
                      onChange={e => setForm(f => ({ ...f, shipping_country: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {COUNTRY_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {errors?.shipping_country && (
                      <p className="text-sm text-red-600 dark:text-red-400">{errors.shipping_country}</p>
                    )}
                  </div>
                </div>
                {errors?.error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-200">{errors.error}</p>
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 text-base"
                  size="lg"
                >
                  {submitting ? 'Processing...' : `Continue to payment — ${offer.currency} ${Number(offer.amount).toFixed(2)}`}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </FrontendLayout>
  )
}
