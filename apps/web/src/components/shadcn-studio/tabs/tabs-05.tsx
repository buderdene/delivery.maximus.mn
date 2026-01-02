'use client'

import { type LucideIcon } from 'lucide-react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Tab {
  name: string
  value: string
  icon: LucideIcon
  content: React.ReactNode
}

interface TabsWithVerticalIconProps {
  tabs: Tab[]
  defaultValue?: string
  className?: string
}

export const TabsWithVerticalIcon = ({
  tabs,
  defaultValue,
  className = ''
}: TabsWithVerticalIconProps) => {
  return (
    <div className={`w-full ${className}`}>
      <Tabs defaultValue={defaultValue || tabs[0]?.value} className="gap-4">
        <TabsList className="h-full">
          {tabs.map(({ icon: Icon, name, value }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="flex flex-col items-center gap-1 px-2.5 sm:px-3"
            >
              <Icon className="size-4" />
              {name}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

export default TabsWithVerticalIcon
