// SafeBuddy v5 — Demo mission + reduced TTS + simplified voice lines
// Tickets: P0.1, P0.2, P0.3, P2.1, P2.2
//
// npx expo install expo-speech @react-native-async-storage/async-storage

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  SafeAreaView, ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from 'react-native';

// ── SCREEN TYPE (P2.1) ────────────────────────────────────────────────────────
// type Screen = 'home' | 'demo' | 'demo_step' | 'pick' | 'active' | 'celebrate' | 'rewards'

// ── STORAGE ───────────────────────────────────────────────────────────────────

const K = {
  STARS:           'sb_stars_v2',
  TOTAL_EVER:      'sb_total_v2',
  COMPLETED_TODAY: 'sb_today_v2',
  LAST_DATE:       'sb_date_v2',
  DEMO_DONE:       'sb_demo_done',   // has child completed demo at least once?
};

// ── DATA ──────────────────────────────────────────────────────────────────────

// P0.1 — Demo steps (always easy, always win)
const DEMO_STEPS = [
  { id: 'd1', title: 'Хлопни в ладоши',  emoji: '👏', praise: 'Отлично!' },
  { id: 'd2', title: 'Прыгни!',           emoji: '🦘', praise: 'Супер!' },
  { id: 'd3', title: 'Коснись носа',      emoji: '👃', praise: 'Молодец!' },
];

// P1.2 — Easy missions always shown first to new users
const MISSIONS_EASY = [
  { id: 1, title: 'Постой на одной ноге',   subtitle: 'Держись 5 секунд', stars: 1, emoji: '🦩' },
  { id: 2, title: 'Потянись к пальцам ног', subtitle: 'Медленно вниз',    stars: 1, emoji: '🙆' },
  { id: 3, title: 'Прыгни три раза',        subtitle: 'Как можно выше',   stars: 1, emoji: '🦘' },
  { id: 4, title: 'Выпей стакан воды',      subtitle: 'Не спеши',         stars: 1, emoji: '💧' },
];

const MISSIONS_BIGGER = [
  { id: 5, title: 'Убери игрушки',       subtitle: 'Хотя бы один уголок', stars: 2, emoji: '🧸' },
  { id: 6, title: 'Обними кого-нибудь',  subtitle: 'Подари тепло',        stars: 2, emoji: '💛' },
];

const REWARDS = [
  { id: 1, title: 'Дополнительный мультик',         cost: 3, emoji: '📺' },
  { id: 2, title: 'Выбрать ужин сегодня',            cost: 4, emoji: '🍕' },
  { id: 3, title: 'Лечь спать на 30 минут позже',    cost: 5, emoji: '🌙' },
  { id: 4, title: 'Любимый перекус',                 cost: 3, emoji: '🍭' },
  { id: 5, title: 'Игра с папой',                    cost: 2, emoji: '🎮' },
];

// P0.3 — Simplified voice lines (1–2 max per state, repetition builds trust)
const MSG = {
  idle:     'Привет! Нажми на меня',
  start:    'Давай вместе!',
  done:     'Молодец!',
  reward:   'Посмотри сколько звёзд!',
  demo_end: 'Хочешь попробовать настоящую миссию?',
  idle_alt: 'Я рядом',  // P1.3 idle presence — used occasionally
};

// ── MILESTONES ────────────────────────────────────────────────────────────────

const MILESTONES = [5, 10, 20, 35, 50, 75, 100, 150, 200];

// ── HELPERS ───────────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().split('T')[0];

function getProgress(total) {
  const next = MILESTONES.find(m => m > total) ?? MILESTONES[MILESTONES.length - 1] * 2;
  let prev = 0;
  for (const m of [0, ...MILESTONES]) { if (m <= total) prev = m; else break; }
  const pct = next === prev ? 1 : Math.min((total - prev) / (next - prev), 1);
  return { next, pct };
}

// ── TTS (P0.2 — speak only on explicit tap, not auto) ─────────────────────────

