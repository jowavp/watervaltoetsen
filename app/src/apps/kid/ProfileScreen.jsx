import { useState } from 'react';
import { Druppie, KID_AVATARS } from '../../components/Characters.jsx';

export default function ProfileScreen({ profile, totalStars, badges, onSave, onClose, firstRun }) {
  const [naam, setNaam] = useState(profile.naam || '');
  const [avatar, setAvatar] = useState(profile.avatar || '🦊');
  const bgs = ['#ffd23f', '#7fd4e8', '#ffb0c4', '#b7e89a', '#c9b8ff', '#ffc59e'];
  const [bg, setBg] = useState(profile.bg || '#ffd23f');

  return (
    <div className="screen" style={{ background: 'var(--cream)' }}>
      {!firstRun && (
        <div style={{ display: 'flex', padding: '6px 4px 10px' }}>
          <button className="iconbtn" onClick={onClose}>
            ✕
          </button>
          <div style={{ marginLeft: 'auto', fontWeight: 800, color: 'var(--ink-soft)', alignSelf: 'center' }}>
            Mijn profiel
          </div>
          <div style={{ width: 36 }} />
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto', textAlign: 'center' }}>
        {firstRun && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
            <Druppie size={70} mood="happy" />
          </div>
        )}
        <div
          style={{
            fontFamily: 'var(--display)',
            fontWeight: 700,
            fontSize: 24,
            color: 'var(--ink)',
            margin: '8px 0 2px'
          }}
        >
          {firstRun ? 'Hoi! Wie ben jij?' : naam}
        </div>
        {firstRun && (
          <div style={{ color: 'var(--ink-soft)', fontWeight: 700, fontSize: 14, marginBottom: 14 }}>
            Kies je naam en een dier.
          </div>
        )}

        <div
          style={{
            margin: '14px auto 6px',
            width: 96,
            height: 96,
            borderRadius: '50%',
            background: bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 52,
            boxShadow: 'inset 0 -5px 0 rgba(0,0,0,0.08)'
          }}
        >
          {avatar}
        </div>

        {!firstRun && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 18, margin: '14px 0' }}>
            <div>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 26, color: '#ffb400' }}>
                ⭐ {totalStars}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>sterren</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 26, color: 'var(--water)' }}>
                {badges}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>insignes</div>
            </div>
          </div>
        )}

        <input
          value={naam}
          onChange={(e) => setNaam(e.target.value)}
          placeholder="Jouw naam"
          style={{
            width: '78%',
            textAlign: 'center',
            fontFamily: 'var(--display)',
            fontWeight: 600,
            fontSize: 20,
            padding: '12px',
            borderRadius: 14,
            border: '2.5px solid var(--border)',
            outline: 'none',
            color: 'var(--ink)',
            marginBottom: 16
          }}
        />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
          {KID_AVATARS.map((a) => (
            <button
              key={a}
              className="tap"
              onClick={() => setAvatar(a)}
              style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                fontSize: 24,
                background: '#fff',
                cursor: 'pointer',
                border: `3px solid ${avatar === a ? 'var(--water)' : 'transparent'}`,
                boxShadow: '0 3px 0 rgba(40,52,59,0.08)'
              }}
            >
              {a}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 8 }}>
          {bgs.map((c) => (
            <button
              key={c}
              className="tap"
              onClick={() => setBg(c)}
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: c,
                border: `3px solid ${bg === c ? 'var(--ink)' : '#fff'}`,
                cursor: 'pointer'
              }}
            />
          ))}
        </div>
      </div>
      <button
        className="cta tap"
        disabled={!naam.trim()}
        onClick={() => onSave({ naam: naam.trim(), avatar, bg })}
        style={{ width: '100%', opacity: naam.trim() ? 1 : 0.45 }}
      >
        {firstRun ? 'Start met oefenen!' : 'Opslaan'}
      </button>
    </div>
  );
}
