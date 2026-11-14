// Accepts { rawText } and returns a ParsedResume-shaped object.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { HttpError, isRecord, serve } from '../_shared/http.ts'
import type { ParsedResume } from '../_shared/types.ts'

serve(async ({ user, body }): Promise<ParsedResume> => {
  if (!isRecord(body) || typeof body.rawText !== 'string' || !body.rawText.trim()) {
    throw new HttpError(400, 'Expected { rawText: string }')
  }
  const rawText = body.rawText

  // TODO (Person A): real implementation
  //   1. callLLM({ system: <resume-parsing prompt>, prompt: rawText, jsonSchemaHint: <ParsedResume minus ids> })
  //   2. Validate with Zod, then run every skills list through normaliseSkills() from _shared/skills.ts
  //   3. Insert into `resumes` via the RLS-scoped `supabase` client and return the stored row
  return {
    id: crypto.randomUUID(),
    userId: user.id,
    label: 'Base resume',
    baseResumeId: null,
    createdAt: new Date().toISOString(),
    rawText,
    contact: { name: '', email: user.email ?? '', links: [] },
    education: [],
    skills: { technical: [], tools: [], soft: [] },
    experience: [],
    projects: [],
    certifications: [],
  }
})
