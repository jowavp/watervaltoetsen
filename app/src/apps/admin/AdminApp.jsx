import { useEffect, useState } from 'react';
import D from '../../lib/data.js';
import { Druppie, Teacher } from '../../components/Characters.jsx';
import { loadTeacherLocal, saveBanks, saveSources, saveTeacherProfile } from '../../lib/storage.js';
import { signOut } from '../../lib/supabase.js';
import VakkenScreen from './VakkenScreen.jsx';

const TYPE_LABEL = { mc: 'Meerkeuze', tf: 'Juist/fout', fill: 'Invul', match: 'Koppel' };
const TYPE_COLOR = { mc: '#1fa9ce', tf: '#5fbe82', fill: '#ff9e2c', match: '#9b8cff' };

const STREAMS = {
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

// ──────── lokale vraagbank-generator (template-based) ────────
const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const WB = {
  wiskunde: [
    { type: 'tf', onderdeel: 'Breuken', q: '1/2 is hetzelfde als 2/4.', a: 'Juist' },
    { type: 'mc', onderdeel: 'Breuken', q: 'Welke breuk is het grootst: 1/2, 1/4 of 3/4?', a: '3/4' },
    { type: 'fill', onderdeel: 'Breuken', q: 'Vul aan: 3/4 + 1/4 = …', a: '1' },
    { type: 'mc', onderdeel: 'Kommagetallen', q: 'Wat is 3,2 + 1,5?', a: '4,7' },
    { type: 'fill', onderdeel: 'Kommagetallen', q: 'Rond 4,68 af op één cijfer na de komma.', a: '4,7' },
    { type: 'mc', onderdeel: 'Omtrek & oppervlakte', q: 'Oppervlakte van een rechthoek van 8 cm op 3 cm?', a: '24 cm²' },
    { type: 'match', onderdeel: 'Omtrek & oppervlakte', q: 'Koppel elke vorm aan de juiste formule.', a: '3 paren' },
    { type: 'tf', onderdeel: 'Meten & wegen', q: '1 kilogram is 1000 gram.', a: 'Juist' },
    { type: 'fill', onderdeel: 'Meten & wegen', q: 'Hoeveel centimeter is 2,5 meter?', a: '250' }
  ],
  nederlands: [
    { type: 'fill', onderdeel: 'Werkwoorden: nu', q: 'Vul in: Ik … (lopen) naar school.', a: 'loop' },
    { type: 'mc', onderdeel: 'Werkwoorden: nu', q: '"Hij … een brief." Welke vorm is juist?', a: 'schrijft' },
    { type: 'fill', onderdeel: 'Werkwoorden: verleden', q: 'Verleden tijd: Gisteren … ik mijn werk. (maken)', a: 'maakte' },
    { type: 'mc', onderdeel: 'Werkwoorden: verleden', q: 'Wat is de verleden tijd van "kopen"?', a: 'kocht' },
    { type: 'tf', onderdeel: 'Werkwoorden: verleden', q: 'De verleden tijd van "spelen" is "speelden".', a: 'Fout' },
    { type: 'mc', onderdeel: 'Woordsoorten', q: 'Welk woord is een zelfstandig naamwoord? "De snelle hond loopt."', a: 'hond' },
    { type: 'mc', onderdeel: 'Woordsoorten', q: 'Wat is "snelle" in "de snelle auto"?', a: 'bijvoeglijk naamwoord' },
    { type: 'tf', onderdeel: 'Leestekens', q: 'Een vraag eindigt met een vraagteken.', a: 'Juist' }
  ],
  frans: [
    { type: 'mc', onderdeel: 'Les nombres', q: 'Wat betekent "quatorze"?', a: '14' },
    { type: 'fill', onderdeel: 'Les nombres', q: 'Schrijf het Franse woord voor 20.', a: 'vingt' },
    { type: 'tf', onderdeel: 'Les nombres', q: '"trente" betekent dertien.', a: 'Fout' },
    { type: 'match', onderdeel: 'Les nombres', q: 'Koppel het Franse getal aan het cijfer.', a: '3 paren' },
    { type: 'mc', onderdeel: 'La famille', q: 'Wat betekent "la sœur"?', a: 'de zus' },
    { type: 'fill', onderdeel: 'La famille', q: 'Hoe zeg je "broer" in het Frans?', a: 'le frère' },
    { type: 'mc', onderdeel: 'Les couleurs', q: 'Welke kleur is "rouge"?', a: 'rood' },
    { type: 'fill', onderdeel: 'Les couleurs', q: 'Hoe schrijf je "blauw" in het Frans?', a: 'bleu' }
  ]
};

function randWiskunde() {
  if (Math.random() < 0.6) {
    const a = rnd(2, 9),
      b = rnd(2, 9);
    return { type: 'mc', onderdeel: 'Maal & deel', q: `Hoeveel is ${a} × ${b}?`, a: `${a * b}`, vak: 'wiskunde' };
  }
  const l = rnd(3, 12),
    b = rnd(2, 9);
  return {
    type: 'fill',
    onderdeel: 'Omtrek & oppervlakte',
    q: `Omtrek van een rechthoek van ${l} cm op ${b} cm?`,
    a: `${2 * (l + b)} cm`,
    vak: 'wiskunde'
  };
}

function makeBank(n, vakken) {
  const order = vakken.length ? vakken : ['wiskunde', 'nederlands', 'frans'];
  const out = [];
  let i = 0;
  while (out.length < n) {
    const vak = order[i % order.length];
    i++;
    let q;
    if (vak === 'wiskunde' && Math.random() < 0.5) q = randWiskunde();
    else q = { ...pick(WB[vak]), vak };
    out.push(q);
  }
  return out;
}

// ──────── Leerkracht-profiel ────────
function TeacherProfile({ teacher, onSave, onClose, onSignOut, firstRun }) {
  const [naam, setNaam] = useState(teacher.naam || '');
  const [who, setWho] = useState(teacher.who || 'tom');
  return (
    <div className="screen" style={{ background: 'var(--cream)' }}>
      {!firstRun && (
        <div style={{ display: 'flex', padding: '4px 2px 8px', alignItems: 'center' }}>
          <button className="iconbtn" onClick={onClose}>
            ✕
          </button>
          {onSignOut && (
            <button
              className="tap"
              onClick={onSignOut}
              style={{
                marginLeft: 'auto',
                border: 'none',
                background: '#fff',
                color: 'var(--coral)',
                borderRadius: 999,
                padding: '7px 12px',
                fontWeight: 800,
                fontSize: 12,
                cursor: 'pointer',
                boxShadow: '0 3px 0 rgba(40,52,59,0.08)'
              }}
            >
              ↪ Uitloggen
            </button>
          )}
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: firstRun ? 14 : 4 }}>
          <Teacher who={who} size={96} />
        </div>
        <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 23, color: 'var(--ink)', margin: '14px 0 2px' }}>
          {firstRun ? 'Welkom, leerkracht!' : 'Mijn profiel'}
        </div>
        {teacher.email && (
          <div style={{ color: 'var(--ink-soft)', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>
            Aangemeld als <b style={{ color: 'var(--ink)' }}>{teacher.email}</b>
          </div>
        )}
        <div style={{ color: 'var(--ink-soft)', fontWeight: 700, fontSize: 14, marginBottom: 18 }}>
          Kies je naam en je avatar.
        </div>
        <input
          value={naam}
          onChange={(e) => setNaam(e.target.value)}
          placeholder="bv. meester Tom of juf Ann"
          className="inp"
          style={{
            width: '82%',
            textAlign: 'center',
            fontFamily: 'var(--display)',
            fontWeight: 600,
            fontSize: 19,
            marginBottom: 20
          }}
        />
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
          {['ann', 'sofie', 'tom', 'rik'].map((w) => (
            <button
              key={w}
              className="tap"
              onClick={() => setWho(w)}
              style={{
                border: 'none',
                background: 'transparent',
                padding: 0,
                cursor: 'pointer',
                borderRadius: '50%',
                boxShadow: who === w ? '0 0 0 4px var(--water)' : 'none'
              }}
            >
              <Teacher who={w} size={58} ring={false} />
            </button>
          ))}
        </div>
      </div>
      <button
        className="cta tap"
        disabled={!naam.trim()}
        onClick={() => onSave({ naam: naam.trim(), who })}
        style={{ width: '100%', opacity: naam.trim() ? 1 : 0.45 }}
      >
        {firstRun ? 'Aan de slag' : 'Opslaan'}
      </button>
    </div>
  );
}

// ──────── Admin home: kennisbronnen ────────
function AdminHome({ teacher, sources, leerjaar, onLeerjaar, onStream, onVakken, onGenerate, onExit, onProfiel }) {
  const totaalDocs = Object.keys(STREAMS).reduce((s, k) => s + sources[k].length, 0);
  return (
    <div className="screen" style={{ background: 'var(--cream)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '2px 0 12px' }}>
        <button
          className="tap"
          onClick={onProfiel}
          style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
        >
          <Teacher who={teacher.who} size={46} />
        </button>
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>Dag {teacher.naam}!</div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 17, color: 'var(--ink)' }}>
            Kennisbank · De Waterval
          </div>
        </div>
        <button
          onClick={onExit}
          className="tap"
          style={{
            marginLeft: 'auto',
            border: 'none',
            background: '#fff',
            color: 'var(--ink-soft)',
            borderRadius: 999,
            padding: '7px 12px',
            fontWeight: 800,
            fontSize: 12,
            cursor: 'pointer',
            boxShadow: '0 3px 0 rgba(40,52,59,0.08)'
          }}
        >
          ↩ rol
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[1, 2, 3, 4, 5, 6].map((n) => {
          const active = n === leerjaar;
          return (
            <button
              key={n}
              className="tap"
              onClick={() => onLeerjaar(n)}
              style={{
                flex: 1,
                height: 34,
                borderRadius: 11,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--display)',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                border: 'none',
                background: active ? 'var(--water)' : '#fff',
                color: active ? '#fff' : 'var(--ink)',
                boxShadow: active ? '0 3px 0 var(--water-dark)' : '0 2px 0 rgba(40,52,59,0.06)'
              }}
            >
              {n}
            </button>
          );
        })}
      </div>

      <button
        className="tap"
        onClick={onVakken}
        style={{
          textAlign: 'left',
          background: '#fff',
          borderRadius: 16,
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 4px 0 rgba(40,52,59,0.06)',
          border: 'none',
          borderLeft: '6px solid var(--water)',
          cursor: 'pointer',
          marginBottom: 14
        }}
      >
        <span style={{ fontSize: 22 }}>🎒</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>
            Vakken beheren
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)' }}>
            Toevoegen, hernoemen, kleuren — per leerjaar
          </div>
        </div>
        <span style={{ color: 'var(--ink-soft)', fontSize: 18, fontWeight: 800 }}>›</span>
      </button>

      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-soft)', letterSpacing: 0.4, marginBottom: 8 }}>
        KENNISBRONNEN · LEERJAAR {leerjaar}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Object.keys(STREAMS).map((k) => {
          const st = STREAMS[k];
          const docs = sources[k];
          return (
            <button
              key={k}
              className="tap"
              onClick={() => onStream(k)}
              style={{
                textAlign: 'left',
                background: '#fff',
                borderRadius: 16,
                padding: '13px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                boxShadow: '0 4px 0 rgba(40,52,59,0.06)',
                border: 'none',
                borderLeft: `6px solid ${st.kleur}`,
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: 26 }}>{st.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--display)',
                    fontWeight: 600,
                    fontSize: 16,
                    color: 'var(--ink)'
                  }}
                >
                  {st.naam}
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', lineHeight: 1.25 }}>
                  {st.desc}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 18, color: st.kleur }}>
                  {docs.length}
                </div>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink-soft)' }}>docs</div>
              </div>
            </button>
          );
        })}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#fff7e0',
            borderRadius: 12,
            padding: '10px 12px',
            marginTop: 2
          }}
        >
          <span style={{ fontSize: 16 }}>💡</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#9a7415' }}>
            Druppie maakt de kwisvragen op basis van deze {totaalDocs} documenten.
          </span>
        </div>
      </div>
      <button className="cta tap" onClick={onGenerate} style={{ width: '100%', marginTop: 12 }}>
        ✨ Genereer 50 kwisvragen
      </button>
    </div>
  );
}

