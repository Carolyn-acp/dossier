// Adzuna job search API, country "sg". Needs ADZUNA_APP_ID and ADZUNA_APP_KEY (Edge Function secrets).
// Docs: https://developer.adzuna.com/docs/search
//
// Notes:
//  - `description` is a TRUNCATED SNIPPET, not the full ad. For keyword gaps / fixes, the full text
//    has to come from the employer page (redirect_url) or be treated as partial.
//  - Adzuna has no skills field; Job.skills is empty until we extract skills via the LLM.
//  - TODO(verify): salary period for SG results (we don't assume annual; period = "unknown").
//  - TODO(verify): field names below against a real response (kept defensive; payload in Job.raw).
import type { Job, SearchQuery } from '../../_shared/types.ts'
import { normaliseSkills } from '../../_shared/skills.ts'
import { get, guessJobType, num, str, stripHtml, toIsoDate } from './util.ts'

const SOURCE = 'adzuna'

export async function searchAdzuna(query: SearchQuery, limit = 20): Promise<Job[]> {
  const appId = Deno.env.get('ADZUNA_APP_ID')
  const appKey = Deno.env.get('ADZUNA_APP_KEY')
  if (!appId || !appKey) {
    console.warn('Adzuna skipped: ADZUNA_APP_ID / ADZUNA_APP_KEY not set')
    return []
  }

  const url = new URL('https://api.adzuna.com/v1/api/jobs/sg/search/1')
  url.searchParams.set('app_id', appId)
  url.searchParams.set('app_key', appKey)
  url.searchParams.set('what', query.keywords.join(' '))
  if (query.location) url.searchParams.set('where', query.location)
  url.searchParams.set('results_per_page', String(limit))

  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  // Don't echo the URL: it contains the app key.
  if (!res.ok) throw new Error(`Adzuna ${res.status}: ${await res.text()}`)
  const payload: unknown = await res.json()

  const items = get(payload, 'results')
  if (!Array.isArray(items)) {
    console.warn('Adzuna: unexpected response shape', JSON.stringify(payload).slice(0, 500))
    return []
  }
  return items.map(mapAdzunaJob).filter((j): j is Job => j !== null)
}

export function mapAdzunaJob(item: unknown): Job | null {
  const sourceId = str(get(item, 'id'))
  const title = str(get(item, 'title'))
  if (!sourceId || !title) return null

  const salaryMin = num(get(item, 'salary_min'))
  const salaryMax = num(get(item, 'salary_max'))
  const category = str(get(item, 'category', 'label'))

  return {
    id: `${SOURCE}:${sourceId}`,
    source: SOURCE,
    sourceId,
    title: stripHtml(title), // Adzuna sometimes wraps matched terms in <strong>
    company: str(get(item, 'company', 'display_name')) ?? '',
    location: str(get(item, 'location', 'display_name')) ?? 'Singapore',
    remote: 'unknown',
    type: guessJobType(
      [str(get(item, 'contract_time')) ?? '', str(get(item, 'contract_type')) ?? ''],
      title,
    ),
    description: stripHtml(str(get(item, 'description')) ?? ''), // truncated snippet
    skills: normaliseSkills([]), // TODO: LLM skill extraction from description
    categories: category ? [category] : undefined,
    salary:
      salaryMin !== undefined || salaryMax !== undefined
        ? { min: salaryMin, max: salaryMax, currency: 'SGD', period: 'unknown' }
        : undefined,
    postedAt: toIsoDate(get(item, 'created')),
    applyUrl: str(get(item, 'redirect_url')) ?? '',
    raw: item,
  }
}
