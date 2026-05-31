-- Migration 002: vakken-beheer per leerjaar, vragen-CRUD, generatie-wachtrij.
-- Idempotent: kan veilig opnieuw uitgevoerd worden in de SQL Editor.

-- ──────────────── vakken (global, per leerjaar) ────────────────
create table if not exists public.vakken (
  id          uuid primary key default gen_random_uuid(),
  leerjaar    int  not null check (leerjaar between 1 and 6),
  key         text not null,                       -- stabiele key, bv. 'wiskunde'
  naam        text not null,
  kleur       text not null default '#1fa9ce',     -- accent color
  tint        text not null default '#e4f5fb',     -- bg tint
  icon        text,                                -- emoji of svg-key
  active      boolean not null default true,
  sort_order  int  not null default 0,
  created_by  uuid references auth.users (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (leerjaar, key)
);

create index if not exists vakken_leerjaar_idx on public.vakken (leerjaar, sort_order);

alter table public.vakken enable row level security;

-- Iedereen die ingelogd is (incl. anonymous leerlingen) mag lezen.
drop policy if exists "vakken read all auth" on public.vakken;
create policy "vakken read all auth" on public.vakken
  for select using (auth.role() = 'authenticated');

-- Leerkrachten (= elke ingelogde gebruiker in dit MVP) mogen schrijven.
-- Bij introductie van een rol-systeem: deze policy aanscherpen.
drop policy if exists "vakken write all auth" on public.vakken;
create policy "vakken write all auth" on public.vakken
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Seed: de drie bestaande vakken voor leerjaar 5, enkel als ze nog niet bestaan.
insert into public.vakken (leerjaar, key, naam, kleur, tint, icon, sort_order) values
  (5, 'wiskunde',   'Wiskunde',   '#1fa9ce', '#e4f5fb', '🔢', 1),
  (5, 'nederlands', 'Nederlands', '#9b8cff', '#efecff', '📖', 2),
  (5, 'frans',      'Frans',      '#5fbe82', '#e7f7ee', '🇫🇷', 3)
on conflict (leerjaar, key) do nothing;

-- ──────────────── questions: active toggle ────────────────
alter table public.questions
  add column if not exists active boolean not null default true;

-- Eveneens een `archived_at` voor zacht verwijderen (audit zonder data te wissen).
alter table public.questions
  add column if not exists archived_at timestamptz;

-- ──────────────── question_banks.status: pending_review toelaten ────────────────
do $$
begin
  -- drop oude check als die bestaat met enkel 'draft','published'
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.question_banks'::regclass
      and conname  = 'question_banks_status_check'
  ) then
    alter table public.question_banks drop constraint question_banks_status_check;
  end if;

  alter table public.question_banks
    add constraint question_banks_status_check
    check (status in ('draft','pending_review','published','archived'));
end $$;

-- ──────────────── generation_requests (wachtrij voor de cron) ────────────────
create table if not exists public.generation_requests (
  id            uuid primary key default gen_random_uuid(),
  teacher_id    uuid not null references auth.users (id) on delete cascade,
  leerjaar      int  not null check (leerjaar between 1 and 6),
  vak           text not null,                 -- key (matcht vakken.key voor dat leerjaar)
  num_questions int  not null default 10 check (num_questions between 1 and 100),
  status        text not null default 'queued'
                 check (status in ('queued','running','done','failed')),
  error         text,
  bank_id       uuid references public.question_banks (id),
  created_at    timestamptz not null default now(),
  started_at    timestamptz,
  completed_at  timestamptz
);

create index if not exists genreq_status_idx on public.generation_requests (status, created_at);
create index if not exists genreq_teacher_idx on public.generation_requests (teacher_id, created_at desc);

alter table public.generation_requests enable row level security;

-- Leerkracht ziet/maakt enkel eigen aanvragen.
drop policy if exists "genreq owner" on public.generation_requests;
create policy "genreq owner" on public.generation_requests
  for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- ──────────────── kleine helper: updated_at auto-touch op vakken ────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vakken_touch on public.vakken;
create trigger vakken_touch
  before update on public.vakken
  for each row execute function public.touch_updated_at();
