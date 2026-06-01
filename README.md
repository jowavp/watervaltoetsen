# De Waterval — oefen-app

Een PWA voor leerlingen van leerjaar 5 om te oefenen voor hun toetsen met de mascotte Druppie. Ook bruikbaar door leerkrachten om vragen te genereren op basis van hun onthoudmap, voorbeeldcontracten en werkbladen.

Werkt online in elke browser, en is installeerbaar als app op Android, iOS en desktop dankzij de PWA-manifest en service worker.

## Structuur

```
app/                 — Vite + React PWA
supabase/schema.sql  — database schema (RLS-ready) voor het Supabase-project
extracted/           — oorspronkelijke prototype (handoff bundle)
```

## Snelstart (lokaal)

```bash
cd app
npm install
cp .env.example .env.local        # vul je Supabase URL + anon key in
npm run dev
```

Open http://localhost:5173 — kies "Ik ben een leerling" of "Ik ben de leerkracht".

> Zonder Supabase werkt de app ook: alles wordt dan lokaal opgeslagen in `localStorage`. Zodra je `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` invult worden profiel en voortgang gesynchroniseerd.

## Supabase opzetten

1. Maak een nieuw project op <https://supabase.com>.
2. Open **SQL Editor → New query**, plak `supabase/schema.sql` en voer uit.
3. Ga naar **Authentication → Providers** en zet **Anonymous Sign-ins** aan. Leerlingen zonder e-mailadres krijgen zo een veilige anonieme sessie.
4. Kopieer de **Project URL** en de **anon public key** uit *Project Settings → API* en plak ze in `app/.env.local`.

## Productie-build

```bash
cd app
npm run build
npm run preview        # serveert /dist op poort 4173 om de PWA te testen
```

De build produceert een statische site met service worker en manifest — host op Vercel, Netlify, Cloudflare Pages of een eigen statische webserver. Voor installatie op een toestel moet de site via HTTPS bereikbaar zijn (localhost werkt ook).

## Vragen genereren met AI

De leerkracht zet aanvragen klaar in de PWA (*Vragen genereren → "Vraag nieuwe set vragen aan"*), een Node-script verwerkt die wachtrij met een LLM, en de gegenereerde vragen verschijnen onder *Vragen beheren* met status `Wacht op nakijk`. Dezelfde codebase ondersteunt **drie providers** zodat je kan kiezen wat past bij wat je betaalt en waar je het draait.

### End-to-end flow

```
┌────────────────────────────────┐
│ Leerkracht (PWA)               │
│ → Vragen genereren             │
│ → Klikt "Vraag nieuwe set      │
│    vragen aan" per vak         │
└──────────────┬─────────────────┘
               │ INSERT
               ▼
┌────────────────────────────────┐
│ Supabase                       │
│  generation_requests           │  ← RLS: enkel eigenaar (Google-leerkracht)
│  status='queued'               │
└──────────────┬─────────────────┘
               │ poll
               ▼
┌────────────────────────────────┐
│ scripts/generate-questions.mjs │  ← service_role key bypasst RLS
│  • status='queued' → 'running' │
│  • Roept LLM met de bronnen    │
│    van die leerkracht          │
│  • status='done' | 'failed'    │
└──────────────┬─────────────────┘
               │ INSERT
               ▼
┌────────────────────────────────┐
│ Supabase                       │
│  question_banks (pending_review)│
│  questions (approved=false)    │
└──────────────┬─────────────────┘
               │ SELECT
               ▼
┌────────────────────────────────┐
│ Leerkracht (PWA)               │
│ → Vragen beheren               │
│ → activeer, deactiveer of      │
│    verwijder                   │
└────────────────────────────────┘
```

Het script kan draaien als **GitHub Actions cron** (productie), **handmatige CI run**, **lokaal vanuit shell**, of vanuit een **Claude Code sessie** via een slash command. Welke provider je gebruikt is een env-variabele — de logica blijft identiek.

### Providers — overzicht

| Provider key | Auth | Kost | Gebruikt voor |
|--------------|------|------|---------------|
| `gemini` *(default)* | API key | Free tier: 1500 req/dag op flash-modellen | CI cron, productie zonder Anthropic credits |
| `anthropic` | API key | Pay-per-token | CI cron, wanneer je Anthropic API credits hebt |
| `claude-code` | Claude Code CLI login | Verbruikt je **Claude Pro/Max abonnement** quota | **Lokaal** triggeren — niet bruikbaar in CI |

