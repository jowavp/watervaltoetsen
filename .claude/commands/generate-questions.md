---
description: Verwerk de Supabase generation_requests wachtrij lokaal met Claude Code's Pro-sessie
allowed-tools: Bash(npm run generate:*), Bash(cd scripts*), Read
---

Run het generator-script lokaal vanuit `scripts/`. Dit gebruikt **jouw Claude Code CLI sessie** (= je Pro/Max-abonnement) als LLM via `LLM_PROVIDER=claude-code` in `scripts/.env`.

Steps:

1. Controleer dat `scripts/.env` bestaat (met SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + `LLM_PROVIDER=claude-code`).
2. Voer uit:
   ```bash
   cd scripts && npm run generate
   ```
3. Toon het resultaat aan de gebruiker — welke aanvragen verwerkt zijn, hoeveel vragen per bank, eventuele fouten.

Als er geen `.env` is in `scripts/`, vraag de gebruiker om eerst `cp scripts/.env.example scripts/.env` te doen en de Supabase-URL + service-role key in te vullen.
