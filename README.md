# Dossier

A web app that helps students apply to internships (Singapore focus):

1. Upload a resume → parse it into structured JSON
2. Find jobs (MyCareersFuture + Adzuna) → rank them by match
3. Suggest fixes per job (missing keywords, bullet rewrites)
4. Human review before an application is marked submitted. **The app never auto-submits.**

**Stack:** Vue 3 + Vite + TypeScript, Pinia, Vue Router, Tailwind CSS · Supabase (Auth, Postgres, Storage, Edge Functions) · LLM calls only from Edge Functions.

Shared types live in [`src/types/schemas.ts`](src/types/schemas.ts). This file is the single source of truth for both the frontend and the Edge Functions. Talk to each other before changing it.

## Prerequisites

- Node.js ≥ 22.18 (or ≥ 24.12) and [pnpm](https://pnpm.io/installation)
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) (`scoop install supabase`, `brew install supabase/tap/supabase`, or `pnpm dlx supabase <cmd>`)
- Docker Desktop, only if you want to run Supabase locally (`supabase start`)
- An Anthropic API key, plus an Adzuna app id/key from <https://developer.adzuna.com> (optional: search still works with MyCareersFuture only)

## 1. Create the Supabase project

1. Create a project at <https://supabase.com/dashboard>. Choose the Singapore region (`ap-southeast-1`).
2. Link this repo to it:
   ```sh
   supabase login
   supabase link --project-ref <your-project-ref>
   ```
3. In **Authentication → URL Configuration**, set the Site URL to `http://localhost:5173` for development.
   If email confirmation is on (the default for hosted projects), new users must click the email link before they can sign in.

## 2. Run migrations

```sh
supabase db push            # applies supabase/migrations/* to the linked project
```

This creates the `resumes`, `jobs`, `matches`, `fix_suggestions` and `applications` tables. It also enables RLS on all of them, creates the private `resumes` storage bucket (files go under `<user_id>/...`), and adds the trigger that blocks `status = 'submitted'` unless `reviewed_at` is set.

Locally: `supabase start`, then `supabase db reset` re-applies all migrations.

## 3. Set function secrets

```sh
cp supabase/.env.example supabase/.env     # fill in the values
supabase secrets set --env-file supabase/.env
# or one at a time:
supabase secrets set LLM_PROVIDER=anthropic LLM_API_KEY=sk-ant-... LLM_MODEL=claude-opus-5-5
supabase secrets set ADZUNA_APP_ID=... ADZUNA_APP_KEY=...
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically. These secrets are never sent to the browser.

## 4. Deploy Edge Functions

```sh
supabase functions deploy            # deploys every function in supabase/functions/
# or one: supabase functions deploy search-jobs
```

| Function         | Body                         | Returns                                   |
| ---------------- | ---------------------------- | ----------------------------------------- |
| `call-llm`       | `{ "test": true }` / `{ "live": true }` | hardcoded JSON / a tiny real LLM call |
| `parse-resume`   | `{ rawText }`                | `ParsedResume` (stub)                     |
| `search-jobs`    | `SearchQuery`                | `Job[]` (MyCareersFuture + Adzuna)        |
| `generate-fixes` | `{ resumeId, jobId }`        | `FixSuggestion` (stub)                    |

Every function requires a signed-in user's JWT, which `supabase.functions.invoke` sends automatically.
Local testing: `supabase functions serve --env-file supabase/.env`.

Smoke test from the browser console once you're signed in:
`(await import('/src/lib/api.ts')).pingLLM().then(console.log)`

## 5. Run the frontend

```sh
cp .env.example .env    # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (Project Settings → API)
pnpm install
pnpm dev                # http://localhost:5173
```

Other scripts: `pnpm build`, `pnpm type-check`, `pnpm lint`, `pnpm format`.

## Project layout

```
src/
  types/schemas.ts        shared types + mock data (source of truth)
  lib/supabase.ts         supabase-js client
  lib/api.ts              typed Edge Function wrappers
  stores/auth.ts          session, signIn, signUp, signOut
  router/index.ts         routes + auth guard
  layouts/AppLayout.vue   navbar + <RouterView/>
  views/LoginPage.vue     email/password auth
  features/
    resume/  jobs/        Person A
    fixes/   applications/ Person B
supabase/
  migrations/0001_init.sql
  functions/
    _shared/              cors, auth/http wrapper, llm, skills normaliser, types re-export
    call-llm/  parse-resume/  search-jobs/(adapters/)  generate-fixes/
```

## Who owns what

| Person   | Frontend                              | Edge Functions                    |
| -------- | ------------------------------------- | --------------------------------- |
| Person A | `src/features/resume`, `src/features/jobs` | `parse-resume`, `search-jobs` |
| Person B | `src/features/fixes`, `src/features/applications` | `generate-fixes`        |

Shared (change together, in small PRs): `src/types/schemas.ts`, `src/lib/*`, `src/router/*`, `supabase/migrations/*`, `supabase/functions/_shared/*`.

Add new migrations as new files (`0002_...sql`). Never edit one that has already been pushed.
