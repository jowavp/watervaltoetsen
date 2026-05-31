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

let cachedUserId = null;

export function appBaseUrl() {
  // BASE_URL is '/' lokaal, '/watervaltoetsen/' op Pages.
  return window.location.origin + import.meta.env.BASE_URL;
}

// Anoniem aanmelden (voor leerlingen). Roep niet aan voor leerkrachten.
export async function ensureAnonymousUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (data?.session?.user) {
    cachedUserId = data.session.user.id;
    return cachedUserId;
  }
  const { data: anonData, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn('[supabase] anonymous sign-in failed:', error.message);
    return null;
  }
  cachedUserId = anonData.user?.id ?? null;
  return cachedUserId;
}

// Alias voor backwards compat in storage.js — gedraagt zich identiek.
export const ensureUser = ensureAnonymousUser;

export async function currentUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

export function isAnonymous(user) {
  if (!user) return true;
  // Supabase zet `is_anonymous: true` op de gebruiker én op de JWT.
  if (typeof user.is_anonymous === 'boolean') return user.is_anonymous;
  return false;
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase niet geconfigureerd.');
  // Als er nog een anonieme sessie hangt, eerst uitloggen — anders linkt
  // Supabase de identiteit aan die anon-user en niet aan een nieuw account.
  const { data: sess } = await supabase.auth.getSession();
  if (sess?.session?.user?.is_anonymous) {
    await supabase.auth.signOut();
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: appBaseUrl(),
      queryParams: { access_type: 'offline', prompt: 'consent' }
    }
  });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  if (!supabase) return;
  cachedUserId = null;
  await supabase.auth.signOut();
}

// Reset de gecachte user-id wanneer de sessie wijzigt — anders wijst
// `ensureUser` na een sign-out nog naar de oude id.
if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    cachedUserId = session?.user?.id ?? null;
  });
}
