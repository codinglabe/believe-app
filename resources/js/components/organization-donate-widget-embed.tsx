"use client"

import { useCallback, useState } from "react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Alert, AlertDescription } from "@/components/frontend/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/frontend/ui/tabs"
import { Check, Copy, Code2, ExternalLink, Eye } from "lucide-react"

export type DonateWidgetEmbedProps = {
  available: boolean
  slug: string | null
  embedUrl: string | null
  iframeCode: string | null
}

export function OrganizationDonateWidgetEmbed({ available, slug, embedUrl, iframeCode }: DonateWidgetEmbedProps) {
  const [copied, setCopied] = useState(false)

  const copyEmbedCode = useCallback(async () => {
    if (!iframeCode) {
      return
    }

    try {
      await navigator.clipboard.writeText(iframeCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = iframeCode
      textarea.style.position = "fixed"
      textarea.style.left = "-9999px"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    }
  }, [iframeCode])

  return (
    <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-gray-800 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
          <Code2 className="h-5 w-5 text-purple-600" />
          Donation Widget
        </CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400">
          Embed the BelieveCash donation widget on your website. Supporters can donate and earn Believe Reward Points
          (BRP).
        </CardDescription>
      </CardHeader>

      <CardContent>
        {!available ? (
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
            <AlertDescription className="text-amber-900 dark:text-amber-200 text-sm">
              Your donation widget will be available after your organization is approved
              {slug ? ` (slug: ${slug})` : ""}.
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs defaultValue="code" className="w-full">
            <TabsList className="grid w-full max-w-xs grid-cols-2 mb-4">
              <TabsTrigger value="code" className="gap-2">
                <Code2 className="h-4 w-4" />
                Code
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="code" className="mt-0 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Paste this iframe on your website to embed the donation widget.
                </p>
                <Button
                  type="button"
                  onClick={copyEmbedCode}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy embed code
                    </>
                  )}
                </Button>
              </div>

              <pre className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80 p-4 text-xs leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-all">
                {iframeCode}
              </pre>
            </TabsContent>

            <TabsContent value="preview" className="mt-0 space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Widget URL:{" "}
                <a
                  href={embedUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 inline-flex items-center gap-1"
                >
                  {embedUrl}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-950 dark:to-purple-950/20">
                <div className="p-3 sm:p-4">
                  <iframe
                    src={embedUrl ?? undefined}
                    title="Donate with BelieveCash preview"
                    width="100%"
                    height="620"
                    className="block w-full max-w-[980px] mx-auto border-0 rounded-2xl"
                    loading="lazy"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}
