// MyCareersFuture (Singapore government job portal). Public endpoint, no API key.
//
// !! There is no official schema for this endpoint. Field names below were checked against ONE
// !! sample response (GET ?search=software%20intern&limit=1&page=0, 2026-11-14). Every read is
// !! still defensive and the full payload is kept in Job.raw. Verify against more results:
//
//   TODO(verify): query params    - `search` / `limit` / `page` worked in the sample; is `page` 0-based?
//                                   Are there server-side filters (employment type, category)?
//   TODO(verify): salary          - `salary.minimum` / `.maximum`, period `salary.type.salaryType`
//                                   ("Monthly" seen; other values unseen). `metadata.isHideSalary`
//                                   may mean these are placeholders.
//   TODO(verify): skills          - `skills[].skill` (long phrases like "Written and Verbal
//                                   Communication Abilities"; `isKeySkill` flag exists, unused).
//   TODO(verify): categories      - `categories[].category`.
//   TODO(verify): employment type - `employmentTypes[].employmentType`. An intern role came back as
//                                   "Full Time", so the title is also checked for "intern".
//   TODO(verify): job URL         - `metadata.jobDetailsUrl` (fallback URL pattern is a guess).
//   TODO(verify): expiry date     - `metadata.expiryDate` ("YYYY-MM-DD", no timezone; parsed as UTC).
//   TODO(verify): company         - `hiringCompany` was null; `postedCompany` had name + uen. When
//                                   `metadata.isPostedOnBehalf` is true, which one is the employer?
//   TODO(verify): remote          - only `flexibleWorkArrangements[]` ("Flexi-Hours") seen; no clear
//                                   onsite/hybrid/remote field, so remote stays "unknown".
import type { Job, SearchQuery } from '../../_shared/types.ts'
import { normaliseSkills } from '../../_shared/skills.ts'
import { get, guessJobType, num, str, strList, stripHtml, toIsoDate } from './util.ts'

const ENDPOINT = 'https://api.mycareersfuture.gov.sg/v2/jobs'
const SOURCE = 'mycareersfuture'

export async function searchMyCareersFuture(query: SearchQuery, limit = 20): Promise<Job[]> {
  const url = new URL(ENDPOINT)
  url.searchParams.set('search', query.keywords.join(' ')) // TODO(verify) param name
  url.searchParams.set('limit', String(limit)) //              TODO(verify) param name
  url.searchParams.set('page', '0') //                          TODO(verify) param name / 0- or 1-based

  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`MyCareersFuture ${res.status}: ${await res.text()}`)
  const payload: unknown = await res.json()

  const items = Array.isArray(payload)
    ? payload
    : ((get(payload, 'results') ?? get(payload, 'data')) as unknown)
  if (!Array.isArray(items)) {
    console.warn(
      'MyCareersFuture: unexpected response shape',
      JSON.stringify(payload).slice(0, 500),
    )
    return []
  }

  return items.map(mapMcfJob).filter((j): j is Job => j !== null)
}

export function mapMcfJob(item: unknown): Job | null {
  const sourceId = str(get(item, 'uuid')) ?? str(get(item, 'metadata', 'jobPostId'))
  const title = str(get(item, 'title'))
  if (!sourceId || !title) return null // can't dedupe or display without these

  const employmentTypes = strList(get(item, 'employmentTypes'), 'employmentType')
  const salaryMin = num(get(item, 'salary', 'minimum'))
  const salaryMax = num(get(item, 'salary', 'maximum'))
  const salaryPeriodText = (str(get(item, 'salary', 'type', 'salaryType')) ?? '').toLowerCase()

  return {
    id: `${SOURCE}:${sourceId}`,
    source: SOURCE,
    sourceId,
    title,
    company:
      str(get(item, 'hiringCompany', 'name')) ?? str(get(item, 'postedCompany', 'name')) ?? '',
    location: mcfLocation(item),
    remote: 'unknown', // see TODO(verify) remote above
    type: guessJobType(employmentTypes, title),
    description: stripHtml(str(get(item, 'description')) ?? ''),
    skills: normaliseSkills(strList(get(item, 'skills'), 'skill')),
    categories: strList(get(item, 'categories'), 'category'),
    salary:
      salaryMin !== undefined || salaryMax !== undefined
        ? {
            min: salaryMin,
            max: salaryMax,
            currency: 'SGD',
            period: salaryPeriodText.includes('month')
              ? 'month'
              : salaryPeriodText.includes('year') || salaryPeriodText.includes('annual')
                ? 'year'
                : salaryPeriodText.includes('hour')
                  ? 'hour'
                  : 'unknown',
          }
        : undefined,
    minYearsExperience: num(get(item, 'minimumYearsExperience')),
    vacancies: num(get(item, 'numberOfVacancies')),
    companyUen: str(get(item, 'hiringCompany', 'uen')) ?? str(get(item, 'postedCompany', 'uen')),
    postedAt: toIsoDate(get(item, 'metadata', 'newPostingDate')),
    expiresAt: toIsoDate(get(item, 'metadata', 'expiryDate')),
    applyUrl:
      str(get(item, 'metadata', 'jobDetailsUrl')) ??
      `https://www.mycareersfuture.gov.sg/job/${encodeURIComponent(sourceId)}`, // TODO(verify) URL pattern
    raw: item,
  }
}

/** "Central, Singapore" from address.districts[0].region; overseas / missing -> best effort. */
function mcfLocation(item: unknown): string {
  if (get(item, 'address', 'isOverseas') === true) {
    return str(get(item, 'address', 'overseasCountry')) ?? 'Overseas'
  }
  const region = str(get(item, 'address', 'districts', 0, 'region'))
  return region ? `${region}, Singapore` : 'Singapore'
}