async function resolveRussianVoice() {
  try {
    await new Promise(r => setTimeout(r, 800));
    const voices = await Speech.getAvailableVoicesAsync();
    if (!voices || voices.length === 0) return null;
    return (
      voices.find(v => v.language === 'ru-RU' && v.quality === Speech.VoiceQuality?.Enhanced) ||
      voices.find(v => v.language?.startsWith('ru')) ||
      null
    );
  } catch { return null; }
}

function useSpeech() {
  const voiceRef = useRef(null);

  useEffect(() => {
    resolveRussianVoice().then(v => { voiceRef.current = v; });
    return () => { try { Speech.stop(); } catch {} };
  }, []);

  // P0.2 — only called on explicit tap, never auto
  const speak = useCallback((text) => {
    if (!text) return;
    try { Speech.stop(); } catch {}
    const opts = {
      language: 'ru-RU',
      pitch: 1.05,
      rate: Platform.OS === 'ios' ? 0.52 : 0.85,
    };
    if (voiceRef.current?.identifier) opts.voice = voiceRef.current.identifier;
    setTimeout(() => {
      try { Speech.speak(text, opts); } catch (e) { console.log('TTS:', e); }
    }, Platform.OS === 'ios' ? 120 : 0);
  }, []);

  return speak;
}

// ── COMPONENTS ────────────────────────────────────────────────────────────────

// P0.5 — Tap animation on Buddy (scale on press)
function Buddy({ mood = 'happy', speak }) {
  const scale = useRef(new Animated.Value(1)).current;

  const faces = { happy: '😊', excited: '🤩', proud: '😄', calm: '🙂', demo: '👀' };
  // TODO P0.4: replace with <Image source={require('./assets/buddy-' + mood + '.png')} />

  function handlePress() {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.12, duration: 100, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1.0,  duration: 150, useNativeDriver: true }),
    ]).start();
    speak(MSG[mood] || MSG.idle);
  }

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={1}>
      <Animated.View style={[s.buddy, { transform: [{ scale }] }]}>
        <Text style={s.buddyFace}>{faces[mood] || '😊'}</Text>
        <Text style={s.buddyName}>Бадди</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// Speakable text — tap to hear (P0.2: explicit only)
function T({ children, style, speak }) {
  if (!children) return null;
  const str = typeof children === 'string' ? children : String(children);
  return (
    <TouchableOpacity onPress={() => speak(str)} activeOpacity={0.65}>
      <Text style={style}>{children}</Text>
    </TouchableOpacity>
  );
}

function ProgressBar({ total, speak }) {
  const { next, pct } = getProgress(total);
  const fillPct = `${Math.round(pct * 100)}%`;
  const label = `У тебя ${total} звёзд. До цели: ${next}`;
  return (
    <TouchableOpacity style={s.pbWrap} onPress={() => speak(label)} activeOpacity={0.75}>
      <View style={s.pbRow}>
        <Text style={s.pbStars}>⭐ {total}</Text>
        <Text style={s.pbTarget}>цель {next} ⭐</Text>
      </View>
      <View style={s.pbTrack}>
        <View style={[s.pbFill, { width: fillPct }]} />
      </View>
    </TouchableOpacity>
  );
}

// ── SCREENS ───────────────────────────────────────────────────────────────────

// P0.1 — Demo intro screen
function DemoIntroScreen({ onStart, onSkip, speak }) {
  return (
    <View style={s.screen}>
      <Buddy mood="demo" speak={speak} />
      <T style={s.msg} speak={speak}>Давай попробуем вместе!</T>
      <T style={s.sub} speak={speak}>Три простых задания — просто для fun!</T>
      <TouchableOpacity style={s.btnPrimary} onPress={onStart}>
        <Text style={s.btnPrimaryTxt}>▶ Попробовать</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btnSkip} onPress={onSkip}>
        <Text style={s.btnSkipTxt}>Пропустить</Text>
      </TouchableOpacity>
    </View>
  );
}

