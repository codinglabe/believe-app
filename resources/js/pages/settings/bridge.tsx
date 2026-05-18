"use client"

import React from "react"
import { Head, useForm } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
import { Settings, Eye, EyeOff, Webhook } from "lucide-react"
import SettingsLayout from "@/layouts/settings/layout"

interface SettingsProps {
  bridge_mode_environment: "sandbox" | "live"
  bridge_sandbox_api_key: string | null
  bridge_sandbox_webhook_url: string | null
  bridge_sandbox_webhook_id: string | null
  bridge_sandbox_webhook_public_key: string | null
  bridge_sandbox_badge_url: string | null
  bridge_live_api_key: string | null
  bridge_live_webhook_id: string | null
  bridge_live_webhook_public_key: string | null
  bridge_live_badge_url: string | null
  app_url: string
}

interface Props {
  settings: SettingsProps
}

export default function BridgeSettings({ settings }: Props) {
  const defaultWebhookUrl = settings.app_url ? `${settings.app_url}/webhooks/bridge` : `${window.location.origin}/webhooks/bridge`
  
  const { data, setData, post, processing, errors } = useForm({
    bridge_mode_environment: settings.bridge_mode_environment || "sandbox",
    bridge_sandbox_api_key: settings.bridge_sandbox_api_key || "",
    bridge_sandbox_webhook_url: settings.bridge_sandbox_webhook_url || defaultWebhookUrl,
    bridge_sandbox_badge_url: settings.bridge_sandbox_badge_url || "",
    bridge_live_api_key: settings.bridge_live_api_key || "",
    bridge_live_badge_url: settings.bridge_live_badge_url || "",
  })

  // State for password visibility
  const [showSandboxApiKey, setShowSandboxApiKey] = React.useState(false)
  const [showLiveApiKey, setShowLiveApiKey] = React.useState(false)
  
  // Current Bridge environment
  const [bridgeEnvironment, setBridgeEnvironment] = React.useState<"sandbox" | "live">(
    settings.bridge_mode_environment || "sandbox"
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post("/settings/bridge", {
      onSuccess: () => {
        showSuccessToast("Bridge settings updated successfully! Webhooks have been created/activated automatically.")
      },
      onError: (formErrors) => {
        showErrorToast("Failed to update settings. Please check the form.")
        console.error(formErrors)
      },
    })
  }

  return (
    <SettingsLayout activeTab="bridge">
      <Head title="Bridge Settings" />
      <div className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900 dark:text-white">
                <Webhook className="h-5 w-5" />
                Bridge Wallet Settings
              </CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Configure Bridge API credentials. Webhooks will be created and activated automatically when you save.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Environment Selection */}
              <div className="space-y-2 border-b pb-4">
                <Label htmlFor="bridge_environment">Environment</Label>
                <Select
                  value={bridgeEnvironment}
                  onValueChange={(value: "sandbox" | "live") => {
                    setBridgeEnvironment(value)
                    setData("bridge_mode_environment", value)
                  }}
                >
                  <SelectTrigger id="bridge_environment">
                    <SelectValue placeholder="Select environment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox (Test)</SelectItem>
                    <SelectItem value="live">Live (Production)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Select Sandbox for test mode or Live for production. Webhooks will be created/activated automatically when you save.
                </p>
              </div>

              {/* Sandbox Credentials */}
              {bridgeEnvironment === "sandbox" && (
                <div className="space-y-4">
                  {/* Webhook Info */}
                  {settings.bridge_sandbox_webhook_id && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800 space-y-2">
                      <p className="text-sm font-medium text-green-700 dark:text-green-300">
                        ✓ Webhook Configured
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        <strong>Webhook ID:</strong> {settings.bridge_sandbox_webhook_id}
                      </p>
                      {settings.bridge_sandbox_webhook_public_key && (
                        <p className="text-xs text-green-600 dark:text-green-400 break-all">
                          <strong>Public Key:</strong> {settings.bridge_sandbox_webhook_public_key.substring(0, 50)}...
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="bridge_sandbox_api_key">Sandbox API Key</Label>
                    <div className="relative">
                      <Input
                        id="bridge_sandbox_api_key"
                        type={showSandboxApiKey ? "text" : "password"}
                        value={data.bridge_sandbox_api_key}
                        onChange={(e) => setData("bridge_sandbox_api_key", e.target.value)}
                        className="pr-10"
                        placeholder="Enter Sandbox API Key (sk-test-...)"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowSandboxApiKey((prev) => !prev)}
                      >
                        {showSandboxApiKey ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                    {errors.bridge_sandbox_api_key && (
                      <p className="text-sm text-red-500 mt-1">{errors.bridge_sandbox_api_key}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Your Bridge Sandbox API key. Get it from your Bridge dashboard.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bridge_sandbox_webhook_url">Sandbox Webhook URL</Label>
                    <Input
                      id="bridge_sandbox_webhook_url"
                      type="url"
                      value={data.bridge_sandbox_webhook_url}
                      onChange={(e) => setData("bridge_sandbox_webhook_url", e.target.value)}
                      placeholder="https://your-domain.com/webhooks/bridge"
                    />
                    {errors.bridge_sandbox_webhook_url && (
                      <p className="text-sm text-red-500 mt-1">{errors.bridge_sandbox_webhook_url}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Custom webhook URL for sandbox environment. Defaults to your website URL. You can use a tunnel URL (e.g., ngrok) for local development.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bridge_sandbox_badge_url">Sandbox Badge URL</Label>
                    <Input
                      id="bridge_sandbox_badge_url"
                      type="url"
                      value={data.bridge_sandbox_badge_url}
                      onChange={(e) => setData("bridge_sandbox_badge_url", e.target.value)}
                      placeholder="https://your-domain.com/badge.png"
                    />
                    {errors.bridge_sandbox_badge_url && (
                      <p className="text-sm text-red-500 mt-1">{errors.bridge_sandbox_badge_url}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Badge URL for sandbox environment. This is the URL to your badge image that will be displayed in Bridge wallet interfaces.
                    </p>
                  </div>
                </div>
              )}

              {/* Live Credentials */}
              {bridgeEnvironment === "live" && (
                <div className="space-y-4">
                  {/* Webhook Info */}
                  {settings.bridge_live_webhook_id && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800 space-y-2">
                      <p className="text-sm font-medium text-green-700 dark:text-green-300">
                        ✓ Webhook Configured
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        <strong>Webhook ID:</strong> {settings.bridge_live_webhook_id}
                      </p>
                      {settings.bridge_live_webhook_public_key && (
                        <p className="text-xs text-green-600 dark:text-green-400 break-all">
                          <strong>Public Key:</strong> {settings.bridge_live_webhook_public_key.substring(0, 50)}...
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="bridge_live_api_key">Live API Key</Label>
                    <div className="relative">
                      <Input
                        id="bridge_live_api_key"
                        type={showLiveApiKey ? "text" : "password"}
                        value={data.bridge_live_api_key}
                        onChange={(e) => setData("bridge_live_api_key", e.target.value)}
                        className="pr-10"
                        placeholder="Enter Live API Key (sk-live-...)"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowLiveApiKey((prev) => !prev)}
                      >
                        {showLiveApiKey ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                    {errors.bridge_live_api_key && (
                      <p className="text-sm text-red-500 mt-1">{errors.bridge_live_api_key}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Your Bridge Live API key. Get it from your Bridge dashboard.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bridge_live_badge_url">Live Badge URL</Label>
                    <Input
                      id="bridge_live_badge_url"
                      type="url"
                      value={data.bridge_live_badge_url}
                      onChange={(e) => setData("bridge_live_badge_url", e.target.value)}
                      placeholder="https://your-domain.com/badge.png"
                    />
                    {errors.bridge_live_badge_url && (
                      <p className="text-sm text-red-500 mt-1">{errors.bridge_live_badge_url}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Badge URL for live environment. This is the URL to your badge image that will be displayed in Bridge wallet interfaces.
                    </p>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Note:</strong> When you save your API keys, the system will automatically:
                </p>
                <ul className="text-xs text-blue-600 dark:text-blue-400 mt-2 list-disc list-inside space-y-1">
                  <li>Create a webhook endpoint at <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{window.location.origin}/webhooks/bridge</code></li>
                  <li>Subscribe to all Bridge event categories (customer, kyc_link, transfer, etc.)</li>
                  <li>Activate the webhook automatically</li>
                  <li>Store the webhook ID and public key for signature verification</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={processing} className="w-full sm:w-auto">
              <Settings className="mr-2 h-4 w-4" />
              {processing ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </div>
    </SettingsLayout>
  )
}

