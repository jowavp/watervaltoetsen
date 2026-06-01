-- Migration 008: auth-redesign.
-- Iedereen logt in met Google. teacher_emails-allowlist bepaalt wie leerkracht is.
-- Niet-leerkrachten zijn automatisch leerlingen. Leerkrachten kunnen wisselen
-- tussen teacher- en leerling-preview-modus → dubbel profiel via PK (user_id, role).
-- Idempotent.

-- ──────────────── teacher_emails (allowlist) ────────────────
create table if not exists public.teacher_emails (
  email      text primary key,
  added_by   uuid references auth.users (id) on delete set null,
  added_at   timestamptz not null default now()
);

alter table public.teacher_emails enable row level security;

-- Iedereen die ingelogd is mag de lijst lezen (nodig om role te bepalen).
-- Schrijven gebeurt uitsluitend via service_role / Supabase Table Editor —
-- geen RLS write-policy.
drop policy if exists "teacher_emails read all auth" on public.teacher_emails;
create policy "teacher_emails read all auth" on public.teacher_emails
  for select using (auth.role() = 'authenticated');

-- ──────────────── profiles: PK migratie + leerjaar ────────────────
alter table public.profiles
  add column if not exists leerjaar int check (leerjaar between 1 and 6);

-- PK omzetten van (user_id) naar (user_id, role) — alleen als nog niet gebeurd.
do $$
declare
  pk_has_role boolean;
begin
  select exists (
    select 1
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
    where c.conrelid = 'public.profiles'::regclass
      and c.contype = 'p'
      and a.attname = 'role'
  ) into pk_has_role;

  if not pk_has_role then
    -- Eventuele dubbele (user_id, role) opruimen voor we de unique opleggen
    -- (zou niet mogen voorkomen omdat user_id momenteel uniek is, maar safe).
    delete from public.profiles a
    using public.profiles b
    where a.ctid < b.ctid
      and a.user_id = b.user_id
      and a.role    = b.role;

    alter table public.profiles drop constraint if exists profiles_pkey;
    alter table public.profiles add primary key (user_id, role);
  end if;
end $$;

-- RLS-policy hercreëren (PK-change zou hem moeten ongemoeid laten, maar safe).
drop policy if exists "profiles owner" on public.profiles;
create policy "profiles owner" on public.profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ──────────────── vakken.quiz_size + test_date (safety) ────────────────
-- test_date kwam normaal uit migration 006 — voor het geval die overgeslagen
-- werd nemen we hem hier defensief ook mee. Beide ADD COLUMN IF NOT EXISTS
-- zijn no-ops als de kolom al bestaat.
alter table public.vakken
  add column if not exists test_date date;
alter table public.vakken
  add column if not exists quiz_size int not null default 10
    check (quiz_size between 1 and 50);
