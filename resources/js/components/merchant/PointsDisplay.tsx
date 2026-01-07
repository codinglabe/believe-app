import React from 'react'
import { Coins } from 'lucide-react'
import { motion } from 'framer-motion'

interface PointsDisplayProps {
  points: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export function PointsDisplay({ 
  points, 
  size = 'md', 
  showLabel = true,
  className = '' 
}: PointsDisplayProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-3xl',
    lg: 'text-5xl'
  }

  const formattedPoints = points.toLocaleString()

  return (
    <motion.div 
      className={`flex items-center gap-2 ${className}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col items-center">
        <div className={`font-bold text-gray-800 dark:text-gray-100 ${sizeClasses[size]}`}>
          {formattedPoints}
        </div>
        {showLabel && (
          <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            Points
          </div>
        )}
      </div>
      <Coins className={`text-blue-600 dark:text-blue-400 ${size === 'lg' ? 'w-8 h-8' : size === 'md' ? 'w-6 h-6' : 'w-4 h-4'}`} />
    </motion.div>
  )
}

