#!/usr/bin/env node
/*
 * Onthoudmap → markdown extractor
 *
 * Leest één of meerdere PDF-bestanden (of een folder), gebruikt Gemini Vision
 * om per sectie te bepalen of de smiley gekleurd is, en schrijft per PDF twee
 * markdown-bestanden:
 *
 *   <naam>_in.md   — secties met een gekleurde smiley (moet kennen)
 *   <naam>_uit.md  — secties met een blanco / geen smiley (overslaan)
 *
 * Gebruik:
 *   node --env-file-if-exists=.env extract-onthoudmap.mjs <pad>
 *   node extract-onthoudmap.mjs ../Onthoudmap                  (folder)
 *   node extract-onthoudmap.mjs ../Onthoudmap/breuken.pdf      (één bestand)
 *
 * ENV:
 *   GEMINI_API_KEY  — verplicht
 *   MODEL           — optioneel; default gemini-2.5-flash
 */

import fs from 'node:fs';
import path from 'node:path';

const trim = (v) => (v || '').toString().trim().replace(/^['"]|['"]$/g, '');
const GEMINI_KEY = trim(process.env.GEMINI_API_KEY);
const MODEL = process.env.MODEL || 'gemini-2.5-flash';

if (!GEMINI_KEY) {
  console.error('GEMINI_API_KEY ontbreekt. Vul scripts/.env aan.');
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node extract-onthoudmap.mjs <pad-naar-pdf-of-folder>');
  process.exit(1);
}

// Verzamel PDFs.
const pdfPaths = [];
for (const arg of args) {
  const abs = path.resolve(arg);
  if (!fs.existsSync(abs)) {
    console.error(`Niet gevonden: ${abs}`);
    process.exit(1);
  }
  const stat = fs.statSync(abs);
  if (stat.isDirectory()) {
    for (const f of fs.readdirSync(abs)) {
      if (f.toLowerCase().endsWith('.pdf')) pdfPaths.push(path.join(abs, f));
    }
  } else if (abs.toLowerCase().endsWith('.pdf')) {
    pdfPaths.push(abs);
  } else {
    console.warn(`Negeer (geen .pdf): ${abs}`);
  }
}

if (pdfPaths.length === 0) {
  console.error('Geen PDF-bestanden gevonden.');
  process.exit(1);
}

console.log(`Model: ${MODEL}`);
console.log(`PDFs te verwerken: ${pdfPaths.length}`);

const PROMPT = `Je analyseert een onthoudmap-PDF van een Vlaamse leerling lager onderwijs.

De leerling heeft op elk hoofdstuk/sectie een smiley die hij kleurt om aan te geven dat hij die stof al moet kennen voor de toets. Een pagina kan **één of meerdere smileys** hebben — elke smiley hoort bij een specifieke sectie of hoofdstuk op de pagina.

Voor elke pagina in de PDF:
1. Identificeer alle smileys op de pagina
2. Voor elke smiley: bepaal welke sectie/hoofdstuk er bij hoort (op basis van positie, header, layout — een smiley hoort meestal bij het hoofdstuk net erboven of erlinks)
3. Per sectie: is de smiley **gekleurd** (roze, rood, oranje, geel, groen, blauw, paars, bruin, …) of **blanco** (zwart/wit lijntjes, niet ingekleurd)?
4. Extraheer de inhoud van die sectie als duidelijke markdown — gebruik subkopjes, lijsten, voorbeelden, formules. Behoud structuur. Negeer de smiley zelf in de output.

Output: EEN JSON ARRAY met één object per pagina (in pagina-volgorde). Elk object:
{
  "page": <paginanummer 1-based>,
  "sections": [
    {
      "title": "<korte titel van de sectie, max 6 woorden>",
      "colored": <true|false>,
      "markdown": "<de inhoud van de sectie als markdown>"
    }
  ]
}

Belangrijke regels:
- Geen smiley op de pagina (vb. titelpagina, inhoudsopgave, illustratie): "sections": []
- Sectie met inhoud maar geen smiley: zet hem als "colored": false (defensief)
- Geef ALLEEN de JSON-array terug. Geen uitleg, geen markdown-code-fences, geen commentaar.`;

async function processPdf(pdfPath) {
  const name = path.basename(pdfPath, '.pdf');
  const dir = path.dirname(pdfPath);
  const sizeMb = (fs.statSync(pdfPath).size / 1024 / 1024).toFixed(2);
  console.log(`\n▶ ${name}.pdf (${sizeMb} MB)`);

  const data = fs.readFileSync(pdfPath);
  const base64 = data.toString('base64');

  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });

  let response;
  try {
    response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { text: PROMPT },
            { inlineData: { mimeType: 'application/pdf', data: base64 } }
          ]
        }
      ],
      config: {
        temperature: 0.2,
        maxOutputTokens: 32768,
        responseMimeType: 'application/json'
      }
    });
  } catch (e) {
    console.error(`  ✗ Gemini-call mislukt: ${e.message}`);
    return;
  }

  const text = response.text || '';
  let pages;
  try {
    // Strip markdown code-fences indien aanwezig
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    pages = JSON.parse(cleaned);
  } catch (e) {
    console.error(`  ✗ JSON parse-fout: ${e.message}`);
    // Schrijf raw output zodat de gebruiker kan debuggen
    fs.writeFileSync(path.join(dir, `${name}_raw.txt`), text);
    console.error(`  → raw output bewaard als ${name}_raw.txt`);
    return;
  }

  if (!Array.isArray(pages)) {
    console.error('  ✗ Verwachte JSON-array niet gekregen');
    return;
  }

  // Statistieken
  let totalSections = 0;
  let coloredSections = 0;
  let pagesWithSmiley = 0;
  for (const p of pages) {
    if (!Array.isArray(p.sections)) continue;
    if (p.sections.length > 0) pagesWithSmiley++;
    totalSections += p.sections.length;
    for (const s of p.sections) {
      if (s.colored) coloredSections++;
    }
  }

  const inLines = [`# ${name} — moet kennen voor de toets`, ''];
  const uitLines = [`# ${name} — nog niet kennen`, ''];

  for (const p of pages) {
    if (!Array.isArray(p.sections) || p.sections.length === 0) continue;
    for (const s of p.sections) {
      const target = s.colored ? inLines : uitLines;
      const title = s.title?.trim() || '(zonder titel)';
      target.push(`## Pagina ${p.page} — ${title}`, '');
      target.push((s.markdown || '').trim(), '');
    }
  }

  const inPath = path.join(dir, `${name}_in.md`);
  const uitPath = path.join(dir, `${name}_uit.md`);
  fs.writeFileSync(inPath, inLines.join('\n'));
  fs.writeFileSync(uitPath, uitLines.join('\n'));

  console.log(
    `  ✓ ${pages.length} pagina's, ${pagesWithSmiley} met smiley, ${totalSections} secties (${coloredSections} gekleurd, ${totalSections - coloredSections} blanco)`
  );
  console.log(`  → ${path.basename(inPath)}`);
  console.log(`  → ${path.basename(uitPath)}`);
}

for (const pdf of pdfPaths) {
  await processPdf(pdf);
}

console.log('\nKlaar.');
