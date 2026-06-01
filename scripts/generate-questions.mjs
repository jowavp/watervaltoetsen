#!/usr/bin/env node
/*
 * Waterval — question generator
 *
 * Leest `generation_requests` waar status='queued', genereert vragen via een
 * LLM (default Gemini) op basis van de bronnen van die leerkracht voor dat
 * leerjaar/vak, en schrijft ze als nieuwe `question_banks` (status='pending_review')
 * + `questions` rows (active=true, approved=false).
 *
 * ENV:
 *   SUPABASE_URL              — https://<project>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY — sb_secret_... (NIET de anon-key!)
 *   LLM_PROVIDER              — 'gemini' (default) of 'anthropic'
 *   GEMINI_API_KEY            — verplicht als provider=gemini
 *   ANTHROPIC_API_KEY         — verplicht als provider=anthropic
 *   MODEL                     — optioneel; default per provider
 *   MAX_REQUESTS              — optioneel, default 10 per run
 */

import { createClient } from '@supabase/supabase-js';

// Trim env-waarden — leading/trailing whitespace en wrapping quotes komen vaak
// voor bij verkeerd geknipte secrets.
const trim = (v) => (v || '').toString().trim().replace(/^['"]|['"]$/g, '');
const SUPABASE_URL = trim(process.env.SUPABASE_URL);
const SUPABASE_KEY = trim(process.env.SUPABASE_SERVICE_ROLE_KEY);
const PROVIDER = trim(process.env.LLM_PROVIDER || 'gemini').toLowerCase();
const MAX_REQUESTS = parseInt(process.env.MAX_REQUESTS || '10', 10);

const DEFAULT_MODEL = {
  gemini: 'gemini-2.5-flash',
  anthropic: 'claude-haiku-4-5-20251001',
  'claude-code': undefined // laat de SDK de default van de CLI gebruiken
};
const MODEL = process.env.MODEL || DEFAULT_MODEL[PROVIDER] || DEFAULT_MODEL.gemini;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!/^https?:\/\//i.test(SUPABASE_URL)) {
  console.error(
    `Invalid SUPABASE_URL — moet beginnen met "https://". Gekregen: "${SUPABASE_URL.slice(0, 12)}…" (${SUPABASE_URL.length} chars).`
  );
  console.error('Controleer of je geen wrapping quotes of leading whitespace in de secret hebt.');
  process.exit(1);
}
if (SUPABASE_KEY.length < 40) {
  console.error(`SUPABASE_SERVICE_ROLE_KEY lijkt te kort (${SUPABASE_KEY.length} chars). Service-role key is meestal een lange JWT die met "eyJ" begint.`);
  process.exit(1);
}

if (PROVIDER === 'gemini' && !process.env.GEMINI_API_KEY) {
  console.error('LLM_PROVIDER=gemini, maar GEMINI_API_KEY ontbreekt.');
  process.exit(1);
}
if (PROVIDER === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
  console.error('LLM_PROVIDER=anthropic, maar ANTHROPIC_API_KEY ontbreekt.');
  process.exit(1);
}
if (PROVIDER === 'claude-code') {
  // Verwijder ANTHROPIC_API_KEY zodat de Claude Code CLI de Pro/Max-sessie gebruikt
  // i.p.v. API-credits.
  if (process.env.ANTHROPIC_API_KEY) {
    console.log('• ANTHROPIC_API_KEY weggeknipt — Claude Code gebruikt je Pro-sessie.');
    delete process.env.ANTHROPIC_API_KEY;
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// ──────────────── Provider abstractie ────────────────

async function callGemini(prompt) {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      temperature: 0.7,
      maxOutputTokens: 4096,
      // Vraag Gemini om JSON-array terug te geven — verhoogt parse-succes.
      responseMimeType: 'application/json'
    }
  });
  return response.text || '';
}

async function callClaude(prompt) {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }]
  });
  return res.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

