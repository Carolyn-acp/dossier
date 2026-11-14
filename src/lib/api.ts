// Typed wrappers around our Supabase Edge Functions.
// supabase.functions.invoke automatically attaches the signed-in user's JWT.
import { supabase } from './supabase'
import type { FixSuggestion, Job, ParsedResume, SearchQuery } from '@/types/schemas'

async function invoke<TResponse>(name: string, body: Record<string, unknown>): Promise<TResponse> {
  const { data, error } = await supabase.functions.invoke<TResponse>(name, { body })
  if (error) throw error
  if (data === null) throw new Error(`Edge function "${name}" returned no data`)
  return data
}

export function parseResume(rawText: string): Promise<ParsedResume> {
  return invoke<ParsedResume>('parse-resume', { rawText })
}

export function searchJobs(query: SearchQuery): Promise<Job[]> {
  return invoke<Job[]>('search-jobs', { ...query })
}

export function generateFixes(resumeId: string, jobId: string): Promise<FixSuggestion> {
  return invoke<FixSuggestion>('generate-fixes', { resumeId, jobId })
}

/** End-to-end smoke test: returns hardcoded JSON from the call-llm function. */
export function pingLLM(): Promise<unknown> {
  return invoke<unknown>('call-llm', { test: true })
}
