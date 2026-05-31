import { useEffect, useState } from 'react';
import { Druppie } from './components/Characters.jsx';
import KidApp from './apps/kid/KidApp.jsx';
import AdminApp from './apps/admin/AdminApp.jsx';
import TeacherLogin from './apps/admin/TeacherLogin.jsx';
import { isAnonymous, supabase } from './lib/supabase.js';

function Launcher({ onPick }) {
  return (
    <div
      className="screen"
      style={{
        background: 'linear-gradient(180deg,#eaf7fb,#fbf6ec 70%)',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 6
      }}
    >
      <Druppie size={120} mood="happy" />
      <div
        style={{
          fontFamily: 'var(--display)',
          fontWeight: 700,
          fontSize: 34,
          color: 'var(--ink)',
          marginTop: 6
        }}
      >
        De Waterval
      </div>
      <div style={{ color: 'var(--ink-soft)', fontWeight: 700, fontSize: 15, marginBottom: 26 }}>
        Oefenen met Druppie 💧
      </div>
      <button className="cta tap" onClick={() => onPick('kid')} style={{ width: '100%' }}>
        Ik ben een leerling
      </button>
      <button className="cta-ghost tap" onClick={() => onPick('admin')} style={{ width: '100%' }}>
        Ik ben de leerkracht
      </button>
    </div>
  );
}

function Loading() {
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
    </div>
  );
}

function Shell() {
  const [role, setRole] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [bootstrapped, setBootstrapped] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const user = data?.session?.user || null;
      setAuthUser(user);
      // Iemand kwam terug van Google OAuth → direct naar admin-flow.
      if (user && !isAnonymous(user)) setRole('admin');
      setBootstrapped(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user || null;
      setAuthUser(user);
      if (event === 'SIGNED_IN' && user && !isAnonymous(user)) {
        setRole('admin');
      }
      if (event === 'SIGNED_OUT') {
        setRole(null);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!bootstrapped) return <Loading />;

  if (role === 'kid') {
    return <KidApp onExit={() => setRole(null)} />;
  }

  if (role === 'admin') {
    const isTeacher = authUser && !isAnonymous(authUser);
    if (!isTeacher) return <TeacherLogin onCancel={() => setRole(null)} />;
    return <AdminApp authUser={authUser} onExit={() => setRole(null)} />;
  }

  return <Launcher onPick={setRole} />;
}

export default function App() {
  return (
    <div className="apparea">
      <Shell />
    </div>
  );
}
