"use client"
import { Sidebar } from "./sidebar"
import { ChatArea } from "./chat-area"
import { ChatDetailsPanel } from "./chat-details-panel"
import { useIsMobile } from "@/hooks/use-mobile"
import { Sheet, SheetContent, SheetTrigger } from "@/components/chat/ui/sheet"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/chat/ui/resizable"
import { Button } from "@/components/chat/ui/button"
import { Menu } from "lucide-react"
import { useState } from "react"

export function ChatLayout() {
  const isMobile = useIsMobile()
  const [showDetailsPanel, setShowDetailsPanel] = useState(false)

  const toggleDetailsPanel = () => {
    setShowDetailsPanel((prev) => !prev)
  }

  if (isMobile) {
    return (
      <Sheet>
        <div className="h-screen flex flex-col">
          <ChatArea
            mobileMenuButton={
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open sidebar">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            }
            toggleDetailsPanel={() => setShowDetailsPanel(true)} // Always open sheet on mobile
          />
        </div>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar />
        </SheetContent>
        <Sheet open={showDetailsPanel} onOpenChange={setShowDetailsPanel}>
          <SheetContent side="right" className="p-0 w-64">
            <ChatDetailsPanel onClose={() => setShowDetailsPanel(false)} />
          </SheetContent>
        </Sheet>
      </Sheet>
    )
  }

  return (
    <ResizablePanelGroup direction="horizontal" className="h-screen">
      <ResizablePanel defaultSize={20} minSize={15} maxSize={25}>
        <Sidebar />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={55}>
        <ChatArea toggleDetailsPanel={toggleDetailsPanel} />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel
        defaultSize={25}
        minSize={20}
        maxSize={30}
        collapsedSize={0}
        collapsible={true}
        onCollapse={() => setShowDetailsPanel(false)}
        onExpand={() => setShowDetailsPanel(true)}
        defaultCollapsed={!showDetailsPanel}
      >
        <ChatDetailsPanel onClose={toggleDetailsPanel} />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
