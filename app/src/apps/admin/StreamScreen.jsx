import { useEffect, useState } from 'react';
import { listVakken } from '../../lib/vakken.js';
import { createSource, deleteSource, listSources, updateSource } from '../../lib/sources.js';

export const STREAMS = {
  onthoudmap: {
    naam: 'Onthoudmap',
    desc: 'Wat de kinderen moeten kennen voor hun toetsen',
    icon: '📒',
    kleur: '#1fa9ce',
    vakgebonden: true
  },
  contracten: {
    naam: 'Voorbeeldcontracten',
    desc: 'Voorbeeldoefeningen zoals in de toets · vakoverschrijdend',
    icon: '📑',
    kleur: '#9b8cff',
    vakgebonden: false
  },
  werkbladen: {
    naam: 'Werkbladen',
    desc: 'Theorie en oefeningen per vak',
    icon: '📝',
    kleur: '#5fbe82',
    vakgebonden: true
  }
};

function DocForm({ st, vakken, initial, onSave, onCancel }) {
  const [titel, setTitel] = useState(initial?.title || '');
  const [vak, setVak] = useState(initial?.vak || (vakken[0]?.key ?? null));
  const [file, setFile] = useState(initial?.file_name ? { name: initial.file_name } : null);
  const ready = titel.trim().length > 1;

  const onChooseFile = () => {
    if (file) return setFile(null);
    const slug = (titel.trim() || 'document').toLowerCase().replace(/\s+/g, '-');
    setFile({ name: slug + '.pdf' });
  };

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: 14,
        boxShadow: '0 4px 0 rgba(40,52,59,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        marginTop: 4
      }}
    >
      <input
        value={titel}
        onChange={(e) => setTitel(e.target.value)}
        placeholder="Titel van het document"
        className="inp"
      />
      {st.vakgebonden && vakken.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {vakken.map((vi) => {
            const sel = vak === vi.key;
            return (
              <button
                key={vi.key}
                className="tap"
                onClick={() => setVak(vi.key)}
                style={{
                  padding: '9px 12px',
                  borderRadius: 11,
                  fontFamily: 'var(--display)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  background: sel ? vi.kleur : 'var(--cream)',
                  color: sel ? '#fff' : 'var(--ink)',
                  border: 'none'
                }}
              >
                {vi.icon ? vi.icon + ' ' : ''}
                {vi.naam}
              </button>
            );
          })}
        </div>
      )}
      <button
        className="tap"
        onClick={onChooseFile}
        style={{
          border: '2.5px dashed var(--border)',
          background: 'var(--cream)',
          borderRadius: 14,
          padding: '14px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 5
        }}
      >
        <span style={{ fontSize: 22 }}>{file ? '📄' : '⬆️'}</span>
        <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--ink)' }}>
          {file ? file.name : 'Sleep een PDF/foto of tik om te kiezen'}
        </span>
      </button>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="cta-ghost tap" onClick={onCancel} style={{ flex: 1 }}>
          Annuleer
        </button>
        <button
          className="cta tap"
          disabled={!ready}
          onClick={() =>
            onSave({
              title: titel.trim(),
              vak: st.vakgebonden ? vak : null,
              file_name: file ? file.name : null
            })
          }
          style={{
            flex: 2,
            background: st.kleur,
            boxShadow: `0 5px 0 ${st.kleur}99`,
            opacity: ready ? 1 : 0.45
          }}
        >
          {initial ? 'Opslaan' : 'Toevoegen'}
        </button>
      </div>
    </div>
  );
}

function DocRow({ doc, st, vakken, onEdit, onDelete }) {
  const vakNaam = doc.vak ? vakken.find((v) => v.key === doc.vak)?.naam || doc.vak : 'vakoverschrijdend';
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 13,
        padding: '11px 13px',
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        boxShadow: '0 3px 0 rgba(40,52,59,0.06)'
      }}
    >
      <span style={{ fontSize: 20 }}>📄</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>{doc.title}</div>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)' }}>
          {vakNaam}
          {doc.file_name ? ' · ' + doc.file_name : ''}
        </div>
      </div>
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

export default function StreamScreen({ streamKey, leerjaar, onBack, onChanged }) {
  const st = STREAMS[streamKey];
  const [docs, setDocs] = useState([]);
  const [vakken, setVakken] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | doc
  const [error, setError] = useState(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const [src, vk] = await Promise.all([listSources(leerjaar), listVakken(leerjaar)]);
      setDocs(src[streamKey] || []);
      setVakken(vk);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamKey, leerjaar]);

  const save = async (vals) => {
    try {
      if (editing === 'new') {
        await createSource({ leerjaar, stream: streamKey, ...vals });
      } else if (editing && editing.id) {
        await updateSource(editing.id, vals);
      }
      setEditing(null);
      await reload();
      onChanged?.();
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async (doc) => {
    if (!confirm(`"${doc.title}" verwijderen?`)) return;
    try {
      await deleteSource(doc.id);
      await reload();
      onChanged?.();
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
        <span style={{ fontSize: 22 }}>{st.icon}</span>
        <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 18, color: 'var(--ink)' }}>{st.naam}</div>
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
          Leerjaar {leerjaar}
        </div>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 12 }}>{st.desc}.</div>

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
          <div style={{ textAlign: 'center', color: 'var(--ink-soft)', fontWeight: 700, fontSize: 13, padding: '20px 0' }}>
            Bezig met laden…
          </div>
        ) : (
          <>
            {docs.map((d) => (
              <DocRow
                key={d.id}
                doc={d}
                st={st}
                vakken={vakken}
                onEdit={() => setEditing(d)}
                onDelete={() => remove(d)}
              />
            ))}
            {docs.length === 0 && !editing && (
              <div style={{ textAlign: 'center', color: 'var(--ink-soft)', fontWeight: 700, fontSize: 13, padding: '20px 0' }}>
                Nog geen documenten.
              </div>
            )}
            {editing && (
              <DocForm
                st={st}
                vakken={vakken}
                initial={editing === 'new' ? null : editing}
                onSave={save}
                onCancel={() => setEditing(null)}
              />
            )}
          </>
        )}
      </div>

      {!editing && (
        <button
          className="cta tap"
          onClick={() => setEditing('new')}
          style={{ width: '100%', marginTop: 12, background: st.kleur, boxShadow: `0 5px 0 ${st.kleur}99` }}
        >
          + Document toevoegen
        </button>
      )}
    </div>
  );
}
