"use client"

import React from "react"
import { Head, Link, useForm } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { ChallengeHubAdminNav } from "@/components/challenge-hub-admin-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Plus } from "lucide-react"
import type { BreadcrumbItem } from "@/types"

declare global {
  function route(name: string, params?: Record<string, unknown> | (string | number)[]): string
}

type HubRow = { id: number; label: string; slug: string }

interface Props {
  hub_categories: HubRow[]
  subcategories_by_category: Record<string, string[]>
}

export default function AdminChallengeHubSubcategoryCreate({ hub_categories }: Props) {
  const form = useForm({
    challenge_hub_category_id: "" as string | number,
    name: "",
    sort_order: 0,
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    form.post(route("admin.challenge-hub.subcategories.store"))
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Challenge Hub", href: route("admin.challenge-hub.categories.index") },
    { title: "Subcategories", href: route("admin.challenge-hub.subcategories.index") },
    { title: "New", href: route("admin.challenge-hub.subcategories.create") },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="New subcategory" />
      <div className="w-full max-w-full p-4 sm:p-6">
        <ChallengeHubAdminNav active="subcategories" />
        <Card className="w-full">
          <CardHeader className="space-y-4">
            <div className="flex w-full flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
                  <Link href={route("admin.challenge-hub.subcategories.index")}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Link>
                </Button>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Plus className="h-6 w-6" />
                  New subcategory
                </CardTitle>
                <CardDescription className="mt-1.5">
                  Names must be unique within the selected hub category. They match{" "}
                  <span className="font-mono text-xs">challenge_questions.subcategory</span> and track quiz filters.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {hub_categories.length === 0 ? (
              <p className="text-sm text-amber-800 dark:text-amber-200">Create a hub category first.</p>
            ) : null}
            <form onSubmit={submit} className="w-full">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="sub-hub">Hub category</Label>
                  <Select
                    value={form.data.challenge_hub_category_id !== "" ? String(form.data.challenge_hub_category_id) : ""}
                    onValueChange={(v) => form.setData("challenge_hub_category_id", v)}
                  >
                    <SelectTrigger id="sub-hub" className="w-full">
                      <SelectValue placeholder="Select hub category" />
                    </SelectTrigger>
                    <SelectContent>
                      {hub_categories.map((h) => (
                        <SelectItem key={h.id} value={String(h.id)}>
                          {h.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.errors.challenge_hub_category_id ? (
                    <p className="text-sm text-red-600">{form.errors.challenge_hub_category_id}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sub-name">Name</Label>
                  <Input
                    id="sub-name"
                    className="w-full"
                    value={form.data.name}
                    onChange={(e) => form.setData("name", e.target.value)}
                    required
                  />
                  {form.errors.name ? <p className="text-sm text-red-600">{form.errors.name}</p> : null}
                </div>
                <div className="space-y-2 md:max-w-xs">
                  <Label htmlFor="sub-sort">Sort order</Label>
                  <Input
                    id="sub-sort"
                    type="number"
                    min={0}
                    className="w-full"
                    value={form.data.sort_order}
                    onChange={(e) => form.setData("sort_order", parseInt(e.target.value, 10) || 0)}
                  />
                </div>
                <div className="flex items-end justify-end md:col-span-2">
                  <Button type="submit" disabled={form.processing || hub_categories.length === 0}>
                    Create subcategory
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
