"use client"

import React, { useState } from 'react'
import { Calendar, Clock, Radio, Users, FileText, Send, CheckCircle2, Search, X, Sparkles, Loader2 } from 'lucide-react'

interface User {
  id: number
  name: string
  email: string
  contact_number?: string
  whatsapp_opt_in?: string
  push_token?: string
}

interface ContentItem {
  id: number
  title: string
  body: string
  type?: string
  meta?: any
}

interface CampaignCreateFormProps {
  formData: {
    name: string
    start_date: string
    end_date: string
    send_time_local: string
    channels: string[]
    content_items: number[]
    user_ids: number[]
  }
  users: User[]
  contentItems: ContentItem[]
  defaultChannels: string[]
  onSubmit: (data: any) => void
  onCancel?: () => void
}

export const CampaignCreateForm: React.FC<CampaignCreateFormProps> = ({
  formData: initialFormData,
  users,
  contentItems,
  defaultChannels,
  onSubmit,
  onCancel,
}) => {
  // Ensure initialFormData has all required fields with defaults
  const defaultFormData = {
    name: '',
    start_date: '',
    end_date: '',
    send_time_local: '07:00',
    channels: ['web'],
    content_items: [],
    user_ids: [],
    ...initialFormData,
  }
  
  const [data, setData] = useState(defaultFormData)
  const [userSearch, setUserSearch] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const toggleChannel = (channel: string) => {
    setData({
      ...data,
      channels: data.channels.includes(channel)
        ? data.channels.filter((c) => c !== channel)
        : [...data.channels, channel],
    })
  }

  const toggleContentItem = (itemId: number) => {
    setData({
      ...data,
      content_items: data.content_items.includes(itemId)
        ? data.content_items.filter((id) => id !== itemId)
        : [...data.content_items, itemId],
    })
  }

  const toggleUser = (userId: number) => {
    setData({
      ...data,
      user_ids: data.user_ids.includes(userId)
        ? data.user_ids.filter((id) => id !== userId)
        : [...data.user_ids, userId],
    })
  }

  const selectAllUsers = () => {
    const filteredUserIds = filteredUsers.map((u) => u.id)
    setData({ ...data, user_ids: filteredUserIds })
  }

  const clearAllUsers = () => {
    setData({ ...data, user_ids: [] })
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    onSubmit(data)
  }

  const isValid = 
    data.name.trim() !== '' &&
    data.start_date !== '' &&
    data.end_date !== '' &&
    data.user_ids.length > 0 &&
    data.content_items.length > 0 &&
    data.channels.length > 0

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-card border border-border rounded-xl p-4 shadow-sm">
      {/* Campaign Details */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1.5 flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" />
            Campaign Name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
            placeholder="e.g., Daily Prayer - October 2025"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Start Date <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              value={data.start_date}
              onChange={(e) => setData({ ...data, start_date: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              End Date <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              value={data.end_date}
              onChange={(e) => setData({ ...data, end_date: e.target.value })}
              min={data.start_date || new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Daily Send Time <span className="text-destructive">*</span>
          </label>
          <input
            type="time"
            value={data.send_time_local}
            onChange={(e) => setData({ ...data, send_time_local: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">Local time for your organization</p>
        </div>
      </div>

      {/* Delivery Channels */}
      <div>
        <label className="block text-sm font-medium mb-2 flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" />
          Delivery Channels <span className="text-destructive">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {defaultChannels.map((channel) => (
            <button
              key={channel}
              type="button"
              onClick={() => toggleChannel(channel)}
              className={`p-2.5 rounded-lg border-2 transition-all text-sm ${
                data.channels.includes(channel)
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-background hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    data.channels.includes(channel) ? 'border-primary bg-primary' : 'border-border'
                  }`}
                >
                  {data.channels.includes(channel) && (
                    <CheckCircle2 className="h-2.5 w-2.5 text-primary-foreground" />
                  )}
                </div>
                <div className="text-left">
                  <div className="font-semibold capitalize">{channel}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Select Recipients */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Select Recipients <span className="text-destructive">*</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary">{data.user_ids.length} selected</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={selectAllUsers}
                className="text-xs px-2 py-1 rounded hover:bg-accent text-primary font-medium transition-colors"
              >
                Select All
              </button>
              <span className="text-muted-foreground">|</span>
              <button
                type="button"
                onClick={clearAllUsers}
                className="text-xs px-2 py-1 rounded hover:bg-accent text-muted-foreground font-medium transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>

        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
          />
        </div>

        <div className="max-h-32 overflow-y-auto space-y-1.5 p-1 border border-border rounded-lg bg-background">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-4">
              <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-xs text-muted-foreground">No users found</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => toggleUser(user.id)}
                className={`w-full text-left p-2 rounded border transition-all text-sm ${
                  data.user_ids.includes(user.id)
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-background hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      data.user_ids.includes(user.id) ? 'border-primary bg-primary' : 'border-border'
                    }`}
                  >
                    {data.user_ids.includes(user.id) && (
                      <CheckCircle2 className="h-2.5 w-2.5 text-primary-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{user.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Select Content */}
      <div>
        <label className="block text-sm font-medium mb-2 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Select Prayer Content <span className="text-destructive">*</span>
        </label>
        <div className="max-h-32 overflow-y-auto space-y-1.5 p-1 border border-border rounded-lg bg-background">
          {contentItems.length === 0 ? (
            <div className="text-center py-4">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-xs text-muted-foreground">No content available</p>
            </div>
          ) : (
            contentItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleContentItem(item.id)}
                className={`w-full text-left p-2 rounded border transition-all text-sm ${
                  data.content_items.includes(item.id)
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-background hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      data.content_items.includes(item.id) ? 'border-primary bg-primary' : 'border-border'
                    }`}
                  >
                    {data.content_items.includes(item.id) && (
                      <CheckCircle2 className="h-2.5 w-2.5 text-primary-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{item.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {item.body.replace(/<[^>]*>/g, '')}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Campaign Summary */}
      {data.name && data.start_date && data.end_date && calculateDays() > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">Campaign Summary</h4>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><strong>{calculateDays()}</strong> days</div>
            <div><strong>{data.content_items.length}</strong> prayer(s)</div>
            <div><strong>{data.user_ids.length}</strong> user(s)</div>
            <div>At <strong>{data.send_time_local}</strong></div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 border border-border rounded-lg hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary transition-all font-medium text-sm"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="px-6 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm flex items-center gap-2 shadow-sm hover:shadow-md"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Create Campaign
            </>
          )}
        </button>
      </div>
    </form>
  )
}

