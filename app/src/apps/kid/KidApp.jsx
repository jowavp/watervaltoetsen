import { useEffect, useMemo, useState } from 'react';
import D from '../../lib/data.js';
import {
  loadKidLocal,
  pullKidState,
  saveKidProfile,
  saveKidProgress,
  saveKidVakOrder
} from '../../lib/storage.js';
import { listVakken } from '../../lib/vakken.js';
import { supabaseEnabled } from '../../lib/supabase.js';
import ProfileScreen from './ProfileScreen.jsx';
import WaterfallMap from './WaterfallMap.jsx';
import QuizEngine from './QuizEngine.jsx';
import ResultScreen from './ResultScreen.jsx';
import TheoryScreen from './TheoryScreen.jsx';

const LEERJAAR = 5;

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
  // vakOrder = teacher-set volgorde. Kind kan deze niet meer wijzigen.
  // Eerst uit localStorage (laatst gecachte teacher-volgorde), anders hardcoded.
  const [vakOrder, setVakOrder] = useState(initial.vakorder || Object.keys(D.vakken));
  // vakkenMeta: per-key metadata (naam/kleur/tint/icon) — Supabase override
  // van de hardcoded D.vakken wanneer beschikbaar.
  const [vakkenMeta, setVakkenMeta] = useState(D.vakken);
  const [screen, setScreen] = useState(profile && profile.naam ? 'home' : 'profiel');
  const [active, setActive] = useState(null);
  const [result, setResult] = useState(null);

  // Hydrate profiel + voortgang vanuit Supabase als beschikbaar.
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
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Vakken-volgorde + metadata van leerkracht ophalen.
  useEffect(() => {
    let cancelled = false;
    if (!supabaseEnabled) return;
    listVakken(LEERJAAR).then((vk) => {
      if (cancelled || !vk?.length) return;
      const active = vk.filter((v) => v.active);
      // Bouw metadata-map met server-waarden als override.
      const meta = { ...D.vakken };
      for (const v of active) {
        meta[v.key] = {
          ...(meta[v.key] || {}),
          naam: v.naam,
          kleur: v.kleur,
          tint: v.tint,
          icon: v.icon,
          test_date: v.test_date,
          teacher: meta[v.key]?.teacher || 'ann'
        };
      }
      setVakkenMeta(meta);
      const order = active.map((v) => v.key);
      if (order.length) {
        setVakOrder(order);
        saveKidVakOrder(order);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    saveKidProgress(progress);
  }, [progress]);

  const isDone = (id) => Object.prototype.hasOwnProperty.call(progress, id);

  const streamNodes = useMemo(() => {
    // Filter nodes op vakken die nog bestaan in de teacher-config.
    const allowed = new Set(vakOrder);
    const filtered = D.nodes.filter((n) => allowed.has(n.vak));
    const ordered = [...filtered].sort((a, b) => {
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
      } else status = 'todo'; // niet meer 'lock' — alle nodes blijven tapbaar
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

  const vakInfoOf = (n) => vakkenMeta[n.vak] || D.vakken[n.vak];
  const teacherOf = (n) => {
    const vi = vakInfoOf(n);
    return D.teachers[vi?.teacher] || D.teachers.ann;
  };

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
      {screen === 'home' && (
        <WaterfallMap
          profile={profile}
          leerjaar={LEERJAAR}
          nodes={streamNodes}
          totalStars={totalStars}
          vakken={vakkenMeta}
          onOpenNode={openNode}
          onLeerjaar={() => {}}
          onProfiel={() => setScreen('profiel')}
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

      {onExit && screen === 'home' && (
        <button onClick={onExit} className="exit-pill">
          ↩ rol
        </button>
      )}
    </div>
  );
}
