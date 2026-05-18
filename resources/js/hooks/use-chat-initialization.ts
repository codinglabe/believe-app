"use client"

import { useEffect } from "react"
import { useChat } from "@/providers/chat-provider"

interface ChatInitiation {
    seller_id: number
    seller_name: string
    gig_slug: string
    gig_title: string
    initiated_at: string
}

export function useChatInitialization() {
    const { createDirectChat, setActiveRoom, chatRooms } = useChat()

    useEffect(() => {
        const initializeChat = async () => {
            try {
                const chatInitiationData = sessionStorage.getItem("chat_initiation")

                if (!chatInitiationData) return

                const data: ChatInitiation = JSON.parse(chatInitiationData)
                const { seller_id } = data

                console.log("[v0] Chat initialization triggered for seller:", seller_id)

                const room = await createDirectChat(seller_id)

                if (room) {
                    console.log("[v0] Chat room created/retrieved:", room.id)
                    setActiveRoom(room)

                    sessionStorage.removeItem("chat_initiation")
                }
            } catch (error) {
                console.error("[v0] Failed to initialize chat with seller:", error)
            }
        }

        // Debounce initialization to avoid race conditions
        const timer = setTimeout(() => {
            initializeChat()
        }, 500)

        return () => clearTimeout(timer)
    }, [createDirectChat, setActiveRoom])
}
