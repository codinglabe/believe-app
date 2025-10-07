"use client"

import type React from "react"
import { Head, Link, useForm } from "@inertiajs/react"
import type { ContentItem } from "@/types"
import AppLayout from "@/layouts/app-layout"
import { useState } from "react"

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
        <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <div className="p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Create Daily Prayer Campaign</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Schedule daily prayers to be sent to selected users
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
                      placeholder="e.g., Daily Prayer - October 2025"
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
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={data.end_date}
                      onChange={(e) => setData("end_date", e.target.value)}
                      min={data.start_date || new Date().toISOString().split("T")[0]}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    {errors.end_date && (
                      <div className="text-red-500 text-sm mt-1 dark:text-red-400">{errors.end_date}</div>
                    )}
                  </div>
                </div>

                {calculateDays() > 0 && (
                  <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      This campaign will run for <strong>{calculateDays()} days</strong>
                      from {new Date(data.start_date).toLocaleDateString()} to{" "}
                      {new Date(data.end_date).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {/* Delivery Channels */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Delivery Channels *
                  </label>
                  <div className="flex space-x-6">
                    {/* <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={data.channels.includes("push")}
                        onChange={() => toggleChannel("push")}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Push Notification</span>
                    </label> */}
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
                              {/* {user.push_token && (
                                <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded">
                                  Push
                                </span>
                              )} */}
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

                {/* Content Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Select Prayer Content ({data.content_items.length} selected) *
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      Content will be rotated daily in the order selected
                    </span>
                  </label>

                  {contentItems.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                      <p className="text-gray-500 dark:text-gray-400 mb-2">No content available</p>
                      <Link
                        href={route("content.items.create")}
                        className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium transition-colors"
                      >
                        Create some content first
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      {contentItems.map((item: ContentItem, index: number) => (
                        <label
                          key={item.id}
                          className={`inline-flex items-start space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                            data.content_items.includes(item.id)
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                              : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={data.content_items.includes(item.id)}
                            onChange={() => toggleContentItem(item.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1 dark:border-gray-600 dark:bg-gray-700"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 dark:text-white text-sm mb-1">{item.title}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                              {item.body.replace(/<[^>]*>/g, "")}
                            </div>
                            {item.meta?.scripture_ref && (
                              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                {item.meta.scripture_ref}
                              </div>
                            )}
                          </div>
                          {data.content_items.includes(item.id) && (
                            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                              #{data.content_items.indexOf(item.id) + 1}
                            </div>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                  {errors.content_items && (
                    <div className="text-red-500 text-sm mt-1 dark:text-red-400">{errors.content_items}</div>
                  )}
                </div>

                {data.content_items.length > 0 && data.user_ids.length > 0 && calculateDays() > 0 && (
                  <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Campaign Summary</h4>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p>• {calculateDays()} days of prayers</p>
                      <p>• {data.content_items.length} prayer(s) will be rotated</p>
                      <p>• {data.user_ids.length} user(s) will receive notifications</p>
                      <p>• Delivery channels: {data.channels.join(", ")}</p>
                      <p>• Daily at {data.send_time_local} local time</p>
                    </div>
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
                      data.content_items.length === 0 ||
                      data.user_ids.length === 0 ||
                      !data.start_date ||
                      !data.end_date
                    }
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {processing ? "Creating Campaign..." : "Create Campaign"}
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

export default CampaignsCreate
