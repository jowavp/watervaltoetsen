// Supabase CRUD voor `sources` (kennisbronnen per leerkracht/leerjaar/stream).
import { ensureUser, supabase, supabaseEnabled } from './supabase.js';

const STREAM_KEYS = ['onthoudmap', 'contracten', 'werkbladen'];

export async function listSources(leerjaar) {
  const empty = { onthoudmap: [], contracten: [], werkbladen: [] };
  if (!supabaseEnabled) return empty;
  const uid = await ensureUser();
  if (!uid) return empty;
  const { data, error } = await supabase
    .from('sources')
    .select('id,stream,title,vak,leerjaar,file_name,storage_path,created_at')
    .eq('teacher_id', uid)
    .eq('leerjaar', leerjaar)
    .order('created_at', { ascending: true });
  if (error) {
    console.warn('[sources] list:', error.message);
    return empty;
  }
  const grouped = { ...empty };
  for (const k of STREAM_KEYS) grouped[k] = [];
  (data || []).forEach((row) => {
    if (STREAM_KEYS.includes(row.stream)) grouped[row.stream].push(row);
  });
  return grouped;
}

export async function createSource({ leerjaar, stream, title, vak, file_name, storage_path }) {
  if (!supabaseEnabled) throw new Error('Supabase niet geconfigureerd.');
  const uid = await ensureUser();
  if (!uid) throw new Error('Niet aangemeld.');
  const { data, error } = await supabase
    .from('sources')
    .insert({
      teacher_id: uid,
      leerjaar,
      stream,
      title: (title || '').trim(),
      vak: vak || null,
      file_name: file_name || null,
      storage_path: storage_path || null
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateSource(id, patch) {
  if (!supabaseEnabled) throw new Error('Supabase niet geconfigureerd.');
  await ensureUser();
  const allowed = ['title', 'vak', 'file_name', 'storage_path', 'stream', 'leerjaar'];
  const body = {};
  for (const k of allowed) if (k in patch) body[k] = patch[k];
  if (body.title) body.title = body.title.trim();
  const { data, error } = await supabase.from('sources').update(body).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteSource(id) {
  if (!supabaseEnabled) throw new Error('Supabase niet geconfigureerd.');
  await ensureUser();
  const { error } = await supabase.from('sources').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
