#!/usr/bin/env node
/*
 * Waterval — question generator
 *
 * Reads `generation_requests` waar status='queued', genereert vragen via Claude
 * op basis van de bronnen van die leerkracht voor dat leerjaar/vak, en schrijft
 * ze als nieuwe `question_banks` (status='pending_review') + `questions` rows
 * (active=true, approved=false).
 *
 * Gebruikt de Supabase **service_role** key — bypasst RLS. Houd deze ALLEEN
 * server-side (GitHub Actions secret, jouw lokale .env). Nooit naar de browser.
 *
 * ENV:
 *   SUPABASE_URL              — https://<project>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY — sb_secret_... (NIET de anon-key!)
 *   ANTHROPIC_API_KEY         — sk-ant-...
 *   MODEL                     — optioneel, default 'claude-haiku-4-5-20251001'
 *   MAX_REQUESTS              — optioneel, default 10 (per run)
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.MODEL || 'claude-haiku-4-5-20251001';
const MAX_REQUESTS = parseInt(process.env.MAX_REQUESTS || '10', 10);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!ANTHROPIC_KEY) {
  console.error('Missing ANTHROPIC_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

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

async function fetchSources(teacherId, leerjaar, vak) {
  // Alle bronnen voor de leerkracht in dat leerjaar; we filteren licht op vak
  // (vakgebonden bronnen) en nemen vakoverschrijdende mee.
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

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }]
  });
  const text = res.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
  const arr = extractJSON(text);
  if (!arr) throw new Error('Model gaf geen geldige JSON terug.');
  const valid = arr.map(validateQuestion).filter(Boolean);
  if (valid.length === 0) throw new Error('Geen geldige vragen na validatie.');
  return valid;
}

async function processRequest(req) {
  console.log(`▶ ${req.id} — ${req.vak} (leerjaar ${req.leerjaar}, n=${req.num_questions})`);

  // Markeer als running
  await supabase
    .from('generation_requests')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', req.id);

  try {
    const questions = await generate(req);

    // Maak een bank in pending_review
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

    // Insert vragen
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
