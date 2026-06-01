// Supabase CRUD voor `sources` (kennisbronnen per leerkracht/leerjaar/stream).
// Inclusief Storage-uploads naar de private 'sources' bucket.
import { ensureUser, supabase, supabaseEnabled } from './supabase.js';

const STREAM_KEYS = ['onthoudmap', 'contracten', 'werkbladen'];
const BUCKET = 'sources';

export async function listSources(leerjaar) {
  const empty = { onthoudmap: [], contracten: [], werkbladen: [] };
  if (!supabaseEnabled) return empty;
  const uid = await ensureUser();
  if (!uid) return empty;
  const { data, error } = await supabase
    .from('sources')
    .select('id,stream,title,vak,leerjaar,file_name,storage_path,size_bytes,mime_type,created_at')
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

// Sanitize filename: behoud extensie, vervang special chars met '-'.
function safeName(name) {
  const last = name.lastIndexOf('.');
  const base = last > 0 ? name.slice(0, last) : name;
  const ext = last > 0 ? name.slice(last) : '';
  const cleanBase = base
    .normalize('NFKD')
    .replace(/[^\w\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return (cleanBase || 'file') + ext.toLowerCase();
}

function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Upload één bestand naar Storage en geef het pad terug.
// path-conventie: <uid>/<leerjaar>/<stream>/<uuid>-<safe filename>
export async function uploadSourceFile({ file, leerjaar, stream }) {
  if (!supabaseEnabled) throw new Error('Supabase niet geconfigureerd.');
  const uid = await ensureUser();
  if (!uid) throw new Error('Niet aangemeld.');
  const path = `${uid}/${leerjaar}/${stream}/${randomId()}-${safeName(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    cacheControl: '3600',
    upsert: false
  });
  if (error) throw new Error(`Upload mislukt: ${error.message}`);
  return { path, file_name: file.name, size: file.size, mime: file.type };
}

// Maak een tijdelijke signed URL aan zodat de browser het bestand kan ophalen.
export async function getSourceSignedUrl(path, expiresInSec = 60 * 30) {
  if (!supabaseEnabled || !path) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSec);
  if (error) {
    console.warn('[sources] signed url:', error.message);
    return null;
  }
  return data?.signedUrl || null;
}

export async function createSource({ leerjaar, stream, title, vak, file_name, storage_path, size_bytes, mime_type }) {
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
      storage_path: storage_path || null,
      size_bytes: size_bytes ?? null,
      mime_type: mime_type || null
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
  // Eerst pad opvragen om het storage-object mee te verwijderen.
  const { data: row } = await supabase.from('sources').select('storage_path').eq('id', id).maybeSingle();
  const { error } = await supabase.from('sources').delete().eq('id', id);
  if (error) throw new Error(error.message);
  if (row?.storage_path) {
    const { error: sErr } = await supabase.storage.from(BUCKET).remove([row.storage_path]);
    if (sErr) console.warn('[sources] storage delete:', sErr.message);
  }
}
