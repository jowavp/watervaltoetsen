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
import { listCategories, countQuestionsPerCategory } from '../../lib/categories.js';
import { loadQuizForCategory, loadQuizForVak } from '../../lib/quiz.js';
import { signOut, supabaseEnabled } from '../../lib/supabase.js';
import ProfileScreen from './ProfileScreen.jsx';
import WaterfallMap from './WaterfallMap.jsx';
import QuizEngine from './QuizEngine.jsx';
import ResultScreen from './ResultScreen.jsx';
import TheoryScreen from './TheoryScreen.jsx';

const DEFAULT_LEERJAAR = 5;
const NULL_CATEGORY_ID = '__null__'; // sentinel voor de "Algemeen"-bucket

export default function KidApp({ authUser, onExit }) {
  const initial = loadKidLocal();
  const [profile, setProfile] = useState(initial.profile || {});
  const [progress, setProgress] = useState(initial.progress || {});
  const [vakOrder, setVakOrder] = useState(initial.vakorder || Object.keys(D.vakken));
  const [vakkenMeta, setVakkenMeta] = useState(D.vakken);
  // categories: array van { id, vak, naam, sort_order } — incl. virtuele "Algemeen"
  const [categories, setCategories] = useState([]);
  // counts per (vak, category) — sleutel `${vak}::${categoryId}`
  const [catCounts, setCatCounts] = useState({});
  const [screen, setScreen] = useState('loading');
  const [active, setActive] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState('');

  const leerjaar = profile.leerjaar || DEFAULT_LEERJAAR;
  const googleNaam = authUser?.user_metadata?.full_name || '';

  // Hydrate profiel + voortgang.
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

  // Vakken + categorieën laden zodra leerjaar bekend is.
  useEffect(() => {
    let cancelled = false;
    if (!supabaseEnabled || !profile.leerjaar) return;

    (async () => {
      const vk = await listVakken(profile.leerjaar);
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
      const order = activeVakken.map((v) => v.key);

      // Categorieën per vak + counts ophalen.
      const cats = [];
      const counts = {};
      for (const v of activeVakken) {
        const [catList, perCat] = await Promise.all([
          listCategories({ leerjaar: profile.leerjaar, vak: v.key }),
          countQuestionsPerCategory({ leerjaar: profile.leerjaar, vak: v.key })
        ]);
        for (const c of catList) {
          if (!c.active) continue;
          cats.push({ id: c.id, vak: v.key, naam: c.naam, sort_order: c.sort_order });
          counts[`${v.key}::${c.id}`] = perCat[c.id] || 0;
        }
        // "Algemeen" bucket voor null-category questions, enkel als er vragen zijn.
        if ((perCat._null || 0) > 0) {
          cats.push({ id: NULL_CATEGORY_ID, vak: v.key, naam: 'Algemeen', sort_order: 9999 });
          counts[`${v.key}::${NULL_CATEGORY_ID}`] = perCat._null;
        }
      }

      if (cancelled) return;
      setVakkenMeta(meta);
      setCategories(cats);
      setCatCounts(counts);
      if (order.length) {
        setVakOrder(order);
        saveKidVakOrder(order);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile.leerjaar]);

  useEffect(() => {
    saveKidProgress(progress);
  }, [progress]);

  // Eén bubbel per categorie, gegroepeerd op vak-volgorde.
  const streamNodes = useMemo(() => {
    if (categories.length === 0) {
      // Eerste laad of geen categorieën nog — toon één vak-bubbel per actief vak.
      let foundNow = false;
      return vakOrder
        .map((vakKey) => {
          const vi = vakkenMeta[vakKey];
          if (!vi) return null;
          const progressKey = `vak:${vakKey}`;
          const stars = progress[progressKey] || 0;
          const played = progress[progressKey] != null;
          let status;
          if (played) status = 'done';
          else if (!foundNow) {
            status = 'now';
            foundNow = true;
          } else status = 'todo';
          return {
            id: progressKey,
            vak: vakKey,
            categoryId: null,
            titel: vi.naam,
            stars,
            status
          };
        })
        .filter(Boolean);
    }

    // Sorteer eerst op vak-volgorde, dan op sort_order binnen vak.
    const ordered = [...categories].sort((a, b) => {
      const oa = vakOrder.indexOf(a.vak);
      const ob = vakOrder.indexOf(b.vak);
      if (oa !== ob) return oa - ob;
      return (a.sort_order || 0) - (b.sort_order || 0);
    });

    let foundNow = false;
    return ordered.map((c) => {
      const progressKey = `cat:${c.id}`;
      const stars = progress[progressKey] || 0;
      const played = progress[progressKey] != null;
      let status;
      if (played) status = 'done';
      else if (!foundNow) {
        status = 'now';
        foundNow = true;
      } else status = 'todo';
      return {
        id: progressKey,
        vak: c.vak,
        categoryId: c.id === NULL_CATEGORY_ID ? null : c.id,
        titel: c.naam,
        stars,
        status
      };
    });
  }, [categories, vakOrder, vakkenMeta, progress]);

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
    const vakQuizSize = vakkenMeta[n.vak]?.quiz_size || 10;
    try {
      let res;
      if (categories.length === 0) {
        // Geen categorieën beschikbaar: trek vak-brede kwis.
        res = await loadQuizForVak({ leerjaar, vak: n.vak, size: vakQuizSize });
      } else {
        res = await loadQuizForCategory({
          leerjaar,
          vak: n.vak,
          categoryId: n.categoryId,
          vakQuizSize
        });
      }
      const { vragen } = res || {};
      if (!vragen || vragen.length === 0) {
        showToast('Nog geen vragen hier — vraag aan je leerkracht.');
        setActive(null);
        setScreen('home');
        return;
      }
      setQuizQuestions(vragen);
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
    setProgress((prev) => ({ ...prev, [active.id]: sterren }));
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
