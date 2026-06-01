-- Migration 009: categorieën binnen vakken.
-- Een vak (vb. Frans, leerjaar 5) kan meerdere categorieën hebben
-- ("Les couleurs", "La famille", …). Vragen worden bij één categorie geplaatst.
-- Wanneer category_id NULL is, valt de vraag onder de virtuele bucket "Algemeen".
-- Idempotent.

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  leerjaar    int  not null check (leerjaar between 1 and 6),
  vak         text not null,                  -- vakken.key
  naam        text not null,
  sort_order  int  not null default 0,
  active      boolean not null default true,
  created_by  uuid references auth.users (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (leerjaar, vak, naam)
);

create index if not exists categories_vak_idx on public.categories (leerjaar, vak, sort_order);

alter table public.categories enable row level security;

-- Iedereen die ingelogd is mag lezen (kids hebben dit nodig om de waterval te
-- bouwen).
drop policy if exists "categories read all auth" on public.categories;
create policy "categories read all auth" on public.categories
  for select using (auth.role() = 'authenticated');

-- Schrijven enkel door non-anonieme users (= Google-leerkrachten).
drop policy if exists "categories insert teachers" on public.categories;
create policy "categories insert teachers" on public.categories
  for insert with check (public.is_non_anonymous());
drop policy if exists "categories update teachers" on public.categories;
create policy "categories update teachers" on public.categories
  for update using (public.is_non_anonymous()) with check (public.is_non_anonymous());
drop policy if exists "categories delete teachers" on public.categories;
create policy "categories delete teachers" on public.categories
  for delete using (public.is_non_anonymous());

-- updated_at touch trigger (hergebruik uit migration 002)
drop trigger if exists categories_touch on public.categories;
create trigger categories_touch
  before update on public.categories
  for each row execute function public.touch_updated_at();

-- ──────────────── questions.category_id ────────────────
alter table public.questions
  add column if not exists category_id uuid references public.categories (id) on delete set null;

create index if not exists questions_category_idx on public.questions (category_id);
