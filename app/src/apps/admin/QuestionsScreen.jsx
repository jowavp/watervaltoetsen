import { useEffect, useMemo, useState } from 'react';
import {
  approveAndPublishBank,
  deleteQuestion,
  listQuestions,
  publishBank,
  setQuestionActive,
  setQuestionApproved
} from '../../lib/questions.js';
import { listVakken } from '../../lib/vakken.js';
import { listCategories, setQuestionCategory } from '../../lib/categories.js';
import { supabaseEnabled } from '../../lib/supabase.js';

const TYPE_LABEL = { mc: 'Meerkeuze', tf: 'Juist/fout', fill: 'Invul', match: 'Koppel' };
const TYPE_COLOR = { mc: '#1fa9ce', tf: '#5fbe82', fill: '#ff9e2c', match: '#9b8cff' };
const STATUS_LABEL = {
  draft: 'Concept',
  pending_review: 'Wacht op nakijk',
  published: 'Gepubliceerd',
  archived: 'Gearchiveerd'
};

function answerText(q) {
  const p = q.payload || {};
  if (q.type === 'mc' && Array.isArray(p.options) && typeof p.answer === 'number') return p.options[p.answer];
  if (q.type === 'tf') return p.answer ? 'Juist' : 'Fout';
  if (q.type === 'fill') return p.answer || p.accept?.[0] || '—';
  if (q.type === 'match' && Array.isArray(p.pairs)) {
    return p.pairs.map((pair) => `${pair.l} → ${pair.r}`).join(', ');
  }
  if (p.a) return p.a; // lokaal-gegenereerd payload-formaat
  return '—';
}

function QuestionCard({ q, vakInfo, categoriesForVak, onToggle, onDelete, onToggleApproved, onChangeCategory }) {
  const isActive = q.active && !q.archived_at;
  const isPending = q.bank?.status === 'pending_review';
  const currentCategory = categoriesForVak?.find((c) => c.id === q.category_id);
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 14,
        padding: '11px 13px',
        boxShadow: '0 3px 0 rgba(40,52,59,0.06)',
        borderLeft: `5px solid ${vakInfo?.kleur || '#7b8890'}`,
        opacity: isActive ? 1 : 0.55
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, flexWrap: 'wrap' }}>
        {vakInfo && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: vakInfo.kleur,
              background: vakInfo.tint,
              borderRadius: 999,
              padding: '3px 8px'
            }}
          >
            {vakInfo.naam}
          </span>
        )}
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: '#fff',
            background: TYPE_COLOR[q.type] || '#7b8890',
            borderRadius: 999,
            padding: '3px 8px'
          }}
        >
          {TYPE_LABEL[q.type] || q.type}
        </span>
        {q.bank?.status && q.bank.status !== 'published' && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: '#8a6d18',
              background: '#fff7e0',
              borderRadius: 999,
              padding: '3px 8px'
            }}
          >
            {STATUS_LABEL[q.bank.status] || q.bank.status}
          </span>
        )}
        {isPending && (
          <button
            className="tap"
            onClick={() => onToggleApproved(q)}
            title={q.approved ? 'Goedgekeurd — klik om af te wijzen' : 'Klik om goed te keuren'}
            style={{
              marginLeft: 'auto',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 999,
              padding: '4px 10px',
              fontWeight: 800,
              fontSize: 11.5,
              background: q.approved ? 'var(--leaf)' : '#fff',
              color: q.approved ? '#fff' : 'var(--ink-soft)',
              boxShadow: q.approved ? 'none' : '0 0 0 1.5px var(--border)'
            }}
          >
            {q.approved ? '✓ Goedgekeurd' : '◯ Keur goed'}
          </button>
        )}
        <button
          className="tap"
          onClick={() => onToggle(q)}
          style={{
            marginLeft: isPending ? 0 : 'auto',
            border: 'none',
            cursor: 'pointer',
            borderRadius: 999,
            padding: '4px 10px',
            fontWeight: 800,
            fontSize: 11.5,
            background: isActive ? 'var(--leaf)' : '#ece6da',
            color: isActive ? '#fff' : 'var(--ink-soft)'
          }}
        >
          {isActive ? '● Actief' : '○ Inactief'}
        </button>
        <button
          className="iconbtn"
          onClick={() => onDelete(q)}
          title="Verwijderen"
          style={{ width: 28, height: 28, fontSize: 12, color: 'var(--coral)' }}
        >
          🗑
        </button>
      </div>
      <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--ink)', lineHeight: 1.3 }}>{q.q}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--ink-soft)' }}>Categorie:</span>
        {onChangeCategory ? (
          <select
            value={q.category_id || ''}
            onChange={(e) => onChangeCategory(q, e.target.value || null)}
            style={{
              fontSize: 11,
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: 7,
              border: '1.5px solid var(--border)',
              background: '#fff',
              color: vakInfo?.kleur || 'var(--ink)',
              cursor: 'pointer'
            }}
          >
            <option value="">— Ongetagd —</option>
            {(categoriesForVak || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.naam}
              </option>
            ))}
          </select>
        ) : (
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 800,
              color: currentCategory ? vakInfo?.kleur || 'var(--ink-soft)' : 'var(--ink-soft)',
              background: currentCategory ? (vakInfo?.tint || '#eef1f3') : '#f4efe2',
              borderRadius: 999,
              padding: '2px 8px'
            }}
          >
            {currentCategory ? currentCategory.naam : 'Ongetagd'}
          </span>
        )}
        {q.onderdeel && q.onderdeel !== (currentCategory?.naam || '') && (
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-soft)' }}>· {q.onderdeel}</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7 }}>
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: 'var(--leaf)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            flexShrink: 0
          }}
        >
          ✓
        </span>
        <span style={{ fontWeight: 800, color: '#2e8c54', fontSize: 12.5, flex: 1, lineHeight: 1.25 }}>
          {answerText(q)}
        </span>
      </div>
    </div>
  );
}

