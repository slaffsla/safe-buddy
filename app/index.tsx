// SafeBuddy MVP — Fixed TTS + Progress Bar + AsyncStorage
// npx expo install expo-speech @react-native-async-storage/async-storage

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Platform,
  SafeAreaView, ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from 'react-native';

// ── STORAGE KEYS ──────────────────────────────────────────────────────────────

const K = {
  STARS:           'sb_stars_v2',
  TOTAL_EVER:      'sb_total_v2',
  COMPLETED_TODAY: 'sb_today_v2',
  LAST_DATE:       'sb_date_v2',
};

// ── DATA ──────────────────────────────────────────────────────────────────────

const MISSIONS = [
  { id: 1, title: 'Постой на одной ноге',     subtitle: 'Держись 5 секунд!',       stars: 1, emoji: '🦩' },
  { id: 2, title: 'Потянись к пальцам ног',   subtitle: 'Медленно наклонись вниз', stars: 1, emoji: '🙆' },
  { id: 3, title: 'Прыгни три раза',          subtitle: 'Как можно выше!',         stars: 1, emoji: '🦘' },
  { id: 4, title: 'Выпей стакан воды',        subtitle: 'Не спеши, пей медленно',  stars: 1, emoji: '💧' },
  { id: 5, title: 'Убери игрушки',            subtitle: 'Хотя бы один уголок',     stars: 2, emoji: '🧸' },
  { id: 6, title: 'Обними кого-нибудь',       subtitle: 'Подари тепло!',           stars: 2, emoji: '💛' },
];

const REWARDS = [
  { id: 1, title: 'Дополнительный мультик',        cost: 3, emoji: '📺' },
  { id: 2, title: 'Выбрать ужин сегодня',           cost: 4, emoji: '🍕' },
  { id: 3, title: 'Лечь спать на тридцать минут позже', cost: 5, emoji: '🌙' },
  { id: 4, title: 'Любимый перекус',                cost: 3, emoji: '🍭' },
  { id: 5, title: 'Игра с папой',                   cost: 2, emoji: '🎮' },
];

const MSG = {
  idle:   ['Привет! Готов к миссии?', 'Что будем делать сегодня?', 'Я здесь, рядом с тобой!'],
  start:  ['Давай сделаем это вместе!', 'У тебя получится!', 'Я верю в тебя!'],
  done:   ['Невероятно! Ты справился!', 'Ты настоящая звезда!', 'Я знал, что ты сможешь!'],
  reward: ['Посмотри сколько звёзд!', 'Ты так старался!', 'Вау, ты заработал награду!'],
};

const MILESTONES = [5, 10, 20, 35, 50, 75, 100, 150, 200];

// ── HELPERS ───────────────────────────────────────────────────────────────────

const todayStr  = () => new Date().toISOString().split('T')[0];
const pick      = arr => arr[Math.floor(Math.random() * arr.length)];

function getProgress(total) {
  const next = MILESTONES.find(m => m > total) ?? MILESTONES[MILESTONES.length - 1] * 2;
  const prev = (() => {
    let p = 0;
    for (const m of [0, ...MILESTONES]) { if (m <= total) p = m; else break; }
    return p;
  })();
  const pct = next === prev ? 1 : Math.min((total - prev) / (next - prev), 1);
  return { next, pct };
}

// ── TTS ───────────────────────────────────────────────────────────────────────

// We resolve the best Russian voice ONCE at startup and cache it.
// This prevents iOS from switching voices mid-session.

async function resolveRussianVoice() {
  try {
    // iOS sometimes needs a small delay before voices are ready
    await new Promise(r => setTimeout(r, 800));
    const voices = await Speech.getAvailableVoicesAsync();

    if (!voices || voices.length === 0) return null;

    // Prefer high-quality Russian voice
    const preferred = voices.find(v =>
      v.language === 'ru-RU' && v.quality === Speech.VoiceQuality?.Enhanced
    );
    if (preferred) return preferred;

    // Any Russian voice
    const anyRu = voices.find(v => v.language?.startsWith('ru'));
    if (anyRu) return anyRu;

    return null;
  } catch {
    return null;
  }
}

