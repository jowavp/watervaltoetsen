// CRUD voor categorieën binnen vakken.
import { ensureUser, supabase, supabaseEnabled } from './supabase.js';

export async function listCategories({ leerjaar, vak }) {
  if (!supabaseEnabled) return [];
  await ensureUser();
  let q = supabase
    .from('categories')
    .select('id,leerjaar,vak,naam,sort_order,active,created_at')
    .eq('leerjaar', leerjaar)
    .order('sort_order')
    .order('naam');
  if (vak) q = q.eq('vak', vak);
  const { data, error } = await q;
  if (error) {
    console.warn('[categories] list:', error.message);
    return [];
  }
  return data || [];
}

export async function createCategory({ leerjaar, vak, naam, sort_order }) {
  if (!supabaseEnabled) throw new Error('Supabase niet geconfigureerd.');
  const uid = await ensureUser();
  if (!uid) throw new Error('Niet aangemeld.');
  const { data, error } = await supabase
    .from('categories')
    .insert({
      leerjaar,
      vak,
      naam: (naam || '').trim(),
      sort_order: sort_order ?? 0,
      created_by: uid
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateCategory(id, patch) {
  if (!supabaseEnabled) throw new Error('Supabase niet geconfigureerd.');
  await ensureUser();
  const allowed = ['naam', 'sort_order', 'active'];
  const body = {};
  for (const k of allowed) if (k in patch) body[k] = patch[k];
  if (body.naam) body.naam = body.naam.trim();
  const { data, error } = await supabase.from('categories').update(body).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteCategory(id) {
  if (!supabaseEnabled) throw new Error('Supabase niet geconfigureerd.');
  await ensureUser();
  // Vragen die naar deze categorie verwijzen krijgen category_id=null
  // (ON DELETE SET NULL in het schema).
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// Verplaats een vraag naar een andere categorie (of null voor "Algemeen").
export async function setQuestionCategory(questionId, categoryId) {
  if (!supabaseEnabled) throw new Error('Supabase niet geconfigureerd.');
  await ensureUser();
  const { error } = await supabase.from('questions').update({ category_id: categoryId }).eq('id', questionId);
  if (error) throw new Error(error.message);
}

// Tel vragen per categorie voor een (leerjaar, vak). Gebruikt voor
// proportionele kwis-grootte in de kid-flow.
// Geeft { [categoryId]: count, _null: count } terug — _null = "Algemeen" bucket.
export async function countQuestionsPerCategory({ leerjaar, vak }) {
  if (!supabaseEnabled) return {};
  await ensureUser();
  const { data, error } = await supabase
    .from('questions')
    .select('category_id, bank:question_banks!inner(leerjaar, status)')
    .eq('vak', vak)
    .eq('active', true)
    .eq('approved', true)
    .eq('bank.status', 'published')
    .eq('bank.leerjaar', leerjaar);
  if (error) {
    console.warn('[categories] count:', error.message);
    return {};
  }
  const counts = {};
  for (const row of data || []) {
    const key = row.category_id || '_null';
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}
