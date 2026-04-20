"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { Head, Link, router, usePage } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal"
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
import { BookOpen, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react"
import type { BreadcrumbItem } from "@/types"

declare global {
  function route(name: string, params?: Record<string, unknown> | (string | number)[]): string
}

interface QuestionRow {
  id: number
  category: string
  subcategory: string | null
  question: string
  source: string | null
  difficulty: string | null
}

interface LaravelPagination<T> {
  data: T[]
  links: { url: string | null; label: string; active: boolean }[]
  current_page: number
  last_page: number
  from: number | null
  to: number | null
  total: number
  prev_page_url: string | null
  next_page_url: string | null
}

interface Props {
  questions: LaravelPagination<QuestionRow>
  filters: { category: string; search: string }
  category_options: string[]
}

function getNumericLinks(links: LaravelPagination<QuestionRow>["links"]) {
  return links.filter((l) => l.label !== "&laquo; Previous" && l.label !== "Next &raquo;")
}

const SEARCH_DEBOUNCE_MS = 400

export default function AdminChallengeHubQuestionsBank() {
  const { questions, filters, category_options } = usePage<Props>().props
  const { flash } = usePage().props as { flash?: { success?: string; error?: string } }

  const [category, setCategory] = useState(() => filters.category || "")
  const [search, setSearch] = useState(() => filters.search || "")
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: number | null; message: string }>({
    open: false,
    id: null,
    message: "",
  })
  const [isDeleting, setIsDeleting] = useState(false)

  const openDeleteQuestion = (id: number, preview: string) => {
    const short = preview.length > 80 ? `${preview.slice(0, 80)}…` : preview
    setDeleteModal({ open: true, id, message: short })
  }

  const handleDeleteConfirm = () => {
    if (deleteModal.id == null) return
    setIsDeleting(true)
    router.delete(route("admin.challenge-hub.questions.destroy", deleteModal.id), {
      preserveScroll: true,
      onFinish: () => {
        setIsDeleting(false)
        setDeleteModal({ open: false, id: null, message: "" })
      },
    })
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Challenge Hub", href: route("admin.challenge-hub.categories.index") },
    { title: "Questions bank", href: route("admin.challenge-hub.questions.index") },
  ]

  const visit = useCallback((nextCategory: string, nextSearch: string) => {
    router.get(
      route("admin.challenge-hub.questions.index"),
      {
        category: nextCategory || undefined,
        search: nextSearch || undefined,
      },
      { preserveState: true, replace: true }
    )
  }, [])

  useEffect(() => {
    setCategory(filters.category || "")
    setSearch(filters.search || "")
  }, [filters.category, filters.search])

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current)
      }
    }
  }, [])

  const onCategoryChange = (v: string) => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
      searchDebounceRef.current = null
    }
    const next = v === "__all__" ? "" : v
    setCategory(next)
    visit(next, search)
  }

  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextSearch = e.target.value
    setSearch(nextSearch)
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
    }
    searchDebounceRef.current = setTimeout(() => {
      searchDebounceRef.current = null
      visit(category, nextSearch)
    }, SEARCH_DEBOUNCE_MS)
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Challenge Hub — Questions bank" />
      <div className="w-full max-w-full space-y-6 p-4 sm:p-6">
        <ChallengeHubAdminNav active="questions" />
        <div className="flex w-full flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Questions bank</h1>
            <p className="mt-1.5 text-gray-600 dark:text-gray-400">
              Browse, filter, and open a question for full edit. Create uses a separate page.
            </p>
          </div>
          <div className="flex shrink-0 justify-end">
            <Button asChild>
              <Link href={route("admin.challenge-hub.questions.create")}>
                <Plus className="mr-2 h-4 w-4" />
                New question
              </Link>
            </Button>
          </div>
        </div>

        {flash?.success ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
            {flash.success}
          </div>
        ) : null}
        {flash?.error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
            {flash.error}
          </div>
        ) : null}

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Questions
            </CardTitle>
            <CardDescription>
              Category applies immediately. Search runs automatically a short moment after you stop typing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 md:items-end">
              <div className="min-w-0 space-y-2">
                <Label>Category</Label>
                <Select value={category || "__all__"} onValueChange={onCategoryChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All categories</SelectItem>
                    {category_options.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 space-y-2">
                <Label>Search</Label>
                <Input
                  className="w-full"
                  value={search}
                  onChange={onSearchChange}
                  placeholder="Question text…"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500 dark:text-gray-400">
                    <th className="pb-2 pr-3 font-medium">ID</th>
                    <th className="pb-2 pr-3 font-medium">Category</th>
                    <th className="pb-2 pr-3 font-medium">Subcategory</th>
                    <th className="pb-2 pr-3 font-medium">Question</th>
                    <th className="pb-2 pr-3 font-medium">Source</th>
                    <th className="pb-2 pr-3 font-medium">Difficulty</th>
                    <th className="pb-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.data.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">
                        No questions match.
                      </td>
                    </tr>
                  ) : (
                    questions.data.map((q) => (
                      <tr key={q.id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2 pr-3 font-mono text-xs text-gray-500">{q.id}</td>
                        <td className="py-2 pr-3">{q.category}</td>
                        <td className="py-2 pr-3 text-gray-600 dark:text-gray-300">{q.subcategory ?? "—"}</td>
                        <td className="max-w-md py-2 pr-3 text-gray-800 dark:text-gray-100">{q.question}</td>
                        <td className="py-2 pr-3 text-xs text-gray-500">{q.source ?? "—"}</td>
                        <td className="py-2 pr-3 text-xs">{q.difficulty ?? "—"}</td>
                        <td className="py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <Button asChild variant="outline" size="sm">
                              <Link href={route("admin.challenge-hub.questions.edit", q.id)}>
                                <Pencil className="mr-1 h-4 w-4" />
                                Edit
                              </Link>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                              onClick={() => openDeleteQuestion(q.id, q.question)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {questions.last_page > 1 ? (
              <div className="flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-500">
                  Showing {questions.from ?? 0}–{questions.to ?? 0} of {questions.total}
                </p>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {questions.prev_page_url ? (
                    <Link href={questions.prev_page_url}>
                      <Button variant="outline" size="sm" type="button">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </Link>
                  ) : null}
                  {getNumericLinks(questions.links).map((link, i) => (
                    <span key={i}>
                      {link.url ? (
                        <Link href={link.url}>
                          <Button variant={link.active ? "default" : "outline"} size="sm" type="button" className="min-w-9">
                            <span dangerouslySetInnerHTML={{ __html: link.label }} />
                          </Button>
                        </Link>
                      ) : (
                        <span className="px-2 text-gray-400" dangerouslySetInnerHTML={{ __html: link.label }} />
                      )}
                    </span>
                  ))}
                  {questions.next_page_url ? (
                    <Link href={questions.next_page_url}>
                      <Button variant="outline" size="sm" type="button">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <DeleteConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null, message: "" })}
        onConfirm={handleDeleteConfirm}
        title="Delete question"
        message={
          deleteModal.message
            ? `Delete this question? Preview: ${deleteModal.message}`
            : "Delete this question?"
        }
        isLoading={isDeleting}
      />
    </AppLayout>
  )
}
