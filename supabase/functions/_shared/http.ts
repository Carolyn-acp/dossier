// Shared request plumbing: CORS preflight, caller JWT check, JSON body parsing, error mapping.
import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2.119.0'
import { corsHeaders } from './cors.ts'

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export interface HandlerContext {
  user: User
  /** Supabase client acting as the caller: queries are subject to RLS. */
  supabase: SupabaseClient
  body: unknown
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function authenticate(req: Request): Promise<{ user: User; supabase: SupabaseClient }> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) throw new HttpError(401, 'Missing bearer token')

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data, error } = await supabase.auth.getUser(authHeader.slice('Bearer '.length))
  if (error || !data.user) throw new HttpError(401, 'Invalid or expired token')
  return { user: data.user, supabase }
}

/** Wraps Deno.serve with CORS, auth, JSON parsing and consistent error responses. */
export function serve(handler: (ctx: HandlerContext) => Promise<unknown>) {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    try {
      if (req.method !== 'POST') throw new HttpError(405, 'Use POST')
      const { user, supabase } = await authenticate(req)
      let body: unknown
      try {
        body = await req.json()
      } catch {
        throw new HttpError(400, 'Request body must be JSON')
      }
      return json(await handler({ user, supabase, body }))
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status)
      console.error(err)
      return json({ error: err instanceof Error ? err.message : 'Internal error' }, 500)
    }
  })
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
