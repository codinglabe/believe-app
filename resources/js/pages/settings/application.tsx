"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { router, usePage, useForm } from "@inertiajs/react"
import SettingsLayout from "@/layouts/settings/layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/frontend/ui/card"
import { Button } from "@/components/frontend/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/frontend/ui/tabs"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { Textarea } from "@/components/frontend/ui/textarea"
import { motion, AnimatePresence } from "framer-motion"
import {
  Zap,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Terminal,
  HardDrive,
  Database,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  Save,
  Plus,
  X,
  Layout,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/frontend/ui/alert"
import { showSuccessToast, showErrorToast } from "@/lib/toast"

interface TerminalLine {
  id: string
  type: 'command' | 'output' | 'success' | 'error'
  content: string
  timestamp: Date
}

interface CacheStats {
  driver: string
  prefix: string
}

interface StorageStats {
  logs_size: number
  cache_size: number
  total_size: number
  logs_size_formatted: string
  cache_size_formatted: string
  total_size_formatted: string
}

interface FooterSettings {
  description?: string
  social_links?: {
    facebook?: string
    twitter?: string
    instagram?: string
    linkedin?: string
  }
  quick_links?: Array<{
    title: string
    url: string
  }>
  contact_email?: string
  contact_phone?: string
  contact_address?: string
  copyright_text?: string
  legal_links?: Array<{
    title: string
    url: string
  }>
}

interface Props {
  cache_stats: CacheStats
  storage_stats: StorageStats
  footer_settings?: FooterSettings | null
}

export default function ApplicationSettings({ cache_stats, storage_stats, footer_settings }: Props) {
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([])
  const [showTerminal, setShowTerminal] = useState(false)
  const [clearType, setClearType] = useState<'all' | 'cache' | 'config' | 'route' | 'view'>('all')
  
  // Footer settings form
  const { data: footerData, setData: setFooterData, post: postFooter, processing: isSavingFooter, errors: footerErrors } = useForm<FooterSettings>({
    description: footer_settings?.description || '',
    social_links: footer_settings?.social_links || {
      facebook: '',
      twitter: '',
      instagram: '',
      linkedin: ''
    },
    quick_links: footer_settings?.quick_links || [],
    contact_email: footer_settings?.contact_email || '',
    contact_phone: footer_settings?.contact_phone || '',
    contact_address: footer_settings?.contact_address || '',
    copyright_text: footer_settings?.copyright_text || '',
    legal_links: footer_settings?.legal_links || []
  })

  const addTerminalLine = (type: TerminalLine['type'], content: string) => {
    const line: TerminalLine = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type,
      content,
      timestamp: new Date(),
    }
    setTerminalLines((prev) => [...prev, line])
    setShowTerminal(true)
  }

  const handleOptimize = async () => {
    setIsOptimizing(true)
    setTerminalLines([])
    addTerminalLine('command', '$ php artisan optimize')
    addTerminalLine('output', 'Starting optimization process...')

    try {
      const response = await fetch('/settings/application/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
      })

      const data = await response.json()

      if (data.success) {
        data.results?.forEach((result: { action: string; message: string; status: string }) => {
          if (result.status === 'success') {
            addTerminalLine('success', `✓ ${result.message}`)
          } else {
            addTerminalLine('error', `✗ ${result.message}`)
          }
        })
        addTerminalLine('success', 'Optimization completed successfully!')
      } else {
        addTerminalLine('error', `Error: ${data.message}`)
      }
    } catch (error) {
      addTerminalLine('error', `Failed to optimize: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsOptimizing(false)
    }
  }

  const handleClear = async () => {
    setIsClearing(true)
    setTerminalLines([])
    addTerminalLine('command', `$ php artisan cache:clear --type=${clearType}`)
    addTerminalLine('output', `Clearing ${clearType === 'all' ? 'all caches' : clearType + ' cache'}...`)

    try {
      const response = await fetch('/settings/application/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
        body: JSON.stringify({ type: clearType }),
      })

      const data = await response.json()

      if (data.success) {
        data.results?.forEach((result: { action: string; message: string; status: string }) => {
          if (result.status === 'success') {
            addTerminalLine('success', `✓ ${result.message}`)
          } else {
            addTerminalLine('error', `✗ ${result.message}`)
          }
        })
        addTerminalLine('success', 'Cache cleared successfully!')
        
        // Refresh page to update stats
        setTimeout(() => {
          router.reload({ only: ['cache_stats', 'storage_stats'] })
        }, 1000)
      } else {
        addTerminalLine('error', `Error: ${data.message}`)
      }
    } catch (error) {
      addTerminalLine('error', `Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsClearing(false)
    }
  }

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const handleFooterSave = (e: React.FormEvent) => {
    e.preventDefault()
    
    postFooter(route('application.footer.update'), {
      preserveScroll: true,
      onSuccess: () => {
        router.reload({ only: ['footer_settings'] })
      },
      onError: (errors) => {
        console.error('Footer save errors:', errors)
      }
    })
  }

  const addQuickLink = () => {
    setFooterData('quick_links', [...(footerData.quick_links || []), { title: '', url: '' }])
  }

  const removeQuickLink = (index: number) => {
    setFooterData('quick_links', footerData.quick_links?.filter((_, i) => i !== index) || [])
  }

  const updateQuickLink = (index: number, field: 'title' | 'url', value: string) => {
    const updatedLinks = footerData.quick_links?.map((link, i) => 
      i === index ? { ...link, [field]: value } : link
    ) || []
    setFooterData('quick_links', updatedLinks)
  }

  const addLegalLink = () => {
    setFooterData('legal_links', [...(footerData.legal_links || []), { title: '', url: '' }])
  }

  const removeLegalLink = (index: number) => {
    setFooterData('legal_links', footerData.legal_links?.filter((_, i) => i !== index) || [])
  }

  const updateLegalLink = (index: number, field: 'title' | 'url', value: string) => {
    const updatedLinks = footerData.legal_links?.map((link, i) => 
      i === index ? { ...link, [field]: value } : link
    ) || []
    setFooterData('legal_links', updatedLinks)
  }

  return (
    <SettingsLayout activeTab="application">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Application Settings</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage application performance, caches, and footer settings
          </p>
        </div>

        <Tabs defaultValue="performance" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="performance">
              <Zap className="h-4 w-4 mr-2" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="footer">
              <Layout className="h-4 w-4 mr-2" />
              Footer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-6 mt-6">

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-gray-200 dark:border-gray-800 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Cache Driver</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {cache_stats.driver || 'unknown'}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-gray-200 dark:border-gray-800 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Cache Size</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {storage_stats.cache_size_formatted || '0 B'}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-500/10 rounded-lg">
                    <HardDrive className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-gray-200 dark:border-gray-800 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Logs Size</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {storage_stats.logs_size_formatted || '0 B'}
                    </p>
                  </div>
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <Terminal className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Optimize Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Optimize Application</CardTitle>
                    <CardDescription>
                      Clear caches and rebuild optimized files for better performance
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    This will:
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                    <li>Clear all caches</li>
                    <li>Rebuild configuration cache</li>
                    <li>Rebuild route cache</li>
                    <li>Rebuild view cache</li>
                    <li>Optimize autoloader</li>
                  </ul>
                </div>
                <Button
                  onClick={handleOptimize}
                  disabled={isOptimizing}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                >
                  {isOptimizing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Optimize Application
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Clear Cache Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-red-600 to-red-500 rounded-lg">
                    <Trash2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Clear Cache</CardTitle>
                    <CardDescription>
                      Clear specific or all application caches
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cache Type
                  </label>
                  <select
                    value={clearType}
                    onChange={(e) => setClearType(e.target.value as typeof clearType)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Caches</option>
                    <option value="cache">Application Cache</option>
                    <option value="config">Config Cache</option>
                    <option value="route">Route Cache</option>
                    <option value="view">View Cache</option>
                  </select>
                </div>
                <Button
                  onClick={handleClear}
                  disabled={isClearing}
                  className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white"
                >
                  {isClearing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Cache
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Terminal Output */}
        <AnimatePresence>
          {showTerminal && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-gray-200 dark:border-gray-800 bg-gray-900 dark:bg-black">
                <CardHeader className="border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-5 w-5 text-green-400" />
                      <CardTitle className="text-green-400 font-mono text-sm">Terminal Output</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowTerminal(false)
                        setTerminalLines([])
                      }}
                      className="text-gray-400 hover:text-white"
                    >
                      Clear
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="p-4 font-mono text-sm max-h-96 overflow-y-auto">
                    <div className="space-y-1">
                      {terminalLines.map((line) => (
                        <motion.div
                          key={line.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-start gap-2"
                        >
                          <span className="text-gray-500 text-xs flex-shrink-0">
                            [{formatTimestamp(line.timestamp)}]
                          </span>
                          {line.type === 'command' && (
                            <span className="text-blue-400 flex-1">
                              <span className="text-green-400">$</span> {line.content}
                            </span>
                          )}
                          {line.type === 'output' && (
                            <span className="text-gray-300 flex-1">{line.content}</span>
                          )}
                          {line.type === 'success' && (
                            <span className="text-green-400 flex-1 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              {line.content}
                            </span>
                          )}
                          {line.type === 'error' && (
                            <span className="text-red-400 flex-1 flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                              {line.content}
                            </span>
                          )}
                        </motion.div>
                      ))}
                    </div>
                    {terminalLines.length === 0 && (
                      <div className="text-gray-500 text-center py-8">
                        <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Terminal output will appear here...</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Alert */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
            <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              <strong>Tip:</strong> Optimize your application regularly to maintain peak performance. 
              Clear caches when you make configuration changes or after deployments.
            </AlertDescription>
          </Alert>
        </motion.div>
          </TabsContent>

          <TabsContent value="footer" className="space-y-6 mt-6">
            <Card className="border-gray-200 dark:border-gray-800">
              <CardHeader>
                <CardTitle>Footer Settings</CardTitle>
                <CardDescription>
                  Customize the landing page footer content. All fields are optional.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={footerData.description || ''}
                      onChange={(e) => setFooterData('description', e.target.value)}
                      placeholder="Enter footer description..."
                      rows={4}
                      className="w-full"
                    />
                </div>

                {/* Social Links */}
                <div className="space-y-4">
                  <Label>Social Media Links</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="facebook">Facebook URL</Label>
                      <Input
                        id="facebook"
                        type="url"
                        value={footerData.social_links?.facebook || ''}
                        onChange={(e) => setFooterData('social_links', { ...footerData.social_links, facebook: e.target.value })}
                        placeholder="https://facebook.com/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="twitter">Twitter URL</Label>
                      <Input
                        id="twitter"
                        type="url"
                        value={footerData.social_links?.twitter || ''}
                        onChange={(e) => setFooterData(prev => ({
                          ...prev,
                          social_links: { ...prev.social_links, twitter: e.target.value }
                        }))}
                        placeholder="https://twitter.com/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instagram">Instagram URL</Label>
                      <Input
                        id="instagram"
                        type="url"
                        value={footerData.social_links?.instagram || ''}
                        onChange={(e) => setFooterData('social_links', { ...footerData.social_links, instagram: e.target.value })}
                        placeholder="https://instagram.com/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="linkedin">LinkedIn URL</Label>
                      <Input
                        id="linkedin"
                        type="url"
                        value={footerData.social_links?.linkedin || ''}
                        onChange={(e) => setFooterData('social_links', { ...footerData.social_links, linkedin: e.target.value })}
                        placeholder="https://linkedin.com/..."
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Links */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Quick Links</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addQuickLink}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Link
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {footerData.quick_links?.map((link, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Link Title"
                          value={link.title}
                          onChange={(e) => updateQuickLink(index, 'title', e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="URL"
                          value={link.url}
                          onChange={(e) => updateQuickLink(index, 'url', e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuickLink(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {(!footerData.quick_links || footerData.quick_links.length === 0) && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No quick links added yet.</p>
                    )}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-4">
                  <Label>Contact Information</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact_email">Email</Label>
                      <Input
                        id="contact_email"
                        type="email"
                        value={footerData.contact_email || ''}
                        onChange={(e) => setFooterData(prev => ({ ...prev, contact_email: e.target.value }))}
                        placeholder="support@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_phone">Phone</Label>
                      <Input
                        id="contact_phone"
                        type="tel"
                        value={footerData.contact_phone || ''}
                        onChange={(e) => setFooterData('contact_phone', e.target.value)}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_address">Address</Label>
                    <Textarea
                      id="contact_address"
                      value={footerData.contact_address || ''}
                      onChange={(e) => setFooterData(prev => ({ ...prev, contact_address: e.target.value }))}
                      placeholder="123 Street Name&#10;City, State ZIP"
                      rows={3}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Use line breaks for multi-line addresses</p>
                  </div>
                </div>

                {/* Copyright */}
                <div className="space-y-2">
                  <Label htmlFor="copyright_text">Copyright Text</Label>
                  <Input
                    id="copyright_text"
                    value={footerData.copyright_text || ''}
                    onChange={(e) => setFooterData('copyright_text', e.target.value)}
                    placeholder={`${new Date().getFullYear()} ${import.meta.env.VITE_APP_NAME}. All rights reserved.`}
                  />
                </div>

                {/* Legal Links */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Legal Links</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addLegalLink}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Link
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {footerData.legal_links?.map((link, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Link Title"
                          value={link.title}
                          onChange={(e) => updateLegalLink(index, 'title', e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="URL"
                          value={link.url}
                          onChange={(e) => updateLegalLink(index, 'url', e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLegalLink(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {(!footerData.legal_links || footerData.legal_links.length === 0) && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No legal links added yet.</p>
                    )}
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
                  <Button
                    onClick={handleFooterSave}
                    disabled={isSavingFooter}
                    type="submit"
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                  >
                    {isSavingFooter ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Footer Settings
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SettingsLayout>
  )
}

