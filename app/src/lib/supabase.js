import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseEnabled = Boolean(url && anon && !url.includes('YOUR-PROJECT'));

export const supabase = supabaseEnabled
  ? createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage
      }
    })
  : null;

export function appBaseUrl() {
  // BASE_URL is '/' lokaal, '/watervaltoetsen/' op Pages.
  return window.location.origin + import.meta.env.BASE_URL;
}

// Returnt de huidige user-id of null als niet ingelogd.
// Sinds de auth-redesign maakt deze functie geen sessies meer aan — de
// sign-in flow is verantwoordelijk daarvoor.
export async function ensureUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

export async function currentUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

// Check de teacher_emails allowlist. Case-insensitive.
export async function isTeacherEmail(email) {
  if (!supabase || !email) return false;
  const { data, error } = await supabase
    .from('teacher_emails')
    .select('email')
    .ilike('email', email)
    .maybeSingle();
  if (error) {
    console.warn('[teacher_emails] check:', error.message);
    return false;
  }
  return Boolean(data);
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase niet geconfigureerd.');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: appBaseUrl(),
      queryParams: { access_type: 'offline', prompt: 'select_account' }
    }
  });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  if (!supabase) return;
  // Lokale cache opruimen zodat een volgende gebruiker op hetzelfde toestel
  // geen restjes van de vorige sessie ziet.
  try {
    for (const k of ['wv_profile', 'wv_progress', 'wv_vakorder', 'wv_teacher']) {
      localStorage.removeItem(k);
    }
  } catch {
    /* private mode, quota — negeren */
  }
  await supabase.auth.signOut();
}
