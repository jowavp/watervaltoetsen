import { ChildAvatar, Druppie, Stars, VakIcon } from '../../components/Characters.jsx';

function shade(hex) {
  const m = { '#1fa9ce': '#1689a8', '#9b8cff': '#7a6be0', '#5fbe82': '#3fa565' };
  return m[hex] || '#1689a8';
}

export default function WaterfallMap({
  profile,
  leerjaar,
  nodes,
  totalStars,
  vakken,
  onOpenNode,
  onLeerjaar,
  onProfiel
}) {
  const W = 332,
    GAP = 104,
    TOP = 72,
    NODE = 64,
    AMP = 92,
    CX = W / 2;
  const xOf = (i) => CX + AMP * Math.sin(i * 0.92 + 0.4);
  const yOf = (i) => TOP + i * GAP;
  const H = TOP + (nodes.length - 1) * GAP + 150;

  const pts = nodes.map((_, i) => [xOf(i), yOf(i)]);
  let d = `M ${pts[0][0]} ${pts[0][1] - 30}`;
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    if (i === 0) d += ` L ${x} ${y}`;
    else {
      const [px, py] = pts[i - 1];
      const my = (py + y) / 2;
      d += ` C ${px} ${my}, ${x} ${my}, ${x} ${y}`;
    }
  }
  d += ` L ${pts[pts.length - 1][0]} ${pts[pts.length - 1][1] + 80}`;

  const firstOfVak = {};
  nodes.forEach((n, i) => {
    if (firstOfVak[n.vak] === undefined) firstOfVak[n.vak] = i;
  });

  return (
    <div className="screen" style={{ background: 'linear-gradient(180deg,#eaf7fb 0%, var(--cream) 60%)', padding: 0 }}>
      <div
        style={{
          padding: '4px 16px 12px',
          background: 'rgba(234,247,251,0.95)',
          backdropFilter: 'blur(4px)',
          borderBottom: '1px solid rgba(40,52,59,0.06)',
          zIndex: 5
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="tap"
            onClick={onProfiel}
            style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
          >
            <ChildAvatar emoji={profile.avatar} size={44} bg={profile.bg} />
          </button>
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>Dag {profile.naam}!</div>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 17, color: 'var(--ink)' }}>
              Jouw waterval
            </div>
          </div>
          <div
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: '#fff',
              borderRadius: 999,
              padding: '6px 12px',
              fontWeight: 800,
              color: '#ffb400',
              fontSize: 14,
              boxShadow: '0 3px 0 rgba(40,52,59,0.08)'
            }}
          >
            ⭐ {totalStars}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          {[1, 2, 3, 4, 5, 6].map((n) => {
            const open = n === 5;
            const active = n === leerjaar;
            return (
              <button
                key={n}
                className="tap"
                disabled={!open}
                onClick={() => open && onLeerjaar(n)}
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 12,
                  fontFamily: 'var(--display)',
                  fontWeight: 600,
                  fontSize: 16,
                  cursor: open ? 'pointer' : 'default',
                  background: active ? 'var(--water)' : '#fff',
                  color: active ? '#fff' : open ? 'var(--ink)' : '#c3bcae',
                  border: 'none',
                  boxShadow: active ? '0 4px 0 var(--water-dark)' : '0 3px 0 rgba(40,52,59,0.07)',
                  position: 'relative'
                }}
              >
                {open ? n : '🔒'}
              </button>
            );
          })}
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 0.4,
            color: 'var(--ink-soft)',
            marginTop: 9,
            lineHeight: 1.25
          }}
        >
          De stroom van wat je dit jaar moet kennen — kies een onderdeel om te oefenen.
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <div style={{ position: 'relative', width: W, height: H, margin: '8px auto 0' }}>
          <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
            <defs>
              <linearGradient id="riv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#bfeaf6" />
                <stop offset="1" stopColor="#8ed6ec" />
              </linearGradient>
            </defs>
            <path d={d} fill="none" stroke="url(#riv)" strokeWidth="34" strokeLinecap="round" strokeLinejoin="round" />
            <path
              d={d}
              fill="none"
              stroke="#fff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="2 16"
              opacity="0.85"
            />
          </svg>

          {Object.keys(firstOfVak).map((vk) => {
            const i = firstOfVak[vk];
            const x = xOf(i);
            const y = yOf(i);
            const left = x < CX;
            const vi = vakken[vk];
            return (
              <div
                key={vk}
                style={{
                  position: 'absolute',
                  top: y - 52,
                  left: left ? x + 44 : x - 44,
                  transform: left ? 'none' : 'translateX(-100%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#fff',
                  borderRadius: 999,
                  padding: '5px 11px 5px 8px',
                  boxShadow: '0 3px 0 rgba(40,52,59,0.08)',
                  whiteSpace: 'nowrap'
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: vi.tint,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <VakIcon vak={vk} size={15} c={vi.kleur} stroke={2.4} />
                </span>
                <span style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 13, color: vi.kleur }}>
                  {vi.naam}
                </span>
              </div>
            );
          })}

          {nodes.map((n, i) => {
            const x = xOf(i),
              y = yOf(i);
            const vi = vakken[n.vak];
            const now = n.status === 'now';
            const done = n.status === 'done';
            return (
              <div
                key={n.id}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  transform: 'translate(-50%,-50%)',
                  textAlign: 'center'
                }}
              >
                {now && <Druppie size={42} mood="happy" />}
                <button
                  className="tap"
                  onClick={() => onOpenNode(n)}
                  aria-label={n.titel}
                  style={{
                    width: NODE,
                    height: NODE,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    position: 'relative',
                    border: now ? '4px solid #fff' : 'none',
                    background: vi.kleur,
                    boxShadow: now
                      ? `0 0 0 6px ${vi.kleur}44, 0 6px 0 ${vi.kleur}`
                      : `0 6px 0 ${shade(vi.kleur)}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <VakIcon vak={n.vak} size={28} c="#fff" stroke={2.4} />
                  {done && (
                    <span style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)' }}>
                      <Stars value={n.stars} size={13} gap={1} />
                    </span>
                  )}
                </button>
                <div
                  style={{
                    fontFamily: 'var(--display)',
                    fontWeight: 600,
                    fontSize: 12.5,
                    color: 'var(--ink)',
                    marginTop: done ? 14 : 8,
                    maxWidth: 110
                  }}
                >
                  {n.titel}
                </div>
              </div>
            );
          })}

          <div
            style={{
              position: 'absolute',
              left: CX,
              top: H - 70,
              transform: 'translateX(-50%)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: '#fff7e0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 30,
                boxShadow: '0 5px 0 #f0d28a',
                margin: '0 auto'
              }}
            >
              🏆
            </div>
            <div
              style={{
                fontFamily: 'var(--display)',
                fontWeight: 600,
                fontSize: 12.5,
                color: 'var(--ink-soft)',
                marginTop: 6
              }}
            >
              Klaar voor de toetsen!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
