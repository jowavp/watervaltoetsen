// Persistentie voor kid/teacher state.
// - Schrijft altijd naar localStorage (offline-first).
// - Synct kid-profiel + voortgang naar Supabase wanneer beschikbaar.
//
// De vakken-volgorde komt nu uit de `vakken`-tabel (sort_order, door de
// leerkracht beheerd). We cachen die nog wel naar localStorage voor offline
// gebruik, maar pushen niet meer naar een eigen `vak_order`-tabel.

import { supabase, supabaseEnabled, ensureUser } from './supabase.js';

const KEYS = {
  profile: 'wv_profile',
  progress: 'wv_progress',
  vakorder: 'wv_vakorder',
  teacher: 'wv_teacher'
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
// Pure localStorage-cache van de door de leerkracht ingestelde volgorde —
// gebruikt voor offline rendering. Wordt opnieuw vers gehaald wanneer online.
export function saveKidVakOrder(order) {
  writeLocal(KEYS.vakorder, order);
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

export async function pullKidState() {
  if (!supabaseEnabled) return null;
  const uid = await ensureUser();
  if (!uid) return null;
  const [{ data: prof }, { data: progRows }] = await Promise.all([
    supabase.from('profiles').select('naam,avatar,bg').eq('user_id', uid).maybeSingle(),
    supabase.from('progress').select('node_id,stars').eq('user_id', uid)
  ]);
  const progress = {};
  (progRows || []).forEach((r) => {
    progress[r.node_id] = r.stars;
  });
  return {
    profile: prof || null,
    progress
  };
}

// ──────────────── ADMIN ────────────────

export function loadTeacherLocal() {
  return { teacher: readLocal(KEYS.teacher, {}) };
}

export function saveTeacherProfile(teacher) {
  writeLocal(KEYS.teacher, teacher);
  syncTeacherProfile(teacher);
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
