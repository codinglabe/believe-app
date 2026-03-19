import React, { useState } from 'react'
import { Head } from '@inertiajs/react'
import FrontendLayout from '@/layouts/frontend/frontend-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/frontend/ui/card'
import { Button } from '@/components/frontend/ui/button'
import { Badge } from '@/components/frontend/ui/badge'
import { Input } from '@/components/frontend/ui/input'
import { Search, Filter, CheckCircle2, Clock, ChevronDown, ChevronUp, Camera, Link as LinkIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { TaskSubmissionModal } from '@/components/frontend/merchant/TaskSubmissionModal'

// Task data from Excel file
const merchantTasks = [
  // Follow & Subscribe Actions
  { id: '1', category: 'Follow & Subscribe Actions', subcategory: 'Follow merchant on Instagram' },
  { id: '2', category: 'Follow & Subscribe Actions', subcategory: 'Follow merchant on Facebook' },
  { id: '3', category: 'Follow & Subscribe Actions', subcategory: 'Follow merchant on X (Twitter)' },
  { id: '4', category: 'Follow & Subscribe Actions', subcategory: 'Follow merchant on TikTok' },
  { id: '5', category: 'Follow & Subscribe Actions', subcategory: 'Subscribe to YouTube channel' },
  { id: '6', category: 'Follow & Subscribe Actions', subcategory: 'Follow LinkedIn business page' },
  { id: '7', category: 'Follow & Subscribe Actions', subcategory: 'Join Discord server' },
  { id: '8', category: 'Follow & Subscribe Actions', subcategory: 'Join Telegram group' },
  { id: '9', category: 'Follow & Subscribe Actions', subcategory: 'Follow Pinterest board' },
  { id: '10', category: 'Follow & Subscribe Actions', subcategory: 'Follow Threads account' },
  
  // Like, React & Save Actions
  { id: '11', category: 'Like, React & Save Actions', subcategory: 'Like a post' },
  { id: '12', category: 'Like, React & Save Actions', subcategory: 'React to a post (Facebook / LinkedIn)' },
  { id: '13', category: 'Like, React & Save Actions', subcategory: 'Save a post (Instagram)' },
  { id: '14', category: 'Like, React & Save Actions', subcategory: 'Favorite a tweet' },
  { id: '15', category: 'Like, React & Save Actions', subcategory: 'Upvote content (where allowed)' },
  { id: '16', category: 'Like, React & Save Actions', subcategory: 'Add post to story favorites' },
  { id: '17', category: 'Like, React & Save Actions', subcategory: 'Bookmark YouTube video' },
  { id: '18', category: 'Like, React & Save Actions', subcategory: 'Add podcast to library' },
  { id: '19', category: 'Like, React & Save Actions', subcategory: 'Rate content (platform-compliant)' },
  
  // Share & Repost Actions
  { id: '20', category: 'Share & Repost Actions', subcategory: 'Share post to supporter feed' },
  { id: '21', category: 'Share & Repost Actions', subcategory: 'Repost on X (Twitter)' },
  { id: '22', category: 'Share & Repost Actions', subcategory: 'Share to Instagram story' },
  { id: '23', category: 'Share & Repost Actions', subcategory: 'Share Facebook post' },
  { id: '24', category: 'Share & Repost Actions', subcategory: 'Share LinkedIn post' },
  { id: '25', category: 'Share & Repost Actions', subcategory: 'Share YouTube video' },
  { id: '26', category: 'Share & Repost Actions', subcategory: 'Share TikTok video' },
  { id: '27', category: 'Share & Repost Actions', subcategory: 'Share blog link' },
  { id: '28', category: 'Share & Repost Actions', subcategory: 'Share landing page link' },
  { id: '29', category: 'Share & Repost Actions', subcategory: 'Share event link' },
  
  // Comment & Engagement Boosting
  { id: '30', category: 'Comment & Engagement Boosting', subcategory: 'Comment on merchant post' },
  { id: '31', category: 'Comment & Engagement Boosting', subcategory: 'Reply to merchant comment' },
  { id: '32', category: 'Comment & Engagement Boosting', subcategory: 'Answer questions under posts' },
  { id: '33', category: 'Comment & Engagement Boosting', subcategory: 'Participate in comment threads' },
  { id: '34', category: 'Comment & Engagement Boosting', subcategory: 'Pin supportive comment (where allowed)' },
  { id: '35', category: 'Comment & Engagement Boosting', subcategory: 'Ask prompted questions' },
  { id: '36', category: 'Comment & Engagement Boosting', subcategory: 'Tag friends (platform-safe)' },
  { id: '37', category: 'Comment & Engagement Boosting', subcategory: 'Respond to polls' },
  { id: '38', category: 'Comment & Engagement Boosting', subcategory: 'Engage with stories (emoji / replies)' },
  
  // Hashtag & Discovery Support
  { id: '39', category: 'Hashtag & Discovery Support', subcategory: 'Use branded hashtags' },
  { id: '40', category: 'Hashtag & Discovery Support', subcategory: 'Use campaign hashtags' },
  { id: '41', category: 'Hashtag & Discovery Support', subcategory: 'Add location hashtags' },
  { id: '42', category: 'Hashtag & Discovery Support', subcategory: 'Participate in hashtag challenges' },
  { id: '43', category: 'Hashtag & Discovery Support', subcategory: 'Join trending challenges' },
  { id: '44', category: 'Hashtag & Discovery Support', subcategory: 'Engage with hashtag feeds' },
  { id: '45', category: 'Hashtag & Discovery Support', subcategory: 'Add merchant to bio links' },
  { id: '46', category: 'Hashtag & Discovery Support', subcategory: 'Add merchant mention in caption' },
  { id: '47', category: 'Hashtag & Discovery Support', subcategory: 'Add merchant tag in post' },
  
  // Story & Short-Form Boosting
  { id: '48', category: 'Story & Short-Form Boosting', subcategory: 'Share merchant stories' },
  { id: '49', category: 'Story & Short-Form Boosting', subcategory: 'React to stories' },
  { id: '50', category: 'Story & Short-Form Boosting', subcategory: 'Reply to stories' },
  { id: '51', category: 'Story & Short-Form Boosting', subcategory: 'Add merchant story to highlights' },
  { id: '52', category: 'Story & Short-Form Boosting', subcategory: 'Duet TikTok videos' },
  { id: '53', category: 'Story & Short-Form Boosting', subcategory: 'Stitch TikTok videos' },
  { id: '54', category: 'Story & Short-Form Boosting', subcategory: 'Remix Instagram Reels' },
  { id: '55', category: 'Story & Short-Form Boosting', subcategory: 'Create reaction clips' },
  { id: '56', category: 'Story & Short-Form Boosting', subcategory: 'Add merchant sound / audio' },
  
  // Review & Reputation Actions
  { id: '57', category: 'Review & Reputation Actions', subcategory: 'Leave platform-compliant review' },
  { id: '58', category: 'Review & Reputation Actions', subcategory: 'Answer Q&A sections' },
  { id: '59', category: 'Review & Reputation Actions', subcategory: 'Mark reviews as helpful' },
  { id: '60', category: 'Review & Reputation Actions', subcategory: 'Flag fake reviews' },
  { id: '61', category: 'Review & Reputation Actions', subcategory: 'Share testimonials (opt-in)' },
  { id: '62', category: 'Review & Reputation Actions', subcategory: 'Submit feedback surveys' },
  { id: '63', category: 'Review & Reputation Actions', subcategory: 'Provide star ratings (where permitted)' },
  
  // Event & Campaign Amplification
  { id: '64', category: 'Event & Campaign Amplification', subcategory: 'Share event announcement' },
  { id: '65', category: 'Event & Campaign Amplification', subcategory: 'RSVP to digital event' },
  { id: '66', category: 'Event & Campaign Amplification', subcategory: 'Invite friends to events' },
  { id: '67', category: 'Event & Campaign Amplification', subcategory: 'Share countdown post' },
  { id: '68', category: 'Event & Campaign Amplification', subcategory: 'Promote Unity Meet' },
  { id: '69', category: 'Event & Campaign Amplification', subcategory: 'Share replay link' },
  { id: '70', category: 'Event & Campaign Amplification', subcategory: 'Participate in launch day' },
  { id: '71', category: 'Event & Campaign Amplification', subcategory: 'Boost giveaway post' },
  { id: '72', category: 'Event & Campaign Amplification', subcategory: 'Join campaign challenge' },
  
  // Community Growth Actions
  { id: '73', category: 'Community Growth Actions', subcategory: 'Invite friends to follow page' },
  { id: '74', category: 'Community Growth Actions', subcategory: 'Invite friends to join group' },
  { id: '75', category: 'Community Growth Actions', subcategory: 'Welcome new community members' },
  { id: '76', category: 'Community Growth Actions', subcategory: 'Moderate comment sections' },
  { id: '77', category: 'Community Growth Actions', subcategory: 'Answer FAQs in comments' },
  { id: '78', category: 'Community Growth Actions', subcategory: 'Redirect users to official links' },
  { id: '79', category: 'Community Growth Actions', subcategory: 'Encourage organic engagement' },
  { id: '80', category: 'Community Growth Actions', subcategory: 'Share community guidelines' },
  { id: '81', category: 'Community Growth Actions', subcategory: 'Help onboard new followers' },
  
  // Verification-Friendly Micro-Tasks
  { id: '82', category: 'Verification-Friendly Micro-Tasks', subcategory: 'Follow action (one-time)' },
  { id: '83', category: 'Verification-Friendly Micro-Tasks', subcategory: 'Follow action (recurring)' },
  { id: '84', category: 'Verification-Friendly Micro-Tasks', subcategory: 'Like / react action' },
  { id: '85', category: 'Verification-Friendly Micro-Tasks', subcategory: 'Share with tracking link' },
  { id: '86', category: 'Verification-Friendly Micro-Tasks', subcategory: 'Comment with prompt' },
  { id: '87', category: 'Verification-Friendly Micro-Tasks', subcategory: 'Screenshot verification' },
  { id: '88', category: 'Verification-Friendly Micro-Tasks', subcategory: 'API / link verification' },
  { id: '89', category: 'Verification-Friendly Micro-Tasks', subcategory: 'Daily / weekly task limits' },
]

interface TaskStatus {
  [taskId: string]: 'pending' | 'approved' | 'rejected'
}

export default function MerchantTasksIndex() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [selectedTask, setSelectedTask] = useState<typeof merchantTasks[0] | null>(null)
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus>({})

  // Get unique categories
  const categories = Array.from(new Set(merchantTasks.map(task => task.category)))

  // Filter tasks
  const filteredTasks = merchantTasks.filter(task => {
    const matchesSearch = task.subcategory.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.category.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || task.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Group tasks by category
  const tasksByCategory = filteredTasks.reduce((acc, task) => {
    if (!acc[task.category]) {
      acc[task.category] = []
    }
    acc[task.category].push(task)
    return acc
  }, {} as Record<string, typeof merchantTasks>)

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }

  const handleTaskClick = (task: typeof merchantTasks[0]) => {
    setSelectedTask(task)
  }

  const handleSubmitTask = async (data: {
    taskId: string
    proofType: 'screenshot' | 'link' | 'both'
    screenshot?: string
    link?: string
    notes?: string
  }) => {
    // In production, this would make an API call
    console.log('Submitting task:', data)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Update task status to pending
    setTaskStatuses(prev => ({
      ...prev,
      [data.taskId]: 'pending'
    }))
  }

  const getStatusBadge = (taskId: string) => {
    const status = taskStatuses[taskId]
    if (!status) return null

    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Pending Review
          </Badge>
        )
      case 'approved':
        return (
          <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        )
      case 'rejected':
        return (
          <Badge className="bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30">
            Rejected
          </Badge>
        )
      default:
        return null
    }
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Follow & Subscribe Actions': 'from-blue-500 to-cyan-500',
      'Like, React & Save Actions': 'from-pink-500 to-rose-500',
      'Share & Repost Actions': 'from-green-500 to-emerald-500',
      'Comment & Engagement Boosting': 'from-purple-500 to-violet-500',
      'Hashtag & Discovery Support': 'from-orange-500 to-amber-500',
      'Story & Short-Form Boosting': 'from-indigo-500 to-blue-500',
      'Review & Reputation Actions': 'from-yellow-500 to-orange-500',
      'Event & Campaign Amplification': 'from-red-500 to-pink-500',
      'Community Growth Actions': 'from-teal-500 to-cyan-500',
      'Verification-Friendly Micro-Tasks': 'from-gray-500 to-slate-500',
    }
    return colors[category] || 'from-gray-500 to-gray-600'
  }

  return (
    <FrontendLayout>
      <Head title="Merchant Tasks - Complete & Earn Points" />
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Merchant Tasks
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Complete tasks and submit proof to earn points. All submissions require verification.
            </p>
          </div>

          {/* Search and Filter */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              <Button
                variant={selectedCategory === null ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(null)}
                size="sm"
                className="whitespace-nowrap"
              >
                All Categories
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(category)}
                  size="sm"
                  className="whitespace-nowrap"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* Tasks by Category */}
          <div className="space-y-4">
            {Object.entries(tasksByCategory).map(([category, tasks]) => {
              const isExpanded = expandedCategories.has(category)
              return (
                <Card key={category} className="overflow-hidden">
                  <CardHeader
                    className={`bg-gradient-to-r ${getCategoryColor(category)} text-white cursor-pointer`}
                    onClick={() => toggleCategory(category)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">{category}</CardTitle>
                        <CardDescription className="text-white/90 mt-1">
                          {tasks.length} task{tasks.length !== 1 ? 's' : ''} available
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleCategory(category)
                        }}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <CardContent className="pt-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {tasks.map((task) => (
                              <motion.div
                                key={task.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <Card
                                  className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary"
                                  onClick={() => handleTaskClick(task)}
                                >
                                  <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-2">
                                      <h3 className="font-semibold text-sm flex-1">
                                        {task.subcategory}
                                      </h3>
                                    </div>
                                    <div className="flex items-center justify-between mt-3">
                                      {getStatusBadge(task.id)}
                                      <Button
                                        size="sm"
                                        variant={taskStatuses[task.id] ? 'outline' : 'default'}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleTaskClick(task)
                                        }}
                                      >
                                        {taskStatuses[task.id] ? 'View Status' : 'Submit Proof'}
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            ))}
                          </div>
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              )
            })}
          </div>

          {Object.keys(tasksByCategory).length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">
                No tasks found. Try adjusting your search or filter.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Task Submission Modal */}
      {selectedTask && (
        <TaskSubmissionModal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          task={selectedTask}
          onSubmit={handleSubmitTask}
        />
      )}
    </FrontendLayout>
  )
}
