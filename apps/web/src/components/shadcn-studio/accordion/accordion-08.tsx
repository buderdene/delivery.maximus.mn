'use client'

import { PlusIcon, type LucideIcon } from 'lucide-react'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { Accordion, AccordionContent, AccordionItem } from '@/components/ui/accordion'

interface AccordionItemData {
  icon: LucideIcon
  title: string
  subtitle: string
  content: React.ReactNode
}

interface AccordionIconSubtitleProps {
  items: AccordionItemData[]
  defaultValue?: string
  className?: string
}

export const AccordionIconSubtitle = ({
  items,
  defaultValue,
  className = ''
}: AccordionIconSubtitleProps) => {
  return (
    <Accordion
      type="single"
      collapsible
      className={`w-full ${className}`}
      defaultValue={defaultValue || 'item-1'}
    >
      {items.map((item, index) => (
        <AccordionItem key={index} value={`item-${index + 1}`}>
          <AccordionPrimitive.Header className="flex">
            <AccordionPrimitive.Trigger
              data-slot="accordion-trigger"
              className="focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-center justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&>svg>path:last-child]:origin-center [&>svg>path:last-child]:transition-all [&>svg>path:last-child]:duration-200 [&[data-state=open]>svg]:rotate-180 [&[data-state=open]>svg>path:last-child]:rotate-90 [&[data-state=open]>svg>path:last-child]:opacity-0"
            >
              <span className="flex items-center gap-4">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-muted/50"
                  aria-hidden="true"
                >
                  <item.icon className="size-4" />
                </span>
                <span className="flex flex-col space-y-0.5">
                  <span>{item.title}</span>
                  <span className="text-muted-foreground font-normal text-xs">
                    {item.subtitle}
                  </span>
                </span>
              </span>
              <PlusIcon className="text-muted-foreground pointer-events-none size-4 shrink-0 transition-transform duration-200" />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionContent className="text-muted-foreground pl-14">
            {item.content}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

export default AccordionIconSubtitle
