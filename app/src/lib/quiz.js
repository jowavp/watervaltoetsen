// Quiz-loader: trekt random vragen voor een (leerjaar, vak[, categorie]) uit
// Supabase, schudt vragen + MC-opties, en valt terug op de hardcoded leerlijn
// als er nog niets gepubliceerd is.

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
  if (!q.theory || typeof q.theory !== 'object') {
    q.theory = { titel: 'Uitleg', text: 'Bekijk de bron of vraag het je leerkracht.' };
  }
  return q;
}

async function fetchSupabaseQuestionsForVak(leerjaar, vak) {
  if (!supabaseEnabled) return [];
  const { data, error } = await supabase
    .from('questions')
    .select('id, vak, type, payload, q, category_id, bank:question_banks!inner(leerjaar, status)')
    .eq('vak', vak)
    .eq('active', true)
    .eq('approved', true)
    .eq('bank.status', 'published')
    .eq('bank.leerjaar', leerjaar);
  if (error) {
    console.warn('[quiz] fetch:', error.message);
    return [];
  }
  return data || [];
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

// Tel vragen per categorie voor een (leerjaar, vak). _null-key = vragen
// zonder categorie ("Algemeen"-bucket).
export function countsByCategory(rows) {
  const counts = {};
  for (const row of rows) {
    const key = row.category_id || '_null';
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

// Proportionele kwis-grootte voor één categorie:
//   round(vakQuizSize * catCount / vakTotal), minimum 1
export function proportionalSizeFor({ catCount, vakTotal, vakQuizSize }) {
  if (!vakTotal || !catCount) return 0;
  const raw = (vakQuizSize * catCount) / vakTotal;
  return Math.max(1, Math.round(raw));
}

// Load vragen voor een specifieke (vak, categorie). categoryId mag `null` zijn
// voor de "Algemeen" virtuele bucket.
export async function loadQuizForCategory({ leerjaar, vak, categoryId, vakQuizSize = 10 }) {
  const allRows = await fetchSupabaseQuestionsForVak(leerjaar, vak);
  let source = 'supabase';
  let pool;
  if (allRows.length === 0) {
    // Geen Supabase-vragen → fallback naar hardcoded leerlijn (geen categorie-onderscheid).
    pool = fallbackQuestionsForVak(vak);
    source = pool.length > 0 ? 'fallback' : 'none';
    if (pool.length === 0) return { vragen: [], source };
    const shuffled = shuffleArray(pool);
    return { vragen: shuffled.slice(0, vakQuizSize).map(shuffleMCOptions), source };
  }

  const vakTotal = allRows.length;
  const inCategory = allRows.filter((r) => (r.category_id || null) === (categoryId || null));
  if (inCategory.length === 0) return { vragen: [], source };

  const size = proportionalSizeFor({
    catCount: inCategory.length,
    vakTotal,
    vakQuizSize
  });

  const transformed = inCategory.map(transformSupabaseRow);
  const shuffled = shuffleArray(transformed);
  return {
    vragen: shuffled.slice(0, size).map(shuffleMCOptions),
    source,
    catCount: inCategory.length,
    vakTotal
  };
}

// Volledige vak-kwis (oude API behouden voor fallback en backward-compat).
export async function loadQuizForVak({ leerjaar, vak, size = 10 }) {
  const allRows = await fetchSupabaseQuestionsForVak(leerjaar, vak);
  if (allRows.length === 0) {
    const fallback = fallbackQuestionsForVak(vak);
    if (fallback.length === 0) return { vragen: [], source: 'none' };
    const shuffled = shuffleArray(fallback);
    return { vragen: shuffled.slice(0, size).map(shuffleMCOptions), source: 'fallback' };
  }
  const transformed = allRows.map(transformSupabaseRow);
  const shuffled = shuffleArray(transformed);
  return { vragen: shuffled.slice(0, size).map(shuffleMCOptions), source: 'supabase' };
}
