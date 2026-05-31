import { useState } from 'react';
import { Druppie } from './components/Characters.jsx';
import KidApp from './apps/kid/KidApp.jsx';
import AdminApp from './apps/admin/AdminApp.jsx';

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
      <div
        style={{
          color: 'var(--ink-soft)',
          fontWeight: 700,
          fontSize: 15,
          marginBottom: 26
        }}
      >
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

function Shell() {
  const [role, setRole] = useState(null);
  if (role === 'kid') return <KidApp onExit={() => setRole(null)} />;
  if (role === 'admin') return <AdminApp onExit={() => setRole(null)} />;
  return <Launcher onPick={setRole} />;
}

export default function App() {
  return (
    <div className="apparea">
      <Shell />
    </div>
  );
}
