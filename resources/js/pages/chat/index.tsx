// resources/js/pages/chat/index.tsx
import { ChatLayout } from "@/components/chat/chat-layout"
import { ChatProvider } from "@/providers/chat-provider"

export default function ChatPage() {
  return (
      <ChatProvider>
        <main className="h-screen w-full overflow-hidden">
          <ChatLayout />
        </main>
      </ChatProvider>
  )
}
