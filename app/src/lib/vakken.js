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
    .select('id,leerjaar,key,naam,kleur,tint,icon,active,sort_order')
    .eq('leerjaar', leerjaar)
    .order('sort_order')
    .order('naam');
  if (error) {
    console.warn('[vakken] list:', error.message);
    return [];
  }
  return data || [];
}

export async function createVak({ leerjaar, naam, kleur, tint, icon, sort_order }) {
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
  const allowed = ['naam', 'kleur', 'tint', 'icon', 'active', 'sort_order'];
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
