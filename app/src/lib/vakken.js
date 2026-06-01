// CRUD-laag voor `vakken` per leerjaar. Vakken zijn global (gedeeld door alle
// leerkrachten), maar gefilterd per leerjaar in de UI.

import { ensureUser, supabase, supabaseEnabled } from './supabase.js';

export const VAK_KLEUREN = [
  { kleur: '#1fa9ce', tint: '#e4f5fb', label: 'Water' },
  { kleur: '#9b8cff', tint: '#efecff', label: 'Paars' },
  { kleur: '#5fbe82', tint: '#e7f7ee', label: 'Blad' },
  { kleur: '#ff9e2c', tint: '#fff1da', label: 'Zon' },
  { kleur: '#ff6f61', tint: '#ffe5e2', label: 'Koraal' },
  { kleur: '#ffc23c', tint: '#fff5d6', label: 'Geel' },
  { kleur: '#27b6db', tint: '#defaff', label: 'Druppie' },
  { kleur: '#7b8890', tint: '#eef1f3', label: 'Steen' }
];

export const SUGGEST_ICONS = ['🔢', '📖', '🇫🇷', '🌍', '🔬', '🎨', '🎵', '⚽', '💻', '📐', '🇬🇧', '🇩🇪'];

function slugify(s) {
  return (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function listVakken(leerjaar) {
  if (!supabaseEnabled) return [];
  await ensureUser();
  const { data, error } = await supabase
    .from('vakken')
    .select('id,leerjaar,key,naam,kleur,tint,icon,active,sort_order,test_date,quiz_size')
    .eq('leerjaar', leerjaar)
    .order('sort_order')
    .order('naam');
  if (error) {
    console.warn('[vakken] list:', error.message);
    return [];
  }
  return data || [];
}

export async function createVak({ leerjaar, naam, kleur, tint, icon, sort_order, test_date, quiz_size }) {
  if (!supabaseEnabled) throw new Error('Supabase niet geconfigureerd.');
  const uid = await ensureUser();
  const key = slugify(naam);
  if (!key) throw new Error('Geef een naam in.');
  const { data, error } = await supabase
    .from('vakken')
    .insert({
      leerjaar,
      key,
      naam: naam.trim(),
      kleur: kleur || '#1fa9ce',
      tint: tint || '#e4f5fb',
      icon: icon || null,
      sort_order: sort_order ?? 0,
      test_date: test_date || null,
      quiz_size: quiz_size ?? 10,
      created_by: uid
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateVak(id, patch) {
  if (!supabaseEnabled) throw new Error('Supabase niet geconfigureerd.');
  await ensureUser();
  const allowed = ['naam', 'kleur', 'tint', 'icon', 'active', 'sort_order', 'test_date', 'quiz_size'];
  const body = {};
  for (const k of allowed) if (k in patch) body[k] = patch[k];
  if (patch.naam) body.key = slugify(patch.naam);
  const { data, error } = await supabase.from('vakken').update(body).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteVak(id) {
  if (!supabaseEnabled) throw new Error('Supabase niet geconfigureerd.');
  await ensureUser();
  const { error } = await supabase.from('vakken').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function reorderVakken(ids) {
  if (!supabaseEnabled) throw new Error('Supabase niet geconfigureerd.');
  await ensureUser();
  // Eén update per rij — Supabase heeft geen built-in bulk reorder.
  await Promise.all(
    ids.map((id, i) => supabase.from('vakken').update({ sort_order: i + 1 }).eq('id', id))
  );
}

// Herschik vakken op basis van test_date (oudst eerst). Vakken zonder datum
// belanden achteraan in hun huidige onderlinge volgorde.
export async function sortVakkenByTestDate(leerjaar) {
  const vakken = await listVakken(leerjaar);
  const dated = vakken
    .filter((v) => v.test_date)
    .sort((a, b) => a.test_date.localeCompare(b.test_date));
  const undated = vakken
    .filter((v) => !v.test_date)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const ordered = [...dated, ...undated];
  if (!ordered.length) return;
  await reorderVakken(ordered.map((v) => v.id));
}
