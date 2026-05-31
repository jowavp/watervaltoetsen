export function Druppie({ size = 80, mood = 'idle', body = '#27b6db', shade = '#1689a8' }) {
  const cls = 'druppie druppie-' + mood;
  const eyes = mood === 'happy' || mood === 'cheer' ? 'smile' : mood === 'sad' ? 'sad' : 'open';
  const cheek = '#ff9bb0';
  return (
    <div className={cls} style={{ width: size, height: size * 1.12, display: 'inline-block' }}>
      <svg width="100%" height="100%" viewBox="0 0 100 112" style={{ display: 'block', overflow: 'visible' }}>
        <ellipse cx="50" cy="110" rx="26" ry="6" fill="rgba(20,40,50,0.12)" />
        <path d="M50 4 C50 4 90 56 90 80 A40 40 0 1 1 10 80 C10 56 50 4 50 4 Z" fill={body} />
        <path d="M50 4 C50 4 90 56 90 80 A40 40 0 0 1 50 100 Z" fill={shade} opacity="0.16" />
        <ellipse cx="27" cy="40" rx="11" ry="14" fill="#fff" opacity="0.55" />
        {eyes === 'open' && (
          <>
            <circle cx="38" cy="73" r="8" fill="#22323a" />
            <circle cx="62" cy="73" r="8" fill="#22323a" />
            <circle cx="40.5" cy="70" r="2.6" fill="#fff" />
            <circle cx="64.5" cy="70" r="2.6" fill="#fff" />
          </>
        )}
        {eyes === 'smile' && (
          <>
            <path d="M30 74 q8 -10 16 0" fill="none" stroke="#22323a" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M54 74 q8 -10 16 0" fill="none" stroke="#22323a" strokeWidth="4.5" strokeLinecap="round" />
          </>
        )}
        {eyes === 'sad' && (
          <>
            <path d="M31 70 q7 7 14 2" fill="none" stroke="#22323a" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M55 72 q7 -5 14 -2" fill="none" stroke="#22323a" strokeWidth="4.5" strokeLinecap="round" />
          </>
        )}
        <circle cx="28" cy="87" r="5.5" fill={cheek} opacity="0.7" />
        <circle cx="72" cy="87" r="5.5" fill={cheek} opacity="0.7" />
        {mood === 'sad' ? (
          <path d="M42 94 q8 -7 16 0" fill="none" stroke="#22323a" strokeWidth="4.5" strokeLinecap="round" />
        ) : mood === 'think' ? (
          <path d="M42 91 h16" fill="none" stroke="#22323a" strokeWidth="4.5" strokeLinecap="round" />
        ) : (
          <path d="M39 88 q11 13 22 0" fill="none" stroke="#22323a" strokeWidth="4.5" strokeLinecap="round" />
        )}
      </svg>
    </div>
  );
}

export const TEACHER_LOOKS = {
  ann: { skin: '#f4c79c', hair: '#7a4a26', hairStyle: 'bob', accent: '#1fa9ce' },
  sofie: { skin: '#f1c39a', hair: '#caa24a', hairStyle: 'pony', accent: '#9b8cff' },
  tom: { skin: '#e9b48a', hair: '#3a2c22', hairStyle: 'short', accent: '#5fbe82' },
  rik: { skin: '#d99a6c', hair: '#1f1a16', hairStyle: 'short', accent: '#ff9e2c' }
};

export function Teacher({ who = 'ann', size = 64, ring = true }) {
  const L = TEACHER_LOOKS[who] || TEACHER_LOOKS.ann;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#fff',
        border: ring ? `3px solid ${L.accent}` : 'none',
        overflow: 'hidden',
        flexShrink: 0,
        boxShadow: '0 3px 8px rgba(20,40,50,0.12)'
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 64 64">
        <rect width="64" height="64" fill="#eef6f8" />
        {L.hairStyle === 'bob' && (
          <path
            d="M14 34 Q14 14 32 14 Q50 14 50 34 L50 50 Q50 44 46 44 L46 30 Q46 22 32 22 Q18 22 18 30 L18 44 Q14 44 14 50 Z"
            fill={L.hair}
          />
        )}
        {L.hairStyle === 'pony' && (
          <path
            d="M16 32 Q16 14 32 14 Q48 14 48 32 L48 40 Q44 38 44 30 Q44 22 32 22 Q20 22 20 30 Q20 40 16 40 Z"
            fill={L.hair}
          />
        )}
        {L.hairStyle === 'pony' && <ellipse cx="49" cy="40" rx="5" ry="11" fill={L.hair} />}
        <rect x="26" y="42" width="12" height="10" fill={L.skin} />
        <path d="M14 64 Q14 50 32 50 Q50 50 50 64 Z" fill={L.accent} />
        <ellipse cx="32" cy="34" rx="13" ry="14" fill={L.skin} />
        {L.hairStyle === 'short' && (
          <path d="M19 32 Q19 18 32 18 Q45 18 45 32 Q41 26 32 26 Q23 26 19 32 Z" fill={L.hair} />
        )}
        {(L.hairStyle === 'bob' || L.hairStyle === 'pony') && (
          <path d="M19 32 Q19 17 32 17 Q45 17 45 32 Q40 25 32 25 Q24 25 19 32 Z" fill={L.hair} />
        )}
        <circle cx="27" cy="34" r="1.8" fill="#33302b" />
        <circle cx="37" cy="34" r="1.8" fill="#33302b" />
        <path d="M28 40 q4 3 8 0" fill="none" stroke="#b5654a" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="24" cy="38" r="2" fill="#ff9bb0" opacity="0.5" />
        <circle cx="40" cy="38" r="2" fill="#ff9bb0" opacity="0.5" />
      </svg>
    </div>
  );
}

export const KID_AVATARS = ['🦊', '🐼', '🐲', '🦄', '🐙', '🐯', '🦉', '🐧', '🐢', '🦁', '🐸', '🐱'];

export function ChildAvatar({ emoji = '🦊', size = 48, bg = '#ffd23f' }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.5,
        flexShrink: 0,
        boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.08)'
      }}
    >
      {emoji}
    </div>
  );
}

export function VakIcon({ vak, size = 26, c = '#28343b', stroke = 2.2 }) {
  const p = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: c,
    strokeWidth: stroke,
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  };
  if (vak === 'wiskunde')
    return (
      <svg {...p}>
        <path d="M5 4h14M5 4v16M5 20h14M9 8h2M10 7v3M9 15l2 2M11 15l-2 2M14 8.5h3M14 15.5h3M15.5 14v3" />
      </svg>
    );
  if (vak === 'nederlands')
    return (
      <svg {...p}>
        <path d="M4 19V6a1 1 0 011-1h6v14M20 19V6a1 1 0 00-1-1h-6M4 19h16M7.5 9h1M7.5 12h1" />
      </svg>
    );
  if (vak === 'frans')
    return (
      <svg {...p}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.5 12h17M12 3.5c3 2.5 3 14.5 0 17M12 3.5c-3 2.5-3 14.5 0 17" />
      </svg>
    );
  return null;
}

export function Stars({ value = 0, max = 3, size = 16, gap = 2 }) {
  return (
    <span style={{ display: 'inline-flex', gap }}>
      {Array.from({ length: max }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24">
          <path
            d="M12 2l2.9 6.1 6.6.9-4.8 4.7 1.2 6.7L12 18l-5.9 3.1 1.2-6.7L2.5 9l6.6-.9z"
            fill={i < value ? '#ffb400' : 'none'}
            stroke={i < value ? '#ffb400' : '#cdbfae'}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}