// P0.1 — Single demo step
function DemoStepScreen({ step, stepIndex, total, onDone, speak }) {
  const [done, setDone] = useState(false);

  function handleDone() {
    setDone(true);
    speak(step.praise);
    setTimeout(onDone, 900);
  }

  return (
    <View style={s.screen}>
      <Buddy mood={done ? 'proud' : 'excited'} speak={speak} />
      <View style={s.stepCounter}>
        {Array(total).fill(0).map((_, i) => (
          <View key={i} style={[s.stepDot, i <= stepIndex && s.stepDotActive]} />
        ))}
      </View>
      <TouchableOpacity
        style={s.demoCard}
        onPress={() => speak(`${step.title}`)}
        activeOpacity={0.85}
      >
        <Text style={s.demoEmoji}>{step.emoji}</Text>
        <Text style={s.demoTitle}>{step.title}</Text>
        <Text style={s.tapHint}>нажми чтобы услышать</Text>
      </TouchableOpacity>
      {!done ? (
        <TouchableOpacity style={s.btnPrimary} onPress={handleDone}>
          <Text style={s.btnPrimaryTxt}>✅ Сделал!</Text>
        </TouchableOpacity>
      ) : (
        <View style={s.praiseRow}>
          <Text style={s.praiseText}>{step.praise} 🎉</Text>
        </View>
      )}
    </View>
  );
}

// P0.1 — Demo complete, offer real mission
function DemoCompleteScreen({ onYes, onLater, speak }) {
  return (
    <View style={s.screen}>
      <Buddy mood="proud" speak={speak} />
      <Text style={s.celebTitle}>Отлично! Всё получилось! 🎉</Text>
      <T style={s.msg} speak={speak}>{MSG.demo_end}</T>
      <TouchableOpacity style={s.btnPrimary} onPress={onYes}>
        <Text style={s.btnPrimaryTxt}>🚀 Да!</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btnSecondary} onPress={onLater}>
        <Text style={s.btnSecondaryTxt}>⏳ Потом</Text>
      </TouchableOpacity>
    </View>
  );
}

function HomeScreen({ stars, totalEver, completedToday, onStart, onRewards, speak }) {
  // P1.3 — idle presence: show alt message occasionally
  const [idleMsg] = useState(() => Math.random() > 0.7 ? MSG.idle_alt : MSG.idle);
  return (
    <View style={s.screen}>
      <ProgressBar total={totalEver} speak={speak} />
      <Buddy mood="happy" speak={speak} />
      <T style={s.msg} speak={speak}>{idleMsg}</T>
      {completedToday > 0 && (
        <T style={s.sub} speak={speak}>{`Сегодня: ${completedToday} миссии`}</T>
      )}
      <TouchableOpacity style={s.btnPrimary} onPress={onStart}>
        <Text style={s.btnPrimaryTxt}>🚀 Выбрать миссию</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btnSecondary} onPress={onRewards}>
        <Text style={s.btnSecondaryTxt}>🎁 Мои награды</Text>
      </TouchableOpacity>
    </View>
  );
}

