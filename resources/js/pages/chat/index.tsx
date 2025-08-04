import { ChatLayout } from "@/components/chat/chat-layout"
import AppLayout from "@/layouts/app-layout"
import { ChatProvider } from "@/providers/chat-provider"

export default function ChatPage() {
    return (
    <AppLayout>
        <ChatProvider>
        <main className="flex h-screen w-full overflow-hidden">
            <ChatLayout />
        </main>
        </ChatProvider>
    </AppLayout>
  )
}
