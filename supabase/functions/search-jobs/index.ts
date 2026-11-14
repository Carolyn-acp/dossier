// Accepts a SearchQuery and returns Job[] aggregated from all sources.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { HttpError, isRecord, serve } from '../_shared/http.ts'
import type { Job, SearchQuery } from '../_shared/types.ts'
import { searchMyCareersFuture } from './adapters/mycareersfuture.ts'
import { searchAdzuna } from './adapters/adzuna.ts'

function parseQuery(body: unknown): SearchQuery {
  if (!isRecord(body) || !Array.isArray(body.keywords)) {
    throw new HttpError(400, 'Expected a SearchQuery: { keywords: string[], ... }')
  }
  const keywords = body.keywords.filter((k): k is string => typeof k === 'string' && !!k.trim())
  if (keywords.length === 0) throw new HttpError(400, 'keywords must contain at least one string')
  return { ...(body as unknown as SearchQuery), keywords }
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** Dedupe by `${source}:${sourceId}`, then across sources by normalised title + company. */
function dedupe(jobs: Job[]): Job[] {
  const seen = new Set<string>()
  return jobs.filter((job) => {
    const keys = [`${job.source}:${job.sourceId}`, `${norm(job.title)}|${norm(job.company)}`]
    if (keys.some((k) => seen.has(k))) return false
    keys.forEach((k) => seen.add(k))
    return true
  })
}

serve(async ({ body }): Promise<Job[]> => {
  const query = parseQuery(body)

  const results = await Promise.allSettled([searchMyCareersFuture(query), searchAdzuna(query)])
  const jobs: Job[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') jobs.push(...r.value)
    else console.error('job source failed:', r.reason)
  }

  // Only drop jobs whose type/remote is known and different; "unknown" is kept.
  const filtered = jobs.filter(
    (j) =>
      (!query.type || j.type === 'unknown' || j.type === query.type) &&
      (!query.remote || j.remote === 'unknown' || j.remote === query.remote),
  )

  // TODO: upsert into `jobs` (service-role client, onConflict: 'source,source_id') and return
  //       rows with their DB uuid as Job.id. Until then Job.id is `${source}:${sourceId}`.
  // TODO: rank by match against query.fromResumeId (feature 2).
  return dedupe(filtered)
})
