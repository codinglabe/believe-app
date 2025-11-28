"use client"

import { useState } from "react"
import { Head, Link, router } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Search, X, Eye } from "lucide-react"
import AppLayout from "@/layouts/app-layout"
import type { BreadcrumbItem } from "@/types"
import { Badge } from "@/components/ui/badge"
import { PermissionButton } from "@/components/ui/permission-guard"

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: "Orders",
    href: "/orders",
  },
  {
    title: "Items",
    href: "/order-items",
  },
]

interface OrderItemRow {
  id: number
  order_id: number
  product_id: number
  organization_id: number
  name: string
  quantity: number
  unit_price: string
  subtotal: string
  printify_synced: boolean
  order: {
    id: number
    reference_number: string
    total_amount: string
    status: string
    organization_id: number
    created_at: string
  }
  product: {
    id: number
    name: string
    image: string
  }
  organization: {
    id: number
    name: string
  }
  created_at: string
}

interface Props {
  items: {
    data: OrderItemRow[]
    current_page: number
    last_page: number
    per_page: number
    total: number
    from?: number
    to?: number
    prev_page_url: string | null
    next_page_url: string | null
  }
  filters: {
    per_page: number
    page: number
    search: string
    order_id: string
  }
  allowedPerPage: number[]
  userRole: string
}

export default function Index({ items, filters, allowedPerPage, userRole }: Props) {
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState(filters.search)
  const [orderFilter, setOrderFilter] = useState(filters.order_id)
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  const handlePerPageChange = (newPerPage: number) => {
    setLoading(true)
    router.get(
      "/order-items",
      {
        per_page: newPerPage,
        page: 1,
        search: filters.search,
        order_id: orderFilter,
      },
      {
        preserveState: false,
        onFinish: () => setLoading(false),
      },
    )
  }

  const handlePageChange = (page: number) => {
    if (page < 1 || page > items.last_page) return
    setLoading(true)
    router.get(
      "/order-items",
      {
        per_page: filters.per_page,
        page: page,
        search: filters.search,
        order_id: orderFilter,
      },
      {
        preserveState: false,
        onFinish: () => setLoading(false),
      },
    )
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
    const timeout = setTimeout(() => {
      setLoading(true)
      router.get(
        "/order-items",
        {
          per_page: filters.per_page,
          page: 1,
          search: value,
          order_id: orderFilter,
        },
        {
          preserveState: false,
          onFinish: () => setLoading(false),
        },
      )
    }, 500)
    setSearchTimeout(timeout)
  }

  const handleOrderFilterChange = (value: string) => {
    setOrderFilter(value)
    setLoading(true)
    router.get(
      "/order-items",
      {
        per_page: filters.per_page,
        page: 1,
        search: filters.search,
        order_id: value,
      },
      {
        preserveState: false,
        onFinish: () => setLoading(false),
      },
    )
  }

  const clearFilters = () => {
    setSearchTerm("")
    setOrderFilter("")
    setLoading(true)
    router.get(
      "/order-items",
      {
        per_page: filters.per_page,
        page: 1,
        search: "",
        order_id: "",
      },
      {
        preserveState: false,
        onFinish: () => setLoading(false),
      },
    )
  }

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(amount))
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Order Items" />
      <div className="flex h-full flex-1 flex-col gap-4 rounded-xl py-4 px-4 md:py-6 md:px-10">
        <Card className="px-0">
          <CardHeader className="px-4 md:px-6">
            <div>
              <CardTitle>Order Items</CardTitle>
              <CardDescription>
                Manage items from your {userRole === "admin" ? "all" : ""} orders. Total: {items.total.toLocaleString()}{" "}
                item(s)
              </CardDescription>
            </div>
            <div className="flex flex-col gap-4 mt-4 md:flex-row md:items-end">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search by product or order..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {(searchTerm || orderFilter) && (
                  <button
                    onClick={clearFilters}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {/* <input
                type="text"
                placeholder="Filter by order ID"
                value={orderFilter}
                onChange={(e) => handleOrderFilterChange(e.target.value)}
                className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              /> */}
            </div>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 animate-spin mr-2 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                Loading items...
              </div>
            )}
            <div className="w-full overflow-x-auto">
              <table className="min-w-full rounded-md border border-muted w-full overflow-x-auto table-responsive text-sm text-left text-foreground">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium min-w-40">Product / Name</th>
                    <th className="px-4 py-3 font-medium min-w-32">Order</th>
                    <th className="px-4 py-3 font-medium min-w-32">Quantity</th>
                    <th className="px-4 py-3 font-medium min-w-32">Unit Price</th>
                    <th className="px-4 py-3 font-medium min-w-32">Subtotal</th>
                    {userRole === "admin" && <th className="px-4 py-3 font-medium min-w-32">Organization</th>}
                    <th className="px-4 py-3 font-medium min-w-32">Date</th>
                    <th className="px-4 py-3 font-medium min-w-28 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.data.map((item) => (
                    <tr key={item.id} className="border-t border-muted hover:bg-muted/50 transition">
                      <td className="px-4 py-3 min-w-40">
                        <div className="flex items-center gap-2">
                          {item.product?.image && (
                            <img
                              src={item.product.image || "/placeholder.svg"}
                              alt={item.name}
                              className="w-8 h-8 rounded object-cover"
                            />
                          )}
                          <span className="font-medium truncate">{item.product.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 min-w-32">
                          <span className="text-blue-600 hover:underline">{item.order.id}</span>
                      </td>
                      <td className="px-4 py-3 min-w-32">
                        <Badge variant="secondary">{item.quantity}</Badge>
                      </td>
                      <td className="px-4 py-3 min-w-32">{formatCurrency(item.unit_price)}</td>
                      <td className="px-4 py-3 min-w-32 font-medium">{formatCurrency(item.subtotal)}</td>
                      {userRole === "admin" && (
                        <td className="px-4 py-3 min-w-32">
                          <span className="text-sm">{item.organization?.name}</span>
                        </td>
                      )}
                      <td className="px-4 py-3 min-w-32 text-sm">{new Date(item.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 min-w-28 text-right w-[1%] whitespace-nowrap">
                        <PermissionButton permission="ecommerce.read">
                          <Link href={`/order-items/${item.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Button>
                          </Link>
                        </PermissionButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {items.data.length === 0 && (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium text-foreground mb-2">No items found</h3>
                  <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
                </div>
              )}
              {/* Pagination Controls */}
              {items.total > 0 && (
                <div className="flex items-center justify-between mt-6 px-4 mb-6 text-sm text-muted-foreground flex-wrap gap-4">
                  <div>
                    Showing {items.from?.toLocaleString() || 0} to {items.to?.toLocaleString() || 0} of{" "}
                    {items.total.toLocaleString()} item(s).
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Per Page Selector */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-muted-foreground">Per page:</label>
                      <select
                        className="border rounded px-2 py-1 text-sm bg-background"
                        value={filters.per_page}
                        onChange={(e) => handlePerPageChange(Number.parseInt(e.target.value))}
                        disabled={loading}
                      >
                        {allowedPerPage.map((num) => (
                          <option key={num} value={num}>
                            {num}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Pagination Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-muted transition"
                        onClick={() => handlePageChange(items.current_page - 1)}
                        disabled={!items.prev_page_url || loading}
                      >
                        Prev
                      </button>
                      <span className="px-2">
                        Page {items.current_page} of {items.last_page}
                      </span>
                      <button
                        className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-muted transition"
                        onClick={() => handlePageChange(items.current_page + 1)}
                        disabled={!items.next_page_url || loading}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
