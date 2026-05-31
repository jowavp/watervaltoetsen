import { useMemo, useState } from 'react';
import { Druppie } from '../../components/Characters.jsx';

const optColors = ['#1fa9ce', '#ff9e2c', '#9b8cff', '#5fbe82'];

function norm(s) {
  return (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
}

export default function QuizEngine({ vragen, vak, vakInfo, onDone, onClose }) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState('answer'); // answer | feedback
  const [lastOk, setLastOk] = useState(false);
  const [wrong, setWrong] = useState([]);
  const [goed, setGoed] = useState(0);

  const [sel, setSel] = useState(null);
  const [tf, setTf] = useState(null);
  const [txt, setTxt] = useState('');
  const [pairs, setPairs] = useState({});
  const [pickL, setPickL] = useState(null);

  const v = vragen[idx];
  const total = vragen.length;

  const reset = () => {
    setSel(null);
    setTf(null);
    setTxt('');
    setPairs({});
    setPickL(null);
  };

  const canCheck = () => {
    if (v.type === 'mc') return sel !== null;
    if (v.type === 'tf') return tf !== null;
    if (v.type === 'fill') return txt.trim().length > 0;
    if (v.type === 'match') return Object.keys(pairs).length === v.pairs.length;
    return false;
  };

  const evaluate = () => {
    if (v.type === 'mc') return sel === v.answer;
    if (v.type === 'tf') return tf === v.answer;
    if (v.type === 'fill') return (v.accept || [v.answer]).some((a) => norm(a) === norm(txt));
    if (v.type === 'match') return v.pairs.every((_, li) => pairs[li] === li);
    return false;
  };

  const check = () => {
    const ok = evaluate();
    setLastOk(ok);
    if (ok) setGoed((g) => g + 1);
    else setWrong((w) => [...w, idx]);
    setPhase('feedback');
  };

  const next = () => {
    if (idx + 1 >= total) {
      onDone({ goed, total, wrongIdx: wrong, vragen, vak, vakInfo });
    } else {
      setIdx(idx + 1);
      reset();
      setPhase('answer');
    }
  };

  // geschudde rechterkolom voor match (stabiel per vraag-index)
  const shuffledRight = useMemo(() => {
    if (!v || v.type !== 'match') return [];
    const order = v.pairs.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  return (
    <div className="screen" style={{ background: 'var(--cream)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 4px 12px' }}>
        <button className="iconbtn" onClick={onClose} aria-label="Sluiten">
          ✕
        </button>
        <div style={{ flex: 1, height: 14, borderRadius: 8, background: '#e7e0d2', overflow: 'hidden' }}>
          <div
            style={{
              width: ((idx + (phase === 'feedback' ? 1 : 0)) / total) * 100 + '%',
              height: '100%',
              background: 'linear-gradient(90deg,#ffc23c,#ff9e2c)',
              borderRadius: 8,
              transition: 'width .3s'
            }}
          />
        </div>
        <div style={{ fontWeight: 800, fontSize: 13, color: vakInfo.kleur }}>
          {idx + 1}/{total}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 12 }}>
          <Druppie size={62} mood="think" />
          <div className="bubble">
            {v.type === 'match'
              ? 'Koppel de juiste paren!'
              : v.type === 'fill'
              ? 'Typ jouw antwoord.'
              : v.type === 'tf'
              ? 'Juist of fout?'
              : 'Kies het juiste antwoord.'}
          </div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: vakInfo.kleur, marginBottom: 4 }}>
          {vakInfo.naam.toUpperCase()}
        </div>
        <div
          style={{
            fontFamily: 'var(--display)',
            fontWeight: 600,
            fontSize: 23,
            lineHeight: 1.15,
            color: 'var(--ink)',
            marginBottom: 16,
            textWrap: 'pretty'
          }}
        >
          {v.q}
        </div>

        {v.type === 'mc' && (
          <div style={{ display: 'grid', gap: 10 }}>
            {v.options.map((o, i) => {
              const isSel = sel === i;
              const showCorrect = phase === 'feedback' && i === v.answer;
              const showWrong = phase === 'feedback' && isSel && i !== v.answer;
              return (
                <button
                  key={i}
                  className="opt tap"
                  disabled={phase === 'feedback'}
                  onClick={() => setSel(i)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    textAlign: 'left',
                    background: showCorrect ? '#5fbe82' : showWrong ? '#ff6f61' : '#fff',
                    color: showCorrect || showWrong ? '#fff' : 'var(--ink)',
                    border: `2.5px solid ${isSel && phase === 'answer' ? vakInfo.kleur : 'transparent'}`,
                    boxShadow: showCorrect
                      ? '0 4px 0 #3fa565'
                      : showWrong
                      ? '0 4px 0 #e8513f'
                      : '0 4px 0 rgba(40,52,59,0.10)'
                  }}
                >
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 9,
                      flexShrink: 0,
                      background: showCorrect || showWrong ? 'rgba(255,255,255,0.25)' : optColors[i % 4] + '22',
                      color: showCorrect || showWrong ? '#fff' : optColors[i % 4],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 14
                    }}
                  >
                    {['A', 'B', 'C', 'D'][i]}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 17, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {o}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {v.type === 'tf' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { b: true, t: 'Juist', c: '#5fbe82', e: '👍' },
              { b: false, t: 'Fout', c: '#ff6f61', e: '👎' }
            ].map((o) => {
              const isSel = tf === o.b;
              const showCorrect = phase === 'feedback' && v.answer === o.b;
              const showWrong = phase === 'feedback' && isSel && v.answer !== o.b;
              return (
                <button
                  key={o.t}
                  className="tap"
                  disabled={phase === 'feedback'}
                  onClick={() => setTf(o.b)}
                  style={{
                    height: 110,
                    borderRadius: 20,
                    border: `3px solid ${isSel && phase === 'answer' ? o.c : 'transparent'}`,
                    background: showCorrect ? o.c : showWrong ? '#ff6f61' : '#fff',
                    color: showCorrect || showWrong ? '#fff' : 'var(--ink)',
                    boxShadow: '0 5px 0 rgba(40,52,59,0.10)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <span style={{ fontSize: 32 }}>{o.e}</span>
                  <span style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 20 }}>{o.t}</span>
                </button>
              );
            })}
          </div>
        )}

        {v.type === 'fill' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
            <input
              value={txt}
              disabled={phase === 'feedback'}
              onChange={(e) => setTxt(e.target.value)}
              autoFocus
              placeholder="…"
              inputMode="text"
              style={{
                width: '70%',
                textAlign: 'center',
                fontFamily: 'var(--display)',
                fontWeight: 600,
                fontSize: 30,
                padding: '14px 10px',
                borderRadius: 16,
                color: 'var(--ink)',
                border: `3px solid ${phase === 'feedback' ? (lastOk ? '#5fbe82' : '#ff6f61') : 'var(--border)'}`,
                background: phase === 'feedback' ? (lastOk ? '#eaf8ef' : '#fdeceb') : '#fff',
                outline: 'none'
              }}
            />
            {v.suffix && (
              <span style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 22, color: 'var(--ink-soft)' }}>
                {v.suffix}
              </span>
            )}
          </div>
        )}

        {v.type === 'match' && (
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, display: 'grid', gap: 10 }}>
              {v.pairs.map((p, li) => {
                const paired = pairs[li] !== undefined;
                const correct = phase === 'feedback' && pairs[li] === li;
                const wrongP = phase === 'feedback' && paired && pairs[li] !== li;
                return (
                  <button
                    key={li}
                    className="tap"
                    disabled={phase === 'feedback'}
                    onClick={() => {
                      if (paired) {
                        const np = { ...pairs };
                        delete np[li];
                        setPairs(np);
                      } else setPickL(li);
                    }}
                    style={{
                      padding: '12px',
                      borderRadius: 14,
                      fontWeight: 700,
                      fontSize: 15,
                      textAlign: 'left',
                      border: `2.5px solid ${pickL === li ? vakInfo.kleur : correct ? '#5fbe82' : wrongP ? '#ff6f61' : 'transparent'}`,
                      background: '#fff',
                      color: 'var(--ink)',
                      boxShadow: '0 3px 0 rgba(40,52,59,0.08)',
                      opacity: paired && phase === 'answer' ? 0.55 : 1
                    }}
                  >
                    {p.l}
                    {paired && (
                      <span style={{ float: 'right', color: vakInfo.kleur }}>● {String.fromCharCode(65 + pairs[li])}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div style={{ flex: 1, display: 'grid', gap: 10 }}>
              {shuffledRight.map((ri, slot) => {
                const usedBy = Object.keys(pairs).find((k) => pairs[k] === ri);
                return (
                  <button
                    key={slot}
                    className="tap"
                    disabled={phase === 'feedback'}
                    onClick={() => {
                      if (pickL !== null) {
                        setPairs({ ...pairs, [pickL]: ri });
                        setPickL(null);
                      }
                    }}
                    style={{
                      padding: '12px',
                      borderRadius: 14,
                      fontWeight: 700,
                      fontSize: 15,
                      textAlign: 'left',
                      border: '2.5px solid transparent',
                      background: usedBy !== undefined ? '#f1ede3' : '#fff',
                      color: 'var(--ink)',
                      boxShadow: '0 3px 0 rgba(40,52,59,0.08)'
                    }}
                  >
                    <span style={{ color: vakInfo.kleur, fontWeight: 800, marginRight: 6 }}>
                      {String.fromCharCode(65 + ri)}
                    </span>
                    {v.pairs[ri].r}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div style={{ height: 12 }} />
      </div>

      {phase === 'answer' ? (
        <div style={{ paddingTop: 10 }}>
          <button
            className="cta tap"
            disabled={!canCheck()}
            onClick={check}
            style={{ width: '100%', opacity: canCheck() ? 1 : 0.45 }}
          >
            Nakijken
          </button>
        </div>
      ) : (
        <div className="sheet" style={{ background: lastOk ? '#eaf8ef' : '#fdeceb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Druppie size={56} mood={lastOk ? 'cheer' : 'sad'} />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: 'var(--display)',
                  fontWeight: 600,
                  fontSize: 18,
                  color: lastOk ? '#2e8c54' : '#c83f30'
                }}
              >
                {lastOk ? 'Goed zo! 🎉' : 'Bijna!'}
              </div>
              {!lastOk && (
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 700 }}>{v.theory.titel}</div>
              )}
            </div>
          </div>
          <button
            className="cta tap"
            onClick={next}
            style={{
              width: '100%',
              marginTop: 12,
              background: lastOk ? '#5fbe82' : '#ff9e2c',
              boxShadow: `0 5px 0 ${lastOk ? '#3fa565' : '#e07f14'}`
            }}
          >
            {idx + 1 >= total ? 'Bekijk resultaat' : 'Verder'}
          </button>
        </div>
      )}
    </div>
  );
}
