"use client"
import { Sidebar } from "./sidebar"
import { ChatArea } from "./chat-area"
import { ChatDetailsPanel } from "./chat-details-panel"
import { useIsMobile } from "@/hooks/use-mobile"
import { Sheet, SheetContent, SheetTrigger } from "@/components/chat/ui/sheet"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/chat/ui/resizable"
import { Button } from "@/components/chat/ui/button"
import { Menu, MessageCircle } from 'lucide-react'
import { useState } from "react"
import { useChat } from "@/providers/chat-provider"

export function ChatLayout() {
  const isMobile = useIsMobile()
  const [showDetailsPanel, setShowDetailsPanel] = useState(false)
  const { selectedRoomId } = useChat()

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
          {selectedRoomId ? (
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
            <div className="flex items-center p-4 border-b">
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open sidebar">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <h1 className="ml-3 text-lg font-semibold">Messages</h1>
            </div>
          )}

          {!selectedRoomId && <WelcomeScreen />}
        </div>

        <SheetContent side="left" className="p-0 w-80">
          <Sidebar />
        </SheetContent>

        <Sheet open={showDetailsPanel} onOpenChange={setShowDetailsPanel}>
          <SheetContent side="right" className="p-0 w-80">
            <ChatDetailsPanel onClose={() => setShowDetailsPanel(false)} />
          </SheetContent>
        </Sheet>
      </Sheet>
    )
  }

  return (
    <ResizablePanelGroup direction="horizontal" className="h-screen">
      <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
        <Sidebar />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={selectedRoomId ? 55 : 75}>
        {selectedRoomId ? (
          <ChatArea toggleDetailsPanel={toggleDetailsPanel} />
        ) : (
          <WelcomeScreen />
        )}
      </ResizablePanel>
      {selectedRoomId && (
        <>
          <ResizableHandle withHandle />
          <ResizablePanel
            defaultSize={20}
            minSize={15}
            maxSize={30}
            collapsedSize={0}
            collapsible={true}
            onCollapse={() => setShowDetailsPanel(false)}
            onExpand={() => setShowDetailsPanel(true)}
            defaultCollapsed={!showDetailsPanel}
          >
            <ChatDetailsPanel onClose={toggleDetailsPanel} />
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  )
}
