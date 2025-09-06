import ScrollArea from "./ScrollArea"

interface Message {
  id: string
  user: {
    name: string
    avatar?: string
  }
  message: string
  type: "text" | "emoji" | "system"
  timestamp: string
}

interface ChatScrollAreaProps {
  messages: Message[]
  className?: string
}

export default function ChatScrollArea({ messages, className = "" }: ChatScrollAreaProps) {
  return (
    <ScrollArea
      className={`flex-1 ${className}`}
      maxHeight="calc(100vh - 200px)"
      autoScroll={true}
      showScrollbar={true}
      orientation="vertical"
    >
      <div className="space-y-3 p-4">
        {messages.map((message) => (
          <div key={message.id} className="flex items-start space-x-3">
            {message.user.avatar ? (
              <img
                src={message.user.avatar || "/placeholder.svg"}
                alt={message.user.name}
                className="w-8 h-8 rounded-full flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex-shrink-0 flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  {message.user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white">{message.user.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{message.timestamp}</span>
              </div>

              <div
                className={`mt-1 ${
                  message.type === "emoji"
                    ? "text-2xl"
                    : message.type === "system"
                      ? "text-sm italic text-gray-500 dark:text-gray-400"
                      : "text-sm text-gray-700 dark:text-gray-300"
                }`}
              >
                {message.message}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
