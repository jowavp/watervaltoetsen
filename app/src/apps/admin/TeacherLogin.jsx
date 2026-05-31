import { useState } from 'react';
import { Teacher } from '../../components/Characters.jsx';
import { signInWithGoogle, supabaseEnabled } from '../../lib/supabase.js';

function GoogleIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.7 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.3 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.5 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.2C40.7 36.1 44 30.6 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

export default function TeacherLogin({ onCancel }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handle = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      // De browser redirect naar Google — we komen hier alleen bij een fout.
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div
      className="screen"
      style={{
        background: 'linear-gradient(180deg,#eaf7fb,#fbf6ec 70%)',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
      }}
    >
      <div style={{ display: 'flex', gap: -8 }}>
        <div style={{ marginRight: -10 }}>
          <Teacher who="sofie" size={62} />
        </div>
        <Teacher who="tom" size={62} />
      </div>
      <div
        style={{
          fontFamily: 'var(--display)',
          fontWeight: 700,
          fontSize: 26,
          color: 'var(--ink)',
          marginTop: 18,
          marginBottom: 6
        }}
      >
        Welkom, leerkracht
      </div>
      <div
        style={{
          color: 'var(--ink-soft)',
          fontWeight: 700,
          fontSize: 14,
          marginBottom: 22,
          maxWidth: 280
        }}
      >
        Meld je aan met je Google-schoolaccount om vakken, bronnen en vragen te beheren.
      </div>

      {!supabaseEnabled && (
        <div
          style={{
            background: '#fff7e0',
            border: '1.5px solid #f0d28a',
            borderRadius: 14,
            padding: 12,
            color: '#8a6d18',
            fontWeight: 700,
            fontSize: 13,
            marginBottom: 14,
            maxWidth: 320
          }}
        >
          Supabase is niet geconfigureerd in deze build. Aanmelden werkt pas wanneer{' '}
          <code>VITE_SUPABASE_URL</code> + <code>VITE_SUPABASE_ANON_KEY</code> ingesteld zijn.
        </div>
      )}

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
            marginBottom: 12,
            maxWidth: 320
          }}
        >
          {error}
        </div>
      )}

      <button
        className="tap"
        disabled={loading || !supabaseEnabled}
        onClick={handle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          background: '#fff',
          color: 'var(--ink)',
          border: '1.5px solid #d9d4c8',
          borderRadius: 14,
          padding: '13px 18px',
          fontFamily: 'var(--body)',
          fontWeight: 800,
          fontSize: 15,
          width: '100%',
          maxWidth: 320,
          boxShadow: '0 4px 0 rgba(40,52,59,0.08)',
          cursor: loading || !supabaseEnabled ? 'default' : 'pointer',
          opacity: loading || !supabaseEnabled ? 0.6 : 1
        }}
      >
        <GoogleIcon size={20} />
        {loading ? 'Bezig met aanmelden…' : 'Aanmelden met Google'}
      </button>

      <button
        className="cta-ghost tap"
        onClick={onCancel}
        style={{ marginTop: 12, width: '100%', maxWidth: 320 }}
      >
        Terug
      </button>
    </div>
  );
}
