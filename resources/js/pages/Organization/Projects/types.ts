export type ProjectLabel = {
  id: number
  name: string
  color: string
}

export type ProjectMember = {
  id: number
  name: string
  email: string
  avatar?: string | null
}

export type ChecklistItem = {
  id: number
  title: string
  is_complete: boolean
  position: number
}

export type Checklist = {
  id: number
  title: string
  position: number
  items: ChecklistItem[]
}

export type ProjectComment = {
  id: number
  parent_id?: number | null
  body: string
  created_at: string | null
  likes_count: number
  liked_by_me: boolean
  user: { id: number; name: string; email: string } | null
  replies?: ProjectComment[]
}

export type ProjectAttachment = {
  id: number
  original_name: string
  mime: string | null
  size: number
  url: string
  created_at: string | null
  user: { id: number; name: string } | null
}

export type ProjectActivity = {
  id: number
  action: string
  meta: Record<string, unknown> | null
  created_at: string | null
  user: { id: number; name: string } | null
}

export type ProjectCardSummary = {
  id: number
  list_id: number
  board_id: number
  title: string
  description: string | null
  position: number
  due_at: string | null
  is_overdue: boolean
  cover_color: string | null
  labels: ProjectLabel[]
  members: ProjectMember[]
  checklist_progress: { complete: number; total: number }
  comment_count: number
  attachment_count: number
}

export type ProjectCardDetail = ProjectCardSummary & {
  list_name?: string
  checklists: Checklist[]
  comments: ProjectComment[]
  attachments: ProjectAttachment[]
  activities: ProjectActivity[]
}

export type ProjectList = {
  id: number
  name: string
  position: number
  cards: ProjectCardSummary[]
}

export type ProjectBoard = {
  id: number
  name: string
  description: string | null
  background: string
  is_starred: boolean
  archived_at: string | null
  labels: ProjectLabel[]
  lists: ProjectList[]
}

export type BoardIndexItem = {
  id: number
  name: string
  description: string | null
  background: string
  is_starred: boolean
  archived_at: string | null
  lists_count: number
  cards_count: number
  updated_at: string | null
}

export type CanFlags = {
  create: boolean
  update: boolean
  delete: boolean
}