// Gebruikt de geauthenticeerde Claude Code CLI lokaal — pakt je Pro/Max-abonnement
// i.p.v. API-credits. Vereist `claude` in PATH en een actieve `/login` sessie.
async function callClaudeCode(prompt) {
  const { query } = await import('@anthropic-ai/claude-agent-sdk');
  let finalText = '';
  let resultSeen = false;
  for await (const msg of query({
    prompt,
    options: {
      // Eén-shot LLM-call: geen tools, geen project-context, één turn.
      allowedTools: [],
      settingSources: [],
      maxTurns: 1,
      ...(MODEL ? { model: MODEL } : {})
    }
  })) {
    if (msg.type === 'assistant' && msg.message?.content) {
      for (const block of msg.message.content) {
        if (block && typeof block === 'object' && 'text' in block && typeof block.text === 'string') {
          finalText += block.text;
        }
      }
    } else if (msg.type === 'result') {
      resultSeen = true;
      if (msg.subtype !== 'success') {
        throw new Error(`Claude Code SDK: ${msg.subtype}`);
      }
      // De SDK retourneert ook `result` als string (in de meeste versies).
      if (typeof msg.result === 'string' && msg.result.length > finalText.length) {
        finalText = msg.result;
      }
    }
  }
  if (!resultSeen) throw new Error('Claude Code SDK gaf geen result-message terug.');
  if (!finalText.trim()) throw new Error('Claude Code SDK gaf geen tekst terug.');
  return finalText;
}

async function callLLM(prompt) {
  if (PROVIDER === 'anthropic') return callClaude(prompt);
  if (PROVIDER === 'claude-code') return callClaudeCode(prompt);
  return callGemini(prompt);
}

// ──────────────── Prompt + parsing ────────────────

const TYPE_DESCRIPTIONS = {
  mc: '{"type":"mc","q":"vraag","options":["A","B","C","D"],"answer":<index 0-3>,"theory":{"titel":"...","text":"..."}}',
  tf: '{"type":"tf","q":"stelling","answer":<true|false>,"theory":{"titel":"...","text":"..."}}',
  fill: '{"type":"fill","q":"vraag met ...","answer":"juist antwoord","accept":["alt1","alt2"],"theory":{"titel":"...","text":"..."}}',
  match: '{"type":"match","q":"instructie","pairs":[{"l":"links","r":"rechts"}],"theory":{"titel":"...","text":"..."}}'
};

function buildPrompt({ vak, leerjaar, num, sources }) {
  const bronnen = (sources || [])
    .slice(0, 30)
    .map((s) => `- ${s.title}${s.stream ? ` (${s.stream})` : ''}${s.vak ? ` [${s.vak}]` : ''}`)
    .join('\n');
  const bronText = bronnen || '(geen specifieke bronnen aangeleverd — gebruik de standaard Vlaamse leerlijn)';

  return `Je bent een ervaren Vlaamse leerkracht lager onderwijs.

Maak ${num} korte, kindvriendelijke kwisvragen voor leerlingen van leerjaar ${leerjaar} voor het vak "${vak}". Varieer de vraagtypes (mc, tf, fill, match) en zorg dat elke vraag een korte uitleg/theorie krijgt voor wie ze fout heeft.

Beschikbare kennisbronnen van de leerkracht:
${bronText}

Antwoord UITSLUITEND met geldige JSON: een array van objecten. Elk object volgt exact een van deze schema's:
- ${TYPE_DESCRIPTIONS.mc}
- ${TYPE_DESCRIPTIONS.tf}
- ${TYPE_DESCRIPTIONS.fill}
- ${TYPE_DESCRIPTIONS.match}

Belangrijk:
- "theory" bevat een kort lesje in begrijpelijke taal, max 3 zinnen.
- Voor "match" gebruik 3 paren. De volgorde van "pairs" is de juiste koppeling — de app schudt rechts zelf.
- Voor "fill" maak je antwoorden hoofdletterongevoelig herkenbaar via "accept".
- Geen uitleg, geen markdown, geen code-fences — enkel de JSON-array.`;
}

function extractJSON(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  // Sommige modellen wrappen in een object { "questions": [...] }
  if (s.startsWith('{')) {
    try {
      const obj = JSON.parse(s);
      const arr = obj.questions || obj.items || obj.data;
      if (Array.isArray(arr)) return arr;
    } catch {
      /* val terug op array-extractie */
    }
  }
  const i = s.indexOf('[');
  const j = s.lastIndexOf(']');
  if (i < 0 || j < i) return null;
  try {
    return JSON.parse(s.slice(i, j + 1));
  } catch (e) {
    console.warn('parse error:', e.message);
    return null;
  }
}

