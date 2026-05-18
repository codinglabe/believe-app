"use client"
import { Sidebar } from "./sidebar"
import { ChatArea } from "./chat-area"
import { ChatHeader } from "./chat-header"
import { ChatSidebarHeader } from "./chat-sidebar-header"
import { useIsMobile } from "@/hooks/use-mobile"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/frontend/ui/resizable"
import { Button } from "@/components/ui/button"
import { Menu, MessageCircle, Sparkles } from "lucide-react"
import { useState, useEffect } from "react"
import { useChat } from "@/providers/chat-provider"
import { usePage } from "@inertiajs/react"
import { useChatInitialization } from "@/hooks/use-chat-initialization"
import { motion } from "framer-motion"
import { chatAmbientBg, chatGradientBg, chatGradientText } from "./chat-brand"
import { cn } from "@/lib/utils"

export function ChatLayout() {
  const auth = usePage().props.auth
  const isMobile = useIsMobile()
  const [unreadCount, setUnreadCount] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { activeRoom } = useChat()

  useChatInitialization()

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch("/service-hub/chats/unreadcountget")
        if (response.ok) {
          const data = await response.json()
          setUnreadCount(data.total_unread || 0)
        }
      } catch (error) {
        console.error("Error fetching unread count:", error)
      }
    }

    if (auth?.user?.id) {
      fetchUnreadCount()
      const interval = setInterval(fetchUnreadCount, 30000)
      return () => clearInterval(interval)
    }
  }, [auth?.user?.id])

  const WelcomeScreen = () => (
    <div
      className={`relative flex-1 flex min-h-0 items-center justify-center overflow-hidden px-4 py-8 ${chatAmbientBg}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-25"
        aria-hidden
      >
        <div
          className={`absolute -left-1/4 top-0 h-[min(420px,50vh)] w-[min(420px,80vw)] rounded-full blur-3xl ${chatGradientBg} opacity-20`}
        />
        <div className="absolute -right-1/4 bottom-0 h-[min(380px,45vh)] w-[min(380px,75vw)] rounded-full bg-blue-600/20 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-lg text-center"
      >
        <motion.div
          initial={{ scale: 0.92 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600/15 to-blue-600/15 shadow-lg ring-1 ring-purple-500/20 dark:from-purple-500/10 dark:to-blue-500/10"
        >
          <MessageCircle className="h-10 w-10 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
        </motion.div>

        <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${chatGradientText}`}>
          Welcome to Messages
        </h2>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
          Select a conversation from the sidebar to start chatting with sellers and groups.
        </p>

        <ul className="mt-8 flex flex-col gap-3 text-left text-sm sm:text-[0.9375rem] list-none p-0 m-0">
          {[
            { icon: Sparkles, text: "Open a seller or group from the list" },
            { icon: MessageCircle, text: "Reply in real time with a polished composer" },
            { icon: Menu, text: "On mobile, use the menu to browse conversations" },
          ].map(({ icon: Icon, text }, i) => (
            <li key={text}>
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 + i * 0.08, duration: 0.35 }}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3 backdrop-blur-sm shadow-sm"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${chatGradientBg} text-white shadow-sm`}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <span className="text-foreground/90">{text}</span>
              </motion.div>
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  )

  if (isMobile) {
    return (
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <div className={`h-[100dvh] flex flex-col overflow-hidden bg-background ${chatAmbientBg}`}>
          <ChatHeader
            unreadCount={unreadCount}
            mobileMenuButton={
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open sidebar">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            }
          />

          {/* Chat Content Area */}
          {activeRoom ? (
            <ChatArea
              mobileMenuButton={
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open sidebar">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
              }
            />
          ) : (
            <WelcomeScreen />
          )}

          {/* Mobile Sidebar Sheet */}
          <SheetContent
            side="left"
            className={cn(
              "flex h-full w-[min(20rem,calc(100vw-1rem))] max-w-[100vw] flex-col gap-0 overflow-hidden border-r border-purple-500/15 bg-background p-0",
              /* ui/sheet always adds a default X; ChatSidebarHeader already has one on mobile */
              "[&>button.absolute]:hidden",
            )}
          >
            <ChatSidebarHeader onClose={() => setSidebarOpen(false)} />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <Sidebar />
            </div>
          </SheetContent>
        </div>
      </Sheet>
    )
  }

  return (
    <ResizablePanelGroup
      direction="horizontal"
      autoSaveId="believe-wallet-chat-layout"
      className={`h-screen w-full max-w-full min-h-0 bg-background ${chatAmbientBg}`}
    >
      {/* Sidebar Panel — min/max % keep list usable when resized; min-w-0 prevents flex overflow clipping */}
      <ResizablePanel
        defaultSize={30}
        minSize={22}
        maxSize={46}
        className="hidden min-w-0 md:block"
      >
        <div className="flex h-full min-w-0 w-full flex-col overflow-hidden border-r border-border/50">
          <ChatSidebarHeader />
          {/* Only the list scrolls inside Sidebar — avoid outer overflow-auto (scrollbar beside headers). */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <Sidebar />
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle
        withHandle
        className="relative z-10 w-2 max-w-[12px] shrink-0 bg-border/80 transition-colors hover:bg-purple-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/35 focus-visible:ring-offset-0"
      />

      {/* Chat Panel */}
      <ResizablePanel defaultSize={70} minSize={54} maxSize={78} className="min-w-0">
        <div className="flex h-full min-w-0 flex-col">
          <ChatHeader unreadCount={unreadCount} />
          {activeRoom ? <ChatArea /> : <WelcomeScreen />}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