function useSpeech() {
  const voiceRef = useRef(null);
  const readyRef = useRef(false);

  useEffect(() => {
    resolveRussianVoice().then(v => {
      voiceRef.current = v;
      readyRef.current = true;
    });
    return () => { try { Speech.stop(); } catch {} };
  }, []);

  const speak = useCallback((text) => {
    if (!text) return;
    try { Speech.stop(); } catch {}

    const options = {
      language: 'ru-RU',
      pitch:    1.05,
      rate:     Platform.OS === 'ios' ? 0.52 : 0.85,
    };

    if (voiceRef.current?.identifier) {
      options.voice = voiceRef.current.identifier;
    }

    // Small delay on iOS prevents audio session conflicts
    const delay = Platform.OS === 'ios' ? 120 : 0;
    setTimeout(() => {
      try { Speech.speak(text, options); } catch (e) { console.log('TTS error:', e); }
    }, delay);
  }, []);

  return speak;
}

// ── REUSABLE: SPEAKABLE TEXT ──────────────────────────────────────────────────

function T({ children, style, speak }) {
  if (!children) return null;
  const str = typeof children === 'string' ? children : String(children);
  return (
    <TouchableOpacity onPress={() => speak(str)} activeOpacity={0.6}>
      <Text style={style}>{children}</Text>
    </TouchableOpacity>
  );
}

// ── PROGRESS BAR ─────────────────────────────────────────────────────────────

