"use client"

import { useEffect, useMemo } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  categoryForEventTypeId,
  defaultEventTypeIdForCategory,
  eventTypeCategories,
  eventTypeIdInCatalog,
  subTopicsForCategory,
  type EventTypeOption,
} from "@/lib/event-type-catalog"

type Props = {
  eventTypes: EventTypeOption[]
  eventTypeId: string
  onEventTypeIdChange: (id: string) => void
  error?: string
  topicLabel?: string
  subTopicLabel?: string
  topicPlaceholder?: string
  subTopicPlaceholder?: string
  labelClassName?: string
  triggerClassName?: string
  errorClassName?: string
}

export function EventTypeTopicFields({
  eventTypes,
  eventTypeId,
  onEventTypeIdChange,
  error,
  topicLabel = "Topic",
  subTopicLabel = "Sub Topic",
  topicPlaceholder = "Select topic",
  subTopicPlaceholder = "Select sub topic",
  labelClassName,
  triggerClassName,
  errorClassName = "text-sm text-destructive",
}: Props) {
  const categories = useMemo(() => eventTypeCategories(eventTypes), [eventTypes])

  useEffect(() => {
    if (!eventTypes.length) {
      if (eventTypeId) onEventTypeIdChange("")
      return
    }
    if (!eventTypeIdInCatalog(eventTypes, eventTypeId)) {
      const next = defaultEventTypeIdForCategory(eventTypes, categories[0] ?? "")
      if (next !== eventTypeId) onEventTypeIdChange(next)
    }
  }, [eventTypes, eventTypeId, categories, onEventTypeIdChange])

  const selectedCategory = useMemo(() => {
    const fromId = categoryForEventTypeId(eventTypes, eventTypeId)
    if (fromId) return fromId
    return categories[0] ?? ""
  }, [eventTypes, eventTypeId, categories])

  const subTopics = useMemo(
    () => (selectedCategory ? subTopicsForCategory(eventTypes, selectedCategory) : []),
    [eventTypes, selectedCategory],
  )

  const subTopicValue = useMemo(() => {
    if (eventTypeIdInCatalog(eventTypes, eventTypeId)) {
      const inCurrentCategory = subTopics.some((t) => t.id.toString() === eventTypeId)
      if (inCurrentCategory) return eventTypeId
    }
    return subTopics[0]?.id?.toString() ?? ""
  }, [eventTypes, eventTypeId, subTopics])

  const handleTopicChange = (category: string) => {
    onEventTypeIdChange(defaultEventTypeIdForCategory(eventTypes, category))
  }

  const hasError = !!error

  if (!eventTypes.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No topics are available for this listing type yet. Choose another type or ask an admin to
        configure topics.
      </p>
    )
  }

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="event_type_topic" className={labelClassName}>
          {topicLabel} *
        </Label>
        <Select value={selectedCategory || undefined} onValueChange={handleTopicChange}>
          <SelectTrigger
            id="event_type_topic"
            className={cn(hasError && "border-destructive", triggerClassName)}
          >
            <SelectValue placeholder={topicPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="event_type_sub_topic" className={labelClassName}>
          {subTopicLabel} *
        </Label>
        <Select
          value={subTopicValue || undefined}
          onValueChange={onEventTypeIdChange}
          disabled={!selectedCategory || subTopics.length === 0}
        >
          <SelectTrigger
            id="event_type_sub_topic"
            className={cn(hasError && "border-destructive", triggerClassName)}
          >
            <SelectValue placeholder={subTopicPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {subTopics.map((type) => (
              <SelectItem key={type.id} value={type.id.toString()}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasError && <p className={errorClassName}>{error}</p>}
      </div>
    </>
  )
}
