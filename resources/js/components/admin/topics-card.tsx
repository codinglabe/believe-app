"use client"

import { useState } from "react"
import { Tag, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import TopicsModal from "./topics-modal"

interface Topic {
  id: number
  name: string
  color: string
}

interface TopicsCardProps {
  topics: Topic[]
  onDeleteTopic: (topicId: number) => void
}

export default function TopicsCard({ topics, onDeleteTopic }: TopicsCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Show only first 6 topics in the card
  const visibleTopics = topics.slice(0, 6)
  const remainingCount = topics.length - visibleTopics.length

  return (
    <>
      <Card className="bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Tag className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-lg">Selected Topics</span>
              <p className="text-sm font-normal text-gray-500 dark:text-gray-400 mt-1">
                {topics.length} topics selected
              </p>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {topics.length === 0 ? (
            <div className="text-center py-8">
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full w-fit mx-auto mb-3">
                <Tag className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">No topics selected yet</p>
            </div>
          ) : (
            <>
              {/* Topics Grid */}
              <div className="grid grid-cols-2 gap-2">
                {visibleTopics.map((topic) => (
                  <div
                    key={topic.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className={`w-2 h-2 rounded-full ${topic.color} flex-shrink-0`} />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{topic.name}</span>
                  </div>
                ))}
              </div>

              {/* More Button */}
              {remainingCount > 0 && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsModalOpen(true)}
                    className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    View {remainingCount} more topic{remainingCount !== 1 ? "s" : ""}
                  </Button>
                </div>
              )}

              {/* Quick Stats */}
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400">Total: {topics.length} topics</div>
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                >
                  Active
                </Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <TopicsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        topics={topics}
        onDeleteTopic={onDeleteTopic}
      />
    </>
  )
}
