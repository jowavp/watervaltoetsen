import { useEffect, useState } from 'react';
import {
  SUGGEST_ICONS,
  VAK_KLEUREN,
  createVak,
  deleteVak,
  listVakken,
  reorderVakken,
  sortVakkenByTestDate,
  updateVak
} from '../../lib/vakken.js';
import { supabaseEnabled } from '../../lib/supabase.js';

function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d - today) / (1000 * 60 * 60 * 24));
  const dateStr = d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' });
  if (diffDays === 0) return `vandaag · ${dateStr}`;
  if (diffDays === 1) return `morgen · ${dateStr}`;
  if (diffDays === -1) return `gisteren · ${dateStr}`;
  if (diffDays > 1 && diffDays <= 14) return `over ${diffDays}d · ${dateStr}`;
  if (diffDays < -1 && diffDays >= -14) return `${-diffDays}d geleden · ${dateStr}`;
  return dateStr;
}

function VakRow({ vak, onEdit, onToggle, onDelete, onMove, isFirst, isLast }) {
  const dateLabel = formatDate(vak.test_date);
  const dateInFuture = vak.test_date && new Date(vak.test_date + 'T00:00:00') >= new Date(new Date().setHours(0,0,0,0));
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        background: '#fff',
        borderRadius: 16,
        padding: '11px 12px',
        boxShadow: '0 4px 0 rgba(40,52,59,0.07)',
        borderLeft: `6px solid ${vak.kleur}`,
        opacity: vak.active ? 1 : 0.55
      }}
    >
      <span
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          background: vak.tint,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
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
          {vak.active ? 'Actief' : 'Inactief'} · {vak.key} · {vak.quiz_size ?? 10} vragen/kwis
          {dateLabel && (
            <>
              {' · '}
              <span style={{ color: dateInFuture ? vak.kleur : 'var(--ink-soft)' }}>📅 {dateLabel}</span>
            </>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button className="tap" disabled={isFirst} onClick={() => onMove(-1)} style={arrowBtn(isFirst)}>
          ▲
        </button>
        <button className="tap" disabled={isLast} onClick={() => onMove(1)} style={arrowBtn(isLast)}>
          ▼
        </button>
      </div>
      <button
        className="tap"
        onClick={onToggle}
        style={{
          border: 'none',
          background: vak.active ? '#eaf8ef' : '#f1ede3',
          color: vak.active ? '#2e8c54' : 'var(--ink-soft)',
          borderRadius: 999,
          padding: '5px 10px',
          fontWeight: 800,
          fontSize: 11,
          cursor: 'pointer'
        }}
        title={vak.active ? 'Zet op inactief' : 'Activeer'}
      >
        {vak.active ? '● Aan' : '○ Uit'}
      </button>
      <button
        className="iconbtn"
        onClick={onEdit}
        title="Bewerken"
        style={{ width: 32, height: 32, fontSize: 13 }}
      >
        ✎
      </button>
      <button
        className="iconbtn"
        onClick={onDelete}
        title="Verwijderen"
        style={{ width: 32, height: 32, fontSize: 13, color: 'var(--coral)' }}
      >
        🗑
      </button>
    </div>
  );
}

function arrowBtn(dis) {
  return {
    width: 26,
    height: 22,
    borderRadius: 6,
    border: 'none',
    cursor: dis ? 'default' : 'pointer',
    background: dis ? '#efe9dd' : 'var(--sky)',
    color: dis ? '#cbc3b4' : 'var(--water)',
    fontSize: 10,
    fontWeight: 900
  };
}

