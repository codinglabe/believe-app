"use client"
import { Sidebar } from "./sidebar"
import { ChatArea } from "./chat-area"
import { useIsMobile } from "@/hooks/use-mobile"
import { Sheet, SheetContent, SheetTrigger } from "@/components/chat/ui/sheet"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/chat/ui/resizable"
import { Button } from "@/components/chat/ui/button"
import { Menu, MessageCircle } from 'lucide-react'
import { use, useState } from "react"
import { useChat } from "@/providers/chat-provider"
import { NotificationBell } from "../notification-bell"
import { usePage } from "@inertiajs/react"

export function ChatLayout() {
    const auth = usePage().props.auth;
  const isMobile = useIsMobile()
  const [showDetailsPanel, setShowDetailsPanel] = useState(false)
  const { activeRoom } = useChat()

  const toggleDetailsPanel = () => {
    setShowDetailsPanel((prev) => !prev)
  }

  // Welcome screen component
  const WelcomeScreen = () => (
    <div className="flex-1 flex items-center justify-center bg-muted/20">
      <div className="text-center max-w-md">
        <MessageCircle className="h-24 w-24 text-muted-foreground mx-auto mb-6" />
        <h2 className="text-2xl font-semibold mb-4">Welcome to Chat</h2>
        <p className="text-muted-foreground mb-6">
          Select a conversation from the sidebar to start chatting, or create a new group to get started.
        </p>
        <div className="text-sm text-muted-foreground">
          <p>• Click on any user to start a direct conversation</p>
          <p>• Join existing groups or create new ones</p>
          <p>• All your messages are encrypted and secure</p>
        </div>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <Sheet>
            <div className="h-screen flex flex-col">

                {activeRoom ? (
                    <>
                    <div className="flex items-center p-4 border-b">
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open sidebar">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <h1 className="ml-3 text-lg font-semibold">Messages</h1>
            </div>
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
                        </>
          ) : (
                        <div className="flex items-center pe-4 justify-between border-b border-border/50">
                            <div className="flex items-center p-4 border-b">
              <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Open sidebar">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <h1 className="ml-3 text-lg font-semibold">Messages</h1>
                            </div>
                            <div>
                                <NotificationBell userId={auth.user.id}/>
                            </div>
            </div>
          )}

          {!activeRoom && <WelcomeScreen />}
        </div>

        <SheetContent side="left" className="p-0 w-80">
          <Sidebar />
        </SheetContent>

        <Sheet open={showDetailsPanel} onOpenChange={setShowDetailsPanel}>
          <SheetContent side="right" className="p-0 w-80">
            {/* Placeholder for ChatDetailsPanel */}
          </SheetContent>
        </Sheet>
      </Sheet>
    )
  }

  return (
    <ResizablePanelGroup direction="horizontal" className="h-screen max-w-full">
      <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
        <Sidebar />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={70} minSize={50}>
        {activeRoom ? (
          <ChatArea />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Select a chat to start messaging
          </div>
        )}
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
