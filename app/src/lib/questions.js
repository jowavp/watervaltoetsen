// Supabase CRUD voor `questions` + helpers om banken te publiceren.
import { ensureUser, supabase, supabaseEnabled } from './supabase.js';

// ──────── Lezen ────────
// Lijst van vragen voor de huidige leerkracht, gefilterd op (leerjaar, vak).
// `includeInactive`: ook archived/active=false tonen.
export async function listQuestions({ leerjaar, vak, includeInactive = false }) {
  if (!supabaseEnabled) return [];
  const uid = await ensureUser();
  if (!uid) return [];

  // Eerst alle banks van deze leerkracht voor het leerjaar.
  const { data: banks, error: bankErr } = await supabase
    .from('question_banks')
    .select('id,status,created_at,published_at')
    .eq('teacher_id', uid)
    .eq('leerjaar', leerjaar)
    .order('created_at', { ascending: false });
  if (bankErr) {
    console.warn('[questions] banks:', bankErr.message);
    return [];
  }
  if (!banks || banks.length === 0) return [];

  const bankIds = banks.map((b) => b.id);
  const bankIndex = Object.fromEntries(banks.map((b) => [b.id, b]));

  let q = supabase
    .from('questions')
    .select('id,bank_id,vak,type,onderdeel,category_id,q,payload,approved,active,archived_at,position')
    .in('bank_id', bankIds)
    .order('position', { ascending: true });
  if (vak) q = q.eq('vak', vak);
  if (!includeInactive) q = q.eq('active', true).is('archived_at', null);

  const { data, error } = await q;
  if (error) {
    console.warn('[questions] list:', error.message);
    return [];
  }
  return (data || []).map((row) => ({ ...row, bank: bankIndex[row.bank_id] }));
}

