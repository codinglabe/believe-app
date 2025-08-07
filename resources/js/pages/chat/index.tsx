// resources/js/pages/chat/index.tsx
import { ChatLayout } from "@/components/chat/chat-layout"
import AppLayout from "@/layouts/app-layout"
import { ChatProvider } from "@/providers/chat-provider"
import { Head } from '@inertiajs/react'

export default function ChatPage() {
  return (
    <AppLayout>
      <Head title="Chat" />
      <ChatProvider>
        <main className="flex h-screen w-full overflow-hidden">
          <ChatLayout />
        </main>
      </ChatProvider>
    </AppLayout>
  )
}
