-- Migration 003: tighten RLS so anonymous (kid) sessions can only READ
-- teacher-managed content; only non-anonymous users (= Google-authenticated
-- leerkrachten) can INSERT/UPDATE/DELETE.
--
-- The JWT for anonymous Supabase sessions has `is_anonymous: true`.
-- We use that claim to discriminate.
--
-- Idempotent: drops + recreates policies, safe to re-run.

create or replace function public.is_non_anonymous()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
     and auth.uid() is not null
$$;

-- ──────────────── vakken ────────────────
drop policy if exists "vakken read all auth" on public.vakken;
drop policy if exists "vakken write all auth" on public.vakken;
drop policy if exists "vakken write teachers" on public.vakken;

create policy "vakken read all auth" on public.vakken
  for select using (auth.role() = 'authenticated');

create policy "vakken insert teachers" on public.vakken
  for insert with check (public.is_non_anonymous());
create policy "vakken update teachers" on public.vakken
  for update using (public.is_non_anonymous()) with check (public.is_non_anonymous());
create policy "vakken delete teachers" on public.vakken
  for delete using (public.is_non_anonymous());

-- ──────────────── sources ────────────────
drop policy if exists "sources owner" on public.sources;

create policy "sources select owner" on public.sources
  for select using (teacher_id = auth.uid());
create policy "sources insert teachers" on public.sources
  for insert with check (teacher_id = auth.uid() and public.is_non_anonymous());
create policy "sources update teachers" on public.sources
  for update using (teacher_id = auth.uid() and public.is_non_anonymous())
  with check (teacher_id = auth.uid() and public.is_non_anonymous());
create policy "sources delete teachers" on public.sources
  for delete using (teacher_id = auth.uid() and public.is_non_anonymous());

-- ──────────────── question_banks ────────────────
drop policy if exists "banks owner" on public.question_banks;

create policy "banks select owner" on public.question_banks
  for select using (teacher_id = auth.uid());
create policy "banks insert teachers" on public.question_banks
  for insert with check (teacher_id = auth.uid() and public.is_non_anonymous());
create policy "banks update teachers" on public.question_banks
  for update using (teacher_id = auth.uid() and public.is_non_anonymous())
  with check (teacher_id = auth.uid() and public.is_non_anonymous());
create policy "banks delete teachers" on public.question_banks
  for delete using (teacher_id = auth.uid() and public.is_non_anonymous());

-- Leerlingen lezen gepubliceerde banken (read-only).
-- "banks read published" was al gedefinieerd in schema.sql, hier voor de
-- volledigheid + idempotency opnieuw aangemaakt.
drop policy if exists "banks read published" on public.question_banks;
create policy "banks read published" on public.question_banks
  for select using (status = 'published');

-- ──────────────── questions ────────────────
drop policy if exists "questions owner" on public.questions;

create policy "questions select owner" on public.questions
  for select
  using (exists (select 1 from public.question_banks b where b.id = questions.bank_id and b.teacher_id = auth.uid()));
create policy "questions insert teachers" on public.questions
  for insert with check (
    public.is_non_anonymous()
    and exists (select 1 from public.question_banks b where b.id = questions.bank_id and b.teacher_id = auth.uid())
  );
create policy "questions update teachers" on public.questions
  for update
  using (
    public.is_non_anonymous()
    and exists (select 1 from public.question_banks b where b.id = questions.bank_id and b.teacher_id = auth.uid())
  )
  with check (
    public.is_non_anonymous()
    and exists (select 1 from public.question_banks b where b.id = questions.bank_id and b.teacher_id = auth.uid())
  );
create policy "questions delete teachers" on public.questions
  for delete
  using (
    public.is_non_anonymous()
    and exists (select 1 from public.question_banks b where b.id = questions.bank_id and b.teacher_id = auth.uid())
  );

drop policy if exists "questions read published" on public.questions;
create policy "questions read published" on public.questions
  for select using (
    exists (select 1 from public.question_banks b where b.id = questions.bank_id and b.status = 'published')
    and approved = true
    and active   = true
  );

-- ──────────────── generation_requests ────────────────
drop policy if exists "genreq owner" on public.generation_requests;

create policy "genreq select owner" on public.generation_requests
  for select using (teacher_id = auth.uid());
create policy "genreq insert teachers" on public.generation_requests
  for insert with check (teacher_id = auth.uid() and public.is_non_anonymous());
create policy "genreq update teachers" on public.generation_requests
  for update using (teacher_id = auth.uid() and public.is_non_anonymous())
  with check (teacher_id = auth.uid() and public.is_non_anonymous());
create policy "genreq delete teachers" on public.generation_requests
  for delete using (teacher_id = auth.uid() and public.is_non_anonymous());

-- ──────────────── profiles ────────────────
-- Eigenaar mag alles op zijn eigen rij — geen aanpassing nodig, alleen voor de
-- zekerheid de policy weer aanmaken zodat eerdere migrations niet conflicten.
drop policy if exists "profiles owner" on public.profiles;
create policy "profiles owner" on public.profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ──────────────── progress / vak_order ────────────────
drop policy if exists "progress owner" on public.progress;
create policy "progress owner" on public.progress
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "vak_order owner" on public.vak_order;
create policy "vak_order owner" on public.vak_order
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
