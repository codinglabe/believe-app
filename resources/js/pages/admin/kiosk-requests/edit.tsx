"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, Link, useForm } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, ClipboardList, Eye, Save } from "lucide-react"

interface RequestRecord {
  id: number
  requester_name: string | null
  requester_email: string | null
  display_name: string
  category_slug: string
  subcategory: string
  state: string
  city: string
  url: string
  details: string
  status: string
  ai_decision: string | null
  ai_reason: string
  ai_suggested_url: string | null
  approved_service_id: number | null
  market_code: string | null
  created_at: string | null
}

interface PageProps {
  requestRecord: RequestRecord
  categories: { value: string; label: string }[]
}

export default function KioskRequestEdit({ requestRecord, categories }: PageProps) {
  const { data, setData, put, processing, errors } = useForm({
    display_name: requestRecord.display_name,
    category_slug: requestRecord.category_slug,
    subcategory: requestRecord.subcategory,
    state: requestRecord.state,
    city: requestRecord.city,
    url: requestRecord.url,
    details: requestRecord.details,
    status: requestRecord.status,
    ai_reason: requestRecord.ai_reason,
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    put(route("admin.kiosk.requests.update", requestRecord.id))
  }

  const listHref = route("admin.kiosk.requests.index")

  const breadcrumbs = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Kiosk Management", href: route("admin.kiosk.index") },
    { title: "Kiosk Requests", href: listHref },
    { title: "Edit", href: route("admin.kiosk.requests.edit", requestRecord.id) },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`Edit request — ${requestRecord.display_name}`} />
      <div className="space-y-6 p-4 sm:p-6 w-full max-w-none min-h-screen">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href={listHref}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <ClipboardList className="h-7 w-7 text-primary" />
                Edit kiosk request
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Requester:{" "}
                <span className="font-medium text-foreground">
                  {requestRecord.requester_name ?? "—"}
                </span>{" "}
                · {requestRecord.requester_email ?? "—"} · ID #{requestRecord.id}
              </p>
            </div>
          </div>
          <Button variant="outline" className="shrink-0 gap-2" asChild>
            <Link href={route("admin.kiosk.requests.show", requestRecord.id)}>
              <Eye className="h-4 w-4" />
              View request
            </Link>
          </Button>
        </div>

        <Card className="border-violet-200/60 dark:border-violet-900/50 bg-violet-50/40 dark:bg-violet-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status</CardTitle>
            <CardDescription>
              Set status here and save, or use the{" "}
              <Link href={route("admin.kiosk.requests.show", requestRecord.id)} className="text-primary font-medium hover:underline">
                view page
              </Link>{" "}
              for quick approve / pending / reject without saving other fields.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Request details</CardTitle>
              <CardDescription>Update fields and status. Approving publishes or updates the linked kiosk service.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="display_name">Service name *</Label>
                    <Input
                      id="display_name"
                      value={data.display_name}
                      onChange={(e) => setData("display_name", e.target.value)}
                    />
                    {errors.display_name && (
                      <p className="text-sm text-destructive">{errors.display_name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category_slug">Category *</Label>
                    <select
                      id="category_slug"
                      value={data.category_slug}
                      onChange={(e) => setData("category_slug", e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-9"
                    >
                      {categories.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    {errors.category_slug && (
                      <p className="text-sm text-destructive">{errors.category_slug}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subcategory">Subcategory</Label>
                    <Input
                      id="subcategory"
                      value={data.subcategory}
                      onChange={(e) => setData("subcategory", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={data.state}
                      onChange={(e) => setData("state", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={data.city}
                      onChange={(e) => setData("city", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="url">URL</Label>
                    <Input
                      id="url"
                      type="url"
                      value={data.url}
                      onChange={(e) => setData("url", e.target.value)}
                      placeholder="https://"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="details">Details</Label>
                    <Textarea
                      id="details"
                      value={data.details}
                      onChange={(e) => setData("details", e.target.value)}
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status *</Label>
                    <select
                      id="status"
                      value={data.status}
                      onChange={(e) => setData("status", e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-9"
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    {errors.status && <p className="text-sm text-destructive">{errors.status}</p>}
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="ai_reason">Reason / notes (shown to admins)</Label>
                    <Textarea
                      id="ai_reason"
                      value={data.ai_reason}
                      onChange={(e) => setData("ai_reason", e.target.value)}
                      rows={3}
                      placeholder="AI reason or your admin note"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" asChild>
                    <Link href={listHref}>Cancel</Link>
                  </Button>
                  <Button type="submit" disabled={processing} className="gap-2">
                    <Save className="h-4 w-4" />
                    Save changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Meta</CardTitle>
              <CardDescription>Read-only context</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">AI decision (original):</span>{" "}
                {requestRecord.ai_decision ?? "—"}
              </p>
              <p>
                <span className="font-medium text-foreground">Suggested URL:</span>{" "}
                {requestRecord.ai_suggested_url ?? "—"}
              </p>
              <p>
                <span className="font-medium text-foreground">Approved service ID:</span>{" "}
                {requestRecord.approved_service_id ?? "—"}
              </p>
              <p>
                <span className="font-medium text-foreground">Market code:</span>{" "}
                {requestRecord.market_code ?? "—"}
              </p>
              <p>
                <span className="font-medium text-foreground">Created:</span>{" "}
                {requestRecord.created_at ?? "—"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
