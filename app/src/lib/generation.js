// Wachtrij voor de cron-job: de leerkracht zet een aanvraag, een Node-script
// in GitHub Actions pakt 'queued' rijen op, genereert vragen via Claude en
// schrijft ze terug naar `questions` met status='pending_review'.

import { ensureUser, supabase, supabaseEnabled } from './supabase.js';

export async function listGenerationRequests({ leerjaar }) {
  if (!supabaseEnabled) return [];
  const uid = await ensureUser();
  if (!uid) return [];
  let q = supabase
    .from('generation_requests')
    .select('id,leerjaar,vak,num_questions,source_mode,status,error,bank_id,created_at,started_at,completed_at')
    .eq('teacher_id', uid)
    .order('created_at', { ascending: false })
    .limit(50);
  if (leerjaar) q = q.eq('leerjaar', leerjaar);
  const { data, error } = await q;
  if (error) {
    console.warn('[genreq] list:', error.message);
    return [];
  }
  return data || [];
}

export const SOURCE_MODES = [
  { key: 'mix', label: 'Mix', desc: 'Bronnen + Vlaamse leerlijn als aanvulling' },
  { key: 'documents', label: 'Enkel bronnen', desc: 'Uitsluitend op basis van opgeladen documenten' },
  { key: 'curriculum', label: 'Enkel leerlijn', desc: 'Standaard Vlaamse leerlijn (geen bronnen nodig)' }
];

export async function createGenerationRequest({ leerjaar, vak, num_questions = 10, source_mode = 'mix' }) {
  if (!supabaseEnabled) throw new Error('Supabase niet geconfigureerd.');
  const uid = await ensureUser();
  if (!uid) throw new Error('Niet aangemeld.');
  if (!['mix', 'documents', 'curriculum'].includes(source_mode)) {
    throw new Error(`Onbekende source_mode: ${source_mode}`);
  }
  const { data, error } = await supabase
    .from('generation_requests')
    .insert({
      teacher_id: uid,
      leerjaar,
      vak,
      num_questions: Math.max(1, Math.min(100, num_questions)),
      source_mode,
      status: 'queued'
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function cancelGenerationRequest(id) {
  if (!supabaseEnabled) throw new Error('Supabase niet geconfigureerd.');
  await ensureUser();
  // Alleen queued aanvragen mogen geannuleerd worden — running mag de cron afwerken.
  const { error } = await supabase
    .from('generation_requests')
    .delete()
    .eq('id', id)
    .eq('status', 'queued');
  if (error) throw new Error(error.message);
}

export const REQUEST_STATUS_LABEL = {
  queued: 'In wachtrij',
  running: 'Bezig met genereren…',
  done: 'Klaar — wacht op nakijk',
  failed: 'Mislukt'
};