function validateQuestion(x) {
  if (!x || typeof x !== 'object') return null;
  if (!['mc', 'tf', 'fill', 'match'].includes(x.type)) return null;
  if (typeof x.q !== 'string' || !x.q.trim()) return null;
  const out = { type: x.type, q: String(x.q).trim() };
  if (x.type === 'mc') {
    if (!Array.isArray(x.options) || x.options.length < 2) return null;
    if (typeof x.answer !== 'number' || x.answer < 0 || x.answer >= x.options.length) return null;
    out.options = x.options.map(String);
    out.answer = x.answer;
  } else if (x.type === 'tf') {
    if (typeof x.answer !== 'boolean') return null;
    out.answer = x.answer;
  } else if (x.type === 'fill') {
    if (typeof x.answer !== 'string' || !x.answer.trim()) return null;
    out.answer = String(x.answer).trim();
    if (Array.isArray(x.accept)) out.accept = x.accept.map(String);
  } else if (x.type === 'match') {
    if (!Array.isArray(x.pairs) || x.pairs.length < 2) return null;
    if (!x.pairs.every((p) => p && typeof p.l === 'string' && typeof p.r === 'string')) return null;
    out.pairs = x.pairs.map((p) => ({ l: String(p.l), r: String(p.r) }));
  }
  if (x.theory && typeof x.theory === 'object' && x.theory.titel && x.theory.text) {
    out.theory = { titel: String(x.theory.titel), text: String(x.theory.text) };
  } else {
    out.theory = { titel: 'Uitleg', text: 'Bekijk de bron of vraag het de leerkracht.' };
  }
  return out;
}

// ──────────────── Supabase helpers ────────────────

async function fetchSources(teacherId, leerjaar, vak) {
  const { data, error } = await supabase
    .from('sources')
    .select('title,stream,vak,file_name')
    .eq('teacher_id', teacherId)
    .eq('leerjaar', leerjaar);
  if (error) {
    console.warn('sources fetch:', error.message);
    return [];
  }
  return (data || []).filter((s) => !s.vak || s.vak === vak);
}

async function generate(req) {
  const sources = await fetchSources(req.teacher_id, req.leerjaar, req.vak);
  const prompt = buildPrompt({
    vak: req.vak,
    leerjaar: req.leerjaar,
    num: req.num_questions,
    sources
  });
  const text = await callLLM(prompt);
  const arr = extractJSON(text);
  if (!arr) throw new Error(`Model gaf geen geldige JSON terug (provider=${PROVIDER}, model=${MODEL}).`);
  const valid = arr.map(validateQuestion).filter(Boolean);
  if (valid.length === 0) throw new Error('Geen geldige vragen na validatie.');
  return valid;
}

async function processRequest(req) {
  console.log(`▶ ${req.id} — ${req.vak} (leerjaar ${req.leerjaar}, n=${req.num_questions})`);

  await supabase
    .from('generation_requests')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', req.id);

  try {
    const questions = await generate(req);

    const { data: bank, error: bErr } = await supabase
      .from('question_banks')
      .insert({
        teacher_id: req.teacher_id,
        leerjaar: req.leerjaar,
        status: 'pending_review'
      })
      .select()
      .single();
    if (bErr) throw new Error(bErr.message);

    const rows = questions.map((q, i) => ({
      bank_id: bank.id,
      vak: req.vak,
      type: q.type,
      onderdeel: null,
      q: q.q,
      payload: q,
      approved: false,
      active: true,
      position: i
    }));
    const { error: qErr } = await supabase.from('questions').insert(rows);
    if (qErr) throw new Error(qErr.message);

    await supabase
      .from('generation_requests')
      .update({
        status: 'done',
        completed_at: new Date().toISOString(),
        bank_id: bank.id
      })
      .eq('id', req.id);

    console.log(`  ✓ ${questions.length} vragen → bank ${bank.id}`);
  } catch (e) {
    console.error(`  ✗ ${e.message}`);
    await supabase
      .from('generation_requests')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error: e.message.slice(0, 500)
      })
      .eq('id', req.id);
  }
}

async function main() {
  console.log(`Provider: ${PROVIDER}  Model: ${MODEL}`);
  const { data: queue, error } = await supabase
    .from('generation_requests')
    .select('id,teacher_id,leerjaar,vak,num_questions')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(MAX_REQUESTS);
  if (error) {
    console.error('queue fetch:', error.message);
    process.exit(1);
  }
  if (!queue || queue.length === 0) {
    console.log('Geen wachtrij — niets te doen.');
    return;
  }
  console.log(`Wachtrij: ${queue.length} aanvragen`);
  for (const req of queue) {
    await processRequest(req);
  }
  console.log('Klaar.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