function MissionPickScreen({ onPick, onBack, speak, firstTime }) {
  // P1.2 — first real mission: show only easy missions
  const easy   = MISSIONS_EASY;
  const bigger = firstTime ? [] : MISSIONS_BIGGER;

  return (
    <ScrollView contentContainerStyle={s.scroll}>
      <T style={s.pageTitle} speak={speak}>Выбери миссию</T>
      <T style={s.tier} speak={speak}>Лёгкие — одна звезда</T>
      {easy.map(m => (
        <TouchableOpacity
          key={m.id} style={s.mCard}
          onPress={() => onPick(m)}
          onLongPress={() => speak(`${m.title}. ${m.subtitle}`)}
        >
          <Text style={s.mEmoji}>{m.emoji}</Text>
          <View style={s.mInfo}>
            <Text style={s.mTitle}>{m.title}</Text>
            <Text style={s.mSub}>{m.subtitle}</Text>
          </View>
          <Text style={s.mStar}>⭐</Text>
        </TouchableOpacity>
      ))}
      {bigger.length > 0 && (
        <>
          <T style={s.tier} speak={speak}>Большие — две звезды</T>
          {bigger.map(m => (
            <TouchableOpacity
              key={m.id} style={[s.mCard, s.mCardBig]}
              onPress={() => onPick(m)}
              onLongPress={() => speak(`${m.title}. ${m.subtitle}`)}
            >
              <Text style={s.mEmoji}>{m.emoji}</Text>
              <View style={s.mInfo}>
                <Text style={s.mTitle}>{m.title}</Text>
                <Text style={s.mSub}>{m.subtitle}</Text>
              </View>
              <Text style={s.mStar}>⭐⭐</Text>
            </TouchableOpacity>
          ))}
        </>
      )}
      <T style={s.hint} speak={speak}>Удержи карточку, чтобы услышать</T>
      <TouchableOpacity style={s.btnBack} onPress={onBack}>
        <Text style={s.btnBackTxt}>← Назад</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function ActiveScreen({ mission, onDone, onSkip, speak }) {
  if (!mission) return null; // P2.2 guard
  return (
    <View style={s.screen}>
      <Buddy mood="excited" speak={speak} />
      <T style={s.msg} speak={speak}>{MSG.start}</T>
      <TouchableOpacity
        style={s.activeCard}
        onPress={() => speak(`${mission.title}. ${mission.subtitle}`)}
        activeOpacity={0.85}
      >
        <Text style={s.activeEmoji}>{mission.emoji}</Text>
        <Text style={s.activeTitle}>{mission.title}</Text>
        <Text style={s.activeSub}>{mission.subtitle}</Text>
        <View style={s.starsRow}>
          {Array(mission.stars).fill('⭐').map((_, i) => <Text key={i} style={s.starBig}>⭐</Text>)}
        </View>
        <Text style={s.tapHint}>нажми чтобы услышать ещё раз</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btnPrimary} onPress={onDone}>
        <Text style={s.btnPrimaryTxt}>✅ Я сделал!</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btnSkip} onPress={onSkip}>
        <Text style={s.btnSkipTxt}>Пропустить</Text>
      </TouchableOpacity>
    </View>
  );
}

function CelebrateScreen({ mission, stars, totalEver, onContinue, onRewards, speak }) {
  if (!mission) return null; // P2.2 guard
  return (
    <View style={s.screen}>
      <ProgressBar total={totalEver} speak={speak} />
      <Buddy mood="proud" speak={speak} />
      <T style={s.celebTitle} speak={speak}>Миссия выполнена! 🎉</T>
      <TouchableOpacity
        style={s.earnedCard}
        onPress={() => speak(MSG.done)}
        activeOpacity={0.85}
      >
        <Text style={s.earnedEmoji}>{mission.emoji}</Text>
        <Text style={s.earnedName}>{mission.title}</Text>
        <Text style={s.earnedStars}>{Array(mission.stars).fill('⭐').join(' ')}</Text>
        <Text style={s.earnedTotal}>Всего: ⭐ {stars}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btnPrimary} onPress={onContinue}>
        <Text style={s.btnPrimaryTxt}>🚀 Ещё миссию!</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btnSecondary} onPress={onRewards}>
        <Text style={s.btnSecondaryTxt}>🎁 Посмотреть награды</Text>
      </TouchableOpacity>
    </View>
  );
}

