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

- Volledige leerling-flow: profiel, waterval-map, kwis (mc/tf/fill/match), resultaat met sterren, theorie-review met leerkracht-avatar en Nederlandse spraaksynthese.
- Volledige leerkracht-flow: profiel, kennisbronnen (onthoudmap/contracten/werkbladen), automatische generatie van 50 kwisvragen, nakijken + publiceren.
- Persistentie via `localStorage` met optionele Supabase-sync (profiel, voortgang, vak-volgorde, kennisbronnen, gepubliceerde vragenbanken).
- Offline-first: na het eerste bezoek werkt alles zonder netwerk.

## Wat er nog niet werkt

- AI-verrijking via een echte LLM. In het prototype hing dit aan `window.claude.complete`; in productie hoort dit thuis in een Supabase Edge Function die de leerkracht-sleutel veilig houdt. De template-based generator zit er al in.
- Echte bestand-upload voor PDF/foto's — de UI is voorzien maar uploads zijn nog gemockt (Supabase Storage staat klaar via `storage_path` in `sources`).
- Klas- en leerling-koppeling voor de leerkracht (alleen schema-aanzet).
