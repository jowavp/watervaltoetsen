import { useEffect, useRef, useState } from 'react';
import { listVakken } from '../../lib/vakken.js';
import {
  createSource,
  deleteSource,
  getSourceSignedUrl,
  listSources,
  updateSource,
  uploadSourceFile
} from '../../lib/sources.js';

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

const ACCEPT_TYPES = 'application/pdf,image/*';

function formatBytes(b) {
  if (!b && b !== 0) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function iconFor(file) {
  if (file.type?.startsWith('image/') || /\.(png|jpe?g|gif|webp|heic|heif)$/i.test(file.name)) return '🖼️';
  return '📄';
}

function stripExt(name) {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(0, i) : name;
}

function UploadForm({ st, vakken, onUploaded, onCancel, leerjaar }) {
  const [vak, setVak] = useState(vakken[0]?.key ?? null);
  const [files, setFiles] = useState([]); // Array<File>
  const [progress, setProgress] = useState({}); // { [fileKey]: 'pending'|'uploading'|'done'|'error' }
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const onPick = (e) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length === 0) return;
    setFiles((cur) => {
      const merged = [...cur];
      for (const f of picked) {
        const dup = merged.find((m) => m.name === f.name && m.size === f.size);
        if (!dup) merged.push(f);
      }
      return merged;
    });
    // Reset input zodat dezelfde file later opnieuw kan gekozen worden.
    e.target.value = '';
  };

  const removeFile = (idx) => {
    setFiles((cur) => cur.filter((_, i) => i !== idx));
  };

  const upload = async () => {
    setError(null);
    setUploading(true);
    const prog = {};
    files.forEach((f, i) => (prog[i] = 'pending'));
    setProgress(prog);

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      setProgress((p) => ({ ...p, [i]: 'uploading' }));
      try {
        const up = await uploadSourceFile({ file: f, leerjaar, stream: st.key });
        await createSource({
          leerjaar,
          stream: st.key,
          title: stripExt(f.name),
          vak: st.vakgebonden ? vak : null,
          file_name: up.file_name,
          storage_path: up.path,
          size_bytes: up.size,
          mime_type: up.mime
        });
        setProgress((p) => ({ ...p, [i]: 'done' }));
      } catch (e) {
        setProgress((p) => ({ ...p, [i]: 'error' }));
        setError(`${f.name}: ${e.message}`);
        setUploading(false);
        // Laat de gebruiker beslissen — abort de batch zodat fouten zichtbaar zijn.
        return;
      }
    }
    setUploading(false);
    onUploaded?.();
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
      {st.vakgebonden && vakken.length > 0 && (
        <div>
          <div className="lbl">Vak voor alle bestanden</div>
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
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_TYPES}
        multiple
        onChange={onPick}
        style={{ display: 'none' }}
      />
      <button
        className="tap"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{
          border: '2.5px dashed var(--border)',
          background: 'var(--cream)',
          borderRadius: 14,
          padding: '18px 14px',
          cursor: uploading ? 'default' : 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6
        }}
      >
        <span style={{ fontSize: 26 }}>⬆️</span>
        <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>
          {files.length === 0 ? 'Kies bestanden (PDF of foto)' : '+ Voeg meer bestanden toe'}
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)' }}>
          Meerdere bestanden tegelijk OK · max 50 MB per stuk
        </span>
      </button>

      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {files.map((f, i) => {
            const st_ = progress[i];
            const stColor = st_ === 'done' ? '#5fbe82' : st_ === 'error' ? '#ff6f61' : st_ === 'uploading' ? 'var(--water)' : '#cdbfae';
            const stLabel =
              st_ === 'done' ? '✓ klaar' : st_ === 'error' ? 'fout' : st_ === 'uploading' ? 'bezig…' : 'wacht';
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'var(--cream)',
                  borderRadius: 10,
                  padding: '8px 10px',
                  border: `1.5px solid ${stColor}33`
                }}
              >
                <span style={{ fontSize: 18 }}>{iconFor(f)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 12.5,
                      color: 'var(--ink)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {f.name}
                  </div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-soft)' }}>
                    {formatBytes(f.size)}
                    {st_ ? ' · ' : ''}
                    <span style={{ color: stColor }}>{st_ ? stLabel : ''}</span>
                  </div>
                </div>
                {!uploading && st_ !== 'done' && (
                  <button
                    className="iconbtn"
                    onClick={() => removeFile(i)}
                    title="Verwijderen uit lijst"
                    style={{ width: 26, height: 26, fontSize: 12, color: 'var(--coral)' }}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div
          style={{
            background: '#fdeceb',
            border: '1.5px solid #f3b2ab',
            borderRadius: 10,
            padding: '8px 10px',
            color: '#a93221',
            fontWeight: 700,
            fontSize: 12
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="cta-ghost tap" onClick={onCancel} disabled={uploading} style={{ flex: 1 }}>
          {uploading ? '...' : 'Annuleer'}
        </button>
        <button
          className="cta tap"
          disabled={files.length === 0 || uploading}
          onClick={upload}
          style={{
            flex: 2,
            background: st.kleur,
            boxShadow: `0 5px 0 ${st.kleur}99`,
            opacity: files.length === 0 || uploading ? 0.45 : 1
          }}
        >
          {uploading ? 'Opladen…' : `Opladen (${files.length})`}
        </button>
      </div>
    </div>
  );
}

function EditForm({ doc, st, vakken, onSave, onCancel }) {
  const [titel, setTitel] = useState(doc.title || '');
  const [vak, setVak] = useState(doc.vak || (vakken[0]?.key ?? null));
  const ready = titel.trim().length > 1;

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
        placeholder="Titel"
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
              vak: st.vakgebonden ? vak : null
            })
          }
          style={{
            flex: 2,
            background: st.kleur,
            boxShadow: `0 5px 0 ${st.kleur}99`,
            opacity: ready ? 1 : 0.45
          }}
        >
          Opslaan
        </button>
      </div>
    </div>
  );
}

