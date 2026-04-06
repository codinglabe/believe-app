"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/frontend/ui/card"
import { ArrowLeft, FileX, Search, Home, RefreshCw } from "lucide-react"
import { Link, router } from "@inertiajs/react"
import { useState, useEffect } from "react"

interface NotFoundPageProps {
  type?: "page" | "data"
  title?: string
  description?: string
  showBackButton?: boolean
  showHomeButton?: boolean
  showRefreshButton?: boolean
  customActions?: React.ReactNode
}

export function NotFoundPage({
  type = "page",
  title,
  description,
  showBackButton = true,
  showHomeButton = true,
  showRefreshButton = false,
  customActions,
}: NotFoundPageProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const pageConfig = {
    page: {
      title: title || "Page Not Found",
      description:
        description ||
        "Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or you entered the wrong URL.",
      icon: FileX,
      code: "404",
    },
    data: {
      title: title || "No Data Available",
      description:
        description ||
        "The content you're looking for hasn't been added yet. Please check back later or contact an administrator.",
      icon: Search,
      code: "Empty",
    },
  }

  const config = pageConfig[type]
  const IconComponent = config.icon

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto">
        <Card className="border-0 shadow-2xl bg-card/80 backdrop-blur-sm">
          <CardContent className="p-8 md:p-12 text-center">
            {/* Animated Icon */}
            <div className="relative mb-8">
              <div className="relative bg-primary/5 rounded-full p-6 inline-block animate-bounce">
                <IconComponent className="w-16 h-16 md:w-20 md:h-20 text-primary animate-pulse" />
              </div>
            </div>

            {/* Error Code */}
            <div className="mb-6">
              <span className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent animate-pulse">
                {config.code}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-4 animate-fade-in">{config.title}</h1>

            {/* Description */}
            <p className="text-muted-foreground text-base md:text-lg mb-8 max-w-md mx-auto leading-relaxed animate-fade-in-delay">
              {config.description}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up">
              {showBackButton && (
                <Button
                  onClick={() => router.visit(document.referrer || '/', { method: 'get' })}
                  variant="outline"
                  className="w-full sm:w-auto group hover:scale-105 transition-all duration-200"
                >
                  <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                  Go Back
                </Button>
              )}

              {showHomeButton && (
                <Button asChild className="w-full sm:w-auto group hover:scale-105 transition-all duration-200">
                  <Link href="/">
                    <Home className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                    Back to Home
                  </Link>
                </Button>
              )}

              {showRefreshButton && (
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="w-full sm:w-auto group hover:scale-105 transition-all duration-200"
                >
                  <RefreshCw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                  Refresh Page
                </Button>
              )}
            </div>

            {/* Custom Actions */}
            {customActions && <div className="mt-6 animate-fade-in-delay-2">{customActions}</div>}

            {/* Additional Help Text */}
            <div className="mt-8 pt-6 border-t border-border/50">
              <p className="text-sm text-muted-foreground">
                {type === "page" ? (
                  <>
                    Need help?{" "}
                    <Link href="/contact" className="text-primary hover:underline">
                      Contact support
                    </Link>{" "}
                    or check our{" "}
                    <Link href="/help" className="text-primary hover:underline">
                      help center
                    </Link>
                  </>
                ) : (
                  <>
                    If this seems like an error, please{" "}
                    <Link href="/contact" className="text-primary hover:underline">
                      contact an administrator
                    </Link>
                  </>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Floating Elements */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary/20 rounded-full animate-float" />
        <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-primary/10 rounded-full animate-float-delay" />
        <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-primary/30 rounded-full animate-float-delay-2" />
      </div>
    </div>
  )
}
