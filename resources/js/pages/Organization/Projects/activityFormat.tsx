import React from 'react'
import { ArrowRight } from 'lucide-react'

function str(meta: Record<string, unknown> | null | undefined, key: string): string | null {
  const v = meta?.[key]
  return typeof v === 'string' && v.trim() ? v : null
}

function strList(meta: Record<string, unknown> | null | undefined, key: string): string[] {
  const v = meta?.[key]
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
}

/** Trello-style human-readable activity body (excludes the actor name). */
export function ActivityMessage({
  action,
  meta,
}: {
  action: string
  meta: Record<string, unknown> | null
}) {
  const from = str(meta, 'from_list')
  const to = str(meta, 'to_list')
  const list = str(meta, 'list') ?? to
  const title = str(meta, 'title')
  const fileName = str(meta, 'name')
  const labels = strList(meta, 'labels')
  const members = strList(meta, 'members')
  const changes = strList(meta, 'changes')

  switch (action) {
    case 'card.created':
      return (
        <>
          added this card
          {list ? (
            <>
              {' '}
              to <span className="font-medium text-foreground">{list}</span>
            </>
          ) : null}
        </>
      )

    case 'card.moved':
      if (from && to) {
        return (
          <span className="inline-flex flex-wrap items-center gap-1">
            moved this card from
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-foreground">
              {from}
            </span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-foreground">
              {to}
            </span>
          </span>
        )
      }
      return <>moved this card{to ? <> to <span className="font-medium text-foreground">{to}</span></> : null}</>

    case 'card.updated': {
      if (changes.length === 1 && !['title'].includes(changes[0])) {
        return <>{changes[0]}</>
      }
      if (changes.length > 1) {
        const readable = changes.map((c) => (c === 'title' ? 'the title' : c))
        return <>updated {readable.join(', ')}</>
      }
      if (changes.includes('title') || title) {
        return <>updated the title</>
      }
      return <>updated this card</>
    }

    case 'card.labels_updated':
      if (labels.length === 0) {
        return <>removed all labels</>
      }
      return (
        <>
          set labels to{' '}
          <span className="font-medium text-foreground">{labels.join(', ')}</span>
        </>
      )

    case 'card.members_updated':
      if (members.length === 0) {
        return <>removed all members</>
      }
      return (
        <>
          set members to{' '}
          <span className="font-medium text-foreground">{members.join(', ')}</span>
        </>
      )

    case 'checklist.created':
      return (
        <>
          added checklist{' '}
          <span className="font-medium text-foreground">{title ?? 'Checklist'}</span>
        </>
      )

    case 'checklist.updated':
      return (
        <>
          renamed checklist to{' '}
          <span className="font-medium text-foreground">{title ?? 'Checklist'}</span>
        </>
      )

    case 'checklist.deleted':
      return (
        <>
          removed checklist{' '}
          <span className="font-medium text-foreground">{title ?? 'Checklist'}</span>
        </>
      )

    case 'checklist.item_added':
      return (
        <>
          added checklist item{' '}
          <span className="font-medium text-foreground">{title ?? 'item'}</span>
          {str(meta, 'checklist') ? (
            <>
              {' '}
              to <span className="font-medium text-foreground">{str(meta, 'checklist')}</span>
            </>
          ) : null}
        </>
      )

    case 'checklist.item_completed':
      return (
        <>
          completed{' '}
          <span className="font-medium text-foreground">{title ?? 'item'}</span>
          {str(meta, 'checklist') ? (
            <>
              {' '}
              on <span className="font-medium text-foreground">{str(meta, 'checklist')}</span>
            </>
          ) : null}
        </>
      )

    case 'checklist.item_uncompleted':
      return (
        <>
          marked{' '}
          <span className="font-medium text-foreground">{title ?? 'item'}</span> incomplete
        </>
      )

    case 'checklist.item_updated':
      return (
        <>
          updated checklist item{' '}
          <span className="font-medium text-foreground">{title ?? 'item'}</span>
        </>
      )

    case 'checklist.item_removed':
      return (
        <>
          removed checklist item{' '}
          <span className="font-medium text-foreground">{title ?? 'item'}</span>
        </>
      )

    case 'card.attachment_added':
      return (
        <>
          attached{' '}
          <span className="font-medium text-foreground">{fileName ?? 'a file'}</span>
        </>
      )

    case 'card.attachment_removed':
      return (
        <>
          removed attachment{' '}
          <span className="font-medium text-foreground">{fileName ?? ''}</span>
        </>
      )

    case 'card.archived':
      return <>archived this card</>

    case 'card.restored':
      return <>restored this card</>

    case 'card.commented':
      return <>commented</>

    default:
      return <>{action.replace(/^card\./, '').replace(/[._]/g, ' ')}</>
  }
}