export default function QuestionsScreen({ leerjaar, onLeerjaar, onBack }) {
  const [vakken, setVakken] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vakFilter, setVakFilter] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(null); // null=all, 'NULL'=ongetagd, id=specifiek
  const [showInactive, setShowInactive] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const vakInfo = useMemo(() => Object.fromEntries(vakken.map((v) => [v.key, v])), [vakken]);
  const categoryById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vk, qs] = await Promise.all([
        listVakken(leerjaar),
        listQuestions({ leerjaar, vak: vakFilter, includeInactive: showInactive })
      ]);
      setVakken(vk);
      // Categorieën: enkel voor het actieve vak-filter, of alle vakken samen.
      let cats = [];
      if (vakFilter) {
        cats = await listCategories({ leerjaar, vak: vakFilter });
      } else {
        const lists = await Promise.all(vk.map((v) => listCategories({ leerjaar, vak: v.key })));
        cats = lists.flat();
      }
      setCategories(cats);
      setQuestions(qs);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leerjaar, vakFilter, showInactive]);

  // Reset categoriefilter wanneer vak wisselt.
  useEffect(() => {
    setCategoryFilter(null);
  }, [vakFilter]);

  // Filter questions in-memory op category (Supabase query houdt dit niet bij).
  const filteredQuestions = useMemo(() => {
    if (!categoryFilter) return questions;
    if (categoryFilter === 'NULL') return questions.filter((q) => !q.category_id);
    return questions.filter((q) => q.category_id === categoryFilter);
  }, [questions, categoryFilter]);

  const categoriesByVak = useMemo(() => {
    const map = {};
    for (const c of categories) {
      if (!map[c.vak]) map[c.vak] = [];
      map[c.vak].push(c);
    }
    return map;
  }, [categories]);

  const changeCategory = async (q, newCategoryId) => {
    try {
      await setQuestionCategory(q.id, newCategoryId);
      await reload();
    } catch (e) {
      setError(e.message);
    }
  };

  if (!supabaseEnabled) {
    return (
      <div className="screen" style={{ background: 'var(--cream)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 2px 10px' }}>
          <button className="iconbtn" onClick={onBack}>
            ‹
          </button>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 18, color: 'var(--ink)' }}>
            Vragen beheren
          </div>
        </div>
        <div
          style={{
            background: '#fff7e0',
            border: '1.5px solid #f0d28a',
            borderRadius: 14,
            padding: 14,
            color: '#8a6d18',
            fontWeight: 700,
            fontSize: 14
          }}
        >
          Supabase niet geconfigureerd in deze build.
        </div>
      </div>
    );
  }

  const toggle = async (q) => {
    try {
      await setQuestionActive(q.id, !(q.active && !q.archived_at));
      reload();
    } catch (e) {
      setError(e.message);
    }
  };

  const toggleApproved = async (q) => {
    try {
      await setQuestionApproved(q.id, !q.approved);
      reload();
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async (q) => {
    if (!confirm('Deze vraag definitief verwijderen?')) return;
    try {
      await deleteQuestion(q.id);
      reload();
    } catch (e) {
      setError(e.message);
    }
  };

  // Per-bank: rij goedkeur-status, voor banner-summary + per-bank publiceer-knop.
  const pendingBanks = useMemo(() => {
    const byBank = new Map();
    for (const q of questions) {
      if (q.bank?.status !== 'pending_review') continue;
      const b = byBank.get(q.bank_id) || { bank: q.bank, bankId: q.bank_id, total: 0, approved: 0 };
      b.total += 1;
      if (q.approved) b.approved += 1;
      byBank.set(q.bank_id, b);
    }
    return [...byBank.values()];
  }, [questions]);

  const totalPending = pendingBanks.reduce((s, b) => s + b.total, 0);

  // Bouw vak-overzicht per bank (voor de publish-dialog preview).
  const banksWithVakken = useMemo(() => {
    const byBank = new Map();
    for (const q of questions) {
      if (q.bank?.status !== 'pending_review') continue;
      const entry = byBank.get(q.bank_id) || { bankId: q.bank_id, vakken: new Set(), total: 0 };
      entry.vakken.add(q.vak);
      entry.total += 1;
      byBank.set(q.bank_id, entry);
    }
    return [...byBank.values()].map((e) => ({ ...e, vakken: [...e.vakken] }));
  }, [questions]);

  // Dialog-state voor "Toevoegen of vervangen?"
  // { kind: 'one' | 'bulk', bankIds: string[], vakken: string[], andApprove: bool }
  const [publishDlg, setPublishDlg] = useState(null);

  const openPublishDlgBulk = () => {
    if (!pendingBanks.length) return;
    const vakSet = new Set();
    banksWithVakken.forEach((b) => b.vakken.forEach((v) => vakSet.add(v)));
    setPublishDlg({
      kind: 'bulk',
      bankIds: pendingBanks.map((b) => b.bankId),
      vakken: [...vakSet],
      andApprove: true
    });
  };

  const openPublishDlgOne = (bankId) => {
    const meta = banksWithVakken.find((b) => b.bankId === bankId);
    setPublishDlg({
      kind: 'one',
      bankIds: [bankId],
      vakken: meta?.vakken || [],
      // Voor de "📤 Publiceer batch"-knop weten we niet of alles is goedgekeurd —
      // we publiceren gewoon (de bank's reeds-goedgekeurde vragen worden zichtbaar).
      andApprove: false
    });
  };

  const runPublish = async (mode) => {
    if (!publishDlg) return;
    setPublishDlg(null);
    try {
      for (const bid of publishDlg.bankIds) {
        if (publishDlg.andApprove) {
          await approveAndPublishBank(bid, { mode });
        } else {
          await publishBank(bid, { mode });
        }
      }
      reload();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="screen" style={{ background: 'var(--cream)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 2px 10px' }}>
        <button className="iconbtn" onClick={onBack}>
          ‹
        </button>
        <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 18, color: 'var(--ink)' }}>
          Vragen beheren
        </div>
        <div
          style={{
            marginLeft: 'auto',
            fontWeight: 800,
            fontSize: 11,
            color: 'var(--ink-soft)',
            background: '#fff',
            borderRadius: 999,
            padding: '4px 10px',
            boxShadow: '0 2px 0 rgba(40,52,59,0.06)'
          }}
        >
          {filteredQuestions.length} {filteredQuestions.length === 1 ? 'vraag' : 'vragen'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {[1, 2, 3, 4, 5, 6].map((n) => {
          const active = n === leerjaar;
          return (
            <button
              key={n}
              className="tap"
              onClick={() => onLeerjaar(n)}
              style={{
                flex: 1,
                height: 32,
                borderRadius: 10,
                fontFamily: 'var(--display)',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                background: active ? 'var(--water)' : '#fff',
                color: active ? '#fff' : 'var(--ink)',
                border: 'none',
                boxShadow: active ? '0 3px 0 var(--water-dark)' : '0 2px 0 rgba(40,52,59,0.06)'
              }}
            >
              {n}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
        <button
          className="tap"
          onClick={() => setVakFilter(null)}
          style={chip(vakFilter === null, '#7b8890')}
        >
          Alle vakken
        </button>
        {vakken.map((v) => (
          <button key={v.key} className="tap" onClick={() => setVakFilter(v.key)} style={chip(vakFilter === v.key, v.kleur)}>
            {v.icon ? v.icon + ' ' : ''}
            {v.naam}
          </button>
        ))}
      </div>

      {/* Categorie-chips, alleen tonen als er categorieën zijn binnen scope */}
      {categories.length > 0 && (
        <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
          <button
            className="tap"
            onClick={() => setCategoryFilter(null)}
            style={chipSmall(categoryFilter === null, '#7b8890')}
          >
            Alle categorieën
          </button>
          {categories
            .filter((c) => !vakFilter || c.vak === vakFilter)
            .map((c) => {
              const vi = vakInfo[c.vak];
              return (
                <button
                  key={c.id}
                  className="tap"
                  onClick={() => setCategoryFilter(c.id)}
                  style={chipSmall(categoryFilter === c.id, vi?.kleur || '#7b8890')}
                >
                  {c.naam}
                </button>
              );
            })}
          <button
            className="tap"
            onClick={() => setCategoryFilter('NULL')}
            style={chipSmall(categoryFilter === 'NULL', '#7b8890')}
            title="Vragen zonder categorie"
          >
            ⚪ Ongetagd
          </button>
        </div>
      )}

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12.5,
          fontWeight: 700,
          color: 'var(--ink-soft)',
          marginBottom: 8
        }}
      >
        <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
        Toon ook inactieve vragen
      </label>

      {pendingBanks.length > 0 && (
        <div
          style={{
            background: '#fff7e0',
            border: '1.5px solid #f0d28a',
            borderRadius: 14,
            padding: '12px 14px',
            marginBottom: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>⏳</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 15, color: '#8a6d18' }}>
                {totalPending} {totalPending === 1 ? 'vraag wacht' : 'vragen wachten'} op nakijk
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#a07a1c' }}>
                in {pendingBanks.length} {pendingBanks.length === 1 ? 'batch' : 'batches'} — keur ze goed om ze zichtbaar te maken voor leerlingen
              </div>
            </div>
            <button
              className="cta tap"
              onClick={openPublishDlgBulk}
              style={{
                background: 'var(--leaf)',
                boxShadow: '0 4px 0 var(--leaf-dark)',
                padding: '10px 14px',
                fontSize: 13
              }}
            >
              ✓ Alles + publiceer
            </button>
          </div>
          {pendingBanks.length > 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pendingBanks.map((b) => (
                <div
                  key={b.bankId}
                  style={{
                    background: '#fff',
                    borderRadius: 10,
                    padding: '7px 11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--ink)'
                  }}
                >
                  <span style={{ fontFamily: 'var(--display)', fontWeight: 700 }}>
                    Batch — {b.total} vragen
                  </span>
                  <span style={{ color: 'var(--leaf-dark)', fontWeight: 800 }}>· {b.approved} goedgekeurd</span>
                  <button
                    className="tap"
                    onClick={() => openPublishDlgOne(b.bankId)}
                    disabled={b.approved === 0}
                    style={{
                      marginLeft: 'auto',
                      border: 'none',
                      background: b.approved > 0 ? 'var(--water)' : '#ece6da',
                      color: b.approved > 0 ? '#fff' : 'var(--ink-soft)',
                      cursor: b.approved > 0 ? 'pointer' : 'default',
                      borderRadius: 999,
                      padding: '4px 10px',
                      fontSize: 11,
                      fontWeight: 800,
                      boxShadow: b.approved > 0 ? '0 3px 0 var(--water-dark)' : 'none'
                    }}
                  >
                    📤 Publiceer batch
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div
          style={{
            background: '#fdeceb',
            border: '1.5px solid #f3b2ab',
            borderRadius: 12,
            padding: 10,
            color: '#a93221',
            fontWeight: 700,
            fontSize: 12.5,
            marginBottom: 10
          }}
        >
          {error}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--ink-soft)', fontWeight: 700, fontSize: 13, padding: '24px 0' }}>
            Bezig met laden…
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--ink-soft)', fontWeight: 700, fontSize: 13, padding: '24px 14px' }}>
            Geen vragen{vakFilter ? ` voor ${vakInfo[vakFilter]?.naam || vakFilter}` : ''} in leerjaar {leerjaar}.
            <br />
            <span style={{ fontSize: 12 }}>
              Genereer er via de admin home of vraag een nieuwe batch aan op het vak-detailscherm.
            </span>
          </div>
        ) : (
          filteredQuestions.map((q) => (
            <QuestionCard
              key={q.id}
              q={q}
              vakInfo={vakInfo[q.vak]}
              categoriesForVak={categoriesByVak[q.vak] || []}
              onToggle={toggle}
              onDelete={remove}
              onToggleApproved={toggleApproved}
              onChangeCategory={changeCategory}
            />
          ))
        )}
      </div>

      {publishDlg && (
        <PublishDialog
          dlg={publishDlg}
          vakInfo={vakInfo}
          onClose={() => setPublishDlg(null)}
          onChoose={runPublish}
        />
      )}
    </div>
  );
}

function PublishDialog({ dlg, vakInfo, onClose, onChoose }) {
  const vakNamen = dlg.vakken
    .map((k) => vakInfo[k]?.naam || k)
    .filter(Boolean);
  const vakSummary =
    vakNamen.length === 0
      ? 'dit vak'
      : vakNamen.length === 1
      ? vakNamen[0]
      : vakNamen.slice(0, -1).join(', ') + ' en ' + vakNamen.slice(-1);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end'
      }}
    >
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(40,52,59,0.45)', animation: 'fadein .2s ease' }}
      />
      <div
        style={{
          position: 'relative',
          background: 'var(--cream)',
          borderRadius: '26px 26px 0 0',
          padding: '14px 18px 20px',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.22)',
          animation: 'slideup .3s cubic-bezier(.2,.8,.3,1)'
        }}
      >
        <div style={{ width: 44, height: 5, borderRadius: 3, background: '#d9d0c0', margin: '0 auto 14px' }} />

        <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 20, color: 'var(--ink)', marginBottom: 4 }}>
          {dlg.kind === 'bulk' ? 'Alles publiceren' : 'Batch publiceren'}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 16, lineHeight: 1.35 }}>
          Wat doen we met de vragen die nu al gepubliceerd staan voor <b style={{ color: 'var(--ink)' }}>{vakSummary}</b>?
        </div>

        <button
          className="tap"
          onClick={() => onChoose('add')}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            background: '#fff',
            border: 'none',
            borderRadius: 16,
            padding: '14px 14px',
            cursor: 'pointer',
            boxShadow: '0 4px 0 rgba(40,52,59,0.07)',
            borderLeft: '6px solid var(--water)',
            width: '100%',
            textAlign: 'left',
            marginBottom: 10
          }}
        >
          <span style={{ fontSize: 22 }}>➕</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 16, color: 'var(--ink)' }}>
              Toevoegen aan bestaande set
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginTop: 2, lineHeight: 1.3 }}>
              Oude vragen blijven zichtbaar. De nieuwe komen erbij.
            </div>
          </div>
        </button>

        <button
          className="tap"
          onClick={() => onChoose('replace')}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            background: '#fff',
            border: 'none',
            borderRadius: 16,
            padding: '14px 14px',
            cursor: 'pointer',
            boxShadow: '0 4px 0 rgba(40,52,59,0.07)',
            borderLeft: '6px solid var(--coral)',
            width: '100%',
            textAlign: 'left',
            marginBottom: 14
          }}
        >
          <span style={{ fontSize: 22 }}>♻️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 16, color: 'var(--ink)' }}>
              Vervangen — oude verbergen
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginTop: 2, lineHeight: 1.3 }}>
              Bestaande vragen voor {vakSummary} worden uitgeschakeld (niet gewist) en alleen de nieuwe blijven zichtbaar voor leerlingen.
            </div>
          </div>
        </button>

        <button className="cta-ghost tap" onClick={onClose} style={{ width: '100%' }}>
          Annuleer
        </button>
      </div>
    </div>
  );
}

function chip(active, kleur) {
  return {
    padding: '6px 11px',
    borderRadius: 999,
    fontFamily: 'var(--body)',
    fontWeight: 800,
    fontSize: 12,
    border: 'none',
    cursor: 'pointer',
    background: active ? kleur : '#fff',
    color: active ? '#fff' : 'var(--ink)',
    boxShadow: active ? `0 3px 0 ${kleur}99` : '0 2px 0 rgba(40,52,59,0.06)'
  };
}

function chipSmall(active, kleur) {
  return {
    padding: '4px 9px',
    borderRadius: 999,
    fontFamily: 'var(--body)',
    fontWeight: 700,
    fontSize: 10.5,
    border: 'none',
    cursor: 'pointer',
    background: active ? kleur : '#fff',
    color: active ? '#fff' : 'var(--ink)',
    boxShadow: active ? `0 2px 0 ${kleur}99` : '0 1px 0 rgba(40,52,59,0.06)'
  };
}
