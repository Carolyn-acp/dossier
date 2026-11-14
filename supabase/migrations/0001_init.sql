-- 0001_init: core tables, RLS, storage bucket, and the "review before submit" rule.
-- Column names are snake_case versions of the fields in src/types/schemas.ts.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- resumes  (ParsedResume)
-- ---------------------------------------------------------------------------

create table public.resumes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  label           text not null default 'Base resume',
  base_resume_id  uuid references public.resumes (id) on delete set null,
  raw_text        text not null default '',
  file_path       text,                               -- object path in the `resumes` bucket, if uploaded
  contact         jsonb not null default '{"name":"","email":"","links":[]}'::jsonb,
  summary         text,
  education       jsonb not null default '[]'::jsonb,
  skills          jsonb not null default '{"technical":[],"tools":[],"soft":[]}'::jsonb,
  experience      jsonb not null default '[]'::jsonb,
  projects        jsonb not null default '[]'::jsonb,
  certifications  text[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index resumes_user_id_idx on public.resumes (user_id);

-- ---------------------------------------------------------------------------
-- jobs  (Job) — shared across users, written only by Edge Functions (service role)
-- ---------------------------------------------------------------------------

create table public.jobs (
  id                   uuid primary key default gen_random_uuid(),
  source               text not null,                 -- "mycareersfuture" | "adzuna" | "manual" ...
  source_id            text not null,
  title                text not null,
  company              text not null default '',
  location             text not null default '',
  remote               text not null default 'unknown'
                         check (remote in ('onsite', 'hybrid', 'remote', 'unknown')),
  type                 text not null default 'unknown'
                         check (type in ('internship', 'full-time', 'part-time', 'contract', 'unknown')),
  description          text not null default '',
  requirements         text[],
  skills               text[] not null default '{}',
  categories           text[],
  duration_months      integer,
  salary               jsonb,                         -- { min?, max?, currency, period }
  min_years_experience numeric,
  vacancies            integer,
  company_uen          text,
  posted_at            timestamptz,
  expires_at           timestamptz,
  apply_url            text not null default '',
  raw                  jsonb,                         -- original API payload
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (source, source_id)
);

create index jobs_skills_idx on public.jobs using gin (skills);

-- ---------------------------------------------------------------------------
-- matches  (MatchResult)
-- ---------------------------------------------------------------------------

create table public.matches (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  resume_id       uuid not null references public.resumes (id) on delete cascade,
  job_id          uuid not null references public.jobs (id) on delete cascade,
  score           integer not null check (score between 0 and 100),
  matched_skills  text[] not null default '{}',
  missing_skills  text[] not null default '{}',
  reasons         text[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (resume_id, job_id)
);

create index matches_user_id_idx on public.matches (user_id);

-- ---------------------------------------------------------------------------
-- fix_suggestions  (FixSuggestion)
-- ---------------------------------------------------------------------------

create table public.fix_suggestions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  resume_id           uuid not null references public.resumes (id) on delete cascade,
  job_id              uuid not null references public.jobs (id) on delete cascade,
  missing_keywords    jsonb not null default '[]'::jsonb,   -- { keyword, importance, tip }[]
  bullet_rewrites     jsonb not null default '[]'::jsonb,   -- { section, itemIndex, bulletIndex, original, suggested, reason }[]
  overall_note        text not null default '',
  tailored_resume_id  uuid references public.resumes (id) on delete set null,
  cover_letter        text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index fix_suggestions_user_id_idx on public.fix_suggestions (user_id);

-- ---------------------------------------------------------------------------
-- applications  (Application)
-- ---------------------------------------------------------------------------

create table public.applications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  job_id        uuid not null references public.jobs (id) on delete cascade,
  resume_id     uuid not null references public.resumes (id) on delete restrict,
  status        text not null default 'saved'
                  check (status in ('saved', 'prepared', 'reviewed', 'submitted', 'rejected', 'interview')),
  prepared      jsonb,                                -- { coverLetter?, answers: { question, answer }[] }
  reviewed_at   timestamptz,
  submitted_at  timestamptz,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index applications_user_id_idx on public.applications (user_id);

-- Human review is mandatory: an application can never be 'submitted' without reviewed_at.
-- Enforced in the trigger below (covers INSERT and UPDATE, gives a clear error message).
create or replace function public.enforce_review_before_submit()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'submitted' and new.reviewed_at is null then
    raise exception 'Application % cannot be submitted before it has been reviewed (reviewed_at is null)', new.id
      using errcode = 'check_violation';
  end if;
  if new.status = 'submitted' and new.submitted_at is null then
    new.submitted_at = now();
  end if;
  return new;
end;
$$;

create trigger applications_review_before_submit
  before insert or update on public.applications
  for each row execute function public.enforce_review_before_submit();

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create trigger resumes_set_updated_at         before update on public.resumes         for each row execute function public.set_updated_at();
create trigger jobs_set_updated_at            before update on public.jobs            for each row execute function public.set_updated_at();
create trigger matches_set_updated_at         before update on public.matches         for each row execute function public.set_updated_at();
create trigger fix_suggestions_set_updated_at before update on public.fix_suggestions for each row execute function public.set_updated_at();
create trigger applications_set_updated_at    before update on public.applications    for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.resumes         enable row level security;
alter table public.jobs            enable row level security;
alter table public.matches         enable row level security;
alter table public.fix_suggestions enable row level security;
alter table public.applications    enable row level security;

-- Users can only see and change their own rows.
create policy "own resumes" on public.resumes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own matches" on public.matches
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own fix_suggestions" on public.fix_suggestions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own applications" on public.applications
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Jobs: any signed-in user can read. No insert/update/delete policies, so only the
-- service role (which bypasses RLS, used inside Edge Functions) can write.
create policy "authenticated can read jobs" on public.jobs
  for select to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Storage: private `resumes` bucket, each user limited to the folder "<user_id>/..."
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

create policy "own resume files" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