// ──────── Per-vraag updates ────────
export async function setQuestionActive(id, active) {
  if (!supabaseEnabled) throw new Error('Supabase niet geconfigureerd.');
  await ensureUser();
  const { error } = await supabase
    .from('questions')
    .update({ active, archived_at: active ? null : new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteQuestion(id) {
  if (!supabaseEnabled) throw new Error('Supabase niet geconfigureerd.');
  await ensureUser();
  const { error } = await supabase.from('questions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setQuestionApproved(id, approved) {
  if (!supabaseEnabled) throw new Error('Supabase niet geconfigureerd.');
  await ensureUser();
  const { error } = await supabase.from('questions').update({ approved }).eq('id', id);
  if (error) throw new Error(error.message);
}

// Welke vakken zitten in een bank? Gebruikt om te weten welke oude vragen
// vervangen mogen worden bij replace-mode.
export async function getBankVakken(bankId) {
  if (!supabaseEnabled) return [];
  await ensureUser();
  const { data, error } = await supabase
    .from('questions')
    .select('vak')
    .eq('bank_id', bankId);
  if (error) {
    console.warn('[questions] getBankVakken:', error.message);
    return [];
  }
  return [...new Set((data || []).map((r) => r.vak).filter(Boolean))];
}

// Zet active=false + archived_at op alle oudere published-bank-vragen van
// de huidige leerkracht voor het opgegeven leerjaar en de vakken — behalve
// die in `exceptBankId`. Geeft aantal gearchiveerde vragen terug.
async function archiveOlderQuestions({ leerjaar, vakken, exceptBankId }) {
  if (!supabaseEnabled) return 0;
  const uid = await ensureUser();
  if (!uid) return 0;
  if (!vakken?.length) return 0;
  const { data: banks, error: bErr } = await supabase
    .from('question_banks')
    .select('id')
    .eq('teacher_id', uid)
    .eq('leerjaar', leerjaar)
    .eq('status', 'published')
    .neq('id', exceptBankId);
  if (bErr) throw new Error(bErr.message);
  if (!banks || banks.length === 0) return 0;
  const bankIds = banks.map((b) => b.id);
  const { data, error } = await supabase
    .from('questions')
    .update({ active: false, archived_at: new Date().toISOString() })
    .in('bank_id', bankIds)
    .in('vak', vakken)
    .eq('active', true)
    .select('id');
  if (error) throw new Error(error.message);
  return data?.length || 0;
}

// Zet de bank-status naar 'published' zodat goedgekeurde + actieve vragen
// zichtbaar worden voor leerlingen.
//   mode='add'     → laat bestaande gepubliceerde vragen staan
//   mode='replace' → archiveer eerst de oude vragen voor dezelfde vakken
export async function publishBank(bankId, { mode = 'add' } = {}) {
  if (!supabaseEnabled) throw new Error('Supabase niet geconfigureerd.');
  await ensureUser();
  if (mode === 'replace') {
    const { data: bank, error: bErr } = await supabase
      .from('question_banks')
      .select('leerjaar')
      .eq('id', bankId)
      .maybeSingle();
    if (bErr) throw new Error(bErr.message);
    if (bank?.leerjaar != null) {
      const vakken = await getBankVakken(bankId);
      if (vakken.length) {
        await archiveOlderQuestions({ leerjaar: bank.leerjaar, vakken, exceptBankId: bankId });
      }
    }
  }
  const { error } = await supabase
    .from('question_banks')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', bankId);
  if (error) throw new Error(error.message);
}

// Eén-knop-werkflow: alle vragen in een bank goedkeuren + de bank publiceren.
export async function approveAndPublishBank(bankId, { mode = 'add' } = {}) {
  if (!supabaseEnabled) throw new Error('Supabase niet geconfigureerd.');
  await ensureUser();
  const { error: aErr } = await supabase
    .from('questions')
    .update({ approved: true })
    .eq('bank_id', bankId);
  if (aErr) throw new Error(aErr.message);
  await publishBank(bankId, { mode });
}

export async function updateQuestion(id, patch) {
  if (!supabaseEnabled) throw new Error('Supabase niet geconfigureerd.');
  await ensureUser();
  const allowed = ['q', 'payload', 'onderdeel', 'approved', 'active', 'vak', 'type'];
  const body = {};
  for (const k of allowed) if (k in patch) body[k] = patch[k];
  const { data, error } = await supabase.from('questions').update(body).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

// ──────── Publiceren van een lokaal-gegenereerde batch ────────
// Schrijft een nieuwe bank ('published') + bijhorende rijen voor de actieve
// vragen. Verwacht het bank-formaat uit AdminApp (vak, type, q, a, onderdeel).
export async function publishLocalBank({ leerjaar, vragen, approved }) {
  if (!supabaseEnabled) throw new Error('Supabase niet geconfigureerd.');
  const uid = await ensureUser();
  if (!uid) throw new Error('Niet aangemeld.');

  const { data: bank, error: bankErr } = await supabase
    .from('question_banks')
    .insert({
      teacher_id: uid,
      leerjaar,
      status: 'published',
      published_at: new Date().toISOString()
    })
    .select()
    .single();
  if (bankErr) throw new Error(bankErr.message);

  const rows = vragen
    .map((qq, i) => ({ qq, i, ok: approved[i] }))
    .filter((x) => x.ok)
    .map(({ qq, i }) => ({
      bank_id: bank.id,
      vak: qq.vak || 'wiskunde',
      type: qq.type || 'mc',
      onderdeel: qq.onderdeel || null,
      q: String(qq.q || '').trim(),
      payload: { answer: qq.a ?? null, raw: qq },
      approved: true,
      active: true,
      position: i
    }));

  if (rows.length === 0) return bank;

  const { error: qErr } = await supabase.from('questions').insert(rows);
  if (qErr) {
    // Rollback: verwijder de zojuist aangemaakte bank.
    await supabase.from('question_banks').delete().eq('id', bank.id);
    throw new Error(qErr.message);
  }
  return bank;
}