// ──────── Kennisbron beheren ────────
function StreamScreen({ streamKey, sources, onAdd, onBack }) {
  const st = STREAMS[streamKey];
  const docs = sources[streamKey];
  const [adding, setAdding] = useState(false);
  const [titel, setTitel] = useState('');
  const [vak, setVak] = useState('wiskunde');
  const [file, setFile] = useState(null);
  const ready = titel.trim().length > 1;
  const reset = () => {
    setTitel('');
    setFile(null);
    setAdding(false);
  };
  return (
    <div className="screen" style={{ background: 'var(--cream)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 2px 10px' }}>
        <button className="iconbtn" onClick={onBack}>
          ‹
        </button>
        <span style={{ fontSize: 22 }}>{st.icon}</span>
        <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 18, color: 'var(--ink)' }}>{st.naam}</div>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 12 }}>{st.desc}.</div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {docs.map((d, i) => (
          <div
            key={i}
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
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>{d.title}</div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)' }}>
                {st.vakgebonden && d.vak ? D.vakken[d.vak].naam : 'vakoverschrijdend'}
                {d.name ? ' · ' + d.name : ''}
              </div>
            </div>
          </div>
        ))}
        {docs.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--ink-soft)', fontWeight: 700, fontSize: 13, padding: '20px 0' }}>
            Nog geen documenten.
          </div>
        )}

        {adding && (
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
            {st.vakgebonden && (
              <div style={{ display: 'flex', gap: 8 }}>
                {Object.keys(D.vakken).map((kk) => {
                  const vi = D.vakken[kk];
                  const sel = vak === kk;
                  return (
                    <button
                      key={kk}
                      className="tap"
                      onClick={() => setVak(kk)}
                      style={{
                        flex: 1,
                        padding: '9px 4px',
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
                      {vi.naam}
                    </button>
                  );
                })}
              </div>
            )}
            <button
              className="tap"
              onClick={() =>
                setFile(
                  file
                    ? null
                    : { name: (titel.trim() ? titel.trim().toLowerCase().replace(/\s+/g, '-') : 'document') + '.pdf' }
                )
              }
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
              <button className="cta-ghost tap" onClick={reset} style={{ flex: 1 }}>
                Annuleer
              </button>
              <button
                className="cta tap"
                disabled={!ready}
                onClick={() => {
                  onAdd(streamKey, {
                    title: titel.trim(),
                    vak: st.vakgebonden ? vak : null,
                    name: file ? file.name : null
                  });
                  reset();
                }}
                style={{
                  flex: 2,
                  background: st.kleur,
                  boxShadow: `0 5px 0 ${st.kleur}99`,
                  opacity: ready ? 1 : 0.45
                }}
              >
                Toevoegen
              </button>
            </div>
          </div>
        )}
      </div>
      {!adding && (
        <button
          className="cta tap"
          onClick={() => setAdding(true)}
          style={{ width: '100%', marginTop: 12, background: st.kleur, boxShadow: `0 5px 0 ${st.kleur}99` }}
        >
          + Document toevoegen
        </button>
      )}
    </div>
  );
}