function VakFormDialog({ initial, onSave, onCancel }) {
  const [naam, setNaam] = useState(initial?.naam || '');
  const [icon, setIcon] = useState(initial?.icon || '📚');
  const [testDate, setTestDate] = useState(initial?.test_date || '');
  const [quizSize, setQuizSize] = useState(initial?.quiz_size ?? 10);
  const [kleurIdx, setKleurIdx] = useState(() => {
    if (!initial) return 0;
    const i = VAK_KLEUREN.findIndex((c) => c.kleur === initial.kleur);
    return i < 0 ? 0 : i;
  });
  const kleur = VAK_KLEUREN[kleurIdx];
  const valid = naam.trim().length >= 2 && quizSize >= 1 && quizSize <= 50;

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
        onClick={onCancel}
        style={{ position: 'absolute', inset: 0, background: 'rgba(40,52,59,0.45)', animation: 'fadein .2s ease' }}
      />
      <div
        style={{
          position: 'relative',
          background: 'var(--cream)',
          borderRadius: '26px 26px 0 0',
          padding: '14px 18px 20px',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.22)',
          animation: 'slideup .3s cubic-bezier(.2,.8,.3,1)',
          maxHeight: '90%',
          overflowY: 'auto'
        }}
      >
        <div style={{ width: 44, height: 5, borderRadius: 3, background: '#d9d0c0', margin: '0 auto 14px' }} />
        <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 20, color: 'var(--ink)', marginBottom: 12 }}>
          {initial ? 'Vak bewerken' : 'Nieuw vak'}
        </div>

        <label className="lbl">Naam</label>
        <input
          className="inp"
          autoFocus
          placeholder="bv. Wiskunde, Wereldoriëntatie…"
          value={naam}
          onChange={(e) => setNaam(e.target.value)}
          style={{ marginBottom: 14 }}
        />

        <label className="lbl">Kleur</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {VAK_KLEUREN.map((c, i) => (
            <button
              key={c.kleur}
              className="tap"
              onClick={() => setKleurIdx(i)}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: c.kleur,
                border: `3px solid ${i === kleurIdx ? 'var(--ink)' : '#fff'}`,
                cursor: 'pointer'
              }}
              title={c.label}
            />
          ))}
        </div>

        <label className="lbl">Icoon</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
          {SUGGEST_ICONS.map((emo) => (
            <button
              key={emo}
              className="tap"
              onClick={() => setIcon(emo)}
              style={{
                width: 40,
                height: 40,
                fontSize: 22,
                borderRadius: 12,
                border: `2.5px solid ${icon === emo ? kleur.kleur : 'transparent'}`,
                background: '#fff',
                boxShadow: '0 3px 0 rgba(40,52,59,0.06)',
                cursor: 'pointer'
              }}
            >
              {emo}
            </button>
          ))}
        </div>
        <input
          className="inp"
          placeholder="… of typ je eigen emoji"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          style={{ marginBottom: 14 }}
        />

        <label className="lbl">Datum van de toets (optioneel)</label>
        <input
          className="inp"
          type="date"
          value={testDate}
          onChange={(e) => setTestDate(e.target.value)}
          style={{ marginBottom: 14 }}
        />

        <label className="lbl">Aantal vragen per kwis</label>
        <input
          className="inp"
          type="number"
          min={1}
          max={50}
          value={quizSize}
          onChange={(e) => setQuizSize(parseInt(e.target.value || '10', 10))}
          style={{ marginBottom: 14 }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            background: '#fff',
            borderRadius: 16,
            padding: '11px 12px',
            boxShadow: '0 4px 0 rgba(40,52,59,0.07)',
            borderLeft: `6px solid ${kleur.kleur}`,
            marginBottom: 14
          }}
        >
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: kleur.tint,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              flexShrink: 0
            }}
          >
            {icon || '📚'}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--ink-soft)' }}>VOORBEELD</div>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 16, color: 'var(--ink)' }}>
              {naam.trim() || 'Vak naam'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="cta-ghost tap" onClick={onCancel} style={{ flex: 1 }}>
            Annuleer
          </button>
          <button
            className="cta tap"
            disabled={!valid}
            onClick={() =>
              onSave({
                naam: naam.trim(),
                icon: icon.trim() || null,
                kleur: kleur.kleur,
                tint: kleur.tint,
                test_date: testDate || null,
                quiz_size: quizSize
              })
            }
            style={{
              flex: 2,
              background: kleur.kleur,
              boxShadow: `0 5px 0 ${kleur.kleur}99`,
              opacity: valid ? 1 : 0.45
            }}
          >
            {initial ? 'Opslaan' : 'Toevoegen'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VakkenScreen({ leerjaar, onLeerjaar, onBack }) {
  const [vakken, setVakken] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null); // null | 'new' | vakObject
  const [error, setError] = useState(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      setVakken(await listVakken(leerjaar));
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

  if (!supabaseEnabled) {
    return (
      <div className="screen" style={{ background: 'var(--cream)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 2px 10px' }}>
          <button className="iconbtn" onClick={onBack}>
            ‹
          </button>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 18, color: 'var(--ink)' }}>Vakken beheren</div>
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
          Supabase is niet geconfigureerd in deze build. Voeg <code>VITE_SUPABASE_URL</code> en{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> toe en herstart om vakken te beheren.
        </div>
      </div>
    );
  }

  const save = async (vals) => {
    try {
      if (edit === 'new') {
        await createVak({ leerjaar, ...vals, sort_order: vakken.length + 1 });
      } else if (edit && edit.id) {
        await updateVak(edit.id, vals);
      }
      setEdit(null);
      reload();
    } catch (e) {
      setError(e.message);
    }
  };

  const toggle = async (vak) => {
    try {
      await updateVak(vak.id, { active: !vak.active });
      reload();
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async (vak) => {
    if (!confirm(`"${vak.naam}" definitief verwijderen?`)) return;
    try {
      await deleteVak(vak.id);
      reload();
    } catch (e) {
      setError(e.message);
    }
  };

  const move = async (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= vakken.length) return;
    const next = [...vakken];
    [next[idx], next[j]] = [next[j], next[idx]];
    setVakken(next);
    try {
      await reorderVakken(next.map((v) => v.id));
    } catch (e) {
      setError(e.message);
      reload();
    }
  };

  return (
    <div className="screen" style={{ background: 'var(--cream)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 2px 10px' }}>
        <button className="iconbtn" onClick={onBack}>
          ‹
        </button>
        <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 18, color: 'var(--ink)' }}>
          Vakken beheren
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {[1, 2, 3, 4, 5, 6].map((n) => {
          const active = n === leerjaar;
          return (
            <button
              key={n}
              className="tap"
              onClick={() => onLeerjaar(n)}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 11,
                fontFamily: 'var(--display)',
                fontWeight: 600,
                fontSize: 15,
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

      {vakken.some((v) => v.test_date) && (
        <button
          className="tap"
          onClick={async () => {
            try {
              await sortVakkenByTestDate(leerjaar);
              await reload();
            } catch (e) {
              setError(e.message);
            }
          }}
          style={{
            border: 'none',
            cursor: 'pointer',
            background: '#fff',
            color: 'var(--water)',
            borderRadius: 11,
            padding: '8px 12px',
            fontWeight: 800,
            fontSize: 12.5,
            boxShadow: '0 3px 0 rgba(40,52,59,0.07)',
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          📅 Sorteer op toetsdatum
        </button>
      )}

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--ink-soft)', fontWeight: 700, fontSize: 13, padding: '20px 0' }}>
            Bezig met laden…
          </div>
        ) : vakken.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--ink-soft)', fontWeight: 700, fontSize: 13, padding: '24px 0' }}>
            Nog geen vakken voor leerjaar {leerjaar}. Voeg er een toe ↓
          </div>
        ) : (
          vakken.map((v, i) => (
            <VakRow
              key={v.id}
              vak={v}
              isFirst={i === 0}
              isLast={i === vakken.length - 1}
              onEdit={() => setEdit(v)}
              onToggle={() => toggle(v)}
              onDelete={() => remove(v)}
              onMove={(dir) => move(i, dir)}
            />
          ))
        )}
      </div>

      <button className="cta tap" onClick={() => setEdit('new')} style={{ width: '100%', marginTop: 12 }}>
        + Vak toevoegen
      </button>

      {edit && <VakFormDialog initial={edit === 'new' ? null : edit} onSave={save} onCancel={() => setEdit(null)} />}
    </div>
  );
}
