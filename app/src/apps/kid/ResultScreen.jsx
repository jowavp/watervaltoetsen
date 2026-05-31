import { Druppie, Stars } from '../../components/Characters.jsx';

export default function ResultScreen({ result, onReview, onRetry, onHome }) {
  const { total, wrongIdx } = result;
  const goed = total - wrongIdx.length;
  const ratio = goed / total;
  const sterren = ratio === 1 ? 3 : ratio >= 0.6 ? 2 : ratio > 0 ? 1 : 0;
  const perfect = ratio === 1;
  return (
    <div className="screen" style={{ background: 'var(--cream)', overflow: 'hidden' }}>
      {perfect && (
        <div className="confetti">
          {Array.from({ length: 28 }).map((_, i) => (
            <span
              key={i}
              style={{
                left: i * 3.5 + '%',
                background: ['#ffc23c', '#1fa9ce', '#5fbe82', '#ff6f61', '#9b8cff'][i % 5],
                animationDelay: ((i % 7) * 0.18) + 's',
                animationDuration: 1.6 + (i % 5) * 0.25 + 's'
              }}
            />
          ))}
        </div>
      )}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 14
        }}
      >
        <Druppie size={108} mood="cheer" />
        <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 28, color: 'var(--ink)' }}>
          {perfect ? 'Foutloos!' : sterren >= 2 ? 'Goed gedaan!' : 'Goed geoefend!'}
        </div>
        <div style={{ transform: 'scale(1.6)' }}>
          <Stars value={sterren} size={26} gap={6} />
        </div>
        <div
          style={{
            background: '#fff',
            borderRadius: 18,
            padding: '14px 26px',
            boxShadow: '0 5px 0 rgba(40,52,59,0.08)'
          }}
        >
          <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 34, color: 'var(--water)' }}>
            {goed}
          </span>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-soft)' }}> / {total} juist</span>
        </div>
        {perfect && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#fff7e0',
              color: '#c98a0e',
              padding: '8px 14px',
              borderRadius: 999,
              fontWeight: 800,
              fontSize: 14
            }}
          >
            🏅 Nieuw insigne: Waterval-meester
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {wrongIdx.length > 0 && (
          <button className="cta tap" onClick={onReview} style={{ width: '100%' }}>
            Bekijk uitleg ({wrongIdx.length})
          </button>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="cta-ghost tap" onClick={onRetry} style={{ flex: 1 }}>
            Opnieuw
          </button>
          <button className="cta-ghost tap" onClick={onHome} style={{ flex: 1 }}>
            Naar waterval
          </button>
        </div>
      </div>
    </div>
  );
}