function AdminGenerating({ doel }) {
  return (
    <div
      className="screen"
      style={{ background: 'var(--cream)', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 14 }}
    >
      <Druppie size={100} mood="think" />
      <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 22, color: 'var(--ink)' }}>
        Druppie leest mee…
      </div>
      <div style={{ color: 'var(--ink-soft)', fontWeight: 700, fontSize: 14, maxWidth: 240 }}>
        Ik maak {doel} vragen uit de onthoudmap, contracten en werkbladen.
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="wavebar"
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: 'var(--water)',
              animationDelay: i * 0.18 + 's'
            }}
          />
        ))}
      </div>
    </div>
  );
}

function AdminReview({ vragen, approved, setApproved, onPublish, onBack, onMore, loadingMore }) {
  const goed = approved.filter(Boolean).length;
  const toggle = (i) => setApproved((a) => a.map((v, j) => (j === i ? !v : v)));
  return (
    <div className="screen" style={{ background: 'var(--cream)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 2px 8px' }}>
        <button className="iconbtn" onClick={onBack}>
          ‹
        </button>
        <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 17, color: 'var(--ink)' }}>
          Vragen nakijken
        </div>
        <div
          style={{
            marginLeft: 'auto',
            fontWeight: 800,
            fontSize: 13,
            color: 'var(--leaf-dark)',
            background: '#eaf8ef',
            borderRadius: 999,
            padding: '5px 11px'
          }}
        >
          ✓ {goed}/{vragen.length}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: '#eef9f1',
          borderRadius: 12,
          padding: '8px 12px',
          marginBottom: 10
        }}
      >
        <span style={{ fontSize: 16 }}>✨</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#2e8c54' }}>
          Druppie stelt {vragen.length} vragen voor. Keur goed of af en pas aan waar nodig.
        </span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {vragen.map((qq, i) => {
          const vi = D.vakken[qq.vak] || D.vakken.wiskunde;
          const on = approved[i];
          return (
            <div
              key={i}
              style={{
                background: '#fff',
                borderRadius: 14,
                padding: '11px 13px',
                boxShadow: '0 3px 0 rgba(40,52,59,0.06)',
                opacity: on ? 1 : 0.5,
                borderLeft: `5px solid ${vi.kleur}`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: vi.kleur,
                    background: vi.tint,
                    borderRadius: 999,
                    padding: '3px 8px'
                  }}
                >
                  {vi.naam}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: '#fff',
                    background: TYPE_COLOR[qq.type],
                    borderRadius: 999,
                    padding: '3px 8px'
                  }}
                >
                  {TYPE_LABEL[qq.type]}
                </span>
                <button
                  className="tap"
                  onClick={() => toggle(i)}
                  style={{
                    marginLeft: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: 999,
                    padding: '4px 10px',
                    fontWeight: 800,
                    fontSize: 11.5,
                    background: on ? 'var(--leaf)' : '#ece6da',
                    color: on ? '#fff' : 'var(--ink-soft)'
                  }}
                >
                  {on ? '✓ Goed' : 'Afgekeurd'}
                </button>
              </div>
              <div
                contentEditable
                suppressContentEditableWarning
                style={{
                  fontWeight: 700,
                  fontSize: 14.5,
                  color: 'var(--ink)',
                  outline: 'none',
                  lineHeight: 1.3
                }}
              >
                {qq.q}
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
                <span style={{ fontWeight: 800, color: '#2e8c54', fontSize: 12.5, flex: 1 }}>{qq.a}</span>
              </div>
            </div>
          );
        })}
        <button
          className="cta-ghost tap"
          onClick={onMore}
          disabled={loadingMore}
          style={{ width: '100%', marginTop: 2, opacity: loadingMore ? 0.6 : 1 }}
        >
          {loadingMore ? 'Druppie maakt vragen…' : '➕ Meer vragen bijmaken'}
        </button>
      </div>
      <button
        className="cta tap"
        disabled={goed === 0}
        onClick={() => onPublish(goed)}
        style={{
          width: '100%',
          marginTop: 12,
          background: 'var(--leaf)',
          boxShadow: '0 5px 0 var(--leaf-dark)',
          opacity: goed ? 1 : 0.45
        }}
      >
        Publiceer {goed} {goed === 1 ? 'vraag' : 'vragen'}
      </button>
    </div>
  );
}

