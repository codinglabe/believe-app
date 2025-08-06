"use client"

import { ScrollArea } from "@/components/chat/ui/scroll-area"
import { Button } from "@/components/chat/ui/button"
import { X, ImageIcon, FileText, Users, Settings } from "lucide-react"
import { UserAvatar } from "./user-avatar"
import { Separator } from "@/components/chat/ui/separator"
import { useChat } from "@/providers/chat-provider"
import { cn } from "@/lib/utils"
import { useState } from "react"
import ImageViewerModal from "./image-viewer-modal"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/chat/ui/accordion"

interface ChatDetailsPanelProps {
  onClose: () => void
  className?: string
}

export function ChatDetailsPanel({ onClose, className }: ChatDetailsPanelProps) {
  const { chatRooms, selectedRoomId, currentUser, messages } = useChat()
  const selectedRoom = chatRooms?.find((room) => room.id === selectedRoomId)

  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [imagesForViewer, setImagesForViewer] = useState<{ url: string; name: string }[]>([])

  if (!selectedRoom) {
    return (
      <div className={cn("flex flex-col h-full border-l bg-background p-4", className)}>
        <div className="flex items-center justify-between pb-4 border-b">
          <h2 className="text-lg font-semibold">Details</h2>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">No room selected.</div>
      </div>
    )
  }

  const isGroupChat = selectedRoom.type === "public" || selectedRoom.type === "private"
  const otherParticipant = !isGroupChat
    ? selectedRoom.members?.find((member) => member.id !== currentUser?.id)
    : undefined

  // Extract shared media from messages
  const sharedMedia =
    messages?.flatMap((message) =>
      message.attachments
        ? message.attachments.map((att) => ({
            ...att,
            messageId: message.id,
            senderId: message.user.id,
          }))
        : [],
    ) || []

  const sharedImages = sharedMedia.filter((att) => att.type.startsWith("image/"))
  const sharedFiles = sharedMedia.filter((att) => !att.type.startsWith("image/"))

  const openImageViewer = (images: { url: string; name: string }[], index: number) => {
    setImagesForViewer(images)
    setCurrentImageIndex(index)
    setIsImageViewerOpen(true)
  }

  return (
    <div className={cn("flex flex-col h-full border-l bg-background", className)}>
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Details</h2>
        <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose} aria-label="Close details">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        {/* Room/User Info */}
        <div className="flex flex-col items-center gap-4 pb-4">
          <UserAvatar
            src={
              isGroupChat
                ? selectedRoom.image || "/placeholder.svg?height=80&width=80&text=Group"
                : otherParticipant?.avatar
            }
            alt={selectedRoom.name}
            fallback={selectedRoom.name.charAt(0)}
            className="h-20 w-20 text-3xl"
            status={isGroupChat ? undefined : otherParticipant?.is_online ? "online" : "offline"}
          />
          <div className="text-center">
            <h3 className="text-xl font-bold">{selectedRoom.name}</h3>
            {!isGroupChat && otherParticipant && (
              <p className="text-sm text-muted-foreground">{otherParticipant.is_online ? "Online" : "Offline"}</p>
            )}
            {isGroupChat && (
              <p className="text-sm text-muted-foreground">
                {selectedRoom.type === "public" ? "Public Group" : "Private Group"}
              </p>
            )}
          </div>
        </div>

        {/* Group Members */}
        {isGroupChat && selectedRoom.members && (
          <>
            <Separator className="my-4" />
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4" />
              <h4 className="font-semibold text-md">Members ({selectedRoom.members.length})</h4>
            </div>
            <div className="grid gap-2">
              {selectedRoom.members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <UserAvatar
                    src={member.avatar}
                    alt={member.name}
                    fallback={member.name.charAt(0)}
                    status={member.is_online ? "online" : "offline"}
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium">{member.name}</span>
                    {member.role && <span className="text-xs text-muted-foreground ml-2">({member.role})</span>}
                    {member.id === currentUser?.id && <span className="text-xs text-muted-foreground ml-2">(You)</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Shared Media */}
        {(sharedImages.length > 0 || sharedFiles.length > 0) && (
          <>
            <Separator className="my-4" />
            <h4 className="font-semibold text-md mb-2">Shared Media</h4>
            <Accordion type="multiple" defaultValue={["images", "files"]} className="w-full">
              {sharedImages.length > 0 && (
                <AccordionItem value="images">
                  <AccordionTrigger className="flex items-center gap-1 text-sm font-medium">
                    <ImageIcon className="h-4 w-4" /> Images ({sharedImages.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-2 py-2">
                      {sharedImages.slice(0, 4).map((img, index) => (
                        <img
                          key={index}
                          src={img.url || "/placeholder.svg"}
                          alt={img.name}
                          className="w-full h-24 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => openImageViewer(sharedImages, index)}
                        />
                      ))}
                      {sharedImages.length > 4 && (
                        <div
                          className="relative w-full h-24 bg-muted-foreground/20 rounded-md flex items-center justify-center text-lg font-bold text-muted-foreground cursor-pointer hover:bg-muted-foreground/30 transition-colors"
                          onClick={() => openImageViewer(sharedImages, 4)}
                        >
                          +{sharedImages.length - 4}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {sharedFiles.length > 0 && (
                <AccordionItem value="files">
                  <AccordionTrigger className="flex items-center gap-1 text-sm font-medium">
                    <FileText className="h-4 w-4" /> Files ({sharedFiles.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-2 py-2">
                      {sharedFiles.slice(0, 3).map((file, index) => (
                        <a
                          key={index}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-500 hover:underline p-2 rounded-md hover:bg-muted/50 transition-colors"
                        >
                          <FileText className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </a>
                      ))}
                      {sharedFiles.length > 3 && (
                        <div className="text-center text-sm text-blue-500 hover:underline cursor-pointer mt-2 p-2">
                          View all files ({sharedFiles.length})
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </>
        )}

        {/* Room Settings (for group chats) */}
        {isGroupChat && (
          <>
            <Separator className="my-4" />
            <div className="flex items-center gap-2 mb-3">
              <Settings className="h-4 w-4" />
              <h4 className="font-semibold text-md">Room Settings</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 rounded-lg hover:bg-muted/50">
                <span className="text-sm">Room Type</span>
                <span className="text-sm text-muted-foreground capitalize">{selectedRoom.type}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg hover:bg-muted/50">
                <span className="text-sm">Created</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(selectedRoom.created_at || "").toLocaleDateString()}
                </span>
              </div>
            </div>
          </>
        )}
      </ScrollArea>

      {isImageViewerOpen && (
        <ImageViewerModal
          isOpen={isImageViewerOpen}
          onClose={() => setIsImageViewerOpen(false)}
          images={imagesForViewer}
          initialIndex={currentImageIndex}
        />
      )}
    </div>
  )
}
