"use client"

import React, { useMemo } from "react"
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
import { Textarea } from "@/components/ui/textarea"
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

const DIFFICULTY_OPTIONS = ["Easy", "Medium", "Hard"] as const

export default function AdminChallengeHubQuestionCreate({ hub_categories, subcategories_by_category }: Props) {
  const form = useForm({
    category: "",
    subcategory: "",
    question: "",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_option: "A" as "A" | "B" | "C" | "D",
    explanation: "",
    difficulty: "",
  })

  const categoryHubId = useMemo(() => {
    const row = hub_categories.find((h) => h.label === form.data.category)
    return row != null ? String(row.id) : ""
  }, [hub_categories, form.data.category])

  const subOptions = useMemo(() => {
    const label = form.data.category
    if (!label) return [] as string[]
    return subcategories_by_category[label] ?? []
  }, [form.data.category, subcategories_by_category])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    form.post(route("admin.challenge-hub.questions.store"))
  }

  const err = (key: string) =>
    form.errors[key] ? <p className="text-sm text-red-600">{form.errors[key]}</p> : null

  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Challenge Hub", href: route("admin.challenge-hub.categories.index") },
    { title: "Questions bank", href: route("admin.challenge-hub.questions.index") },
    { title: "New question", href: route("admin.challenge-hub.questions.create") },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="New question" />
      <div className="w-full max-w-full p-4 sm:p-6">
        <ChallengeHubAdminNav active="questions" />
        <Card className="w-full">
          <CardHeader className="space-y-4">
            <div className="w-full">
              <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
                <Link href={route("admin.challenge-hub.questions.index")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to questions bank
                </Link>
              </Button>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Plus className="h-6 w-6" />
                New question
              </CardTitle>
              <CardDescription className="mt-1.5">
                Pick the hub category (stored as the category label) and a quiz subcategory from Challenge Hub →
                Subcategories. Four options (A–D), one correct answer.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {hub_categories.length === 0 ? (
              <p className="mb-4 text-sm text-amber-800 dark:text-amber-200">
                Create hub categories first, then add questions for those labels.
              </p>
            ) : null}
            <form onSubmit={submit} className="w-full">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="q-category">Category (hub)</Label>
                  <Select
                    value={categoryHubId !== "" ? categoryHubId : undefined}
                    onValueChange={(id) => {
                      const row = hub_categories.find((h) => String(h.id) === id)
                      const label = row?.label ?? ""
                      form.setData("category", label)
                      const nextSubs = label ? subcategories_by_category[label] ?? [] : []
                      form.setData("subcategory", nextSubs[0] ?? "")
                    }}
                    disabled={hub_categories.length === 0}
                  >
                    <SelectTrigger id="q-category" className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {hub_categories.map((h) => (
                        <SelectItem key={h.id} value={String(h.id)}>
                          {h.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {err("category")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="q-subcategory">Subcategory (required)</Label>
                  <Select
                    value={form.data.subcategory !== "" ? form.data.subcategory : undefined}
                    onValueChange={(v) => form.setData("subcategory", v)}
                    disabled={!form.data.category || subOptions.length === 0}
                  >
                    <SelectTrigger id="q-subcategory" className="w-full">
                      <SelectValue
                        placeholder={
                          !form.data.category
                            ? "Pick a category first"
                            : subOptions.length === 0
                              ? "Add subcategories for this hub first"
                              : "Select subcategory"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {subOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.data.category && subOptions.length === 0 ? (
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      No subcategories for this hub yet. Create them under Challenge Hub → Subcategories.
                    </p>
                  ) : null}
                  {err("subcategory")}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="q-text">Question</Label>
                  <Textarea
                    id="q-text"
                    className="w-full"
                    rows={3}
                    value={form.data.question}
                    onChange={(e) => form.setData("question", e.target.value)}
                    required
                  />
                  {err("question")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="q-a">Option A</Label>
                  <Input
                    id="q-a"
                    className="w-full"
                    value={form.data.option_a}
                    onChange={(e) => form.setData("option_a", e.target.value)}
                    required
                  />
                  {err("option_a")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="q-b">Option B</Label>
                  <Input
                    id="q-b"
                    className="w-full"
                    value={form.data.option_b}
                    onChange={(e) => form.setData("option_b", e.target.value)}
                    required
                  />
                  {err("option_b")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="q-c">Option C</Label>
                  <Input
                    id="q-c"
                    className="w-full"
                    value={form.data.option_c}
                    onChange={(e) => form.setData("option_c", e.target.value)}
                    required
                  />
                  {err("option_c")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="q-d">Option D</Label>
                  <Input
                    id="q-d"
                    className="w-full"
                    value={form.data.option_d}
                    onChange={(e) => form.setData("option_d", e.target.value)}
                    required
                  />
                  {err("option_d")}
                </div>
                <div className="space-y-2">
                  <Label>Correct answer</Label>
                  <Select
                    value={form.data.correct_option}
                    onValueChange={(v) => form.setData("correct_option", v as "A" | "B" | "C" | "D")}
                  >
                    <SelectTrigger id="q-correct" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="C">C</SelectItem>
                      <SelectItem value="D">D</SelectItem>
                    </SelectContent>
                  </Select>
                  {err("correct_option")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="q-difficulty">Difficulty (optional)</Label>
                  <Select
                    value={form.data.difficulty === "" ? "__none__" : form.data.difficulty}
                    onValueChange={(v) => form.setData("difficulty", v === "__none__" ? "" : v)}
                  >
                    <SelectTrigger id="q-difficulty" className="w-full">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {DIFFICULTY_OPTIONS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {err("difficulty")}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="q-explanation">Explanation (optional)</Label>
                  <Textarea
                    id="q-explanation"
                    className="w-full"
                    rows={2}
                    value={form.data.explanation}
                    onChange={(e) => form.setData("explanation", e.target.value)}
                  />
                  {err("explanation")}
                </div>
                <div className="flex justify-end md:col-span-2">
                  <Button
                    type="submit"
                    disabled={
                      form.processing ||
                      hub_categories.length === 0 ||
                      !form.data.category ||
                      !form.data.subcategory ||
                      subOptions.length === 0
                    }
                  >
                    Create question
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