Vuistregel:
- **CI / cron** → `gemini` (gratis) of `anthropic` (als je credits hebt)
- **Lokaal** → `claude-code` (geen API credits nodig — gebruikt je abonnement)

### Model-keuze per provider

Het script kiest een default; je kan overschrijven via `MODEL` env var (lokaal) of `LLM_MODEL` repository variable (CI).

| Provider | Default model | Goede alternatieven |
|----------|---------------|---------------------|
| `gemini` | `gemini-2.5-flash` | `gemini-2.5-pro` (trager, meer kwaliteit) |
| `anthropic` | `claude-haiku-4-5-20251001` | `claude-sonnet-4-6`, `claude-opus-4-7` |
| `claude-code` | Default van je CLI (meestal Sonnet) | Geef `MODEL=claude-opus-4-7` als je expliciet Opus wil |

> Voor de kwaliteit van schoolvragen voor leerjaar 1–6 is een **flash/haiku** klasse model meestal voldoende. Stap op naar pro/sonnet als je merkt dat vragen te triviaal of te vaag zijn.

### Environment-variabelen referentie

Volledige lijst van wat het script leest:

| Variabele | Verplicht? | Default | Beschrijving |
|-----------|-----------|---------|--------------|
| `SUPABASE_URL` | ✅ altijd | — | URL van je Supabase project. |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ altijd | — | Server-only key die RLS bypasst. Komt **nooit** in de PWA bundle. |
| `LLM_PROVIDER` | nee | `gemini` | `gemini`, `anthropic`, of `claude-code`. |
| `GEMINI_API_KEY` | bij `gemini` | — | Van <https://aistudio.google.com/apikey>. |
| `ANTHROPIC_API_KEY` | bij `anthropic` | — | Van <https://console.anthropic.com>. Bij `claude-code` automatisch genegeerd. |
| `MODEL` | nee | provider-default | Override van het model (zie tabel hierboven). |
| `MAX_REQUESTS` | nee | `10` | Max aantal queue-items per run — bescherming tegen runaway-kosten. |

### Trigger 1 — GitHub Actions cron *(productie)*

Workflow: `.github/workflows/generate.yml`. Draait elke nacht om **03:00 UTC** (≈ 04:00 BE winter / 05:00 BE zomer).

Setup éénmalig:

```bash
# Verplicht (Gemini route)
gh secret set SUPABASE_URL --repo <user>/<repo>
gh secret set SUPABASE_SERVICE_ROLE_KEY --repo <user>/<repo>
gh secret set GEMINI_API_KEY --repo <user>/<repo>

# Optioneel — overschrijf provider en model
gh variable set LLM_PROVIDER --body "anthropic" --repo <user>/<repo>
gh variable set LLM_MODEL --body "claude-sonnet-4-6" --repo <user>/<repo>
```

Pas het schedule aan in `.github/workflows/generate.yml`:

```yaml
on:
  schedule:
    - cron: '0 3 * * *'   # 03:00 UTC dagelijks
    # - cron: '0 */6 * * *'  # elke 6 uur
    # - cron: '0 3 * * 1-5'  # enkel op weekdagen
```

> **Belangrijk** over GitHub Actions cron: schedules kunnen tot ±15 min vertragen bij hoge load, en runs worden **uitgeschakeld na 60 dagen inactiviteit** in de repo. Push minstens eenmaal per twee maanden, of trigger handmatig.

### Trigger 2 — Handmatige CI run

Wachten op de cron is onnodig — je kan op elk moment manueel runnen:

```bash
gh workflow run "Generate questions (cron)" --repo <user>/<repo> -f max_requests=20
gh run list --workflow=generate.yml --repo <user>/<repo> --limit 3
gh run watch --repo <user>/<repo>
```

Of via de browser: *Actions → Generate questions (cron) → Run workflow*. Je kan optioneel `max_requests` overschrijven.

### Trigger 3 — Lokaal vanuit shell *(elke provider)*

```bash
cd scripts
cp .env.example .env       # eerste keer
# Vul .env aan met de juiste env vars voor je gekozen provider
npm install                 # eerste keer
npm run generate
```

`npm run generate` leest `.env` automatisch via Node's `--env-file-if-exists` flag — geen `dotenv` package nodig.

### Trigger 4 — Lokaal vanuit Claude Code *(geen API credits)*

