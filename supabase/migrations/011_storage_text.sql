-- Migration 011: laat markdown- en plain-text-bestanden toe in de 'sources'
-- bucket. Onthoudmap-content kan nu als pure tekst worden opgeladen
-- (gegenereerd door scripts/extract-onthoudmap.mjs), wat veel goedkoper is
-- voor de LLM dan elke generatie opnieuw door PDF/vision te halen.
-- Idempotent.

update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'text/markdown',
  'text/plain'
]
where id = 'sources';
