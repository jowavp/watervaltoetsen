import { useEffect, useState } from 'react';
import {
  REQUEST_STATUS_LABEL,
  cancelGenerationRequest,
  createGenerationRequest,
  listGenerationRequests
} from '../../lib/generation.js';
import { listVakken } from '../../lib/vakken.js';
import { supabaseEnabled } from '../../lib/supabase.js';

const STATUS_TINT = {
  queued: { bg: '#fff7e0', fg: '#8a6d18' },
  running: { bg: '#e4f5fb', fg: '#1689a8' },
  done: { bg: '#eaf8ef', fg: '#2e8c54' },
  failed: { bg: '#fdeceb', fg: '#a93221' }
};

function timeAgo(iso) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s geleden`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min geleden`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} u geleden`;
  return `${Math.floor(h / 24)} d geleden`;
}

function VakCard({ vak, lastRequest, count, onRequest, onCancel, busy }) {
  const tint = lastRequest ? STATUS_TINT[lastRequest.status] : null;
  const isQueued = lastRequest && lastRequest.status === 'queued';
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: '13px 14px',
        boxShadow: '0 4px 0 rgba(40,52,59,0.06)',
        borderLeft: `6px solid ${vak.kleur}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 11,
            background: vak.tint,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            flexShrink: 0
          }}
        >
          {vak.icon || '📚'}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 16, color: 'var(--ink)' }}>
            {vak.naam}
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)' }}>
            {count} actieve vragen in de bank
          </div>
        </div>
      </div>

      {lastRequest && tint && (
        <div
          style={{
            background: tint.bg,
            color: tint.fg,
            borderRadius: 10,
            padding: '7px 11px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12.5,
            fontWeight: 800
          }}
        >
          <span style={{ flex: 1 }}>
            {REQUEST_STATUS_LABEL[lastRequest.status] || lastRequest.status} ·{' '}
            {lastRequest.num_questions}×
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.85 }}>{timeAgo(lastRequest.created_at)}</span>
          {isQueued && (
            <button
              className="tap"
              onClick={() => onCancel(lastRequest)}
              style={{
                border: 'none',
                background: 'transparent',
                color: tint.fg,
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: 12
              }}
              title="Annuleren"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {lastRequest?.status === 'failed' && lastRequest.error && (
        <div style={{ fontSize: 11.5, fontWeight: 700, color: '#a93221' }}>{lastRequest.error}</div>
      )}

      <button
        className="cta tap"
        disabled={busy}
        onClick={() => onRequest(vak)}
        style={{
          width: '100%',
          background: vak.kleur,
          boxShadow: `0 5px 0 ${vak.kleur}99`,
          opacity: busy ? 0.6 : 1
        }}
      >
        ✨ Vraag nieuwe set vragen aan
      </button>
    </div>
  );
}

