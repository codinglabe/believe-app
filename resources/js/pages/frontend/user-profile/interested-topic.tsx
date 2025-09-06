"use client"

import type React from "react"
import type { PageProps } from "@/types"
import { useState, type FormEventHandler } from "react"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import {Head, useForm, router } from "@inertiajs/react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Check, Search, Filter, MessageCircle } from "lucide-react"

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
  const [searchTerm, setSearchTerm] = useState("")

  const filteredTopics = topics.filter((topic) => topic.name.toLowerCase().includes(searchTerm.toLowerCase()))

  const toggleTopic = (topicId: number) => {
    const updated = selectedTopics.includes(topicId)
      ? selectedTopics.filter((id) => id !== topicId)
      : [...selectedTopics, topicId]

    setSelectedTopics(updated)
    setData("topics", updated)
    setShowSuccess(false)
  }

  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault()
    post("/user/topics/store", {
      onSuccess: () => {
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
      },
    })
  }

  const navigateToChat = (topicId: number) => {
    router.get(route("chat.index", { topic: topicId }))
  }

  return (
      <ProfileLayout title="Select Groups Chat">
          <Head title="Interested Topic" />
      <div className="">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200/50 dark:border-blue-700/50 text-blue-700 dark:text-blue-300 text-sm font-semibold mb-6 backdrop-blur-sm"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Personalize Your Experience
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent mb-4"
            >
              {topics.length > 0 ? "Choose Your Groups chat" : "No Groups chat Available"}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed"
            >
              {topics.length > 0
                ? "Discover content tailored to your passions. Select the Groups chat that inspire you most and unlock a personalized experience."
                : "There are currently no Groups chat available for selection. Please check back later."}
            </motion.p>

            {topics.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6 max-w-md mx-auto"
              >
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search Groups chat..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              </motion.div>
            )}
          </div>

          {topics.length > 0 ? (
            <form onSubmit={handleSubmit} className="space-y-8">
              <AnimatePresence>
                {showSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200 dark:border-green-700/50 shadow-lg backdrop-blur-sm"
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">Success!</h3>
                        <p className="text-green-700 dark:text-green-300">
                          Your interests have been updated and saved.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {errors.topics && (
                  <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="p-6 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-2xl border border-red-200 dark:border-red-700/50 shadow-lg backdrop-blur-sm"
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414-1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">Error</h3>
                        <p className="text-red-700 dark:text-red-300">{errors.topics}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {filteredTopics.map((topic, index) => {
                  const isChecked = selectedTopics.includes(topic.id)
                  return (
                    <motion.div
                      key={topic.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.4 }}
                      whileHover={{ y: -8, scale: 1.02 }}
                      className="group relative"
                    >
                      <label
                        htmlFor={`topic-${topic.id}`}
                        className={`block relative overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl backdrop-blur-sm
                          ${
                            isChecked
                              ? "border-blue-400 bg-blue-50 dark:bg-blue-900/30 shadow-blue-200/50 dark:shadow-blue-900/30"
                              : "border-gray-200 hover:border-gray-300 bg-white/80 dark:bg-gray-800/80 dark:border-gray-700 dark:hover:border-gray-600 hover:shadow-gray-200/50 dark:hover:shadow-gray-700/30"
                          }`}
                      >
                        {isChecked && <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />}

                        <div className="p-4 relative z-10">
                          <div className="flex items-start justify-between mb-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                                isChecked
                                  ? "bg-blue-500 to-purple-600 text-white shadow-lg"
                                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-gray-600"
                              }`}
                            >
                              <Sparkles className="w-5 h-5" />
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Chat icon button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  navigateToChat(topic.id)
                                }}
                                className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-800/50 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-300 transition-all duration-200 group/chat"
                                title="Go to chat"
                              >
                                <MessageCircle className="w-4 h-4 group-hover/chat:scale-110 transition-transform" />
                              </button>

                              <div
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                                  isChecked
                                    ? "border-blue-500 bg-blue-500"
                                    : "border-gray-300 dark:border-gray-600 group-hover:border-gray-400 dark:group-hover:border-gray-500"
                                }`}
                              >
                                {isChecked && <Check className="w-4 h-4 text-white" />}
                              </div>
                            </div>
                          </div>

                          <h3
                            className={`text-base font-bold transition-colors leading-tight ${
                              isChecked
                                ? "text-blue-800 dark:text-blue-200"
                                : "text-gray-800 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white"
                            }`}
                          >
                            {topic.name}
                          </h3>
                        </div>

                        <input
                          id={`topic-${topic.id}`}
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleTopic(topic.id)}
                          className="sr-only"
                        />
                      </label>
                    </motion.div>
                  )
                })}
              </div>

              {filteredTopics.length === 0 && searchTerm && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                  <Search className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Groups chat found</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Try adjusting your search terms or browse all available Groups chat.
                  </p>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="sticky bottom-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 p-4 rounded-t-3xl shadow-2xl"
              >
                <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-4 h-4 rounded-full transition-all duration-300 ${
                        selectedTopics.length > 0
                          ? "bg-green-500 animate-pulse shadow-lg shadow-green-500/50"
                          : "bg-gray-400"
                      }`}
                    />
                    <div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedTopics.length > 0
                          ? `${selectedTopics.length} topic${selectedTopics.length !== 1 ? "s" : ""} selected`
                          : "Select Groups chat to get started"}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Choose Groups chat that match your interests
                      </p>
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={processing || selectedTopics.length === 0}
                    whileHover={!processing && selectedTopics.length > 0 ? { scale: 1.05 } : {}}
                    whileTap={!processing && selectedTopics.length > 0 ? { scale: 0.95 } : {}}
                    className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 focus:outline-none focus:ring-4 min-w-[220px] shadow-xl
                      ${
                        processing
                          ? "bg-blue-400 dark:bg-blue-600 cursor-wait text-white"
                          : selectedTopics.length === 0
                            ? "bg-gray-300 dark:bg-gray-600 cursor-not-allowed text-gray-500 dark:text-gray-400"
                            : "bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 hover:from-blue-700 hover:via-purple-700 hover:to-blue-800 text-white focus:ring-blue-500/50 hover:shadow-2xl shadow-blue-500/25"
                      }`}
                  >
                    {processing ? (
                      <span className="flex items-center justify-center">
                        <svg
                          className="animate-spin -ml-1 mr-3 h-6 w-6 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Saving Your Interests...
                      </span>
                    ) : (
                      "Save My Interests"
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </form>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center">
                <Filter className="w-12 h-12 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No Groups chat available</h3>
              <p className="text-lg text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                We couldn't find any Groups chat for you to select at this time. Please check back later.
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </ProfileLayout>
  )
}
