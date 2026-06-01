-- Migration 010: optionele expliciete categorie op generation_requests.
-- Wanneer ingevuld, dwingt het script de generator om vragen in die ene
-- categorie te plaatsen i.p.v. zelf categorieën voor te stellen.
-- Idempotent.

alter table public.generation_requests
  add column if not exists category_id uuid references public.categories (id) on delete set null;

create index if not exists genreq_category_idx on public.generation_requests (category_id);
