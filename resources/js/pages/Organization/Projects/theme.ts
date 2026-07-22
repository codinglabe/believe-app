/**
 * Organization Project Management — brand matches sidebar logo
 * (`site-title.tsx`: purple-600 → blue-600).
 */
export const pm = {
  btn: 'text-white bg-gradient-to-r from-purple-600 to-blue-600 shadow-sm hover:from-purple-500 hover:to-blue-500',
  btnSm: 'text-white bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-400 hover:to-blue-500',
  btnOutline:
    'border border-purple-500/40 text-purple-600 hover:bg-purple-500/10 dark:text-purple-400 dark:border-purple-400/35',
  tabActive: 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm',
  text: 'text-purple-600 dark:text-purple-400',
  textStrong: 'text-blue-600 dark:text-blue-400',
  titleGradient: 'bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent',
  border: 'border border-purple-500/20',
  surface: 'bg-purple-500/10 border border-purple-500/30',
  surfaceSoft: 'bg-purple-500/5 border border-purple-500/20',
  progress: 'bg-gradient-to-r from-purple-500 to-blue-500',
} as const

export const boardBackgrounds: Record<string, string> = {
  'purple-blue': 'bg-gradient-to-br from-purple-600 via-purple-700 to-blue-700',
  'blue-indigo': 'bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-800',
  slate: 'bg-gradient-to-br from-slate-600 via-slate-700 to-slate-900',
  rose: 'bg-gradient-to-br from-rose-500 via-pink-600 to-fuchsia-700',
  emerald: 'bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700',
  amber: 'bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600',
}

export const labelColors: Record<string, string> = {
  purple: 'bg-purple-500',
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  yellow: 'bg-amber-400',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  pink: 'bg-pink-500',
  sky: 'bg-sky-500',
  gray: 'bg-slate-400',
}

export const coverColors = [
  'purple',
  'blue',
  'green',
  'yellow',
  'orange',
  'red',
  'pink',
  'sky',
  'gray',
] as const
