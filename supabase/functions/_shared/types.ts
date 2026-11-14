// Re-export the shared app types so Edge Functions use the same single source of truth.
// NOTE: this imports from outside supabase/functions. Recent Supabase CLI versions bundle
// relative imports on deploy; if `supabase functions deploy` ever fails to resolve it,
// copy src/types/schemas.ts into this folder instead.
export type * from '../../../src/types/schemas.ts'