function AdminDone({ count, onHome }) {
  return (
    <div
      className="screen"
      style={{ background: 'var(--cream)', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 14 }}
    >
      <Druppie size={104} mood="cheer" />
      <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 24, color: 'var(--ink)' }}>
        Gepubliceerd! 🎉
      </div>
      <div style={{ color: 'var(--ink-soft)', fontWeight: 700, fontSize: 15, maxWidth: 250 }}>
        <b style={{ color: 'var(--leaf-dark)' }}>{count} vragen</b> staan nu klaar voor de leerlingen van leerjaar 5.
      </div>
      <button className="cta tap" onClick={onHome} style={{ width: '100%', marginTop: 8 }}>
        Terug naar de kennisbank
      </button>
    </div>
  );
}

export default function AdminApp({ onExit, authUser }) {
  const initial = loadTeacherLocal();
  const seededSources = {
    onthoudmap: [
      { title: 'Onthoudmap lj5 — wiskunde', vak: 'wiskunde', name: 'onthoudmap-wiskunde.pdf' },
      { title: 'Onthoudmap lj5 — Frans', vak: 'frans', name: 'onthoudmap-frans.pdf' }
    ],
    contracten: [{ title: 'Contract 7 — herfst', name: 'contract-7.pdf' }],
    werkbladen: [{ title: 'Werkblad breuken', vak: 'wiskunde', name: 'werkblad-breuken.pdf' }]
  };
  const startSources =
    initial.sources && Object.values(initial.sources).some((arr) => arr.length) ? initial.sources : seededSources;

  // Pre-fill profiel vanuit Google bij eerste login.
  const googleNaam = authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || '';
  const googleEmail = authUser?.email || '';

  const initialTeacher = (() => {
    const base = initial.teacher || {};
    if (!base.naam && googleNaam) {
      return { naam: googleNaam, email: googleEmail, who: base.who || 'tom' };
    }
    if (googleEmail && base.email !== googleEmail) {
      return { ...base, email: googleEmail };
    }
    return base;
  })();

  const [teacher, setTeacher] = useState(initialTeacher);
  const [step, setStep] = useState(initialTeacher.naam ? 'home' : 'profiel');
  const [sources, setSourcesState] = useState(startSources);
  const [stream, setStream] = useState(null);
  const [bank, setBank] = useState([]);
  const [approved, setApproved] = useState([]);
  const [count, setCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [leerjaar, setLeerjaar] = useState(5);

  // Eenmalige sync: als we Google-data hebben en het profiel was leeg, schrijf
  // de pre-filled waarden ook door naar Supabase + localStorage.
  useEffect(() => {
    if (!initial.teacher?.naam && googleNaam) {
      saveTeacherProfile(initialTeacher);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveTeacher = (t) => {
    const nt = { ...teacher, ...t };
    setTeacher(nt);
    saveTeacherProfile(nt);
    setStep('home');
  };

  const persistSources = (next) => {
    setSourcesState(next);
    saveSources(next);
  };

  const activeVakken = () => {
    const set = new Set();
    sources.onthoudmap.forEach((d) => d.vak && set.add(d.vak));
    sources.werkbladen.forEach((d) => d.vak && set.add(d.vak));
    const arr = [...set];
    return arr.length ? arr : ['wiskunde', 'nederlands', 'frans'];
  };

  const addDoc = (key, doc) => {
    const next = { ...sources, [key]: [...sources[key], doc] };
    persistSources(next);
  };

  const generate = async () => {
    setStep('gen');
    const t0 = Date.now();
    const vakken = activeVakken();
    const qs = makeBank(50, vakken);
    // TODO: optionele AI-verrijking via een eigen backend / Supabase edge function.
    const wait = Math.max(0, 1600 - (Date.now() - t0));
    setTimeout(() => {
      setBank(qs);
      setApproved(qs.map(() => true));
      setStep('review');
    }, wait);
  };

  const more = async () => {
    setLoadingMore(true);
    const vakken = activeVakken();
    const extra = makeBank(15, vakken);
    setBank((b) => [...b, ...extra]);
    setApproved((a) => [...a, ...extra.map(() => true)]);
    setLoadingMore(false);
  };

  const publish = (n) => {
    const published = bank.filter((_, i) => approved[i]);
    saveBanks(published);
    setCount(n);
    setStep('done');
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {step === 'profiel' && (
        <TeacherProfile
          teacher={teacher}
          firstRun={!teacher.naam}
          onSave={saveTeacher}
          onClose={() => setStep('home')}
          onSignOut={async () => {
            await signOut();
            // Shell's onAuthStateChange triggert SIGNED_OUT → terug naar launcher.
          }}
        />
      )}
      {step === 'home' && (
        <AdminHome
          teacher={teacher}
          sources={sources}
          leerjaar={leerjaar}
          onLeerjaar={setLeerjaar}
          onStream={(k) => {
            setStream(k);
            setStep('stream');
          }}
          onVakken={() => setStep('vakken')}
          onGenerate={generate}
          onExit={onExit}
          onProfiel={() => setStep('profiel')}
        />
      )}
      {step === 'vakken' && (
        <VakkenScreen leerjaar={leerjaar} onLeerjaar={setLeerjaar} onBack={() => setStep('home')} />
      )}
      {step === 'stream' && (
        <StreamScreen streamKey={stream} sources={sources} onAdd={addDoc} onBack={() => setStep('home')} />
      )}
      {step === 'gen' && <AdminGenerating doel={50} />}
      {step === 'review' && (
        <AdminReview
          vragen={bank}
          approved={approved}
          setApproved={setApproved}
          onMore={more}
          loadingMore={loadingMore}
          onBack={() => setStep('home')}
          onPublish={publish}
        />
      )}
      {step === 'done' && <AdminDone count={count} onHome={() => setStep('home')} />}
    </div>
  );
}
