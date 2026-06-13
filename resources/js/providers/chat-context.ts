import { createContext, useContext } from "react"

import type { ChatContextType } from "./chat-provider"

export const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function useChat(): ChatContextType {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider")
  }
  return context
}
