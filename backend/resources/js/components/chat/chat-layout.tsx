"use client"
import { Sidebar } from "./sidebar"
import { ChatArea } from "./chat-area"
import { ChatHeader } from "./chat-header"
import { ChatSidebarHeader } from "./chat-sidebar-header"
import { useIsMobile } from "@/hooks/use-mobile"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/frontend/ui/resizable"
import { Button } from "@/components/ui/button"
import { Menu, MessageCircle } from "lucide-react"
import { useState, useEffect } from "react"
import { useChat } from "@/providers/chat-provider"
import { usePage } from "@inertiajs/react"
import { useChatInitialization } from "@/hooks/use-chat-initialization"

export function ChatLayout() {
  const auth = usePage().props.auth
  const isMobile = useIsMobile()
  const [showDetailsPanel, setShowDetailsPanel] = useState(false)
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

  const toggleDetailsPanel = () => {
    setShowDetailsPanel((prev) => !prev)
  }

  const WelcomeScreen = () => (
    <div className="flex-1 flex items-center justify-center bg-muted/20">
      <div className="text-center max-w-md px-4">
        <MessageCircle className="h-24 w-24 text-muted-foreground mx-auto mb-6" />
        <h2 className="text-2xl font-semibold mb-4">Welcome to Messages</h2>
        <p className="text-muted-foreground mb-6">
          Select a conversation from the sidebar to start chatting with sellers
        </p>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>📞 Click on any seller to open direct conversation</p>
          <p>💬 Start messaging right away</p>
          <p>🔒 All messages are secure and encrypted</p>
        </div>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <div className="h-[100dvh] flex flex-col overflow-hidden bg-background">
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
              toggleDetailsPanel={() => setShowDetailsPanel(true)}
            />
          ) : (
            <WelcomeScreen />
          )}

          {/* Mobile Sidebar Sheet */}
          <SheetContent side="left" className="p-0 w-80 flex flex-col">
            <ChatSidebarHeader onClose={() => setSidebarOpen(false)} />
            <div className="flex-1 overflow-auto">
              <Sidebar />
            </div>
          </SheetContent>
        </div>
      </Sheet>
    )
  }

  return (
    <ResizablePanelGroup direction="horizontal" className="h-screen max-w-full bg-background">
      {/* Sidebar Panel */}
      <ResizablePanel defaultSize={28} minSize={20} maxSize={35} className="hidden md:block">
        <div className="flex flex-col h-full">
          <ChatSidebarHeader />
          <div className="flex-1 overflow-auto border-r border-border/50">
            <Sidebar />
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Chat Panel */}
      <ResizablePanel defaultSize={72} minSize={50}>
        <div className="flex flex-col h-full">
          <ChatHeader unreadCount={unreadCount} />
          {activeRoom ? <ChatArea /> : <WelcomeScreen />}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
