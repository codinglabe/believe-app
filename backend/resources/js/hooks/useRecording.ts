"use client"

import { useState, useCallback } from "react"

interface UseRecordingReturn {
  isRecording: boolean
  recordingDuration: number
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
  pauseRecording: () => void
  resumeRecording: () => void
}

export function useRecording(meetingId: number, canRecord = false): UseRecordingReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)

  const startRecording = useCallback(async () => {
    if (!canRecord) {
      throw new Error("You don't have permission to record this meeting")
    }

    try {
      const response = await fetch(`/meetings/${meetingId}/recording/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to start recording")
      }

      setIsRecording(true)
      setRecordingDuration(0)

      // Start duration timer
      const timer = setInterval(() => {
        setRecordingDuration((prev) => prev + 1)
      }, 1000)

      // Store timer reference for cleanup
      ;(window as any).recordingTimer = timer
    } catch (error) {
      console.error("Failed to start recording:", error)
      throw error
    }
  }, [meetingId, canRecord])

  const stopRecording = useCallback(async () => {
    try {
      const response = await fetch(`/meetings/${meetingId}/recording/stop`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to stop recording")
      }

      setIsRecording(false)

      // Clear timer
      if ((window as any).recordingTimer) {
        clearInterval((window as any).recordingTimer)
        ;(window as any).recordingTimer = null
      }
    } catch (error) {
      console.error("Failed to stop recording:", error)
      throw error
    }
  }, [meetingId])

  const pauseRecording = useCallback(() => {
    // Implementation for pause recording
    console.log("Pause recording")
  }, [])

  const resumeRecording = useCallback(() => {
    // Implementation for resume recording
    console.log("Resume recording")
  }, [])

  return {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  }
}
