import { useEffect, useMemo, useState } from 'react';
import D from '../../lib/data.js';
import {
  loadKidLocal,
  pullKidState,
  saveKidProfile,
  saveKidProgress,
  saveKidVakOrder
} from '../../lib/storage.js';
import ProfileScreen from './ProfileScreen.jsx';
import WaterfallMap from './WaterfallMap.jsx';
import PlanSheet from './PlanSheet.jsx';
import QuizEngine from './QuizEngine.jsx';
import ResultScreen from './ResultScreen.jsx';
import TheoryScreen from './TheoryScreen.jsx';

export default function KidApp({ onExit }) {
  const initial = loadKidLocal();
  const [profile, setProfile] = useState(initial.profile || {});
  const [progress, setProgress] = useState(() => {
    if (initial.progress && Object.keys(initial.progress).length) return initial.progress;
    const init = {};
    D.nodes.forEach((n) => {
      if (n.status === 'done') init[n.id] = n.stars;
    });
    return init;
  });
  const [vakOrder, setVakOrder] = useState(initial.vakorder || Object.keys(D.vakken));
  const [screen, setScreen] = useState(profile && profile.naam ? 'home' : 'profiel');
  const [active, setActive] = useState(null);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState('');

  // Hydrate from Supabase als configured — overschrijft alleen als er server-data is.
  useEffect(() => {
    let cancelled = false;
    pullKidState().then((remote) => {
      if (!remote || cancelled) return;
      if (remote.profile && remote.profile.naam) {
        setProfile((p) => ({ ...p, ...remote.profile }));
        if (!profile.naam) setScreen('home');
      }
      if (remote.progress && Object.keys(remote.progress).length) {
        setProgress((p) => ({ ...p, ...remote.progress }));
      }
      if (remote.vakorder && remote.vakorder.length) {
        setVakOrder(remote.vakorder);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    saveKidProgress(progress);
  }, [progress]);
  useEffect(() => {
    saveKidVakOrder(vakOrder);
  }, [vakOrder]);

  const isDone = (id) => Object.prototype.hasOwnProperty.call(progress, id);

  const streamNodes = useMemo(() => {
    const ordered = [...D.nodes].sort((a, b) => {
      const oa = vakOrder.indexOf(a.vak),
        ob = vakOrder.indexOf(b.vak);
      if (oa !== ob) return oa - ob;
      return D.nodes.indexOf(a) - D.nodes.indexOf(b);
    });
    let foundNow = false;
    return ordered.map((n) => {
      const stars = progress[n.id] || 0;
      let status;
      if (isDone(n.id)) status = 'done';
      else if (!foundNow) {
        status = 'now';
        foundNow = true;
      } else status = 'lock';
      return { ...n, stars, status };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vakOrder, progress]);

  const totalStars = Object.values(progress).reduce((s, v) => s + (v || 0), 0);
  const badges = Object.values(progress).filter((v) => v === 3).length;

  const saveProfile = (p) => {
    const np = { ...profile, ...p };
    setProfile(np);
    saveKidProfile(np);
    setScreen('home');
  };

  const openNode = (n) => {
    if (n.status === 'lock') {
      setToast('Maak eerst het vorige onderdeel af! 💧');
      setTimeout(() => setToast(''), 1800);
      return;
    }
    setActive(n);
    setScreen('quiz');
  };

  const finishQuiz = (res) => {
    const sterren =
      res.wrongIdx.length === 0
        ? 3
        : (res.total - res.wrongIdx.length) / res.total >= 0.6
        ? 2
        : res.total - res.wrongIdx.length > 0
        ? 1
        : 0;
    setProgress((prev) => {
      const np = { ...prev };
      const cur = np[active.id];
      np[active.id] = cur == null ? sterren : Math.max(cur, sterren);
      return np;
    });
    setResult({ ...res });
  };

  const vakInfoOf = (n) => D.vakken[n.vak];
  const teacherOf = (n) => D.teachers[D.vakken[n.vak].teacher];

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {screen === 'profiel' && (
        <ProfileScreen
          profile={profile}
          firstRun={!profile.naam}
          totalStars={totalStars}
          badges={badges}
          onSave={saveProfile}
          onClose={() => setScreen('home')}
        />
      )}
      {(screen === 'home' || screen === 'plan') && (
        <WaterfallMap
          profile={profile}
          leerjaar={5}
          nodes={streamNodes}
          totalStars={totalStars}
          vakken={D.vakken}
          onOpenNode={openNode}
          onLeerjaar={() => {}}
          onProfiel={() => setScreen('profiel')}
          onPlan={() => setScreen('plan')}
        />
      )}
      {screen === 'plan' && (
        <PlanSheet
          vakOrder={vakOrder}
          vakken={D.vakken}
          nodes={D.nodes}
          onSave={(o) => {
            setVakOrder(o);
            setScreen('home');
          }}
          onClose={() => setScreen('home')}
        />
      )}
      {screen === 'quiz' && active && !result && (
        <QuizEngine
          vragen={D.vragenVoor(active.id)}
          vak={active.vak}
          vakInfo={vakInfoOf(active)}
          onDone={finishQuiz}
          onClose={() => {
            setActive(null);
            setScreen('home');
          }}
        />
      )}
      {screen === 'quiz' && result && (
        <ResultScreen
          result={result}
          onReview={() => setScreen('theorie')}
          onRetry={() => setResult(null)}
          onHome={() => {
            setResult(null);
            setActive(null);
            setScreen('home');
          }}
        />
      )}
      {screen === 'theorie' && result && (
        <TheoryScreen result={result} teacher={teacherOf(active)} onBack={() => setScreen('quiz')} />
      )}

      {toast && <div className="toast">{toast}</div>}
      {onExit && screen === 'home' && (
        <button onClick={onExit} className="exit-pill">
          ↩ rol
        </button>
      )}
    </div>
  );
}
