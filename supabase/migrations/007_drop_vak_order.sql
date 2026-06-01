-- Migration 007: vak_order tabel is overbodig geworden.
-- De waterval-volgorde komt nu uit `vakken.sort_order` (door de leerkracht
-- beheerd via VakkenScreen). Leerlingen kunnen de volgorde niet meer
-- aanpassen.
-- Idempotent.

drop table if exists public.vak_order cascade;