function ProgressBar({ total, speak }) {
  const { next, pct } = getProgress(total);
  const fillPct = `${Math.round(pct * 100)}%`;
  const label = `У тебя ${total} ${total === 1 ? 'звезда' : 'звёзд'}. До следующей цели: ${next}`;

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

// ── BUDDY ─────────────────────────────────────────────────────────────────────

const BUDDY_FACES = { happy:'😊', excited:'🤩', proud:'😄', calm:'🙂' };
const BUDDY_LINES = {
  happy:   'Привет, я Бадди! Нажми на меня!',
  excited: 'Давай, ты можешь это сделать!',
  proud:   'Я так горжусь тобой!',
  calm:    'Всё хорошо, я рядом.',
};

function Buddy({ mood = 'happy', speak }) {
  return (
    <TouchableOpacity style={s.buddy} onPress={() => speak(BUDDY_LINES[mood])} activeOpacity={0.7}>
      <Text style={s.buddyFace}>{BUDDY_FACES[mood]}</Text>
      <Text style={s.buddyName}>Бадди</Text>
    </TouchableOpacity>
  );
}

// ── SCREENS ───────────────────────────────────────────────────────────────────

function HomeScreen({ stars, totalEver, completedToday, onStart, onRewards, speak }) {
  const msg = pick(MSG.idle);
  return (
    <View style={s.screen}>
      <ProgressBar total={totalEver} speak={speak} />
      <Buddy mood="happy" speak={speak} />
      <T style={s.msg} speak={speak}>{msg}</T>
      {completedToday > 0 && (
        <T style={s.sub} speak={speak}>
          {`Сегодня выполнено миссий: ${completedToday}`}
        </T>
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

function MissionPickScreen({ onPick, onBack, speak }) {
  const easy   = MISSIONS.filter(m => m.stars === 1);
  const bigger = MISSIONS.filter(m => m.stars === 2);
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

      <T style={s.hint} speak={speak}>Удержи карточку, чтобы услышать миссию</T>
      <TouchableOpacity style={s.btnBack} onPress={onBack}>
        <Text style={s.btnBackTxt}>← Назад</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function ActiveScreen({ mission, onDone, onSkip, speak }) {
  const msg = pick(MSG.start);
  return (
    <View style={s.screen}>
      <Buddy mood="excited" speak={speak} />
      <T style={s.msg} speak={speak}>{msg}</T>
      <TouchableOpacity
        style={s.activeCard}
        onPress={() => speak(`${mission.title}. ${mission.subtitle}`)}
        activeOpacity={0.85}
      >
        <Text style={s.activeEmoji}>{mission.emoji}</Text>
        <Text style={s.activeTitle}>{mission.title}</Text>
        <Text style={s.activeSub}>{mission.subtitle}</Text>
        <View style={s.starsRow}>
          {Array(mission.stars).fill('⭐').map((_, i) => (
            <Text key={i} style={s.starBig}>⭐</Text>
          ))}
        </View>
        <Text style={s.tapHint}>нажми, чтобы услышать ещё раз</Text>
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
  const msg = pick(MSG.done);
  useEffect(() => {
    const t = setTimeout(() => speak(msg), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={s.screen}>
      <ProgressBar total={totalEver} speak={speak} />
      <Buddy mood="proud" speak={speak} />
      <T style={s.celebTitle} speak={speak}>Миссия выполнена!</T>
      <T style={s.msg} speak={speak}>{msg}</T>
      <TouchableOpacity
        style={s.earnedCard}
        onPress={() => speak(`Ты заработал ${mission.stars === 1 ? 'одну звезду' : 'две звезды'}. Всего звёзд: ${stars}`)}
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
  const msg = pick(MSG.reward);
  return (
    <ScrollView contentContainerStyle={s.scroll}>
      <ProgressBar total={totalEver} speak={speak} />
      <Buddy mood="excited" speak={speak} />
      <T style={s.msg} speak={speak}>{msg}</T>
      <T style={s.pageTitle} speak={speak}>Твои награды</T>
      {REWARDS.map(r => {
        const can = stars >= r.cost;
        const line = can
          ? `${r.title}. Готово к получению!`
          : `${r.title}. Нужно ещё ${r.cost - stars} звёзд`;
        return (
          <TouchableOpacity
            key={r.id}
            style={[s.rCard, !can && s.rLocked]}
            onPress={() => speak(line)}
            activeOpacity={0.7}
          >
            <Text style={s.rEmoji}>{r.emoji}</Text>
            <View style={s.rInfo}>
              <Text style={s.rTitle}>{r.title}</Text>
              <Text style={s.rCost}>{Array(r.cost).fill('⭐').join('')}</Text>
            </View>
            {can
              ? <Text style={s.rReady}>Готово!</Text>
              : <Text style={s.rNeed}>ещё {r.cost - stars} ⭐</Text>
            }
          </TouchableOpacity>
        );
      })}
      <T style={s.hint} speak={speak}>
        Попроси папу или маму разблокировать награду
      </T>
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
  const [stars,          setStars]          = useState(0);
  const [totalEver,      setTotalEver]      = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const [mission,        setMission]        = useState(null);
  const speak = useSpeech();

  // Load
  useEffect(() => {
    (async () => {
      try {
        const [sv, tv, cv, dv] = await Promise.all([
          AsyncStorage.getItem(K.STARS),
          AsyncStorage.getItem(K.TOTAL_EVER),
          AsyncStorage.getItem(K.COMPLETED_TODAY),
          AsyncStorage.getItem(K.LAST_DATE),
        ]);
        const today    = todayStr();
        const newDay   = dv !== today;
        const st       = sv ? parseInt(sv, 10) : 0;
        const tot      = tv ? parseInt(tv, 10) : (sv ? parseInt(sv, 10) : 0);
        const comp     = newDay ? 0 : (cv ? parseInt(cv, 10) : 0);
        setStars(st);
        setTotalEver(tot);
        setCompletedToday(comp);
        if (newDay) {
          await AsyncStorage.multiSet([
            [K.LAST_DATE,       today],
            [K.COMPLETED_TODAY, '0'],
          ]);
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
    AsyncStorage.multiSet([
      [K.STARS,      String(stars)],
      [K.TOTAL_EVER, String(totalEver)],
    ]).catch(console.log);
  }, [stars, totalEver, ready]);

  // Persist daily count
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(K.COMPLETED_TODAY, String(completedToday)).catch(console.log);
  }, [completedToday, ready]);

  function pickMission(m) {
    setMission(m);
    speak(`${m.title}. ${m.subtitle}`);
    setScreen('active');
  }

  function completeMission() {
    setStars(n    => n   + mission.stars);
    setTotalEver(n => n   + mission.stars);
    setCompletedToday(n => n + 1);
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
      {screen === 'home' && (
        <HomeScreen
          {...p}
          completedToday={completedToday}
          onStart={()     => setScreen('pick')}
          onRewards={()   => setScreen('rewards')}
        />
      )}
      {screen === 'pick' && (
        <MissionPickScreen
          {...p}
          onPick={pickMission}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'active' && mission && (
        <ActiveScreen
          {...p}
          mission={mission}
          onDone={completeMission}
          onSkip={() => { setMission(null); setScreen('home'); }}
        />
      )}
      {screen === 'celebrate' && mission && (
        <CelebrateScreen
          {...p}
          mission={mission}
          onContinue={() => setScreen('pick')}
          onRewards={()  => setScreen('rewards')}
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
  buddy:     { alignItems: 'center', marginBottom: 4 },
  buddyFace: { fontSize: 66 },
  buddyName: { fontSize: 12, color: C.muted, marginTop: 2, fontWeight: '500' },

  // Text
  msg:       { fontSize: 17, color: C.text, textAlign: 'center', marginVertical: 8, lineHeight: 25, paddingHorizontal: 8 },
  sub:       { fontSize: 13, color: C.muted, marginBottom: 6, textAlign: 'center' },
  pageTitle: { fontSize: 21, fontWeight: '700', color: C.text, marginBottom: 14, alignSelf: 'flex-start' },
  tier:      { fontSize: 12, fontWeight: '600', color: C.muted, alignSelf: 'flex-start', marginTop: 10, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  hint:      { fontSize: 11, color: C.muted, marginTop: 8, textAlign: 'center', fontStyle: 'italic' },
  tapHint:   { fontSize: 11, color: C.muted, marginTop: 10, fontStyle: 'italic' },

  // Buttons
  btnPrimary:    { backgroundColor: C.green, borderRadius: 16, paddingVertical: 17, paddingHorizontal: 32, marginTop: 10, width: '100%', alignItems: 'center' },
  btnPrimaryTxt: { fontSize: 19, color: '#fff', fontWeight: '700' },
  btnSecondary:    { backgroundColor: C.gold, borderRadius: 16, borderWidth: 1, borderColor: C.goldBdr, paddingVertical: 15, paddingHorizontal: 32, marginTop: 8, width: '100%', alignItems: 'center' },
  btnSecondaryTxt: { fontSize: 17, color: '#92400E', fontWeight: '600' },
  btnSkip:    { marginTop: 10, padding: 12 },
  btnSkipTxt: { fontSize: 15, color: C.muted },
  btnBack:    { marginTop: 18, padding: 12 },
  btnBackTxt: { fontSize: 15, color: C.green, fontWeight: '500' },

  // Mission cards
  mCard:    { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 13, marginBottom: 7, width: '100%' },
  mCardBig: { backgroundColor: C.gold, borderColor: C.goldBdr },
  mEmoji:   { fontSize: 30, marginRight: 11 },
  mInfo:    { flex: 1 },
  mTitle:   { fontSize: 15, fontWeight: '600', color: C.text },
  mSub:     { fontSize: 12, color: C.muted, marginTop: 2 },
  mStar:    { fontSize: 17 },

  // Active mission
  activeCard:  { backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 26, alignItems: 'center', width: '100%', marginVertical: 12 },
  activeEmoji: { fontSize: 58, marginBottom: 10 },
  activeTitle: { fontSize: 22, fontWeight: '700', color: C.text, textAlign: 'center' },
  activeSub:   { fontSize: 14, color: C.muted, marginTop: 5, textAlign: 'center' },
  starsRow:    { flexDirection: 'row', marginTop: 12, gap: 4 },
  starBig:     { fontSize: 24 },

  // Celebration
  celebTitle: { fontSize: 25, fontWeight: '800', color: C.green, marginBottom: 4, textAlign: 'center' },
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