import React from 'react'
import { Link, router } from '@inertiajs/react'
import { PageHead } from '@/components/frontend/PageHead'
import FrontendLayout from '@/layouts/frontend/frontend-layout'
import { Card, CardContent } from '@/components/frontend/ui/card'
import { Button } from '@/components/frontend/ui/button'
import { Badge } from '@/components/frontend/ui/badge'
import { ArrowLeft, ShoppingBag, Receipt, Coins, DollarSign, Calendar } from 'lucide-react'

declare global {
  function route(name: string, params?: Record<string, unknown>): string
}

function offerImageSrc(src: string | undefined): string {
  if (!src || src === '/placeholder.jpg') return src || '/placeholder.jpg'
  if (src.startsWith('http') || src.startsWith('//') || src.startsWith('/storage')) return src
  return '/storage/' + src.replace(/^\//, '')
}

interface Purchase {
  id: string
  receipt_code: string
  offer_title: string
  offer_image: string
  merchant_name: string
  points_used: number
  cash_paid: number | null
  status: string
  purchased_at: string
  confirmed_url: string
}

interface PaginatedPurchases {
  data: Purchase[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  links?: { url: string | null; label: string; active: boolean }[]
}

interface Props {
  purchases: PaginatedPurchases
}

export default function MyPurchases({ purchases }: Props) {
  const list = purchases.data || []
  const hasMore = purchases.current_page < purchases.last_page
  const hasPrev = purchases.current_page > 1

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      approved: 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30',
      fulfilled: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
      pending: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
      canceled: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
    }
    return map[status] || 'bg-muted text-muted-foreground'
  }

  return (
    <FrontendLayout>
      <PageHead title="My Purchases" description="Your Merchant Hub purchases and redemptions." />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/merchant-hub">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Merchant Hub
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-2 mb-6">
            <ShoppingBag className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">My Purchases</h1>
          </div>
          <p className="text-muted-foreground mb-6">All your Merchant Hub offers and redemptions in one place.</p>

          {list.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-60" />
                <p className="text-muted-foreground font-medium">No purchases yet</p>
                <p className="text-sm text-muted-foreground mt-1">Redeem offers from the Merchant Hub to see them here.</p>
                <Link href="/merchant-hub">
                  <Button className="mt-4">Browse offers</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {list.map((p) => (
                  <Card key={p.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <div className="aspect-[4/3] relative bg-muted w-full">
                      <img
                        src={offerImageSrc(p.offer_image)}
                        alt={p.offer_title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        <Badge className={`${getStatusBadge(p.status)} text-xs px-2 py-0.5`}>
                          {p.status}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-3 space-y-2">
                      <h3 className="font-semibold text-foreground text-sm line-clamp-2">{p.offer_title}</h3>
                      <p className="text-xs text-muted-foreground truncate">{p.merchant_name}</p>
                      <div className="flex flex-wrap gap-2 text-sm">
                        {p.points_used > 0 && (
                          <span className="inline-flex items-center gap-1 text-primary">
                            <Coins className="h-3.5 w-3.5" />
                            {p.points_used.toLocaleString()} pts
                          </span>
                        )}
                        {p.cash_paid != null && p.cash_paid > 0 && (
                          <span className="inline-flex items-center gap-1 text-foreground">
                            <DollarSign className="h-3.5 w-3.5" />
                            {p.cash_paid.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(p.purchased_at).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-2 pt-2">
                        <Link href={p.confirmed_url} className="min-w-0 flex-1">
                          <Button variant="outline" size="sm" className="w-full gap-1.5">
                            <Receipt className="h-3.5 w-3.5 shrink-0" />
                            View receipt
                          </Button>
                        </Link>
                        <span className="text-xs text-muted-foreground font-mono truncate max-w-20" title={p.receipt_code}>{p.receipt_code}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {(hasPrev || hasMore) && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  {hasPrev && (
                    <Button
                      variant="outline"
                      onClick={() => router.get(route('merchant-hub.my-purchases'), { page: purchases.current_page - 1 })}
                    >
                      Previous
                    </Button>
                  )}
                  <span className="text-sm text-muted-foreground">
                    Page {purchases.current_page} of {purchases.last_page}
                  </span>
                  {hasMore && (
                    <Button
                      variant="outline"
                      onClick={() => router.get(route('merchant-hub.my-purchases'), { page: purchases.current_page + 1 })}
                    >
                      Next
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </FrontendLayout>
  )
}
