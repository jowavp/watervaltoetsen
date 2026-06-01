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

function QuestionCard({ q, vakInfo, onToggle, onDelete, onToggleApproved }) {
  const isActive = q.active && !q.archived_at;
  const isPending = q.bank?.status === 'pending_review';
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
      {q.onderdeel && (
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-soft)', marginTop: 4 }}>· {q.onderdeel}</div>
      )}
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
  const [vakFilter, setVakFilter] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const vakInfo = useMemo(() => Object.fromEntries(vakken.map((v) => [v.key, v])), [vakken]);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vk, qs] = await Promise.all([
        listVakken(leerjaar),
        listQuestions({ leerjaar, vak: vakFilter, includeInactive: showInactive })
      ]);
      setVakken(vk);
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

  const approveAndPublishAll = async () => {
    if (!pendingBanks.length) return;
    if (!confirm(`Alle ${totalPending} vragen goedkeuren en ${pendingBanks.length} batch(es) publiceren?`)) return;
    try {
      for (const b of pendingBanks) {
        await approveAndPublishBank(b.bankId);
      }
      reload();
    } catch (e) {
      setError(e.message);
    }
  };

  const publishOneBank = async (bankId) => {
    if (!confirm('Deze batch publiceren? Enkel goedgekeurde vragen worden zichtbaar voor leerlingen.')) return;
    try {
      await publishBank(bankId);
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
          {questions.length} {questions.length === 1 ? 'vraag' : 'vragen'}
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

      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
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
              onClick={approveAndPublishAll}
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
                    onClick={() => publishOneBank(b.bankId)}
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
        ) : questions.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--ink-soft)', fontWeight: 700, fontSize: 13, padding: '24px 14px' }}>
            Geen vragen{vakFilter ? ` voor ${vakInfo[vakFilter]?.naam || vakFilter}` : ''} in leerjaar {leerjaar}.
            <br />
            <span style={{ fontSize: 12 }}>
              Genereer er via de admin home of vraag een nieuwe batch aan op het vak-detailscherm.
            </span>
          </div>
        ) : (
          questions.map((q) => (
            <QuestionCard
              key={q.id}
              q={q}
              vakInfo={vakInfo[q.vak]}
              onToggle={toggle}
              onDelete={remove}
              onToggleApproved={toggleApproved}
            />
          ))
        )}
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
