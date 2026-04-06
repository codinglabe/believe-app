"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"

interface ScrollAreaProps {
  children: React.ReactNode
  maxHeight?: string
  className?: string
  autoScroll?: boolean
  showScrollbar?: boolean
  orientation?: "vertical" | "horizontal" | "both"
}

export default function ScrollArea({
  children,
  maxHeight = "400px",
  className = "",
  autoScroll = false,
  showScrollbar = true,
  orientation = "vertical",
}: ScrollAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true)

  // Auto-scroll to bottom when new content is added
  useEffect(() => {
    if (autoScroll && isScrolledToBottom && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [children, autoScroll, isScrolledToBottom])

  // Check if user is at bottom
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10
      setIsScrolledToBottom(isAtBottom)
    }
  }

  const getScrollbarClasses = () => {
    if (!showScrollbar) return "scrollbar-hide"

    const baseClasses = "scrollbar-thin scrollbar-track-transparent"

    if (orientation === "horizontal") {
      return `${baseClasses} scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500 overflow-x-auto overflow-y-hidden`
    } else if (orientation === "both") {
      return `${baseClasses} scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500 overflow-auto`
    } else {
      return `${baseClasses} scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500 overflow-y-auto overflow-x-hidden`
    }
  }

  return (
    <div
      ref={scrollRef}
      className={`${getScrollbarClasses()} ${className}`}
      style={{ maxHeight }}
      onScroll={handleScroll}
    >
      {children}
    </div>
  )
}
