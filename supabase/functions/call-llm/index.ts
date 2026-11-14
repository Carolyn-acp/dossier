// Thin smoke-test endpoint for the frontend -> Edge Function -> LLM path.
//   { "test": true }  -> hardcoded JSON (verifies CORS + auth + deploy, no LLM call)
//   { "live": true }  -> tiny real LLM call (verifies LLM_API_KEY / LLM_MODEL)
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { HttpError, isRecord, serve } from '../_shared/http.ts'
import { callLLM } from '../_shared/llm.ts'

serve(async ({ user, body }) => {
  if (!isRecord(body)) throw new HttpError(400, 'Body must be a JSON object')

  if (body.test === true) {
    return { ok: true, source: 'hardcoded', userId: user.id, message: 'call-llm is reachable' }
  }

  if (body.live === true) {
    const result = await callLLM<{ ok: boolean }>({
      system: 'You are a health check.',
      prompt: 'Return {"ok": true}.',
      jsonSchemaHint: '{ "ok": boolean }',
      maxTokens: 1024,
    })
    return { ok: true, source: 'llm', result }
  }

  throw new HttpError(400, 'Send { "test": true } or { "live": true }')
})
