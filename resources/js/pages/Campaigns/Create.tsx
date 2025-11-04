"use client"

import type React from "react"
import { Head, Link, useForm } from "@inertiajs/react"
import type { ContentItem } from "@/types"
import AppLayout from "@/layouts/app-layout"
import { useState } from "react"
import { Calendar, Clock, Radio, Users, FileText, Send, ArrowLeft, CheckCircle2, Search, X } from "lucide-react"

const route = (name: string, params?: any) => {
  const routes: Record<string, string> = {
    "campaigns.store": "/campaigns",
    "campaigns.index": "/campaigns",
    "content.items.create": "/content/create",
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

interface CampaignsCreateProps {
  contentItems: ContentItem[]
  defaultChannels: string[]
  users: User[]
}

const CampaignsCreate: React.FC<CampaignsCreateProps> = ({ contentItems, defaultChannels, users }) => {
  const { data, setData, errors, post, processing } = useForm({
    name: "",
    start_date: "",
    end_date: "",
    send_time_local: "07:00",
    channels: defaultChannels,
    content_items: [] as number[],
    user_ids: [] as number[],
  })

  const [userSearch, setUserSearch] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post(route("campaigns.store"))
  }

  const toggleChannel = (channel: string) => {
    setData(
      "channels",
      data.channels.includes(channel) ? data.channels.filter((c) => c !== channel) : [...data.channels, channel],
    )
  }

  const toggleContentItem = (itemId: number) => {
    setData(
      "content_items",
      data.content_items.includes(itemId)
        ? data.content_items.filter((id) => id !== itemId)
        : [...data.content_items, itemId],
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
    if (data.start_date && data.end_date) {
      const start = new Date(data.start_date)
      const end = new Date(data.end_date)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    }
    return 0
  }

  return (
    <AppLayout>
      <Head title="Create Campaign" />

      <div className="py-6">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          {/* Professional Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="p-2 sm:p-3 rounded-xl bg-primary/10 flex-shrink-0">
                  <Radio className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Link
                      href={route("campaigns.index")}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      Campaigns
                    </Link>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-sm text-muted-foreground">Create</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-2">Create Daily Prayer Campaign</h1>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Schedule daily prayers to be sent to selected users
                  </p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Campaign Details Section */}
            <div className="bg-card border border-border rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Campaign Details</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Radio className="h-4 w-4 text-primary" />
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    value={data.name}
                    onChange={(e) => setData("name", e.target.value)}
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    placeholder="e.g., Daily Prayer - October 2025"
                  />
                  {errors.name && (
                    <div className="flex items-center gap-1.5 mt-2 text-sm text-destructive">
                      <X className="h-4 w-4" />
                      {errors.name}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Daily Send Time *
                  </label>
                  <input
                    type="time"
                    value={data.send_time_local}
                    onChange={(e) => setData("send_time_local", e.target.value)}
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">Local time for your organization</p>
                  {errors.send_time_local && (
                    <div className="flex items-center gap-1.5 mt-2 text-sm text-destructive">
                      <X className="h-4 w-4" />
                      {errors.send_time_local}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={data.start_date}
                    onChange={(e) => setData("start_date", e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  />
                  {errors.start_date && (
                    <div className="flex items-center gap-1.5 mt-2 text-sm text-destructive">
                      <X className="h-4 w-4" />
                      {errors.start_date}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={data.end_date}
                    onChange={(e) => setData("end_date", e.target.value)}
                    min={data.start_date || new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  />
                  {errors.end_date && (
                    <div className="flex items-center gap-1.5 mt-2 text-sm text-destructive">
                      <X className="h-4 w-4" />
                      {errors.end_date}
                    </div>
                  )}
                </div>
              </div>

              {calculateDays() > 0 && (
                <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <p className="text-sm font-medium">
                      This campaign will run for <strong>{calculateDays()} days</strong> from{" "}
                      {new Date(data.start_date).toLocaleDateString()} to {new Date(data.end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Delivery Channels Section */}
            <div className="bg-card border border-border rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6">
                <Send className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Delivery Channels</h2>
                <span className="text-sm text-muted-foreground">*</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => toggleChannel("whatsapp")}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    data.channels.includes("whatsapp")
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        data.channels.includes("whatsapp")
                          ? "border-primary bg-primary"
                          : "border-border"
                      }`}
                    >
                      {data.channels.includes("whatsapp") && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />
                      )}
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">WhatsApp</div>
                      <div className="text-xs text-muted-foreground">Send via WhatsApp messages</div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => toggleChannel("web")}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    data.channels.includes("web")
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        data.channels.includes("web") ? "border-primary bg-primary" : "border-border"
                      }`}
                    >
                      {data.channels.includes("web") && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />
                      )}
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">Web Notification</div>
                      <div className="text-xs text-muted-foreground">Send via web notifications</div>
                    </div>
                  </div>
                </button>
              </div>

              {errors.channels && (
                <div className="flex items-center gap-1.5 mt-4 text-sm text-destructive">
                  <X className="h-4 w-4" />
                  {errors.channels}
                </div>
              )}
            </div>

            {/* Select Recipients Section */}
            <div className="bg-card border border-border rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Select Recipients</h2>
                  <span className="text-sm text-muted-foreground">*</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-primary">{data.user_ids.length} selected</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={selectAllUsers}
                      className="text-xs px-2 py-1 rounded-lg hover:bg-accent text-primary font-medium transition-colors"
                    >
                      Select All
                    </button>
                    <span className="text-muted-foreground">|</span>
                    <button
                      type="button"
                      onClick={clearAllUsers}
                      className="text-xs px-2 py-1 rounded-lg hover:bg-accent text-muted-foreground font-medium transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 p-1">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-sm text-muted-foreground">No users found</p>
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleUser(user.id)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                        data.user_ids.includes(user.id)
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            data.user_ids.includes(user.id) ? "border-primary bg-primary" : "border-border"
                          }`}
                        >
                          {data.user_ids.includes(user.id) && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{user.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                          <div className="flex gap-2 mt-1.5">
                            {user.whatsapp_opt_in === "yes" && (
                              <span className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded">
                                WhatsApp
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {errors.user_ids && (
                <div className="flex items-center gap-1.5 mt-4 text-sm text-destructive">
                  <X className="h-4 w-4" />
                  {errors.user_ids}
                </div>
              )}
            </div>

            {/* Select Content Section */}
            <div className="bg-card border border-border rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Select Prayer Content</h2>
                  <span className="text-sm text-muted-foreground">*</span>
                </div>
                <span className="text-sm font-semibold text-primary">{data.content_items.length} selected</span>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                Content will be rotated daily in the order selected
              </p>

              {contentItems.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground mb-4">No content available</p>
                  <Link
                    href={route("content.items.create")}
                    className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    <FileText className="h-4 w-4" />
                    Create some content first
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto p-1">
                  {contentItems.map((item: ContentItem) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleContentItem(item.id)}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${
                        data.content_items.includes(item.id)
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            data.content_items.includes(item.id) ? "border-primary bg-primary" : "border-border"
                          }`}
                        >
                          {data.content_items.includes(item.id) && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="font-semibold text-sm">{item.title}</div>
                            {data.content_items.includes(item.id) && (
                              <div className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-xs font-semibold flex-shrink-0">
                                #{data.content_items.indexOf(item.id) + 1}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {item.body.replace(/<[^>]*>/g, "")}
                          </div>
                          {item.meta?.scripture_ref && (
                            <div className="text-xs text-primary font-medium mt-2">
                              📖 {item.meta.scripture_ref}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {errors.content_items && (
                <div className="flex items-center gap-1.5 mt-4 text-sm text-destructive">
                  <X className="h-4 w-4" />
                  {errors.content_items}
                </div>
              )}
            </div>

            {/* Campaign Summary */}
            {data.content_items.length > 0 && data.user_ids.length > 0 && calculateDays() > 0 && (
              <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-2 border-primary/20 rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Campaign Summary</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span><strong>{calculateDays()}</strong> days of prayers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span><strong>{data.content_items.length}</strong> prayer(s) will be rotated</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span><strong>{data.user_ids.length}</strong> user(s) will receive notifications</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-primary" />
                    <span>Channels: <strong>{data.channels.join(", ")}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>Daily at <strong>{data.send_time_local}</strong> local time</span>
                  </div>
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
                  data.content_items.length === 0 ||
                  data.user_ids.length === 0 ||
                  !data.start_date ||
                  !data.end_date
                }
                className="px-8 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                {processing ? (
                  <>
                    <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Creating Campaign...
                  </>
                ) : (
                  <>
                    <Radio className="h-4 w-4" />
                    Create Campaign
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

export default CampaignsCreate