Vereist: `claude` CLI geïnstalleerd en ingelogd met je **Pro of Max** abonnement.

```bash
# Eerste keer: zorg dat scripts/.env bestaat met SUPABASE_URL,
# SUPABASE_SERVICE_ROLE_KEY en LLM_PROVIDER=claude-code
```

Daarna twee opties:

**a) Vanuit een shell** (zelfs zonder Claude Code sessie open):

```bash
npm --prefix scripts run generate
```

**b) Vanuit een Claude Code sessie in deze repo:**

```
/generate-questions
```

De slash command staat in `.claude/commands/generate-questions.md` en draait gewoon `cd scripts && npm run generate`.

### Lokale setup voor `claude-code` provider

Minimale `scripts/.env`:

```
SUPABASE_URL=https://<jouw-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...service_role...
LLM_PROVIDER=claude-code
```

Géén `GEMINI_API_KEY` of `ANTHROPIC_API_KEY` nodig. Het script verwijdert zelfs `ANTHROPIC_API_KEY` uit `process.env` op het moment dat hij `claude-code` provider ziet — zo gaat de Pro-sessie zeker boven een per-ongeluk gezette API-key.

### Provider wisselen

**Lokaal**: pas `LLM_PROVIDER` in `scripts/.env` aan. Voorbeelden:

```
LLM_PROVIDER=claude-code          # geen API key nodig
LLM_PROVIDER=gemini               # + GEMINI_API_KEY
LLM_PROVIDER=anthropic            # + ANTHROPIC_API_KEY
MODEL=gemini-2.5-pro              # optioneel model-override
```

**In CI**: gebruik repository *variables* (niet secrets — variables mogen leesbaar zijn):

```bash
gh variable set LLM_PROVIDER --body "gemini" --repo <user>/<repo>
gh variable set LLM_MODEL --body "gemini-2.5-pro" --repo <user>/<repo>
```

CI kan `claude-code` niet gebruiken — daar is geen Claude Code CLI of Pro-sessie.

### Cron-instellingen — fine-tuning

`.github/workflows/generate.yml`:

```yaml
on:
  schedule:
    - cron: '0 3 * * *'                 # ← pas hier aan
  workflow_dispatch:
    inputs:
      max_requests:
        description: 'Max aanvragen per run'
        required: false
        default: '10'

# ...
env:
  MAX_REQUESTS: ${{ inputs.max_requests || '10' }}
```

Veelgebruikte schedule-patronen:

| Patroon | Cron expressie |
|---------|---------------|
| Dagelijks om 03:00 UTC | `0 3 * * *` |
| Elke 6 uur | `0 */6 * * *` |
| Enkel weekdagen | `0 3 * * 1-5` |
| Zondag middernacht | `0 0 * * 0` |
| Elke 15 minuten (max actie-burn!) | `*/15 * * * *` |

`MAX_REQUESTS` per run beperkt hoeveel queue-items één run aanpakt — handig om kosten te plafonneren als de queue volloopt.

### Vragen goedkeuren na generatie

Vragen uit de cron krijgen `approved=false` en zitten in een bank met `status='pending_review'`. Ze zijn voor leerkrachten zichtbaar in *Vragen beheren* maar **niet** voor leerlingen (RLS `questions read published` checkt `approved=true AND active=true AND bank.status='published'`).

Op dit moment kan een leerkracht in de UI alleen individuele vragen actief/inactief zetten of verwijderen — een "Keur volledige batch goed"-knop staat op de roadmap.

### Troubleshooting

| Foutmelding | Oorzaak | Oplossing |
|------------|---------|-----------|
| `Missing SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY` | env vars niet gezet | Vul `scripts/.env` aan of stel secrets in op de repo. |
| `LLM_PROVIDER=gemini, maar GEMINI_API_KEY ontbreekt.` | API key niet gevonden | Zet `GEMINI_API_KEY` of switch provider. |
| `429 Too Many Requests` van Gemini | Gratis-tier rate-limit overschreden | Wacht; of switch tijdelijk naar `anthropic`/`claude-code`. |
| `Claude Code SDK: error_max_turns` | Model gaf te lange response of beleidsweigering | Kleinere `num_questions` per aanvraag, of probeer ander model via `MODEL=`. |
| `Model gaf geen geldige JSON terug` | LLM week af van JSON-format | Re-run; bij herhaling: schakel naar groter model (`-pro` / `-sonnet`). |
| `new row violates row-level security policy` | Verkeerde key — anon i.p.v. service_role | Controleer dat `SUPABASE_SERVICE_ROLE_KEY` echt de **service_role** is, niet de anon-key. |

