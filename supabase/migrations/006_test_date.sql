-- Migration 006: toetsdatum per vak.
-- Optioneel — wanneer ingevuld, kan de leerkracht de waterval-volgorde
-- automatisch sorteren op datum. Leerlingen zien de volgorde maar mogen die
-- niet wijzigen.
-- Idempotent.

alter table public.vakken
  add column if not exists test_date date;
