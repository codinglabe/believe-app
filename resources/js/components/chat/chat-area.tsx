"use client"

import React, { useEffect, useRef } from "react"
import { useChat } from "@/providers/chat-provider"
import { MessageList } from "@/components/chat/message-list"
import { MessageInput } from "@/components/chat/message-input"
import { UserAvatar } from "@/components/chat/user-avatar"
import { TypingIndicator } from "@/components/chat/typing-indicator"
import { Button } from "@/components/chat/ui/button"
import { InfoIcon, UsersIcon } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/chat/ui/sheet"
import { ChatDetailsPanel } from "@/components/chat/chat-details-panel"

export function ChatArea() {
  const { activeRoom, currentUser, typingUsers, leaveRoom, joinRoom } = useChat()
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = React.useState(false)

  if (!activeRoom) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Select a chat to start messaging
      </div>
    )
  }

  const isMember = activeRoom.members.some(member => member.id === currentUser.id);

  // Determine chat header name for direct chats
  const chatHeaderName = activeRoom.type === 'direct'
    ? activeRoom.members.find(member => member.id !== currentUser.id)?.name || 'Direct Chat'
    : activeRoom.name;

  const chatHeaderAvatar = activeRoom.type === 'direct'
    ? activeRoom.members.find(member => member.id !== currentUser.id)?.avatar
    : activeRoom.image;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <UserAvatar user={{ name: chatHeaderName, avatar: chatHeaderAvatar || '/placeholder.svg?height=32&width=32' }} className="h-9 w-9" />
          <div>
            <h3 className="font-semibold text-lg">{chatHeaderName}</h3>
            {activeRoom.type === 'public' && (
              <p className="text-sm text-muted-foreground">{activeRoom.members.length} members</p>
            )}
            {activeRoom.type === 'private' && (
              <p className="text-sm text-muted-foreground">Private Group ({activeRoom.members.length} members)</p>
            )}
            {activeRoom.type === 'direct' && (
              <p className="text-sm text-muted-foreground">Direct Message</p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsDetailsPanelOpen(true)}>
          <InfoIcon className="h-5 w-5" />
        </Button>
      </div>

      <MessageList />

      <div className="p-4 border-t">
        {typingUsers.length > 0 && (
          <div className="mb-2 text-sm text-muted-foreground">
            <TypingIndicator users={typingUsers} />
          </div>
        )}
        {!isMember && activeRoom.type === 'public' ? (
          <div className="flex justify-center">
            <Button onClick={() => joinRoom(activeRoom.id)}>Join Public Room</Button>
          </div>
        ) : (
          <MessageInput />
        )}
      </div>

      <Sheet open={isDetailsPanelOpen} onOpenChange={setIsDetailsPanelOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle>Chat Details</SheetTitle>
            <SheetDescription>Information and settings for this chat.</SheetDescription>
          </SheetHeader>
          <ChatDetailsPanel room={activeRoom} onClose={() => setIsDetailsPanelOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
