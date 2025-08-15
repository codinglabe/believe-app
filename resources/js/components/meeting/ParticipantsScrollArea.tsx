"use client"
import ScrollArea from "./ScrollArea"

interface Participant {
  id: string
  name: string
  avatar?: string
  role: "host" | "student" | "organization" | "user"
  isAudioMuted: boolean
  isVideoMuted: boolean
  isOnline: boolean
}

interface ParticipantsScrollAreaProps {
  participants: Participant[]
  className?: string
  onParticipantClick?: (participant: Participant) => void
}

export default function ParticipantsScrollArea({
  participants,
  className = "",
  onParticipantClick,
}: ParticipantsScrollAreaProps) {
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "host":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "organization":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "student":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
    }
  }

  return (
    <ScrollArea className={className} maxHeight="300px" showScrollbar={true} orientation="vertical">
      <div className="space-y-2 p-2">
        {participants.map((participant) => (
          <div
            key={participant.id}
            className={`
              flex items-center space-x-3 p-3 rounded-lg cursor-pointer
              bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700
              border border-gray-200 dark:border-gray-600
              transition-colors duration-200
            `}
            onClick={() => onParticipantClick?.(participant)}
          >
            <div className="relative">
              {participant.avatar ? (
                <img
                  src={participant.avatar || "/placeholder.svg"}
                  alt={participant.name}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {participant.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              {/* Online status indicator */}
              <div
                className={`
                absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800
                ${participant.isOnline ? "bg-green-500" : "bg-gray-400"}
              `}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{participant.name}</span>
                <span
                  className={`
                  px-2 py-1 text-xs font-medium rounded-full
                  ${getRoleBadgeColor(participant.role)}
                `}
                >
                  {participant.role}
                </span>
              </div>

              <div className="flex items-center space-x-2 mt-1">
                {/* Audio status */}
                <div
                  className={`
                  w-4 h-4 rounded-full flex items-center justify-center
                  ${participant.isAudioMuted ? "bg-red-100 dark:bg-red-900" : "bg-green-100 dark:bg-green-900"}
                `}
                >
                  <svg
                    className={`w-2.5 h-2.5 ${
                      participant.isAudioMuted ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    {participant.isAudioMuted ? (
                      <path
                        fillRule="evenodd"
                        d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    ) : (
                      <path
                        fillRule="evenodd"
                        d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 010 1.414A7.975 7.975 0 0118 12a7.975 7.975 0 01-2.343 4.243 1 1 0 01-1.414-1.414A5.976 5.976 0 0016 12a5.976 5.976 0 00-1.757-3.829 1 1 0 011.414-1.414z"
                        clipRule="evenodd"
                      />
                    )}
                  </svg>
                </div>

                {/* Video status */}
                <div
                  className={`
                  w-4 h-4 rounded-full flex items-center justify-center
                  ${participant.isVideoMuted ? "bg-red-100 dark:bg-red-900" : "bg-green-100 dark:bg-green-900"}
                `}
                >
                  <svg
                    className={`w-2.5 h-2.5 ${
                      participant.isVideoMuted ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    {participant.isVideoMuted ? (
                      <path
                        fillRule="evenodd"
                        d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019 10C19 5.641 15.359 2 11 2a9.014 9.014 0 00-7.293 3.707zM14.82 11.82A7.006 7.006 0 0017 10C17 6.686 14.314 4 11 4a6.014 6.014 0 00-4.82 2.18l1.062 1.062A4 4 0 0115 10a3.99 3.99 0 01-.18 1.18l1.82 1.82z"
                        clipRule="evenodd"
                      />
                    ) : (
                      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                    )}
                  </svg>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
