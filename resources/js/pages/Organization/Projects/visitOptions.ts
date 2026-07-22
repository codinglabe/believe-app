/** Shared Inertia options so board mutations never full-remount the Kanban page. */
export const boardPartial = {
  preserveScroll: true,
  preserveState: true,
  showProgress: false,
  only: [
    'board',
    'activeCard',
    'assignableUsers',
    'filters',
    'can',
    'organization',
    'backgrounds',
    'flash',
    'success',
    'error',
  ],
} as const

export const cardPartial = {
  preserveScroll: true,
  preserveState: true,
  showProgress: false,
  only: ['activeCard', 'board', 'flash', 'success', 'error'],
} as const
