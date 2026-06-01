-- Waterval Toetsen — Supabase schema
-- Voer dit uit in de Supabase SQL Editor van een nieuw project.
-- Schakel daarna "Anonymous Sign-ins" aan onder Authentication → Providers.

-- ──────────────── profiles ────────────────
create table if not exists public.profiles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  role        text not null check (role in ('kid','teacher')),
  naam        text,
  avatar      text,                  -- emoji (kid) of teacher-key (ann/sofie/tom/rik)
  bg          text,                  -- achtergrond-kleur (kid)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ──────────────── progress ────────────────
create table if not exists public.progress (
  user_id     uuid not null references auth.users (id) on delete cascade,
  node_id     text not null,
  stars       int  not null check (stars between 0 and 3),
  updated_at  timestamptz not null default now(),
  primary key (user_id, node_id)
);

-- ──────────────── teacher-content ────────────────
create table if not exists public.sources (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references auth.users (id) on delete cascade,
  stream      text not null check (stream in ('onthoudmap','contracten','werkbladen')),
  title       text not null,
  vak         text,                  -- wiskunde | nederlands | frans | null (vakoverschrijdend)
  leerjaar    int  not null default 5,
  file_name   text,
  storage_path text,                 -- als je de PDF/foto naar Supabase Storage upload
  created_at  timestamptz not null default now()
);

create table if not exists public.question_banks (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references auth.users (id) on delete cascade,
  leerjaar    int  not null default 5,
  status      text not null default 'draft' check (status in ('draft','published')),
  created_at  timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists public.questions (
  id          uuid primary key default gen_random_uuid(),
  bank_id     uuid not null references public.question_banks (id) on delete cascade,
  vak         text not null check (vak in ('wiskunde','nederlands','frans')),
  type        text not null check (type in ('mc','tf','fill','match')),
  onderdeel   text,
  q           text not null,
  payload     jsonb not null,        -- {options, answer, accept, pairs, suffix, theory}
  approved    boolean not null default true,
  position    int not null default 0
);

create index if not exists questions_bank_idx on public.questions (bank_id, position);

-- ──────────────── RLS ────────────────
alter table public.profiles      enable row level security;
alter table public.progress      enable row level security;
alter table public.sources       enable row level security;
alter table public.question_banks enable row level security;
alter table public.questions     enable row level security;

-- Profiles: eigenaar mag alles op zijn eigen rij.
drop policy if exists "profiles owner" on public.profiles;
create policy "profiles owner" on public.profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Progress: eigenaar mag alles.
drop policy if exists "progress owner" on public.progress;
create policy "progress owner" on public.progress
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());


-- Sources / banks: eigen leerkracht
drop policy if exists "sources owner" on public.sources;
create policy "sources owner" on public.sources
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

drop policy if exists "banks owner" on public.question_banks;
create policy "banks owner" on public.question_banks
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- Questions: leerkracht-eigenaar via bank.
drop policy if exists "questions owner" on public.questions;
create policy "questions owner" on public.questions
  for all
  using (exists (select 1 from public.question_banks b where b.id = questions.bank_id and b.teacher_id = auth.uid()))
  with check (exists (select 1 from public.question_banks b where b.id = questions.bank_id and b.teacher_id = auth.uid()));

-- Leerlingen mogen GEPUBLICEERDE banken & vragen lezen (read-only).
drop policy if exists "banks read published" on public.question_banks;
create policy "banks read published" on public.question_banks
  for select using (status = 'published');

drop policy if exists "questions read published" on public.questions;
create policy "questions read published" on public.questions
  for select using (
    exists (select 1 from public.question_banks b where b.id = questions.bank_id and b.status = 'published')
    and approved = true
  );
