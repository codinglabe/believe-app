import React from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Users, MousePointerClick, History } from 'lucide-react'

interface EarnPointsTabsProps {
  children: React.ReactNode
  defaultTab?: 'volunteer' | 'digital' | 'history'
}

export function EarnPointsTabs({ children, defaultTab = 'volunteer' }: EarnPointsTabsProps) {
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger value="volunteer" className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          Volunteer & Earn
        </TabsTrigger>
        <TabsTrigger value="digital" className="flex items-center gap-2">
          <MousePointerClick className="w-4 h-4" />
          Digital Actions
        </TabsTrigger>
        <TabsTrigger value="history" className="flex items-center gap-2">
          <History className="w-4 h-4" />
          My History
        </TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  )
}

