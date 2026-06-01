import { useState } from 'react';
import { Druppie, KID_AVATARS } from '../../components/Characters.jsx';

const BGS = ['#ffd23f', '#7fd4e8', '#ffb0c4', '#b7e89a', '#c9b8ff', '#ffc59e'];

export default function ProfileScreen({
  profile,
  totalStars,
  badges,
  onSave,
  onClose,
  onSignOut,
  firstRun,
  suggestedNaam // optionele Google-naam voor pre-fill bij eerste run
}) {
  const [naam, setNaam] = useState(profile.naam || suggestedNaam || '');
  const [avatar, setAvatar] = useState(profile.avatar || '🦊');
  const [bg, setBg] = useState(profile.bg || BGS[0]);
  const [leerjaar, setLeerjaar] = useState(profile.leerjaar || null);

  // Voor de wizard: stap 1 = naam, stap 2 = avatar+kleur, stap 3 = leerjaar.
  // Buiten firstRun zien we alles op één scrolbaar scherm.
  const [step, setStep] = useState(firstRun ? 1 : null);

  const naamOK = naam.trim().length >= 1;
  const allOK = naamOK && Boolean(avatar) && Number.isInteger(leerjaar) && leerjaar >= 1 && leerjaar <= 6;

  const save = () => onSave({ naam: naam.trim(), avatar, bg, leerjaar });

  const ToolbarHeader = !firstRun ? (
    <div style={{ display: 'flex', alignItems: 'center', padding: '6px 4px 10px' }}>
      <button className="iconbtn" onClick={onClose}>✕</button>
      <div style={{ marginLeft: 'auto', fontWeight: 800, color: 'var(--ink-soft)' }}>Mijn profiel</div>
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
    </div>
  ) : null;

  // ────────── Onboarding wizard ──────────
  if (firstRun) {
    const isLast = step === 3;
    const canNext = step === 1 ? naamOK : step === 2 ? Boolean(avatar) : leerjaar != null;

    return (
      <div className="screen" style={{ background: 'var(--cream)' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                background: s <= step ? 'var(--water)' : '#e7e0d2'
              }}
            />
          ))}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', overflowY: 'auto' }}>
          <Druppie size={84} mood="happy" />

          {step === 1 && (
            <>
              <h1 style={titel}>Hoi! Wie ben jij?</h1>
              <p style={sub}>Vul je naam in (mag ook een bijnaam zijn).</p>
              <input
                autoFocus
                value={naam}
                onChange={(e) => setNaam(e.target.value)}
                placeholder="Jouw naam"
                style={namenInput}
              />
            </>
          )}

          {step === 2 && (
            <>
              <h1 style={titel}>Kies je avatar</h1>
              <p style={sub}>Je dier en kleur — zo herkennen we je.</p>
              <div style={{ ...avatarCircle, background: bg }}>{avatar}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
                {KID_AVATARS.map((a) => (
                  <button
                    key={a}
                    className="tap"
                    onClick={() => setAvatar(a)}
                    style={avatarButton(avatar === a)}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {BGS.map((c) => (
                  <button
                    key={c}
                    className="tap"
                    onClick={() => setBg(c)}
                    style={bgButton(c, bg === c)}
                  />
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h1 style={titel}>In welk leerjaar zit jij?</h1>
              <p style={sub}>Je kan dit altijd later wijzigen.</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 6 }}>
                {[1, 2, 3, 4, 5, 6].map((n) => {
                  const sel = leerjaar === n;
                  return (
                    <button
                      key={n}
                      className="tap"
                      onClick={() => setLeerjaar(n)}
                      style={leerjaarPill(sel)}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, paddingTop: 14 }}>
          {step > 1 && (
            <button className="cta-ghost tap" onClick={() => setStep((s) => s - 1)} style={{ flex: 1 }}>
              ← Terug
            </button>
          )}
          {!isLast && (
            <button
              className="cta tap"
              disabled={!canNext}
              onClick={() => setStep((s) => s + 1)}
              style={{ flex: 2, opacity: canNext ? 1 : 0.45 }}
            >
              Verder →
            </button>
          )}
          {isLast && (
            <button
              className="cta tap"
              disabled={!allOK}
              onClick={save}
              style={{ flex: 2, opacity: allOK ? 1 : 0.45 }}
            >
              Start met oefenen! 💧
            </button>
          )}
        </div>
      </div>
    );
  }

  // ────────── Bewerk-modus (één scherm, scrollbaar) ──────────
  return (
    <div className="screen" style={{ background: 'var(--cream)' }}>
      {ToolbarHeader}

      <div style={{ flex: 1, overflowY: 'auto', textAlign: 'center' }}>
        <div style={{ ...avatarCircle, background: bg, margin: '14px auto 6px' }}>{avatar}</div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 18, margin: '14px 0' }}>
          <div>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 26, color: '#ffb400' }}>⭐ {totalStars}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>sterren</div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 26, color: 'var(--water)' }}>{badges}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>insignes</div>
          </div>
        </div>

        <label className="lbl" style={{ marginLeft: '12%' }}>Naam</label>
        <input
          value={naam}
          onChange={(e) => setNaam(e.target.value)}
          placeholder="Jouw naam"
          style={namenInput}
        />

        <label className="lbl" style={{ marginLeft: '12%', marginTop: 8 }}>Leerjaar</label>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
          {[1, 2, 3, 4, 5, 6].map((n) => {
            const sel = leerjaar === n;
            return (
              <button
                key={n}
                className="tap"
                onClick={() => setLeerjaar(n)}
                style={{
                  flex: '0 0 42px',
                  height: 42,
                  borderRadius: 11,
                  fontFamily: 'var(--display)',
                  fontWeight: 600,
                  fontSize: 16,
                  border: 'none',
                  cursor: 'pointer',
                  background: sel ? 'var(--water)' : '#fff',
                  color: sel ? '#fff' : 'var(--ink)',
                  boxShadow: sel ? '0 3px 0 var(--water-dark)' : '0 2px 0 rgba(40,52,59,0.06)'
                }}
              >
                {n}
              </button>
            );
          })}
        </div>

        <label className="lbl" style={{ marginLeft: '12%' }}>Avatar</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
          {KID_AVATARS.map((a) => (
            <button key={a} className="tap" onClick={() => setAvatar(a)} style={avatarButton(avatar === a)}>
              {a}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
          {BGS.map((c) => (
            <button key={c} className="tap" onClick={() => setBg(c)} style={bgButton(c, bg === c)} />
          ))}
        </div>
      </div>

      <button
        className="cta tap"
        disabled={!allOK}
        onClick={save}
        style={{ width: '100%', opacity: allOK ? 1 : 0.45 }}
      >
        Opslaan
      </button>
    </div>
  );
}

// ────────── shared styles ──────────
const titel = {
  fontFamily: 'var(--display)',
  fontWeight: 700,
  fontSize: 24,
  color: 'var(--ink)',
  margin: '14px 0 4px'
};
const sub = { color: 'var(--ink-soft)', fontWeight: 700, fontSize: 14, marginBottom: 18, maxWidth: 280 };
const namenInput = {
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
};
const avatarCircle = {
  width: 96,
  height: 96,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 52,
  boxShadow: 'inset 0 -5px 0 rgba(0,0,0,0.08)',
  marginBottom: 14
};
const avatarButton = (sel) => ({
  width: 46,
  height: 46,
  borderRadius: '50%',
  fontSize: 24,
  background: '#fff',
  cursor: 'pointer',
  border: `3px solid ${sel ? 'var(--water)' : 'transparent'}`,
  boxShadow: '0 3px 0 rgba(40,52,59,0.08)'
});
const bgButton = (c, sel) => ({
  width: 30,
  height: 30,
  borderRadius: '50%',
  background: c,
  border: `3px solid ${sel ? 'var(--ink)' : '#fff'}`,
  cursor: 'pointer'
});
const leerjaarPill = (sel) => ({
  width: 60,
  height: 60,
  borderRadius: 16,
  fontFamily: 'var(--display)',
  fontWeight: 600,
  fontSize: 26,
  border: 'none',
  cursor: 'pointer',
  background: sel ? 'var(--water)' : '#fff',
  color: sel ? '#fff' : 'var(--ink)',
  boxShadow: sel ? '0 5px 0 var(--water-dark)' : '0 3px 0 rgba(40,52,59,0.08)'
});
