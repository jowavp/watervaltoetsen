-- Migration 004: Supabase Storage bucket voor source-bestanden (PDF/foto's).
-- Pad-conventie: <teacher_uid>/<leerjaar>/<stream>/<uuid>-<filename>
-- Privé bucket — toegang enkel via signed URLs, RLS gefilterd op map-eigenaar.
-- Idempotent.

-- ──────────────── Bucket ────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sources',
  'sources',
  false,                          -- privé bucket
  50 * 1024 * 1024,               -- 50 MB per file (Supabase free-tier max)
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ──────────────── RLS op storage.objects (voor deze bucket) ────────────────
-- storage.foldername(name) geeft een tekst-array van de map-onderdelen.
-- Het eerste element is de top-level folder; die zetten we op auth.uid().

drop policy if exists "sources-storage select owner" on storage.objects;
create policy "sources-storage select owner" on storage.objects
  for select
  using (
    bucket_id = 'sources'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "sources-storage insert teachers" on storage.objects;
create policy "sources-storage insert teachers" on storage.objects
  for insert
  with check (
    bucket_id = 'sources'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_non_anonymous()
  );

drop policy if exists "sources-storage delete teachers" on storage.objects;
create policy "sources-storage delete teachers" on storage.objects
  for delete
  using (
    bucket_id = 'sources'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_non_anonymous()
  );

-- Update mag ook (bv. metadata of move) — zelfde regels als insert/delete.
drop policy if exists "sources-storage update teachers" on storage.objects;
create policy "sources-storage update teachers" on storage.objects
  for update
  using (
    bucket_id = 'sources'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_non_anonymous()
  )
  with check (
    bucket_id = 'sources'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_non_anonymous()
  );

-- ──────────────── sources tabel: nodig kolommen toevoegen indien afwezig ────
-- file_name + storage_path bestaan al uit schema.sql. Voeg size + mime toe voor UI.
alter table public.sources
  add column if not exists size_bytes bigint,
  add column if not exists mime_type  text;
