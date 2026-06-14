"use client"

import type React from "react"
import type { PageProps } from "@/types"
import { useMemo, useState, type FormEventHandler } from "react"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { Head, useForm, router } from "@inertiajs/react"
import {
  Check,
  CheckCircle2,
  MessageCircle,
  MessagesSquare,
  Search,
  Sparkles,
  X,
} from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/frontend/ui/input"
import { Badge } from "@/components/frontend/ui/badge"
import { Card, CardContent } from "@/components/frontend/ui/card"
import { Alert, AlertDescription } from "@/components/frontend/ui/alert"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Topic {
  id: number
  name: string
  description?: string | null
  chat_room_id?: number | null
}

interface Props extends PageProps {
  topics: Topic[]
  initialSelected: number[]
}

const TOPIC_ACCENTS = [
  "from-purple-600 to-blue-600",
  "from-blue-600 to-indigo-600",
  "from-violet-600 to-purple-600",
  "from-indigo-600 to-blue-500",
  "from-purple-500 to-blue-500",
  "from-blue-500 to-cyan-600",
] as const

type FilterMode = "all" | "selected" | "unselected"

function topicAccent(topicId: number) {
  return TOPIC_ACCENTS[topicId % TOPIC_ACCENTS.length]
}

export default function TopicSelectPage({ topics, initialSelected }: Props) {
  const safeTopics = useMemo(
    () => [...(topics ?? [])].sort((a, b) => a.id - b.id),
    [topics],
  )
  const safeInitial = initialSelected ?? []

  const { data, setData, post, processing, errors } = useForm({
    topics: safeInitial,
  })

  const [selectedTopics, setSelectedTopics] = useState<number[]>(data.topics)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterMode, setFilterMode] = useState<FilterMode>("all")

  const filteredTopics = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    const matches = safeTopics.filter((topic) => {
      const matchesSearch =
        query === "" ||
        topic.name.toLowerCase().includes(query) ||
        (topic.description?.toLowerCase().includes(query) ?? false)

      if (!matchesSearch) {
        return false
      }

      const isSelected = selectedTopics.includes(topic.id)
      if (filterMode === "selected") {
        return isSelected
      }
      if (filterMode === "unselected") {
        return !isSelected
      }
      return true
    })

    if (filterMode !== "all" || matches.length === 0) {
      return matches
    }

    const selectedSet = new Set(selectedTopics)
    const selected = matches.filter((topic) => selectedSet.has(topic.id))
    const unselected = matches.filter((topic) => !selectedSet.has(topic.id))
    return [...selected, ...unselected]
  }, [safeTopics, searchTerm, filterMode, selectedTopics])

  const hasChanges =
    selectedTopics.length !== safeInitial.length ||
    selectedTopics.some((id) => !safeInitial.includes(id)) ||
    safeInitial.some((id) => !selectedTopics.includes(id))

  const syncSelection = (updated: number[]) => {
    setSelectedTopics(updated)
    setData("topics", updated)
  }

  const toggleTopic = (topicId: number) => {
    const updated = selectedTopics.includes(topicId)
      ? selectedTopics.filter((id) => id !== topicId)
      : [...selectedTopics, topicId]
    syncSelection(updated)
  }

  const selectAllVisible = () => {
    const ids = filteredTopics.map((topic) => topic.id)
    syncSelection([...new Set([...selectedTopics, ...ids])])
  }

  const clearAll = () => {
    syncSelection([])
  }

  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault()

    if (selectedTopics.length === 0) {
      toast.error("Select at least one group chat to continue.")
      return
    }

    post("/user/topics/store", {
      preserveScroll: true,
      onSuccess: () => {
        toast.success("Your group chat interests have been saved.")
      },
      onError: () => {
        toast.error("Could not save your interests. Please try again.")
      },
    })
  }

  const navigateToChat = (topic: Topic) => {
    router.get(route("chat.index"), { topic: topic.id })
  }

  return (
    <ProfileLayout
      title="Groups Chat"
      description="Click a card to select or deselect. Use the chat button to open the group conversation."
    >
      <Head title="Groups Chat" />

      {safeTopics.length === 0 ? (
        <Card className="border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
          <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="mb-4 rounded-2xl bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/40 dark:to-blue-900/40 p-4">
              <MessagesSquare className="h-10 w-10 text-purple-600 dark:text-purple-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              No group chats available yet
            </h3>
            <p className="mt-2 max-w-md text-sm text-gray-600 dark:text-gray-400">
              New communities are added regularly. Check back soon or contact support if you
              expected to see options here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Available
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {safeTopics.length}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Selected
              </p>
              <p className="mt-1 text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                {selectedTopics.length}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Showing
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {filteredTopics.length}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Status
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                {hasChanges ? (
                  <>
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    Unsaved changes
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Up to date
                  </>
                )}
              </p>
            </div>
          </div>

          {errors.topics && (
            <Alert variant="destructive">
              <AlertDescription>{errors.topics}</AlertDescription>
            </Alert>
          )}

          {/* Toolbar */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                placeholder="Search group chats..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-white dark:bg-gray-900"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(["all", "selected", "unselected"] as FilterMode[]).map((mode) => (
                <Button
                  key={mode}
                  type="button"
                  size="sm"
                  variant={filterMode === mode ? "default" : "outline"}
                  className={cn(
                    filterMode === mode &&
                      "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0",
                  )}
                  onClick={() => setFilterMode(mode)}
                >
                  {mode === "all" ? "All" : mode === "selected" ? "Selected" : "Not selected"}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={selectAllVisible}
                disabled={filteredTopics.length === 0}
              >
                Select visible
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={clearAll}
                disabled={selectedTopics.length === 0}
              >
                Clear all
              </Button>
            </div>
          </div>

          {/* Topic grid */}
          {filteredTopics.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredTopics.map((topic) => {
                const isChecked = selectedTopics.includes(topic.id)
                const accent = topicAccent(topic.id)

                return (
                  <div
                    key={topic.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleTopic(topic.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        toggleTopic(topic.id)
                      }
                    }}
                    className={cn(
                      "group relative flex cursor-pointer flex-col rounded-xl border-2 transition-all duration-200 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50",
                      isChecked
                        ? "border-purple-400 dark:border-purple-500 shadow-md shadow-purple-500/10 ring-1 ring-purple-500/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-800 hover:shadow-md",
                    )}
                  >
                    <div
                      className={cn(
                        "h-1.5 w-full bg-gradient-to-r",
                        isChecked ? accent : "from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600",
                      )}
                    />

                    <div className="flex flex-1 flex-col p-4 bg-white dark:bg-gray-900/60">
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm transition-transform group-hover:scale-105",
                            isChecked
                              ? `bg-gradient-to-br ${accent}`
                              : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
                          )}
                        >
                          <MessagesSquare className="h-5 w-5" />
                        </div>

                        <div
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                            isChecked
                              ? "border-purple-600 bg-purple-600 dark:border-purple-500 dark:bg-purple-500"
                              : "border-gray-300 dark:border-gray-600 group-hover:border-purple-300",
                          )}
                          aria-hidden
                        >
                          {isChecked && <Check className="h-3.5 w-3.5 text-white" />}
                        </div>
                      </div>

                      <div className="mt-3 space-y-1.5 min-w-0 pb-10">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3
                            className={cn(
                              "font-semibold leading-snug",
                              isChecked
                                ? "text-purple-900 dark:text-purple-100"
                                : "text-gray-900 dark:text-white",
                            )}
                          >
                            {topic.name}
                          </h3>
                          {isChecked && (
                            <Badge
                              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 text-[10px] px-1.5 py-0"
                            >
                              Selected
                            </Badge>
                          )}
                        </div>
                        {topic.description ? (
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                            {topic.description}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-400 dark:text-gray-500">
                            Join conversations with others who share this interest.
                          </p>
                        )}
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        disabled={!isChecked}
                        onClick={(e) => {
                          e.stopPropagation()
                          navigateToChat(topic)
                        }}
                        className={cn(
                          "absolute bottom-3 right-3 h-8 gap-1.5 px-3 text-xs shadow-sm",
                          isChecked
                            ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
                            : "",
                        )}
                        title={isChecked ? "Open group chat" : "Select this group first"}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Chat
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <Card className="border-dashed border-gray-200 dark:border-gray-700">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <Search className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  No group chats match your filters
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Try a different search or switch back to &ldquo;All&rdquo;.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setSearchTerm("")
                    setFilterMode("all")
                  }}
                >
                  <X className="mr-1.5 h-4 w-4" />
                  Clear filters
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div
            className="flex flex-col gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/50 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white">
                {selectedTopics.length === 0
                  ? "Select at least one group chat"
                  : `${selectedTopics.length} group chat${selectedTopics.length === 1 ? "" : "s"} selected`}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {hasChanges
                  ? "You have unsaved changes."
                  : "Your selections are saved."}
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="outline"
                disabled={selectedTopics.length === 0}
                onClick={clearAll}
              >
                Clear selection
              </Button>
              <Button
                type="submit"
                disabled={processing || selectedTopics.length === 0 || !hasChanges}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 min-w-[160px]"
              >
                {processing ? "Saving…" : "Save interests"}
              </Button>
            </div>
          </div>
        </form>
      )}
    </ProfileLayout>
  )
}
