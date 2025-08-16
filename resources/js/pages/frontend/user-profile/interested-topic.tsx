"use client"

import type React from "react"
import type { PageProps } from "@/types"
import { useState, type FormEventHandler } from "react"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { useForm } from "@inertiajs/react"

interface Topic {
  id: number
  name: string
  description?: string
}

interface Props extends PageProps {
  topics: Topic[]
  initialSelected: number[]
}

export default function TopicSelectPage({ topics, initialSelected }: Props) {
  const { data, setData, post, processing, errors } = useForm({
    topics: initialSelected ?? [],
  })

  const [selectedTopics, setSelectedTopics] = useState<number[]>(data.topics)
  const [showSuccess, setShowSuccess] = useState(false)

  const toggleTopic = (topicId: number) => {
    const updated = selectedTopics.includes(topicId)
      ? selectedTopics.filter(id => id !== topicId)
      : [...selectedTopics, topicId]

    setSelectedTopics(updated)
    setData("topics", updated)
    setShowSuccess(false) // Hide success message when changing selection
  }

  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault()
    post('/user/topics/store', {
      onSuccess: () => {
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000) // Hide after 3 seconds
      }
    })
  }

  return (
    <ProfileLayout title="Select Topics">
      <div className="py-8 px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {topics.length > 0 ? "Select Your Interests" : "No Topics Available"}
            </h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              {topics.length > 0
                ? "Choose the topics you're interested in to personalize your experience"
                : "There are currently no topics available for selection. Please check back later."}
            </p>
          </div>

          {topics.length > 0 ? (
            <form onSubmit={handleSubmit} className="space-y-8">
              {showSuccess && (
                <div className="p-4 text-sm text-green-700 bg-green-100 rounded-lg dark:bg-green-900/20 dark:text-green-300 border border-green-200 dark:border-green-800 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Your interests have been successfully updated!
                </div>
              )}

              {errors.topics && (
                <div className="p-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900/20 dark:text-red-300 border border-red-200 dark:border-red-800 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {errors.topics}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {topics.map(topic => {
                  const isChecked = selectedTopics.includes(topic.id)
                  return (
                    <label
                      key={topic.id}
                      htmlFor={`topic-${topic.id}`}
                      className={`flex items-start p-4 rounded-lg border transition-all cursor-pointer
                        ${
                          isChecked
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 hover:border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 dark:hover:border-gray-600"
                        }`}
                    >
                      <div className="flex items-center h-5">
                        <input
                          id={`topic-${topic.id}`}
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleTopic(topic.id)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500
                            dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:border-gray-600"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <span
                          className={`block font-medium ${
                            isChecked
                              ? "text-blue-800 dark:text-blue-200"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {topic.name}
                        </span>
                        {topic.description && (
                          <p
                            className={`mt-1 ${
                              isChecked
                                ? "text-blue-600 dark:text-blue-300"
                                : "text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            {topic.description}
                          </p>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedTopics.length > 0
                    ? `You've selected ${selectedTopics.length} topic${selectedTopics.length !== 1 ? 's' : ''}`
                    : "Please select at least one topic"}
                </p>

                <button
                  type="submit"
                  disabled={processing || selectedTopics.length === 0}
                  className={`px-6 py-3 rounded-md text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-w-[180px]
                    ${
                      processing
                        ? "bg-blue-400 dark:bg-blue-600 cursor-wait"
                        : selectedTopics.length === 0
                          ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                    }`}
                >
                  {processing ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    "Update Interests"
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No topics available</h3>
              <p className="mt-1 text-gray-500 dark:text-gray-400">
                We couldn't find any topics for you to select at this time.
              </p>
            </div>
          )}
        </div>
      </div>
    </ProfileLayout>
  )
}
