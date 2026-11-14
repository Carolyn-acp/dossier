// Accepts { resumeId, jobId } and returns a FixSuggestion-shaped object.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { HttpError, isRecord, serve } from '../_shared/http.ts'
import type { FixSuggestion } from '../_shared/types.ts'

serve(async ({ body }): Promise<FixSuggestion> => {
  if (!isRecord(body) || typeof body.resumeId !== 'string' || typeof body.jobId !== 'string') {
    throw new HttpError(400, 'Expected { resumeId: string, jobId: string }')
  }

  // TODO (Person B): real implementation
  //   1. Load the resume and job with the RLS-scoped `supabase` client (404 if not found)
  //   2. callLLM({ system: <fix prompt>, prompt: resume + job, jsonSchemaHint: <FixSuggestion> })
  //   3. Validate with Zod, insert into `fix_suggestions`, return it
  return {
    jobId: body.jobId,
    resumeId: body.resumeId,
    createdAt: new Date().toISOString(),
    missingKeywords: [],
    bulletRewrites: [],
    overallNote: 'Stub response: generate-fixes is not implemented yet.',
  }
})