function DocRow({ doc, st, vakken, onEdit, onDelete }) {
  const vakNaam = doc.vak ? vakken.find((v) => v.key === doc.vak)?.naam || doc.vak : 'vakoverschrijdend';
  const isImage = doc.mime_type?.startsWith('image/') || /\.(png|jpe?g|gif|webp|heic|heif)$/i.test(doc.file_name || '');

  const openFile = async () => {
    if (!doc.storage_path) return;
    const url = await getSourceSignedUrl(doc.storage_path);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

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
      <span style={{ fontSize: 20 }}>{isImage ? '🖼️' : '📄'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <button
          onClick={openFile}
          disabled={!doc.storage_path}
          className="tap"
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: doc.storage_path ? 'pointer' : 'default',
            textAlign: 'left',
            fontWeight: 800,
            fontSize: 14,
            color: doc.storage_path ? 'var(--water-dark)' : 'var(--ink)',
            textDecoration: doc.storage_path ? 'underline' : 'none'
          }}
        >
          {doc.title}
        </button>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)' }}>
          {vakNaam}
          {doc.file_name ? ' · ' + doc.file_name : ''}
          {doc.size_bytes ? ' · ' + formatBytes(doc.size_bytes) : ''}
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
  const st = { ...STREAMS[streamKey], key: streamKey };
  const [docs, setDocs] = useState([]);
  const [vakken, setVakken] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(null); // null | 'upload' | { edit: doc }
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

  const saveEdit = async (vals) => {
    try {
      await updateSource(mode.edit.id, vals);
      setMode(null);
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
                onEdit={() => setMode({ edit: d })}
                onDelete={() => remove(d)}
              />
            ))}
            {docs.length === 0 && !mode && (
              <div style={{ textAlign: 'center', color: 'var(--ink-soft)', fontWeight: 700, fontSize: 13, padding: '20px 0' }}>
                Nog geen documenten.
              </div>
            )}
            {mode === 'upload' && (
              <UploadForm
                st={st}
                vakken={vakken}
                leerjaar={leerjaar}
                onUploaded={async () => {
                  setMode(null);
                  await reload();
                  onChanged?.();
                }}
                onCancel={() => setMode(null)}
              />
            )}
            {mode?.edit && (
              <EditForm
                doc={mode.edit}
                st={st}
                vakken={vakken}
                onSave={saveEdit}
                onCancel={() => setMode(null)}
              />
            )}
          </>
        )}
      </div>

      {!mode && (
        <button
          className="cta tap"
          onClick={() => setMode('upload')}
          style={{ width: '100%', marginTop: 12, background: st.kleur, boxShadow: `0 5px 0 ${st.kleur}99` }}
        >
          + Documenten opladen
        </button>
      )}
    </div>
  );
}
