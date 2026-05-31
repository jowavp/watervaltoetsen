// Persistentie voor kid/teacher state.
// - Schrijft altijd naar localStorage (offline-first).
// - Synct naar Supabase als die geconfigureerd is en de gebruiker aangemeld is.

import { supabase, supabaseEnabled, ensureUser } from './supabase.js';

const KEYS = {
  profile: 'wv_profile',
  progress: 'wv_progress',
  vakorder: 'wv_vakorder',
  teacher: 'wv_teacher',
  sources: 'wv_sources',
  banks: 'wv_banks'
};

const readLocal = (k, fallback) => {
  try {
    const v = JSON.parse(localStorage.getItem(k));
    return v == null ? fallback : v;
  } catch {
    return fallback;
  }
};
const writeLocal = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* quota, private mode — negeren */
  }
};

// ──────────────── KID ────────────────

export function loadKidLocal() {
  return {
    profile: readLocal(KEYS.profile, {}),
    progress: readLocal(KEYS.progress, {}),
    vakorder: readLocal(KEYS.vakorder, null)
  };
}

export function saveKidProfile(profile) {
  writeLocal(KEYS.profile, profile);
  syncKidProfile(profile);
}
export function saveKidProgress(progress) {
  writeLocal(KEYS.progress, progress);
  syncKidProgress(progress);
}
export function saveKidVakOrder(order) {
  writeLocal(KEYS.vakorder, order);
  syncKidVakOrder(order);
}

async function syncKidProfile(profile) {
  if (!supabaseEnabled) return;
  const uid = await ensureUser();
  if (!uid) return;
  await supabase.from('profiles').upsert(
    {
      user_id: uid,
      role: 'kid',
      naam: profile.naam ?? null,
      avatar: profile.avatar ?? null,
      bg: profile.bg ?? null,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id' }
  );
}

async function syncKidProgress(progress) {
  if (!supabaseEnabled) return;
  const uid = await ensureUser();
  if (!uid) return;
  const rows = Object.entries(progress).map(([node_id, stars]) => ({
    user_id: uid,
    node_id,
    stars,
    updated_at: new Date().toISOString()
  }));
  if (!rows.length) return;
  await supabase.from('progress').upsert(rows, { onConflict: 'user_id,node_id' });
}

async function syncKidVakOrder(order) {
  if (!supabaseEnabled) return;
  const uid = await ensureUser();
  if (!uid) return;
  await supabase.from('vak_order').upsert(
    { user_id: uid, ordering: order, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
}

export async function pullKidState() {
  if (!supabaseEnabled) return null;
  const uid = await ensureUser();
  if (!uid) return null;
  const [{ data: prof }, { data: progRows }, { data: orderRow }] = await Promise.all([
    supabase.from('profiles').select('naam,avatar,bg').eq('user_id', uid).maybeSingle(),
    supabase.from('progress').select('node_id,stars').eq('user_id', uid),
    supabase.from('vak_order').select('ordering').eq('user_id', uid).maybeSingle()
  ]);
  const progress = {};
  (progRows || []).forEach((r) => {
    progress[r.node_id] = r.stars;
  });
  return {
    profile: prof || null,
    progress,
    vakorder: orderRow?.ordering || null
  };
}

// ──────────────── ADMIN ────────────────

export function loadTeacherLocal() {
  return {
    teacher: readLocal(KEYS.teacher, {}),
    sources: readLocal(KEYS.sources, { onthoudmap: [], contracten: [], werkbladen: [] }),
    banks: readLocal(KEYS.banks, [])
  };
}

export function saveTeacherProfile(teacher) {
  writeLocal(KEYS.teacher, teacher);
  syncTeacherProfile(teacher);
}
export function saveSources(sources) {
  writeLocal(KEYS.sources, sources);
}
export function saveBanks(banks) {
  writeLocal(KEYS.banks, banks);
}

async function syncTeacherProfile(teacher) {
  if (!supabaseEnabled) return;
  const uid = await ensureUser();
  if (!uid) return;
  await supabase.from('profiles').upsert(
    {
      user_id: uid,
      role: 'teacher',
      naam: teacher.naam ?? null,
      avatar: teacher.who ?? null,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id' }
  );
}
