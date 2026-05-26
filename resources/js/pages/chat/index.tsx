// resources/js/pages/chat/index.tsx
import { ChatLayout } from "@/components/chat/chat-layout"
import { ChatProvider } from "@/providers/chat-provider"
import { usePage } from "@inertiajs/react";
import { useEffect } from "react";
import toast, { Toaster } from 'react-hot-toast';

export default function ChatPage() {
    const props = usePage();
    useEffect(() => {
        const success = props.props?.success;
        const error = props.props?.error;
        if (typeof success === 'string' && success.trim() !== '') toast.success(success);
        if (typeof error === 'string' && error.trim() !== '') toast.error(error);
    }, [props.props?.success, props.props?.error])

    return (
      <ChatProvider>
          <Toaster
                position="top-right"
                reverseOrder={false}
                gutter={8}
                containerClassName=""
                containerStyle={{}}
                toastOptions={{
                    className: "",
                    duration: 4000,
                    style: {
                        background: "hsl(var(--background))",
                        color: "hsl(var(--foreground))",
                        border: "1px solid hsl(var(--border))",
                    },
                    success: {
                        duration: 4000,
                        iconTheme: {
                            primary: "hsl(var(--primary))",
                            secondary: "hsl(var(--primary-foreground))",
                        },
                    },
                    error: {
                        duration: 5000,
                        iconTheme: {
                            primary: "#ef4444",
                            secondary: "#fff",
                        },
                    },
                }}
            />
        <main className="h-screen h-[100dvh] w-full overflow-hidden">
          <ChatLayout />
        </main>
            </ChatProvider>
  )
}