export default function GenerateScreen({ leerjaar, onLeerjaar, onBack, onSeeQuestions }) {
  const [vakken, setVakken] = useState([]);
  const [requests, setRequests] = useState([]);
  const [counts, setCounts] = useState({}); // vak.key → count actieve vragen
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [num, setNum] = useState(10);
  const [error, setError] = useState(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vk, req] = await Promise.all([
        listVakken(leerjaar),
        listGenerationRequests({ leerjaar })
      ]);
      setVakken(vk.filter((v) => v.active));
      setRequests(req);

      // Tellingen via questions.js — vermijd circulair: importeer hier inline.
      const { listQuestions } = await import('../../lib/questions.js');
      const c = {};
      await Promise.all(
        vk.map(async (v) => {
          const q = await listQuestions({ leerjaar, vak: v.key });
          c[v.key] = q.length;
        })
      );
      setCounts(c);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leerjaar]);

  // Live polling zolang er queued/running aanvragen zijn.
  useEffect(() => {
    const pending = requests.some((r) => r.status === 'queued' || r.status === 'running');
    if (!pending) return;
    const id = setInterval(reload, 8000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests]);

  if (!supabaseEnabled) {
    return (
      <div className="screen" style={{ background: 'var(--cream)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 2px 10px' }}>
          <button className="iconbtn" onClick={onBack}>
            ‹
          </button>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 18, color: 'var(--ink)' }}>
            Vragen genereren
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

  const onRequest = async (vak) => {
    setBusy(true);
    setError(null);
    try {
      await createGenerationRequest({ leerjaar, vak: vak.key, num_questions: num });
      await reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const onCancel = async (req) => {
    try {
      await cancelGenerationRequest(req.id);
      reload();
    } catch (e) {
      setError(e.message);
    }
  };

  const lastByVak = {};
  for (const r of requests) {
    if (!lastByVak[r.vak]) lastByVak[r.vak] = r;
  }

  const recent = requests.slice(0, 10);

  return (
    <div className="screen" style={{ background: 'var(--cream)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 2px 10px' }}>
        <button className="iconbtn" onClick={onBack}>
          ‹
        </button>
        <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 18, color: 'var(--ink)' }}>
          Vragen genereren
        </div>
        <button
          className="tap"
          onClick={onSeeQuestions}
          style={{
            marginLeft: 'auto',
            border: 'none',
            background: '#fff',
            color: 'var(--water)',
            borderRadius: 999,
            padding: '6px 11px',
            fontWeight: 800,
            fontSize: 11.5,
            cursor: 'pointer',
            boxShadow: '0 3px 0 rgba(40,52,59,0.08)'
          }}
        >
          → Vragen bekijken
        </button>
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

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: '#eaf7fb',
          borderRadius: 12,
          padding: '8px 12px',
          marginBottom: 10
        }}
      >
        <span style={{ fontSize: 14 }}>🤖</span>
        <span style={{ flex: 1, fontSize: 11.5, fontWeight: 700, color: 'var(--ink)' }}>
          De cron pakt nieuwe aanvragen op (elke nacht ~03u) en maakt vragen via Claude. Je ziet ze daarna onder{' '}
          <b>Vragen beheren</b>.
        </span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 800, color: 'var(--ink)' }}>
          #
          <input
            type="number"
            min={1}
            max={50}
            value={num}
            onChange={(e) => setNum(parseInt(e.target.value || '10', 10))}
            style={{
              width: 50,
              padding: '4px 7px',
              borderRadius: 8,
              border: '1.5px solid var(--border)',
              background: '#fff',
              fontWeight: 700,
              fontSize: 12
            }}
          />
        </label>
      </div>

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

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--ink-soft)', fontWeight: 700, fontSize: 13, padding: '24px 0' }}>
            Bezig met laden…
          </div>
        ) : vakken.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--ink-soft)', fontWeight: 700, fontSize: 13, padding: '24px 14px' }}>
            Geen actieve vakken voor leerjaar {leerjaar}. Voeg eerst vakken toe via "Vakken beheren".
          </div>
        ) : (
          <>
            {vakken.map((v) => (
              <VakCard
                key={v.id}
                vak={v}
                lastRequest={lastByVak[v.key]}
                count={counts[v.key] || 0}
                onRequest={onRequest}
                onCancel={onCancel}
                busy={busy}
              />
            ))}
            {recent.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-soft)', letterSpacing: 0.5, marginBottom: 6 }}>
                  RECENTE AANVRAGEN
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {recent.map((r) => {
                    const tint = STATUS_TINT[r.status] || STATUS_TINT.queued;
                    return (
                      <div
                        key={r.id}
                        style={{
                          background: '#fff',
                          borderRadius: 10,
                          padding: '7px 11px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 11.5,
                          fontWeight: 700
                        }}
                      >
                        <span style={{ color: 'var(--ink)', fontWeight: 800 }}>{r.vak}</span>
                        <span style={{ color: 'var(--ink-soft)' }}>· {r.num_questions} vragen</span>
                        <span
                          style={{
                            marginLeft: 'auto',
                            background: tint.bg,
                            color: tint.fg,
                            borderRadius: 999,
                            padding: '2px 9px',
                            fontSize: 10.5,
                            fontWeight: 800
                          }}
                        >
                          {REQUEST_STATUS_LABEL[r.status]}
                        </span>
                        <span style={{ color: 'var(--ink-soft)', fontSize: 10.5, fontWeight: 700 }}>
                          {timeAgo(r.created_at)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
