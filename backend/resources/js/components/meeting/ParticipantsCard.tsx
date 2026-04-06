"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Users, ChevronDown, Mic, MicOff, Video, VideoOff, Crown, UserPlus, Wifi } from "lucide-react"
import type { Participant } from "@/types"
import { usePage } from "@inertiajs/react"
import { echo } from "@/lib/echo"

interface ParticipantsCardProps {
  participants: Participant[]
  onInviteClick: () => void
  isLoading?: boolean
}

export default function ParticipantsCard({
  participants: initialParticipants,
  onInviteClick,
  isLoading = false,
}: ParticipantsCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants)
  const [animatingParticipants, setAnimatingParticipants] = useState<Set<string>>(new Set())
  const { user } = usePage().props

  useEffect(() => {
    if (!participants.length) return

    const meetingId = participants[0].meeting_id
    const participantsChannel = echo.channel(`meeting.${meetingId}.participants`)

    const handleParticipantJoined = (e: any) => {
      setAnimatingParticipants((prev) => new Set([...prev, e.participant.id]))
      setParticipants((prev) => {
        if (!prev.find((p) => p.id === e.participant.id)) {
          return [...prev, e.participant]
        }
        return prev
      })

      // Remove animation class after animation completes
      setTimeout(() => {
        setAnimatingParticipants((prev) => {
          const newSet = new Set(prev)
          newSet.delete(e.participant.id)
          return newSet
        })
      }, 500)
    }

    const handleParticipantLeft = (e: any) => {
      setParticipants((prev) => prev.filter((p) => p.id !== e.participant.id))
    }

    participantsChannel.listen(".participant.joined", handleParticipantJoined)
    participantsChannel.listen(".participant.left", handleParticipantLeft)

    return () => {
      participantsChannel.stopListening(".participant.joined", handleParticipantJoined)
      participantsChannel.stopListening(".participant.left", handleParticipantLeft)
    }
  }, [participants])

  if (isLoading) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
        <div className="p-4 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 bg-gray-700 rounded animate-pulse" />
              <div className="w-20 h-4 bg-gray-700 rounded animate-pulse" />
              <div className="w-6 h-4 bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="w-6 h-6 bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-3 animate-pulse">
              <div className="w-10 h-10 bg-gray-700 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded w-24 mb-2" />
                <div className="h-3 bg-gray-700 rounded w-16" />
              </div>
              <div className="flex space-x-1">
                <div className="w-6 h-6 bg-gray-700 rounded-full" />
                <div className="w-6 h-6 bg-gray-700 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden transition-all duration-300 hover:bg-gray-900/60">
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Users className="w-5 h-5 text-blue-400" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>
            <span className="text-sm font-semibold text-white">Participants</span>
            <Badge
              variant="secondary"
              className="bg-blue-500/20 text-blue-300 border-blue-500/30 px-2 py-0.5 text-xs font-medium"
            >
              {participants.length}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onInviteClick}
              className="h-8 w-8 p-0 hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
            >
              <UserPlus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0 hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
            >
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Participant Avatars Preview */}
        {!isExpanded && (
          <div className="flex items-center space-x-3 mt-3">
            <div className="flex -space-x-2">
              {participants.slice(0, 5).map((participant, index) => (
                <div
                  key={participant.id}
                  className="relative transition-transform hover:scale-110 hover:z-10"
                  style={{ zIndex: 5 - index }}
                >
                  <Avatar className="w-8 h-8 border-2 border-gray-800 ring-2 ring-gray-700/50">
                    <AvatarImage
                      src={
                        participant.user.avatar ||
                        `/placeholder.svg?height=32&width=32&text=${participant.user.name.charAt(0)}`
                      }
                    />
                    <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium">
                      {participant.user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {participant.role === "host" && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                      <Crown className="w-2 h-2 text-white" />
                    </div>
                  )}
                </div>
              ))}
              {participants.length > 5 && (
                <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-700 text-white rounded-full border-2 border-gray-800 flex items-center justify-center shadow-lg">
                  <span className="text-xs font-semibold">+{participants.length - 5}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Expanded Participants List */}
      <div
        className={`transition-all duration-300 ease-in-out ${isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"} overflow-hidden`}
      >
        <div className="p-4">
          {participants.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400 mb-2">No participants yet</p>
              <Button
                variant="outline"
                size="sm"
                onClick={onInviteClick}
                className="border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:text-white bg-transparent"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Invite People
              </Button>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className={`group flex items-center justify-between p-3 rounded-lg transition-all duration-200 hover:bg-gray-800/50 border border-transparent hover:border-gray-700/50 ${
                    animatingParticipants.has(participant.id) ? "animate-pulse bg-green-500/10 border-green-500/30" : ""
                  }`}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="relative">
                      <Avatar className="w-10 h-10 ring-2 ring-gray-700/50 group-hover:ring-gray-600/50 transition-all">
                        <AvatarImage
                          src={
                            participant.user.avatar ||
                            `/placeholder.svg?height=40&width=40&text=${participant.user.name.charAt(0)}`
                          }
                        />
                        <AvatarFallback className="text-sm bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium">
                          {participant.user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {participant.role === "host" && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                          <Crown className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900 animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-white truncate group-hover:text-blue-300 transition-colors">
                          {participant.user.name}
                        </p>
                        {participant.user.id === user?.id && (
                          <Badge variant="outline" className="border-blue-500/50 text-blue-300 text-xs px-1.5 py-0">
                            You
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge
                          variant="secondary"
                          className={`text-xs px-2 py-0 ${
                            participant.role === "host"
                              ? "bg-orange-500/20 text-orange-300 border-orange-500/30"
                              : "bg-gray-700/50 text-gray-300 border-gray-600/50"
                          }`}
                        >
                          {participant.role}
                        </Badge>
                        <div className="flex items-center space-x-1 text-xs text-gray-400">
                          <Wifi className="w-3 h-3 text-green-400" />
                          <span>Connected</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                        participant.is_muted
                          ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      }`}
                    >
                      {participant.is_muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </div>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                        participant.is_video_enabled
                          ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                          : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      }`}
                    >
                      {participant.is_video_enabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