Logs bekijken:

```bash
# CI
gh run list --workflow=generate.yml --repo <user>/<repo>
gh run view <run-id> --repo <user>/<repo> --log

# Lokaal — gewoon op stdout in de terminal waar je `npm run generate` runt
```

> De service_role key omzeilt RLS — daarom **enkel server-side gebruiken** (CI secret of jouw eigen `.env`). Verschillend van de anon-key die in de PWA terechtkomt en wél publiek mag.

## Deploy naar GitHub Pages

De repo bevat een workflow (`.github/workflows/deploy.yml`) die bij elke push naar `main` de PWA bouwt en publiceert. Eénmalige setup:

1. **Maak de repo aan op GitHub** (publiek of privé — Pages werkt op beide bij gratis accounts sinds 2024).
2. **Push deze map** als de inhoud van die repo:
   ```bash
   git init -b main
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/<jouw-user>/<repo-naam>.git
   git push -u origin main
   ```
3. **Voeg de Supabase-secrets toe**: GitHub-repo → *Settings → Secrets and variables → Actions → New repository secret*. Maak `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY` aan (zelfde waarden als in `app/.env.local`). De anon-key mag publiek, maar via secrets blijft je `.env` lokaal.
4. **Schakel Pages aan**: *Settings → Pages → Build and deployment → Source: **GitHub Actions***.
5. Push (of trigger de workflow handmatig vanuit het Actions-tabblad). Na ~1 minuut staat de app live op `https://<jouw-user>.github.io/<repo-naam>/`.

De workflow zet automatisch `VITE_BASE=/<repo-naam>/` zodat alle PWA-assets en de service worker op het Pages-subpad blijven werken. Lokaal blijft `npm run dev` op `/` werken.

> Custom domein gebruiken? Maak een `app/public/CNAME` met je domeinnaam en zet in de workflow `VITE_BASE: /` (of laat ze leeg) — de build draait dan vanaf de root.

## Installeren als app

- **Android (Chrome / Edge):** open de site, tik op het menu en kies "App installeren" of "Toevoegen aan startscherm".
- **iOS (Safari):** open de site, tik op het deel-icoon en kies "Zet op beginscherm".
- **Desktop (Chrome / Edge):** klik op het installatie-icoon in de adresbalk.

Daarna start de app full-screen, zonder browser-chroom, en werkt offline na het eerste bezoek.

## Wat er werkt

- **Leerlingen**: anonieme sessie, profiel, waterval-map per leerjaar, kwis (mc/tf/fill/match), resultaat met sterren, theorie-review met leerkracht-avatar en Nederlandse spraaksynthese.
- **Leerkrachten** (Google login): profiel, **vakken-CRUD per leerjaar**, **sources-CRUD** (onthoudmap/contracten/werkbladen), **vragen-CRUD** met actief-toggle, **per-vak generatie-aanvragen** via wachtrij.
- **AI-vragen-generatie**: drie providers (Gemini default, Anthropic, of lokaal via je Claude Code Pro-sessie). Triggerbaar via cron, handmatige CI-run, lokale shell of `/generate-questions` slash command.
- **Auth-architectuur**: anonymous-sign-in voor kids, Google OAuth voor leerkrachten, RLS-gescheiden zodat alleen non-anonymous gebruikers content kunnen schrijven.
- **PWA**: offline-first via service worker, installeerbaar op Android/iOS/desktop.
- **Persistentie**: Supabase met `localStorage` als offline-fallback voor de kid-flow.

## Wat er nog niet werkt

- **"Batch goedkeuren"-knop** voor pending question banks — individuele vragen kunnen wel actief gezet of verwijderd worden.
- **Echte bestand-upload** voor PDF/foto's bij sources — UI staat klaar maar uploads zijn nog gemockt (Supabase Storage staat klaar via `storage_path` in `sources`).
- **Klas- en leerling-koppeling** voor de leerkracht (geen schema voor klassen of teacher↔student links).
- **Onderdelen/nodes per vak** vanuit Supabase — momenteel nog hardcoded in `lib/data.js`; de kid-map wijzigt niet wanneer een leerkracht een nieuw vak toevoegt.