function RewardsScreen({ stars, totalEver, onBack, speak }) {
  return (
    <ScrollView contentContainerStyle={s.scroll}>
      <ProgressBar total={totalEver} speak={speak} />
      <Buddy mood="happy" speak={speak} />
      <T style={s.pageTitle} speak={speak}>Твои награды</T>
      {REWARDS.map(r => {
        const can = stars >= r.cost;
        // P1.1 — softer language
        const statusText = can
          ? `${r.title}. Готово!`
          : `${r.title}. Ещё немного — и готово`;
        return (
          <TouchableOpacity
            key={r.id}
            style={[s.rCard, !can && s.rLocked]}
            onPress={() => speak(statusText)}
            activeOpacity={0.7}
          >
            <Text style={s.rEmoji}>{r.emoji}</Text>
            <View style={s.rInfo}>
              <Text style={s.rTitle}>{r.title}</Text>
              <Text style={s.rCost}>{Array(r.cost).fill('⭐').join('')}</Text>
            </View>
            {/* P1.1 — "ещё немного" instead of "нужно ещё N звёзд" */}
            {can
              ? <Text style={s.rReady}>Готово!</Text>
              : <Text style={s.rNeed}>ещё немного</Text>
            }
          </TouchableOpacity>
        );
      })}
      <T style={s.hint} speak={speak}>Попроси папу или маму разблокировать</T>
      <TouchableOpacity style={s.btnBack} onPress={onBack}>
        <Text style={s.btnBackTxt}>← Назад</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [ready,          setReady]          = useState(false);
  const [screen,         setScreen]         = useState('home');
  const [demoStep,       setDemoStep]       = useState(0);
  const [demoDone,       setDemoDone]       = useState(false);
  const [stars,          setStars]          = useState(0);
  const [totalEver,      setTotalEver]      = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const [mission,        setMission]        = useState(null);
  const [firstMission,   setFirstMission]   = useState(true);
  const speak = useSpeech();

  // Load
  useEffect(() => {
    (async () => {
      try {
        const [sv, tv, cv, dv, ddv] = await Promise.all([
          AsyncStorage.getItem(K.STARS),
          AsyncStorage.getItem(K.TOTAL_EVER),
          AsyncStorage.getItem(K.COMPLETED_TODAY),
          AsyncStorage.getItem(K.LAST_DATE),
          AsyncStorage.getItem(K.DEMO_DONE),
        ]);
        const today  = todayStr();
        const newDay = dv !== today;
        const st     = sv  ? parseInt(sv,  10) : 0;
        const tot    = tv  ? parseInt(tv,  10) : (sv ? parseInt(sv, 10) : 0);
        const comp   = newDay ? 0 : (cv ? parseInt(cv, 10) : 0);
        const dd     = ddv === 'true';

        setStars(st);
        setTotalEver(tot);
        setCompletedToday(comp);
        setDemoDone(dd);
        setFirstMission(comp === 0 && st === 0);

        // P0.1 — show demo on first ever launch
        if (!dd) setScreen('demo_intro');

        if (newDay) {
          await AsyncStorage.multiSet([[K.LAST_DATE, today], [K.COMPLETED_TODAY, '0']]);
        }
      } catch (e) {
        console.log('Load error', e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // Persist stars
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.multiSet([[K.STARS, String(stars)], [K.TOTAL_EVER, String(totalEver)]]).catch(console.log);
  }, [stars, totalEver, ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(K.COMPLETED_TODAY, String(completedToday)).catch(console.log);
  }, [completedToday, ready]);

  // Demo handlers
  function handleDemoStepDone() {
    if (demoStep < DEMO_STEPS.length - 1) {
      setDemoStep(i => i + 1);
    } else {
      setScreen('demo_complete');
    }
  }

  async function handleDemoFinish() {
    await AsyncStorage.setItem(K.DEMO_DONE, 'true');
    setDemoDone(true);
  }

  function pickMission(m) {
    setMission(m);
    speak(`${m.title}. ${m.subtitle}`);
    setScreen('active');
  }

  function completeMission() {
    if (!mission) return; // P2.2
    setStars(n    => n + mission.stars);
    setTotalEver(n => n + mission.stars);
    setCompletedToday(n => n + 1);
    setFirstMission(false);
    setScreen('celebrate');
  }

  if (!ready) {
    return (
      <SafeAreaView style={[s.root, s.center]}>
        <ActivityIndicator size="large" color={C.green} />
      </SafeAreaView>
    );
  }

  const p = { speak, stars, totalEver };

  return (
    <SafeAreaView style={s.root}>

      {screen === 'demo_intro' && (
        <DemoIntroScreen
          speak={speak}
          onStart={() => { setDemoStep(0); setScreen('demo_step'); }}
          onSkip={async () => { await handleDemoFinish(); setScreen('home'); }}
        />
      )}

      {screen === 'demo_step' && (
        <DemoStepScreen
          speak={speak}
          step={DEMO_STEPS[demoStep]}
          stepIndex={demoStep}
          total={DEMO_STEPS.length}
          onDone={handleDemoStepDone}
        />
      )}

      {screen === 'demo_complete' && (
        <DemoCompleteScreen
          speak={speak}
          onYes={async () => { await handleDemoFinish(); setScreen('pick'); }}
          onLater={async () => { await handleDemoFinish(); setScreen('home'); }}
        />
      )}

      {screen === 'home' && (
        <HomeScreen
          {...p}
          completedToday={completedToday}
          onStart={() => setScreen('pick')}
          onRewards={() => setScreen('rewards')}
        />
      )}

      {screen === 'pick' && (
        <MissionPickScreen
          {...p}
          firstTime={firstMission}
          onPick={pickMission}
          onBack={() => setScreen('home')}
        />
      )}

      {screen === 'active' && (
        <ActiveScreen
          {...p}
          mission={mission}
          onDone={completeMission}
          onSkip={() => { setMission(null); setScreen('home'); }}
        />
      )}

      {screen === 'celebrate' && (
        <CelebrateScreen
          {...p}
          mission={mission}
          onContinue={() => setScreen('pick')}
          onRewards={() => setScreen('rewards')}
        />
      )}

      {screen === 'rewards' && (
        <RewardsScreen
          {...p}
          onBack={() => setScreen('home')}
        />
      )}

    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const C = {
  bg:      '#F7F6F2',
  white:   '#FFFFFF',
  green:   '#1D6B4F',
  greenLt: '#E1F5EE',
  text:    '#1A1A18',
  muted:   '#6B6B68',
  border:  '#E5E5E2',
  track:   '#D8D8D4',
  gold:    '#FFF8E7',
  goldBdr: '#F59E0B',
};

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  scroll: { alignItems: 'center', padding: 20, paddingBottom: 52 },

  // Progress bar
  pbWrap:   { width: '100%', backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 14 },
  pbRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  pbStars:  { fontSize: 15, fontWeight: '700', color: C.green },
  pbTarget: { fontSize: 13, color: C.muted },
  pbTrack:  { height: 10, backgroundColor: C.track, borderRadius: 5, overflow: 'hidden' },
  pbFill:   { height: 10, backgroundColor: C.green, borderRadius: 5, minWidth: 8 },

  // Buddy
  buddy:     { alignItems: 'center', marginBottom: 4, padding: 8 },
  buddyFace: { fontSize: 66 },
  buddyName: { fontSize: 12, color: C.muted, marginTop: 2, fontWeight: '500' },

  // Text
  msg:       { fontSize: 17, color: C.text, textAlign: 'center', marginVertical: 8, lineHeight: 25, paddingHorizontal: 8 },
  sub:       { fontSize: 13, color: C.muted, marginBottom: 6, textAlign: 'center' },
  pageTitle: { fontSize: 21, fontWeight: '700', color: C.text, marginBottom: 14, alignSelf: 'flex-start' },
  tier:      { fontSize: 12, fontWeight: '600', color: C.muted, alignSelf: 'flex-start', marginTop: 10, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  hint:      { fontSize: 11, color: C.muted, marginTop: 8, textAlign: 'center', fontStyle: 'italic' },
  tapHint:   { fontSize: 11, color: C.muted, marginTop: 10, fontStyle: 'italic' },
  celebTitle:{ fontSize: 24, fontWeight: '800', color: C.green, marginBottom: 4, textAlign: 'center' },

  // Buttons
  btnPrimary:    { backgroundColor: C.green, borderRadius: 16, paddingVertical: 17, paddingHorizontal: 32, marginTop: 10, width: '100%', alignItems: 'center' },
  btnPrimaryTxt: { fontSize: 19, color: '#fff', fontWeight: '700' },
  btnSecondary:    { backgroundColor: C.gold, borderRadius: 16, borderWidth: 1, borderColor: C.goldBdr, paddingVertical: 15, paddingHorizontal: 32, marginTop: 8, width: '100%', alignItems: 'center' },
  btnSecondaryTxt: { fontSize: 17, color: '#92400E', fontWeight: '600' },
  btnSkip:    { marginTop: 10, padding: 12 },
  btnSkipTxt: { fontSize: 15, color: C.muted },
  btnBack:    { marginTop: 18, padding: 12 },
  btnBackTxt: { fontSize: 15, color: C.green, fontWeight: '500' },

  // Demo
  stepCounter: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  stepDot:     { width: 10, height: 10, borderRadius: 5, backgroundColor: C.border },
  stepDotActive: { backgroundColor: C.green },
  demoCard:    { backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 32, alignItems: 'center', width: '100%', marginVertical: 12 },
  demoEmoji:   { fontSize: 64, marginBottom: 12 },
  demoTitle:   { fontSize: 22, fontWeight: '700', color: C.text, textAlign: 'center' },
  praiseRow:   { marginTop: 16, alignItems: 'center' },
  praiseText:  { fontSize: 24, fontWeight: '800', color: C.green },

  // Mission cards
  mCard:    { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 13, marginBottom: 7, width: '100%' },
  mCardBig: { backgroundColor: C.gold, borderColor: C.goldBdr },
  mEmoji:   { fontSize: 30, marginRight: 11 },
  mInfo:    { flex: 1 },
  mTitle:   { fontSize: 15, fontWeight: '600', color: C.text },
  mSub:     { fontSize: 12, color: C.muted, marginTop: 2 },
  mStar:    { fontSize: 17 },

  // Active
  activeCard:  { backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 26, alignItems: 'center', width: '100%', marginVertical: 12 },
  activeEmoji: { fontSize: 58, marginBottom: 10 },
  activeTitle: { fontSize: 22, fontWeight: '700', color: C.text, textAlign: 'center' },
  activeSub:   { fontSize: 14, color: C.muted, marginTop: 5, textAlign: 'center' },
  starsRow:    { flexDirection: 'row', marginTop: 12, gap: 4 },
  starBig:     { fontSize: 24 },

  // Celebrate
  earnedCard:  { backgroundColor: C.greenLt, borderRadius: 20, padding: 22, alignItems: 'center', width: '100%', marginVertical: 12 },
  earnedEmoji: { fontSize: 44, marginBottom: 6 },
  earnedName:  { fontSize: 16, fontWeight: '600', color: C.green },
  earnedStars: { fontSize: 26, marginTop: 6 },
  earnedTotal: { fontSize: 14, color: C.green, marginTop: 4, fontWeight: '500' },

  // Rewards
  rCard:   { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 13, marginBottom: 7, width: '100%' },
  rLocked: { opacity: 0.42 },
  rEmoji:  { fontSize: 29, marginRight: 11 },
  rInfo:   { flex: 1 },
  rTitle:  { fontSize: 15, fontWeight: '600', color: C.text },
  rCost:   { fontSize: 12, color: C.muted, marginTop: 2 },
  rReady:  { fontSize: 13, color: C.green, fontWeight: '700' },
  rNeed:   { fontSize: 11, color: C.muted, textAlign: 'right' },
});