"use client"

import type React from "react"
import { Head, Link, router, useForm, usePage } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { useState } from "react"
import { Coins, Calendar, Clock, FileText, Users, MessageSquare, Radio, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react"
import type { SharedData } from "@/types"

const route = (name: string) => {
  const routes: Record<string, string> = {
    "campaigns.ai-store": "/campaigns/ai",
    "campaigns.index": "/campaigns",
    "credits.checkout": "/credits/checkout",
  }
  return routes[name] || "/"
}

interface User {
  id: number
  name: string
  email: string
  contact_number?: string
  whatsapp_opt_in?: string
  push_token?: string
}

interface AiCampaignsCreateProps {
  defaultChannels: string[]
  users: User[]
  credits: number
}

const AiCampaignsCreate: React.FC<AiCampaignsCreateProps> = ({ defaultChannels, users, credits: initialCredits = 0 }) => {
  const { auth } = usePage<SharedData>().props
  const currentCredits = auth.user.credits ?? initialCredits
  const { data, setData, errors, post, processing } = useForm({
    name: "",
    start_date: "",
    end_date: "",
    send_time_local: "07:00",
    channels: defaultChannels,
    user_ids: [] as number[],
    prompt: "",
    content_count: 10,
    content_type: "prayer" as "prayer" | "devotional" | "scripture",
  })

  const [userSearch, setUserSearch] = useState("")
  const [showPromptExamples, setShowPromptExamples] = useState(false)
  const [isLoadingCredits, setIsLoadingCredits] = useState(false)

  const promptExamples = [
    "List 20 Daily Prayer with Bible Verses for morning motivation",
    "Create 15 devotional messages about faith and trust in God",
    "Generate 10 scripture-based reflections on hope and perseverance",
    "Write 12 daily prayers for peace and mental wellness",
    "Create 20 inspirational prayers with relevant Bible verses",
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post(route("campaigns.ai-store"), {
      onSuccess: () => {
        // Reload auth data to update credits in real-time
        router.reload({ only: ['auth'] })
      },
    })
  }

  const toggleChannel = (channel: string) => {
    setData(
      "channels",
      data.channels.includes(channel) ? data.channels.filter((c) => c !== channel) : [...data.channels, channel],
    )
  }

  const toggleUser = (userId: number) => {
    setData(
      "user_ids",
      data.user_ids.includes(userId) ? data.user_ids.filter((id) => id !== userId) : [...data.user_ids, userId],
    )
  }

  const selectAllUsers = () => {
    const filteredUserIds = filteredUsers.map((u) => u.id)
    setData("user_ids", filteredUserIds)
  }

  const clearAllUsers = () => {
    setData("user_ids", [])
  }

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearch.toLowerCase()),
  )

  const calculateDays = (): number => {
    return data.content_count
  }

  const applyExample = (example: string) => {
    setData("prompt", example)
    setShowPromptExamples(false)
  }

  const handleBuyCredits = () => {
    setIsLoadingCredits(true)
    router.post(route("credits.checkout"), {
      amount: 1.00, // $1
      return_route: "campaigns.ai-create",
    }, {
      onError: (errors) => {
        console.error('Failed to create checkout session:', errors)
        setIsLoadingCredits(false)
      },
      onFinish: () => {
        // Inertia will automatically redirect to Stripe checkout on success
        // This will be called if there's an error
        setIsLoadingCredits(false)
      }
    })
  }

  return (
    <AppLayout>
      <Head title="Create AI Campaign" />

      <div className="py-6">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="p-2 sm:p-3 rounded-xl bg-primary/10 flex-shrink-0">
                  <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl sm:text-3xl font-bold leading-tight">Create AI-Powered Campaign</h1>
                  <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                    Let AI generate unique daily content for your campaign
                  </p>
                </div>
              </div>
              {auth.user.role === 'organization' && (
                <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 sm:px-4 py-2 sm:py-2.5 border border-primary/20 flex-shrink-0">
                  <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                  <span className="text-xs sm:text-sm font-semibold text-primary whitespace-nowrap">
                    <span className="hidden sm:inline">{(auth.user.credits ?? 0).toLocaleString()} Credits</span>
                    <span className="sm:hidden">{(auth.user.credits ?? 0).toLocaleString()}</span>
                  </span>
                </div>
              )}
            </div>

            {currentCredits < data.content_count && (
              <div className="flex items-start gap-3 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/20">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-yellow-900 dark:text-yellow-300">Insufficient Credits</div>
                  <div className="text-sm text-yellow-700 dark:text-yellow-400 mt-0.5">
                    You need <strong>{data.content_count}</strong> credits but only have <strong>{currentCredits}</strong> available.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleBuyCredits}
                  disabled={isLoadingCredits}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 cursor-pointer"
                >
                  <Coins className="h-4 w-4" />
                  {isLoadingCredits ? "Processing..." : "Upgrade Buy Credits"}
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information Card */}
            <div className="bg-card border border-border rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Campaign Details</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    value={data.name}
                    onChange={(e) => setData("name", e.target.value)}
                    className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background transition-all"
                    placeholder="e.g., AI Daily Prayers - October 2025"
                  />
                  {errors.name && <div className="text-destructive text-sm mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.name}</div>}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={data.start_date}
                    onChange={(e) => setData("start_date", e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background transition-all"
                  />
                  {errors.start_date && (
                    <div className="text-destructive text-sm mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.start_date}</div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Daily Send Time *
                  </label>
                  <input
                    type="time"
                    value={data.send_time_local}
                    onChange={(e) => setData("send_time_local", e.target.value)}
                    className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background transition-all"
                  />
                  <p className="text-xs text-muted-foreground">Local time for your organization</p>
                  {errors.send_time_local && (
                    <div className="text-destructive text-sm mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.send_time_local}</div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Number of Days (Content Items) *
                  </label>
                  <input
                    type="number"
                    value={data.content_count}
                    onChange={(e) => setData("content_count", Math.max(1, Number.parseInt(e.target.value) || 1))}
                    min="1"
                    max="30"
                    className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background transition-all"
                  />
                  <p className="text-xs text-muted-foreground">
                    Campaign will generate <strong>{data.content_count}</strong> unique content items
                  </p>
                  {errors.content_count && (
                    <div className="text-destructive text-sm mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.content_count}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Content Type Selection */}
            <div className="bg-card border border-border rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Radio className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Content Type</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(["prayer", "devotional", "scripture"] as const).map((type) => (
                  <label
                    key={type}
                    className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      data.content_type === type
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border bg-card hover:border-primary/50 hover:bg-accent/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="content_type"
                      value={type}
                      checked={data.content_type === type}
                      onChange={(e) => setData("content_type", e.target.value as "prayer" | "devotional" | "scripture")}
                      className="rounded-full border-border text-primary focus:ring-primary w-4 h-4"
                    />
                    <span className="text-sm font-medium capitalize flex-1">{type}</span>
                    {data.content_type === type && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </label>
                ))}
              </div>
              {errors.content_type && (
                <div className="text-destructive text-sm mt-3 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.content_type}</div>
              )}
            </div>

            {/* AI Prompt */}
            <div className="bg-card border border-border rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <MessageSquare className="h-4 w-4 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">AI Prompt</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPromptExamples(!showPromptExamples)}
                  className="text-sm text-primary hover:text-primary/80 font-medium px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                >
                  {showPromptExamples ? "Hide" : "Show"} Examples
                </button>
              </div>

              {showPromptExamples && (
                <div className="mb-4 p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-2">
                  {promptExamples.map((example, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyExample(example)}
                      className="w-full text-left text-sm p-3 hover:bg-primary/10 rounded-lg transition-colors text-muted-foreground hover:text-foreground border border-transparent hover:border-primary/20"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Describe what content you want AI to generate *
                </label>
                <textarea
                  value={data.prompt}
                  onChange={(e) => setData("prompt", e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background transition-all resize-none"
                  placeholder="Be specific about the theme, tone, and any requirements. Example: 'Create 20 daily prayers with Bible verses for morning motivation'"
                />
                {errors.prompt && <div className="text-destructive text-sm mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.prompt}</div>}
              </div>
            </div>

            {/* Delivery Channels */}
            <div className="bg-card border border-border rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Delivery Channels</h2>
              </div>
              <div className="flex flex-wrap gap-6">
                <label className="inline-flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all border-border hover:border-primary/50 hover:bg-accent/50">
                  <input
                    type="checkbox"
                    checked={data.channels.includes("whatsapp")}
                    onChange={() => toggleChannel("whatsapp")}
                    className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                  />
                  <span className="text-sm font-medium">WhatsApp</span>
                  {data.channels.includes("whatsapp") && <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />}
                </label>
                <label className="inline-flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all border-border hover:border-primary/50 hover:bg-accent/50">
                  <input
                    type="checkbox"
                    checked={data.channels.includes("web")}
                    onChange={() => toggleChannel("web")}
                    className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                  />
                  <span className="text-sm font-medium">Web Notification</span>
                  {data.channels.includes("web") && <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />}
                </label>
              </div>
              {errors.channels && (
                <div className="text-destructive text-sm mt-3 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.channels}</div>
              )}
            </div>

            {/* User Selection */}
            <div className="bg-card border border-border rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">Select Recipients</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {data.user_ids.length} {data.user_ids.length === 1 ? 'user' : 'users'} selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllUsers}
                      className="text-sm text-primary hover:text-primary/80 font-medium px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                    >
                      Select All
                    </button>
                    <span className="text-muted-foreground">|</span>
                    <button
                      type="button"
                      onClick={clearAllUsers}
                      className="text-sm text-muted-foreground hover:text-foreground font-medium px-3 py-1.5 rounded-lg hover:bg-accent transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="🔍 Search users by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background transition-all"
                />

                <div className="max-h-72 overflow-y-auto p-4 border border-border rounded-lg space-y-2 bg-muted/30">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                      <p className="text-muted-foreground">No users found</p>
                    </div>
                  ) : (
                    filteredUsers.map((user) => (
                      <label
                        key={user.id}
                        className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                          data.user_ids.includes(user.id)
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border bg-card hover:border-primary/50 hover:bg-accent/50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={data.user_ids.includes(user.id)}
                          onChange={() => toggleUser(user.id)}
                          className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                          <div className="flex gap-2 mt-2">
                            {user.whatsapp_opt_in === "yes" && (
                              <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                                WhatsApp Enabled
                              </span>
                            )}
                          </div>
                        </div>
                        {data.user_ids.includes(user.id) && <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />}
                      </label>
                    ))
                  )}
                </div>
              </div>
              {errors.user_ids && (
                <div className="text-destructive text-sm mt-3 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.user_ids}</div>
              )}
            </div>

            {/* Campaign Summary */}
            {data.prompt && data.user_ids.length > 0 ? (
              <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-2 border-primary/20 rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">Campaign Summary</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium">Content Generation</div>
                        <div className="text-sm text-muted-foreground">
                          <strong>{data.content_count}</strong> unique {data.content_type} items
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium">Campaign Duration</div>
                        <div className="text-sm text-muted-foreground">
                          <strong>{calculateDays()} days</strong> from start date
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium">Recipients</div>
                        <div className="text-sm text-muted-foreground">
                          <strong>{data.user_ids.length}</strong> {data.user_ids.length === 1 ? 'user' : 'users'} will receive notifications
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MessageSquare className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium">Delivery Channels</div>
                        <div className="text-sm text-muted-foreground">
                          <strong>{data.channels.join(" & ")}</strong>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium">Send Time</div>
                        <div className="text-sm text-muted-foreground">
                          Daily at <strong>{data.send_time_local}</strong> local time
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Coins className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium">Cost</div>
                        <div className="text-sm text-muted-foreground">
                          <strong>{data.content_count}</strong> credits (Remaining: <strong>{currentCredits - data.content_count}</strong>)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {('error' in errors && errors.error) && (
              <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg border-2 border-destructive/20">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-destructive">Error</div>
                  <div className="text-sm text-destructive/90 mt-0.5">{(errors as { error?: string }).error}</div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-6 border-t border-border">
              <Link
                href={route("campaigns.index")}
                className="px-6 py-2.5 border border-border rounded-lg hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={
                  processing ||
                  !data.prompt ||
                  data.user_ids.length === 0 ||
                  !data.start_date ||
                  data.content_count < 1 ||
                  currentCredits < data.content_count
                }
                className="px-8 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                {processing ? (
                  <>
                    <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Generating Content...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate & Create Campaign
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}

export default AiCampaignsCreate
