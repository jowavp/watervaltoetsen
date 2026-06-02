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
  return window.location.origin + import.meta.env.BASE_URL;
}

// Generieke timeout-helper. Faalt liever snel met een error dan eindeloos
// te wachten op een netwerk-call.
export function withTimeout(promise, ms, label = 'timeout') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} (${ms}ms)`)), ms))
  ]);
}

// Geeft een geldige sessie terug of `null`. Behandelt expired access tokens
// expliciet en faalt snel als refresh hangt.
export async function getValidSession({ timeoutMs = 6000 } = {}) {
  if (!supabase) return null;
  let session = null;
  try {
    const { data } = await withTimeout(supabase.auth.getSession(), timeoutMs, 'getSession');
    session = data?.session || null;
  } catch (e) {
    console.warn('[auth] getSession failed:', e.message);
    return null;
  }
  if (!session) return null;

  // Check expiry — refresh wanneer access token binnen 10s verloopt.
  const expiresAtMs = session.expires_at ? session.expires_at * 1000 : 0;
  if (expiresAtMs && expiresAtMs < Date.now() + 10_000) {
    try {
      const { data, error } = await withTimeout(
        supabase.auth.refreshSession(),
        timeoutMs,
        'refreshSession'
      );
      if (error || !data?.session) {
        console.warn('[auth] refreshSession failed:', error?.message || 'no session');
        return null;
      }
      return data.session;
    } catch (e) {
      console.warn('[auth] refresh timed out:', e.message);
      return null;
    }
  }
  return session;
}

// Backward-compat: andere lib-bestanden gebruiken nog ensureUser.
export async function ensureUser() {
  const session = await getValidSession();
  return session?.user?.id ?? null;
}

export async function currentUser() {
  const session = await getValidSession();
  return session?.user || null;
}

export async function isTeacherEmail(email, { timeoutMs = 5000 } = {}) {
  if (!supabase || !email) return false;
  try {
    const result = await withTimeout(
      supabase.from('teacher_emails').select('email').ilike('email', email).maybeSingle(),
      timeoutMs,
      'teacher_emails'
    );
    const { data, error } = result || {};
    if (error) {
      console.warn('[teacher_emails] check:', error.message);
      return false;
    }
    return Boolean(data);
  } catch (e) {
    console.warn('[teacher_emails] timeout/error:', e.message);
    return false;
  }
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

export async function signOut({ clearLocal = true } = {}) {
  if (!supabase) return;
  if (clearLocal) {
    try {
      for (const k of ['wv_profile', 'wv_progress', 'wv_vakorder', 'wv_teacher']) {
        localStorage.removeItem(k);
      }
    } catch {
      /* ignore */
    }
  }
  try {
    await withTimeout(supabase.auth.signOut(), 3000, 'signOut');
  } catch (e) {
    console.warn('[auth] signOut timeout — manueel wissen', e.message);
    // Fallback: wis Supabase auth-tokens manueel zodat de gebruiker tenminste
    // doorkan naar de sign-in flow.
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
          localStorage.removeItem(k);
        }
      }
    } catch {}
  }
}
