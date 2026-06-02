---
description: Zet onthoudmap-PDFs om naar markdown — split per sectie/smiley in _in.md + _uit.md
allowed-tools: Bash(cd scripts*), Bash(npm run extract*), Read, Glob
argument-hint: <pad-naar-pdf-of-folder>
---

Run het extract-script op het opgegeven pad (relatief tov de repo-root). Default `Onthoudmap/` als geen argument meegegeven.

Voer uit:

```bash
cd scripts && npm run extract -- "../$ARGUMENTS"
```

Vereist `scripts/.env` met `GEMINI_API_KEY`.

Output: voor elke PDF in het opgegeven pad → `<naam>_in.md` (te kennen) + `<naam>_uit.md` (overslaan). De gebruiker kan deze nakijken en eventueel content tussen beide bestanden verschuiven voor hij de `_in.md`-bestanden in de app oplaadt.
