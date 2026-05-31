import { useEffect, useState } from 'react';
import { Teacher } from '../../components/Characters.jsx';
import { useSpeak } from '../../lib/speak.js';

function Waveform({ active, color = '#fff' }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, height: 18 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={active ? 'wavebar' : ''}
          style={{
            width: 3,
            height: active ? 16 : 5,
            borderRadius: 3,
            background: color,
            animationDelay: i * 0.12 + 's',
            opacity: active ? 1 : 0.5
          }}
        />
      ))}
    </span>
  );
}

export default function TheoryScreen({ result, teacher, onBack }) {
  const { wrongIdx, vragen, vakInfo } = result;
  const [pos, setPos] = useState(0);
  const { speak, stop, speaking } = useSpeak();
  const wi = wrongIdx[pos];
  const v = vragen[wi];
  const th = v.theory;

  useEffect(() => {
    stop();
    const t = setTimeout(() => speak(th.text), 350);
    return () => {
      clearTimeout(t);
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos]);

  const correctText =
    v.type === 'mc'
      ? v.options[v.answer]
      : v.type === 'tf'
      ? v.answer
        ? 'Juist'
        : 'Fout'
      : v.type === 'fill'
      ? v.answer
      : v.pairs.map((p, i) => `${p.l} → ${v.pairs[i].r}`).join(', ');

  return (
    <div className="screen" style={{ background: 'var(--cream)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 4px 10px' }}>
        <button
          className="iconbtn"
          onClick={() => {
            stop();
            onBack();
          }}
        >
          ✕
        </button>
        <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 18, color: 'var(--ink)' }}>Uitleg</div>
        <div style={{ marginLeft: 'auto', fontWeight: 800, fontSize: 13, color: 'var(--ink-soft)' }}>
          {pos + 1}/{wrongIdx.length}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ background: '#fff', borderRadius: 18, padding: 16, boxShadow: '0 4px 0 rgba(40,52,59,0.07)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: vakInfo.kleur }}>
            {vakInfo.naam.toUpperCase()}
          </div>
          <div
            style={{
              fontFamily: 'var(--display)',
              fontWeight: 600,
              fontSize: 19,
              color: 'var(--ink)',
              margin: '4px 0 10px',
              textWrap: 'pretty'
            }}
          >
            {v.q}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#eaf8ef',
              borderRadius: 12,
              padding: '10px 12px'
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: '#5fbe82',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                flexShrink: 0
              }}
            >
              ✓
            </span>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#2e8c54', flex: 1 }}>{correctText}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'flex-start' }}>
          <div style={{ textAlign: 'center' }}>
            <div className={speaking ? 'talkbob' : ''}>
              <Teacher who={teacher.who} size={64} />
            </div>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-soft)', marginTop: 4 }}>{teacher.naam}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div className="bubble" style={{ borderRadius: '4px 16px 16px 16px', fontSize: 15, lineHeight: 1.45 }}>
              <div
                style={{
                  fontFamily: 'var(--display)',
                  fontWeight: 600,
                  fontSize: 16,
                  color: 'var(--ink)',
                  marginBottom: 4
                }}
              >
                {th.titel}
              </div>
              {th.text}
            </div>
            <button
              className="tap"
              onClick={() => (speaking ? stop() : speak(th.text))}
              style={{
                marginTop: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                background: vakInfo.kleur,
                color: '#fff',
                border: 'none',
                borderRadius: 999,
                padding: '9px 16px',
                fontWeight: 800,
                fontSize: 14,
                boxShadow: `0 4px 0 ${vakInfo.kleur}99`,
                cursor: 'pointer'
              }}
            >
              {speaking ? '❚❚ Stop' : '▶ Beluister'} <Waveform active={speaking} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, paddingTop: 10 }}>
        {pos > 0 && (
          <button className="cta-ghost tap" onClick={() => setPos(pos - 1)} style={{ flex: 1 }}>
            Vorige
          </button>
        )}
        {pos + 1 < wrongIdx.length ? (
          <button className="cta tap" onClick={() => setPos(pos + 1)} style={{ flex: 2 }}>
            Volgende uitleg
          </button>
        ) : (
          <button
            className="cta tap"
            onClick={() => {
              stop();
              onBack();
            }}
            style={{ flex: 2 }}
          >
            Klaar
          </button>
        )}
      </div>
    </div>
  );
}
