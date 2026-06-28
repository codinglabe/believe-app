"use client"

import { useEffect, useMemo, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  categoryKeyForEventTypeId,
  categoryOptionForKey,
  defaultEventTypeIdForCategory,
  eventTypeCategoryOptions,
  eventTypeIdInCatalog,
  subTopicsForCategory,
  type EventTypeOption,
} from "@/lib/event-type-catalog"

function resolveTopicCategoryKey(
  eventTypes: EventTypeOption[],
  eventTypeId: string,
  categoryOptions: ReturnType<typeof eventTypeCategoryOptions>,
): string {
  return (
    categoryKeyForEventTypeId(eventTypes, eventTypeId) ?? categoryOptions[0]?.key ?? ""
  )
}

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
  const normalizedEventTypeId = eventTypeId?.toString() ?? ""

  const categoryOptions = useMemo(
    () => eventTypeCategoryOptions(eventTypes),
    [eventTypes],
  )

  const derivedTopicCategoryKey = useMemo(
    () => resolveTopicCategoryKey(eventTypes, normalizedEventTypeId, categoryOptions),
    [eventTypes, normalizedEventTypeId, categoryOptions],
  )

  const catalogSignature = useMemo(
    () => eventTypes.map((type) => type.id).join(","),
    [eventTypes],
  )

  const [topicCategoryKey, setTopicCategoryKey] = useState(derivedTopicCategoryKey)

  useEffect(() => {
    setTopicCategoryKey(derivedTopicCategoryKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- realign topic when the catalog list changes
  }, [catalogSignature])

  const activeCategoryOption = useMemo(
    () => categoryOptionForKey(eventTypes, topicCategoryKey),
    [eventTypes, topicCategoryKey],
  )

  const activeCategory = activeCategoryOption?.category ?? ""

  const subTopics = useMemo(
    () => (activeCategory ? subTopicsForCategory(eventTypes, activeCategory) : []),
    [eventTypes, activeCategory],
  )

  const subTopicSelectValue = useMemo(() => {
    if (subTopics.some((topic) => topic.id.toString() === normalizedEventTypeId)) {
      return normalizedEventTypeId
    }
    return subTopics[0]?.id?.toString() ?? ""
  }, [subTopics, normalizedEventTypeId])

  useEffect(() => {
    if (!eventTypes.length) {
      if (normalizedEventTypeId) onEventTypeIdChange("")
      return
    }

    const firstCategory = categoryOptions[0]?.category ?? ""

    if (!eventTypeIdInCatalog(eventTypes, normalizedEventTypeId)) {
      const next = defaultEventTypeIdForCategory(eventTypes, firstCategory)
      if (next !== normalizedEventTypeId) onEventTypeIdChange(next)
    }
    // onEventTypeIdChange comes from Inertia useForm and is not referentially stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-sync when the catalog changes
  }, [eventTypes, categoryOptions])

  useEffect(() => {
    if (!activeCategory || subTopics.length === 0) return

    const currentInActiveCategory = subTopics.some(
      (topic) => topic.id.toString() === normalizedEventTypeId,
    )
    if (currentInActiveCategory) return

    const next = subTopics[0]?.id?.toString() ?? ""
    if (next && next !== normalizedEventTypeId) {
      onEventTypeIdChange(next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- align sub topic when topic category changes
  }, [activeCategory, subTopics, normalizedEventTypeId])

  const handleTopicChange = (categoryKey: string) => {
    const option = categoryOptionForKey(eventTypes, categoryKey)
    if (!option?.defaultEventTypeId) return

    setTopicCategoryKey(categoryKey)
    onEventTypeIdChange(option.defaultEventTypeId)
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
        <Select value={topicCategoryKey || undefined} onValueChange={handleTopicChange}>
          <SelectTrigger
            id="event_type_topic"
            className={cn(hasError && "border-destructive", triggerClassName)}
          >
            <SelectValue placeholder={topicPlaceholder} />
          </SelectTrigger>
          <SelectContent position="popper" className="z-[200]">
            {categoryOptions.map((option) => (
              <SelectItem key={option.key} value={option.key}>
                {option.category}
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
          value={subTopicSelectValue || undefined}
          onValueChange={onEventTypeIdChange}
          disabled={!activeCategory || subTopics.length === 0}
        >
          <SelectTrigger
            id="event_type_sub_topic"
            className={cn(hasError && "border-destructive", triggerClassName)}
          >
            <SelectValue placeholder={subTopicPlaceholder} />
          </SelectTrigger>
          <SelectContent position="popper" className="z-[200]">
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
