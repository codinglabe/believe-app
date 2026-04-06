"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, FileText, Clock, Wifi, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MeetingDetailsCardProps {
  meetingId: string
  duration: string
  status: string
  isRecording?: boolean
}

export default function MeetingDetailsCard({
  meetingId,
  duration,
  status,
  isRecording = false,
}: MeetingDetailsCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [activeTab, setActiveTab] = useState<"chat" | "notes">("chat")

  const isConnected = status === "connected"

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Meeting Details</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="p-1 h-6 w-6">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4">
          {/* Meeting Info */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Duration</span>
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3 text-gray-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">{duration}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
              <div className="flex items-center space-x-1">
                {isConnected ? (
                  <Wifi className="w-3 h-3 text-green-500" />
                ) : (
                  <WifiOff className="w-3 h-3 text-red-500" />
                )}
                <span
                  className={`text-sm font-medium capitalize ${
                    isConnected ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {status}
                </span>
              </div>
            </div>

            {isRecording && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Recording</span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">Active</span>
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex space-x-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab("chat")}
              className={`text-sm flex items-center space-x-2 ${
                activeTab === "chat"
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  activeTab === "chat" ? "bg-gray-400" : "bg-gray-300 dark:bg-gray-600"
                }`}
              />
              <span>Chat</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab("notes")}
              className={`text-sm flex items-center space-x-2 ${
                activeTab === "notes"
                  ? "text-purple-600 dark:text-purple-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  activeTab === "notes" ? "bg-purple-500" : "bg-gray-300 dark:bg-gray-600"
                }`}
              />
              <span>AI Notes</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
