// Persistentie voor kid/teacher state.
// - localStorage als offline cache
// - Supabase als source-of-truth wanneer ingelogd

import { supabase, supabaseEnabled, ensureUser } from './supabase.js';

const KEYS = {
  profile: 'wv_profile',         // kid-profile cache
  progress: 'wv_progress',       // kid-progress cache
  vakorder: 'wv_vakorder',       // teacher-volgorde cache
  teacher: 'wv_teacher'          // teacher-profile cache
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
  syncProfile('kid', profile);
}
export function saveKidProgress(progress) {
  writeLocal(KEYS.progress, progress);
  syncKidProgress(progress);
}
export function saveKidVakOrder(order) {
  writeLocal(KEYS.vakorder, order);
}

async function syncProfile(role, profile) {
  if (!supabaseEnabled) return;
  const uid = await ensureUser();
  if (!uid) return;
  await supabase.from('profiles').upsert(
    {
      user_id: uid,
      role,
      naam: profile.naam ?? null,
      avatar: profile.avatar ?? null,
      bg: profile.bg ?? null,
      leerjaar: profile.leerjaar ?? null,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id,role' }
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
    supabase
      .from('profiles')
      .select('naam,avatar,bg,leerjaar')
      .eq('user_id', uid)
      .eq('role', 'kid')
      .maybeSingle(),
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

// ──────────────── TEACHER ────────────────

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
    { onConflict: 'user_id,role' }
  );
}

export async function pullTeacherProfile() {
  if (!supabaseEnabled) return null;
  const uid = await ensureUser();
  if (!uid) return null;
  const { data } = await supabase
    .from('profiles')
    .select('naam,avatar')
    .eq('user_id', uid)
    .eq('role', 'teacher')
    .maybeSingle();
  if (!data) return null;
  return { naam: data.naam, who: data.avatar };
}
