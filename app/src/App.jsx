import { useEffect, useState } from 'react';
import { Druppie, Teacher } from './components/Characters.jsx';
import KidApp from './apps/kid/KidApp.jsx';
import AdminApp from './apps/admin/AdminApp.jsx';
import {
  isTeacherEmail,
  signInWithGoogle,
  signOut,
  supabase,
  supabaseEnabled
} from './lib/supabase.js';

function GoogleIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.7 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.3 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.5 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.2C40.7 36.1 44 30.6 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function SignInScreen({ disabled }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handle = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
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
      <Druppie size={130} mood="happy" />
      <div
        style={{
          fontFamily: 'var(--display)',
          fontWeight: 700,
          fontSize: 36,
          color: 'var(--ink)',
          marginTop: 14
        }}
      >
        De Waterval
      </div>
      <div
        style={{
          color: 'var(--ink-soft)',
          fontWeight: 700,
          fontSize: 15,
          marginBottom: 30,
          maxWidth: 300
        }}
      >
        Hallo! Meld je aan om te beginnen oefenen.
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
        disabled={loading || disabled || !supabaseEnabled}
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
          padding: '14px 18px',
          fontFamily: 'var(--body)',
          fontWeight: 800,
          fontSize: 15,
          width: '100%',
          maxWidth: 320,
          boxShadow: '0 4px 0 rgba(40,52,59,0.08)',
          cursor: loading || disabled ? 'default' : 'pointer',
          opacity: loading || disabled ? 0.6 : 1
        }}
      >
        <GoogleIcon size={20} />
        {loading ? 'Bezig met aanmelden…' : 'Aanmelden met Google'}
      </button>
    </div>
  );
}

function RolePicker({ user, onPick, onSignOut }) {
  const naam = user?.user_metadata?.full_name?.split(' ')[0] || user?.email || '';
  return (
    <div
      className="screen"
      style={{
        background: 'linear-gradient(180deg,#eaf7fb,#fbf6ec 70%)',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 8
      }}
    >
      <Druppie size={100} mood="happy" />
      <div
        style={{
          fontFamily: 'var(--display)',
          fontWeight: 700,
          fontSize: 26,
          color: 'var(--ink)',
          marginTop: 12
        }}
      >
        Welkom {naam}!
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
        Hoe wil je verder?
      </div>

      <button
        className="cta tap"
        onClick={() => onPick('admin')}
        style={{ width: '100%', maxWidth: 320 }}
      >
        🎓 Als leerkracht
      </button>
      <button
        className="cta-ghost tap"
        onClick={() => onPick('kid')}
        style={{ width: '100%', maxWidth: 320 }}
      >
        🦊 Als leerling (preview)
      </button>

      <button
        className="tap"
        onClick={onSignOut}
        style={{
          marginTop: 16,
          border: 'none',
          background: 'transparent',
          color: 'var(--ink-soft)',
          fontWeight: 800,
          fontSize: 12,
          cursor: 'pointer'
        }}
      >
        Uitloggen
      </button>
    </div>
  );
}

function Loading() {
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowReset(true), 4000);
    return () => clearTimeout(t);
  }, []);

  const hardReset = async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if (typeof caches !== 'undefined') {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (e) {
      console.warn('[reset] cleanup failed:', e);
    }
    // Forceer een netwerk-bypass reload
    window.location.replace(window.location.pathname + '?nocache=' + Date.now());
  };

  return (
    <div
      className="screen"
      style={{
        background: 'linear-gradient(180deg,#eaf7fb,#fbf6ec 70%)',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Druppie size={88} mood="happy" />
      {showReset && (
        <button
          onClick={hardReset}
          style={{
            marginTop: 28,
            background: 'rgba(40,52,59,0.06)',
            border: 'none',
            borderRadius: 999,
            padding: '8px 14px',
            color: 'var(--ink-soft)',
            fontSize: 12,
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          ↻ Vastgelopen? Klik om opnieuw te starten
        </button>
      )}
    </div>
  );
}

function Shell() {
  const [authUser, setAuthUser] = useState(null);
  const [isTeacher, setIsTeacher] = useState(null); // null = loading, true/false = known
  const [role, setRole] = useState(null);
  const [bootstrapped, setBootstrapped] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    const settleUser = async (user) => {
      if (cancelled) return;
      if (!user) {
        setAuthUser(null);
        setIsTeacher(null);
        setRole(null);
        return;
      }
      // Anonieme sessies van vóór de auth-redesign worden geforceerd uitgelogd
      // zodat de gebruiker via Google opnieuw inlogt. Anders zien we een user
      // zonder email en blijven we op rare states hangen.
      if (user.is_anonymous) {
        console.log('[shell] stale anonymous session — signing out');
        await signOut();
        return; // SIGNED_OUT-event volgt en zet alles netjes terug
      }
      setAuthUser(user);
      try {
        const t = await isTeacherEmail(user.email);
        if (cancelled) return;
        setIsTeacher(t);
        if (!t) setRole('kid');
      } catch (e) {
        console.warn('[shell] teacher check failed:', e);
        setIsTeacher(false);
        setRole('kid');
      }
    };

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        await settleUser(data?.session?.user || null);
      } catch (e) {
        console.warn('[shell] bootstrap failed:', e);
      } finally {
        if (!cancelled) setBootstrapped(true);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;
      // INITIAL_SESSION laten we over aan de bootstrap-call hierboven om
      // race-conditions en dubbele state-updates te vermijden.
      if (event === 'SIGNED_OUT') {
        setAuthUser(null);
        setIsTeacher(null);
        setRole(null);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        await settleUser(session?.user || null);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!bootstrapped) return <Loading />;
  if (!authUser) return <SignInScreen />;
  if (isTeacher === null) return <Loading />;

  // Leerkracht moet nog rol kiezen
  if (isTeacher && !role) {
    return (
      <RolePicker
        user={authUser}
        onPick={setRole}
        onSignOut={async () => {
          await signOut();
        }}
      />
    );
  }

  if (role === 'kid') {
    return (
      <KidApp
        authUser={authUser}
        // Teachers in preview-modus krijgen een "terug naar role-picker" exit;
        // echte leerlingen niet (zij gebruiken sign-out via profiel).
        onExit={isTeacher ? () => setRole(null) : null}
      />
    );
  }

  if (role === 'admin') {
    return <AdminApp authUser={authUser} onExit={() => setRole(null)} />;
  }

  return <Loading />;
}

export default function App() {
  return (
    <div className="apparea">
      <Shell />
    </div>
  );
}
