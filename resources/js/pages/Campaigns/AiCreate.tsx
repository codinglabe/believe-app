"use client"

import type React from "react"
import { Head, Link, useForm } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { useState } from "react"

const route = (name: string, params?: any) => {
  const routes: Record<string, string> = {
    "campaigns.ai-store": "/campaigns/ai",
    "campaigns.index": "/campaigns",
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
}

const AiCampaignsCreate: React.FC<AiCampaignsCreateProps> = ({ defaultChannels, users }) => {
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

  const promptExamples = [
    "List 20 Daily Prayer with Bible Verses for morning motivation",
    "Create 15 devotional messages about faith and trust in God",
    "Generate 10 scripture-based reflections on hope and perseverance",
    "Write 12 daily prayers for peace and mental wellness",
    "Create 20 inspirational prayers with relevant Bible verses",
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post(route("campaigns.ai-store"))
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

  return (
    <AppLayout>
      <Head title="Create AI Campaign" />

      <div className="py-6">
        <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <div className="p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-3xl">✨</div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create AI-Powered Campaign</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Let AI generate unique daily content for your campaign
              </p>

              <form onSubmit={handleSubmit}>
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Campaign Name *
                    </label>
                    <input
                      type="text"
                      value={data.name}
                      onChange={(e) => setData("name", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                      placeholder="e.g., AI Daily Prayers - October 2025"
                    />
                    {errors.name && <div className="text-red-500 text-sm mt-1 dark:text-red-400">{errors.name}</div>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Daily Send Time *
                    </label>
                    <input
                      type="time"
                      value={data.send_time_local}
                      onChange={(e) => setData("send_time_local", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Local time for your organization</p>
                    {errors.send_time_local && (
                      <div className="text-red-500 text-sm mt-1 dark:text-red-400">{errors.send_time_local}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={data.start_date}
                      onChange={(e) => setData("start_date", e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    {errors.start_date && (
                      <div className="text-red-500 text-sm mt-1 dark:text-red-400">{errors.start_date}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Number of Days (Content Items) *
                    </label>
                    <input
                      type="number"
                      value={data.content_count}
                      onChange={(e) => setData("content_count", Math.max(1, Number.parseInt(e.target.value) || 1))}
                      min="1"
                      max="30"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Campaign will run for {data.content_count} days
                    </p>
                    {errors.content_count && (
                      <div className="text-red-500 text-sm mt-1 dark:text-red-400">{errors.content_count}</div>
                    )}
                  </div>
                </div>

                {/* Content Type Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Content Type *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(["prayer", "devotional", "scripture"] as const).map((type) => (
                      <label
                        key={type}
                        className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          data.content_type === type
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                            : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                        }`}
                      >
                        <input
                          type="radio"
                          name="content_type"
                          value={type}
                          checked={data.content_type === type}
                          onChange={(e) => setData("content_type", e.target.value as any)}
                          className="rounded-full border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">{type}</span>
                      </label>
                    ))}
                  </div>
                  {errors.content_type && (
                    <div className="text-red-500 text-sm mt-1 dark:text-red-400">{errors.content_type}</div>
                  )}
                </div>

                {/* AI Prompt */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      AI Prompt (What content to generate?) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPromptExamples(!showPromptExamples)}
                      className="text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                    >
                      {showPromptExamples ? "Hide" : "Show"} Examples
                    </button>
                  </div>

                  {showPromptExamples && (
                    <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-2">
                      {promptExamples.map((example, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => applyExample(example)}
                          className="w-full text-left text-xs p-2 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-colors text-gray-700 dark:text-gray-300"
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                  )}

                  <textarea
                    value={data.prompt}
                    onChange={(e) => setData("prompt", e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                    placeholder="Describe what content you want AI to generate. Be specific about the theme, tone, and any requirements..."
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Example: "Create 20 daily prayers with Bible verses for morning motivation"
                  </p>
                  {errors.prompt && <div className="text-red-500 text-sm mt-1 dark:text-red-400">{errors.prompt}</div>}
                </div>

                {/* Delivery Channels */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Delivery Channels *
                  </label>
                  <div className="flex space-x-6">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={data.channels.includes("whatsapp")}
                        onChange={() => toggleChannel("whatsapp")}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">WhatsApp</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={data.channels.includes("web")}
                        onChange={() => toggleChannel("web")}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Web Notification</span>
                    </label>
                  </div>
                  {errors.channels && (
                    <div className="text-red-500 text-sm mt-1 dark:text-red-400">{errors.channels}</div>
                  )}
                </div>

                {/* User Selection */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Select Users ({data.user_ids.length} selected) *
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllUsers}
                        className="text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                      >
                        Select All
                      </button>
                      <span className="text-gray-400">|</span>
                      <button
                        type="button"
                        onClick={clearAllUsers}
                        className="text-xs text-gray-600 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-300 font-medium"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full px-3 py-2 mb-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  />

                  <div className="max-h-64 overflow-y-auto p-4 border border-gray-200 dark:border-gray-600 rounded-lg space-y-2">
                    {filteredUsers.length === 0 ? (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-4">No users found</p>
                    ) : (
                      filteredUsers.map((user) => (
                        <label
                          key={user.id}
                          className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                            data.user_ids.includes(user.id)
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                              : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={data.user_ids.includes(user.id)}
                            onChange={() => toggleUser(user.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 dark:text-white text-sm">{user.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                            <div className="flex gap-2 mt-1">
                              {user.whatsapp_opt_in === "yes" && (
                                <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded">
                                  WhatsApp
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                  {errors.user_ids && (
                    <div className="text-red-500 text-sm mt-1 dark:text-red-400">{errors.user_ids}</div>
                  )}
                </div>

                {/* Campaign Summary */}
                {data.prompt && data.user_ids.length > 0 && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">📊 Campaign Summary</h4>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p>
                        • AI will generate <strong>{data.content_count}</strong> unique {data.content_type} items
                      </p>
                      <p>
                        • Campaign will run for <strong>{calculateDays()} days</strong>
                      </p>
                      <p>
                        • <strong>{data.user_ids.length}</strong> user(s) will receive notifications
                      </p>
                      <p>
                        • Delivery channels: <strong>{data.channels.join(", ")}</strong>
                      </p>
                      <p>
                        • Daily at <strong>{data.send_time_local}</strong> local time
                      </p>
                    </div>
                  </div>
                )}

                {errors.error && (
                  <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-700 dark:text-red-400">{errors.error}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <Link
                    href={route("campaigns.index")}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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
                      data.content_count < 1
                    }
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {processing ? "Generating Content..." : "✨ Generate & Create Campaign"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default AiCampaignsCreate
