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
import { loadQuizForVak } from '../../lib/quiz.js';
import { signOut, supabaseEnabled } from '../../lib/supabase.js';
import ProfileScreen from './ProfileScreen.jsx';
import WaterfallMap from './WaterfallMap.jsx';
import QuizEngine from './QuizEngine.jsx';
import ResultScreen from './ResultScreen.jsx';
import TheoryScreen from './TheoryScreen.jsx';

const DEFAULT_LEERJAAR = 5;

export default function KidApp({ authUser, onExit }) {
  const initial = loadKidLocal();
  const [profile, setProfile] = useState(initial.profile || {});
  const [progress, setProgress] = useState(initial.progress || {});
  const [vakOrder, setVakOrder] = useState(initial.vakorder || Object.keys(D.vakken));
  const [vakkenMeta, setVakkenMeta] = useState(D.vakken);
  const [screen, setScreen] = useState('loading');
  const [active, setActive] = useState(null); // current vak-node
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizSource, setQuizSource] = useState('none');
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState('');

  const leerjaar = profile.leerjaar || DEFAULT_LEERJAAR;
  const googleNaam = authUser?.user_metadata?.full_name || '';

  // Hydrate profiel + voortgang vanuit Supabase.
  useEffect(() => {
    let cancelled = false;
    if (!supabaseEnabled) {
      setScreen(initial.profile?.naam ? 'home' : 'profiel');
      return;
    }
    pullKidState().then((remote) => {
      if (cancelled) return;
      if (remote?.profile && remote.profile.naam) {
        setProfile((p) => ({ ...p, ...remote.profile }));
        if (remote.progress && Object.keys(remote.progress).length) {
          setProgress((p) => ({ ...p, ...remote.progress }));
        }
        setScreen('home');
      } else {
        setScreen('profiel');
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Vakken-metadata + volgorde laden zodra het leerjaar bekend is.
  useEffect(() => {
    let cancelled = false;
    if (!supabaseEnabled) return;
    if (!profile.leerjaar) return;
    listVakken(profile.leerjaar).then((vk) => {
      if (cancelled || !vk?.length) return;
      const activeVakken = vk.filter((v) => v.active);
      const meta = { ...D.vakken };
      for (const v of activeVakken) {
        meta[v.key] = {
          ...(meta[v.key] || {}),
          naam: v.naam,
          kleur: v.kleur,
          tint: v.tint,
          icon: v.icon,
          test_date: v.test_date,
          quiz_size: v.quiz_size ?? 10,
          teacher: meta[v.key]?.teacher || 'ann'
        };
      }
      setVakkenMeta(meta);
      const order = activeVakken.map((v) => v.key);
      if (order.length) {
        setVakOrder(order);
        saveKidVakOrder(order);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [profile.leerjaar]);

  // Voortgang persisteren bij elke wijziging.
  useEffect(() => {
    saveKidProgress(progress);
  }, [progress]);

  // Eén bubbel per vak — de "stroom" van leerjaar.
  // Status: 'done' (al gespeeld), 'now' (eerstvolgende onaangetaste), 'todo' (rest).
  const streamNodes = useMemo(() => {
    let foundNow = false;
    return vakOrder
      .map((vakKey) => {
        const vi = vakkenMeta[vakKey];
        if (!vi) return null;
        const stars = progress[vakKey] || 0;
        const played = stars > 0 || progress[vakKey] === 0;
        let status;
        if (played) status = 'done';
        else if (!foundNow) {
          status = 'now';
          foundNow = true;
        } else status = 'todo';
        return {
          id: `vak-${vakKey}`,
          vak: vakKey,
          titel: vi.naam,
          stars,
          status
        };
      })
      .filter(Boolean);
  }, [vakOrder, vakkenMeta, progress]);

  const totalStars = Object.values(progress).reduce((s, v) => s + (v || 0), 0);
  const badges = Object.values(progress).filter((v) => v === 3).length;

  const saveProfile = (p) => {
    const np = { ...profile, ...p };
    setProfile(np);
    saveKidProfile(np);
    setScreen('home');
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  const openNode = async (n) => {
    setActive(n);
    setScreen('loading_quiz');
    const size = vakkenMeta[n.vak]?.quiz_size || 10;
    try {
      const { vragen, source } = await loadQuizForVak({ leerjaar, vak: n.vak, size });
      if (!vragen || vragen.length === 0) {
        showToast('Nog geen vragen voor dit vak.');
        setActive(null);
        setScreen('home');
        return;
      }
      setQuizQuestions(vragen);
      setQuizSource(source);
      setScreen('quiz');
    } catch (e) {
      showToast('Kon kwis niet laden.');
      console.warn('[quiz] load error:', e);
      setActive(null);
      setScreen('home');
    }
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
    // LAATSTE ronde wint — niet best-ever.
    setProgress((prev) => ({ ...prev, [active.vak]: sterren }));
    setResult({ ...res });
  };

  const vakInfoOf = (n) => vakkenMeta[n.vak] || D.vakken[n.vak];
  const teacherOf = (n) => {
    const vi = vakInfoOf(n);
    return D.teachers[vi?.teacher] || D.teachers.ann;
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (screen === 'loading') {
    return (
      <div className="screen" style={{ background: 'var(--cream)', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>Bezig met laden…</span>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {screen === 'profiel' && (
        <ProfileScreen
          profile={profile}
          firstRun={!profile.naam}
          suggestedNaam={googleNaam}
          totalStars={totalStars}
          badges={badges}
          onSave={saveProfile}
          onClose={() => setScreen('home')}
          onSignOut={handleSignOut}
        />
      )}
      {screen === 'home' && (
        <WaterfallMap
          profile={profile}
          leerjaar={leerjaar}
          nodes={streamNodes}
          totalStars={totalStars}
          vakken={vakkenMeta}
          onOpenNode={openNode}
          onProfiel={() => setScreen('profiel')}
        />
      )}
      {screen === 'loading_quiz' && (
        <div className="screen" style={{ background: 'var(--cream)', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>Vragen laden…</span>
        </div>
      )}
      {screen === 'quiz' && active && !result && (
        <QuizEngine
          vragen={quizQuestions}
          vak={active.vak}
          vakInfo={vakInfoOf(active)}
          onDone={finishQuiz}
          onClose={() => {
            setActive(null);
            setQuizQuestions([]);
            setScreen('home');
          }}
        />
      )}
      {screen === 'quiz' && result && (
        <ResultScreen
          result={result}
          onReview={() => setScreen('theorie')}
          onRetry={async () => {
            setResult(null);
            // Nieuwe random batch trekken voor "opnieuw spelen".
            if (active) await openNode(active);
          }}
          onHome={() => {
            setResult(null);
            setActive(null);
            setQuizQuestions([]);
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
          🎓 Naar leerkracht
        </button>
      )}
    </div>
  );
}
