// Quiz-loader: trekt random vragen voor een (leerjaar, vak) uit Supabase,
// schudt zowel volgorde van de vragen als de MC-opties. Valt terug op de
// hardcoded `data.js`-leerlijn als er nog niets gepubliceerd is.

import D from './data.js';
import { supabase, supabaseEnabled } from './supabase.js';

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffleMCOptions(q) {
  if (q.type !== 'mc' || !Array.isArray(q.options) || typeof q.answer !== 'number') return q;
  const correctValue = q.options[q.answer];
  const opts = shuffleArray(q.options);
  return { ...q, options: opts, answer: opts.indexOf(correctValue) };
}

function transformSupabaseRow(row) {
  const p = row.payload || {};
  const q = { type: row.type, q: row.q || p.q || '', theory: p.theory };
  if (row.type === 'mc') {
    q.options = Array.isArray(p.options) ? p.options : [];
    q.answer = typeof p.answer === 'number' ? p.answer : 0;
  } else if (row.type === 'tf') {
    q.answer = Boolean(p.answer);
  } else if (row.type === 'fill') {
    q.answer = String(p.answer || '');
    if (Array.isArray(p.accept)) q.accept = p.accept;
    if (p.suffix) q.suffix = p.suffix;
  } else if (row.type === 'match') {
    q.pairs = Array.isArray(p.pairs) ? p.pairs : [];
  }
  // Defaults voor theorie
  if (!q.theory || typeof q.theory !== 'object') {
    q.theory = { titel: 'Uitleg', text: 'Bekijk de bron of vraag het je leerkracht.' };
  }
  return q;
}

async function fetchSupabaseQuestions(leerjaar, vak) {
  if (!supabaseEnabled) return [];
  const { data, error } = await supabase
    .from('questions')
    .select('id, vak, type, payload, q, bank:question_banks!inner(leerjaar, status)')
    .eq('vak', vak)
    .eq('active', true)
    .eq('approved', true)
    .eq('bank.status', 'published')
    .eq('bank.leerjaar', leerjaar);
  if (error) {
    console.warn('[quiz] fetch:', error.message);
    return [];
  }
  return (data || []).map(transformSupabaseRow);
}

function fallbackQuestionsForVak(vak) {
  const nodes = D.nodes.filter((n) => n.vak === vak);
  const all = [];
  for (const n of nodes) {
    const qs = D.vragenVoor(n.id);
    if (qs) all.push(...qs);
  }
  return all;
}

export async function loadQuizForVak({ leerjaar, vak, size = 10 }) {
  const supabaseQs = await fetchSupabaseQuestions(leerjaar, vak);
  let pool = supabaseQs;
  let source = 'supabase';
  if (pool.length === 0) {
    pool = fallbackQuestionsForVak(vak);
    source = pool.length > 0 ? 'fallback' : 'none';
  }
  if (pool.length === 0) {
    return { vragen: [], source };
  }
  const shuffled = shuffleArray(pool);
  const picked = shuffled.slice(0, size);
  return { vragen: picked.map(shuffleMCOptions), source };
}
