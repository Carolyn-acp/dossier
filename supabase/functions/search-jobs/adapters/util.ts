import type { Job } from '../../_shared/types.ts'

/** Plain text from an HTML fragment: drops tags, decodes common entities, collapses whitespace. */
export function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim()
}

/** Safe nested lookup: get(obj, 'a', 'b') === obj?.a?.b, without throwing on bad shapes. */
export function get(obj: unknown, ...path: (string | number)[]): unknown {
  let cur: unknown = obj
  for (const key of path) {
    if (cur === null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string | number, unknown>)[key]
  }
  return cur
}

export function str(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number') return String(value)
  return undefined
}

export function num(value: unknown): number | undefined {
  const n = typeof value === 'string' && value.trim() ? Number(value) : value
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined
}

/** Collects strings from an array of strings or objects (reading `key` from objects). */
export function strList(value: unknown, key?: string): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((v) => (typeof v === 'string' ? v : key ? str(get(v, key)) : undefined))
    .filter((v): v is string => !!v)
}

export function toIsoDate(value: unknown): string | undefined {
  const s = str(value)
  if (!s) return undefined
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

/** Best-effort mapping from free-text employment type (+ title) to Job["type"]. */
export function guessJobType(texts: string[], title: string): Job['type'] {
  const t = [...texts, title].join(' ').toLowerCase()
  if (/intern|traineeship|attachment/.test(t)) return 'internship'
  if (/part[\s_-]?time/.test(t)) return 'part-time'
  if (/contract|temporary|freelance/.test(t)) return 'contract'
  if (/full[\s_-]?time|permanent/.test(t)) return 'full-time'
  return 'unknown'
}
