-- Migration 005: kies hoe vragen gegenereerd worden per aanvraag:
--   documents  → enkel op basis van de opgeladen bronnen voor dat vak/leerjaar
--   mix        → bronnen + standaard Vlaamse leerlijn als aanvulling (default)
--   curriculum → enkel de standaard leerlijn, bronnen worden genegeerd
-- Idempotent.

alter table public.generation_requests
  add column if not exists source_mode text not null default 'mix';

-- Hercreëer constraint zodat het check-domein klopt (idempotent — eerst weg).
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.generation_requests'::regclass
      and conname  = 'generation_requests_source_mode_check'
  ) then
    alter table public.generation_requests drop constraint generation_requests_source_mode_check;
  end if;

  alter table public.generation_requests
    add constraint generation_requests_source_mode_check
    check (source_mode in ('documents','mix','curriculum'));
end $$;
