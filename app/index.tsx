// SafeBuddy v7 — Clean rebuild with onboarding, PIN, transparent images
// npx expo install expo-speech @react-native-async-storage/async-storage react-native-confetti-cannon

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DemoCompleteScreen, DemoIntroScreen, DemoStepScreen } from './_DemoScreens';
import HomeScreen from './_HomeScreen';
import { ActiveScreen, CelebrateScreen, MissionPickScreen, RewardsScreen } from './_MissionScreens';
import MorningRoutineScreen from './_MorningRoutineScreen';
import SettingsScreen, { AppSettings, DEFAULT_SETTINGS, loadSettings } from './_SettingsScreen';
import { DEFAULT_MORNING_STEPS, DEFAULT_WEEKDAY_IDS, DEFAULT_WEEKEND_IDS, isWeekend, MISSION_POOL, shouldShowMorning } from './_constants';

// ── CHARACTER IMAGES ──────────────────────────────────────────────────────────

const BUDDY = {
  calm:              require('../assets/Character/buddy-calm.png'),
  'gentle-reminder': require('../assets/Character/buddy-gentle-reminder.png'),
  serene:            require('../assets/Character/buddy-serene.png'),
  encouraging:       require('../assets/Character/buddy-encouraging.png'),
  thinking:          require('../assets/Character/buddy-thinking.png'),
  excited:           require('../assets/Character/buddy-excited.png'),
  happy:             require('../assets/Character/buddy-happy.png'),
  proud:             require('../assets/Character/buddy-proud.png'),
  'very-excited':    require('../assets/Character/buddy-very-excited.png'),
};

// ── MOOD TRIGGER LOGIC ────────────────────────────────────────────────────────
// calm            → home default, quiet idle, breathing sessions
// gentle-reminder → home alternate (~30%), morning, after 2 skips
// serene          → rewards browsing, reflective boost, breathing end
// encouraging     → mission pick, hesitation, daily suggestion
// thinking        → tiny facts delivery
// excited         → active mission, big mission ⭐⭐
// happy           → easy mission done ⭐, demo praise
// proud           → demo complete, milestone, reward redemption
// very-excited    → first 10 stars, every 50 stars, first reward redeemed (RARE)

// ── VERY-EXCITED TRIGGERS ─────────────────────────────────────────────────────

function shouldBeVeryExcited(
  totalEver: number,
  prevTotalEver: number,
  isFirstReward: boolean
): boolean {
  if (isFirstReward) return true;
  if (prevTotalEver < 10 && totalEver >= 10) return true;
  const prevFifty = Math.floor(prevTotalEver / 50);
  const currFifty = Math.floor(totalEver / 50);
  if (currFifty > prevFifty && currFifty > 0) return true;
  return false;
}

// ── EMOTIONAL PROGRESSION ─────────────────────────────────────────────────────

function getProgressionMessage(totalMissions: number, completedToday: number): string {
  if (totalMissions === 1) return 'Первая миссия! Ты начал!';
  if (completedToday === 1) return 'Сегодня ты уже начал — это главное';
  if (completedToday === 2) return 'Две миссии сегодня — ты становишься сильнее';
  if (completedToday === 3) return 'Три миссии! Бадди очень гордится тобой';
  if (completedToday >= 4) return 'Ты сегодня настоящий герой!';
  if (totalMissions === 5) return 'Пять миссий всего! Ты растёшь!';
  if (totalMissions === 10) return 'Десять миссий — ты уже совсем другой!';
  return 'Бадди видит как ты растёшь';
}

function getMilestoneMessage(totalEver: number): string {
  if (totalEver >= 10  && totalEver < 11)  return 'Десять звёзд! Ты сияешь!';
  if (totalEver >= 20  && totalEver < 22)  return 'Двадцать звёзд — ты растёшь каждый день';
  if (totalEver >= 50  && totalEver < 52)  return 'Пятьдесят звёзд! Бадди так тобой гордится!';
  if (totalEver >= 100 && totalEver < 102) return 'Сто звёзд. Ты настоящая звезда!';
  return `${totalEver} звёзд — и ты продолжаешь!`;
}

// ── STORAGE KEYS ──────────────────────────────────────────────────────────────

const K = {
  STARS:           'sb_stars_v2',
  TOTAL_EVER:      'sb_total_v2',
  COMPLETED_TODAY: 'sb_today_v2',
  LAST_DATE:       'sb_date_v2',
  DEMO_DONE:       'sb_demo_done',
  TOTAL_MISSIONS:  'sb_total_missions',
  CHILD_NAME:      'sb_child_name',
  LAST_MISSION:    'sb_last_mission',
  SKIP_COUNT:      'sb_skip_count',
  FIRST_REWARD:    'sb_first_reward',
  PARENT_PIN:      'sb_parent_pin',
  PIN_ENABLED:     'sb_pin_enabled',
  ONBOARDING_DONE: 'sb_onboarding_done',
  MORNING_DONE:    'sb_morning_done',
};

const CONFETTI_AT = [1, 5, 10, 25, 50, 100];

// ── DATA ──────────────────────────────────────────────────────────────────────

const DEMO_STEPS = [
  { id: 'd1', title: 'Хлопни в ладоши', emoji: '👏', praise: 'Отлично!' },
  { id: 'd2', title: 'Прыгни!',          emoji: '🦘', praise: 'Супер!' },
  { id: 'd3', title: 'Коснись носа',     emoji: '👃', praise: 'Молодец!' },
];

const MISSIONS_EASY = [
  { id: 1, title: 'Постой на одной ноге',   subtitle: 'Держись 5 секунд', stars: 1, emoji: '🦩' },
  { id: 2, title: 'Потянись к пальцам ног', subtitle: 'Медленно вниз',    stars: 1, emoji: '🙆' },
  { id: 3, title: 'Прыгни три раза',        subtitle: 'Как можно выше',   stars: 1, emoji: '🦘' },
  { id: 4, title: 'Выпей стакан воды',      subtitle: 'Не спеши',         stars: 1, emoji: '💧' },
];

const MISSIONS_BIGGER = [
  { id: 5, title: 'Убери игрушки',      subtitle: 'Хотя бы один уголок', stars: 2, emoji: '🧸' },
  { id: 6, title: 'Обними кого-нибудь', subtitle: 'Подари тепло',        stars: 2, emoji: '💛' },
];

const REWARDS = [
  { id: 1, title: 'Дополнительный мультик',      cost: 3, emoji: '📺' },
  { id: 2, title: 'Выбрать ужин сегодня',         cost: 4, emoji: '🍕' },
  { id: 3, title: 'Лечь спать на 30 минут позже', cost: 5, emoji: '🌙' },
  { id: 4, title: 'Любимый перекус',              cost: 3, emoji: '🍭' },
  { id: 5, title: 'Игра с папой',                 cost: 2, emoji: '🎮' },
];

const DAILY_SUGGESTIONS = [
  { text: 'Попробуй сегодня выпить больше воды',       missionId: 4 },
  { text: 'Сделай что-то приятное для кого-то рядом',  missionId: 6 },
  { text: 'Потянись — твоё тело скажет спасибо',       missionId: 2 },
  { text: 'Прыгни немного — станет веселее',           missionId: 3 },
  { text: 'Убери один маленький уголок — сразу легче', missionId: 5 },
];

const MSG = {
  idle:             'Привет! Нажми на меня',
  idle_alt:         'Я рядом',
  start:            'Давай вместе!',
  done:             'Молодец!',
  reward:           'Посмотри сколько всего!',
  encouraging:      'Ты можешь это сделать',
  thinking:         'Знаешь ли ты...',
  serene:           'Всё хорошо. Я рядом.',
  'very-excited':   'Невероятно!!!',
};

const MILESTONES = [5, 10, 20, 35, 50, 75, 100, 150, 200];

// ── HELPERS ───────────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().split('T')[0];

function getProgress(total: number) {
  const next = MILESTONES.find(m => m > total) ?? MILESTONES[MILESTONES.length - 1] * 2;
  let prev = 0;
  for (const m of [0, ...MILESTONES]) { if (m <= total) prev = m; else break; }
  const pct = next === prev ? 1 : Math.min((total - prev) / (next - prev), 1);
  return { next, pct };
}

const shouldShowConfetti = (n: number) => CONFETTI_AT.includes(n);

// ── TTS ───────────────────────────────────────────────────────────────────────

async function resolveRussianVoice() {
  try {
    await new Promise(r => setTimeout(r, 800));
    const voices = await Speech.getAvailableVoicesAsync();
    if (!voices?.length) return null;
    return (
      voices.find(v => v.language === 'ru-RU' && v.quality === (Speech as any).VoiceQuality?.Enhanced) ||
      voices.find(v => v.language?.startsWith('ru')) ||
      null
    );
  } catch { return null; }
}

function useSpeech() {
  const voiceRef = useRef<any>(null);
  useEffect(() => {
    resolveRussianVoice().then(v => { voiceRef.current = v; });
    return () => { try { Speech.stop(); } catch {} };
  }, []);

  return useCallback((text: string) => {
    if (!text) return;
    try { Speech.stop(); } catch {}
    const opts: any = {
      language: 'ru-RU',
      pitch: 1.05,
      rate: Platform.OS === 'ios' ? 0.52 : 0.65,
    };
    if (voiceRef.current?.identifier) opts.voice = voiceRef.current.identifier;
    setTimeout(() => {
      try { Speech.speak(text, opts); } catch (e) { console.log('TTS:', e); }
    }, Platform.OS === 'ios' ? 120 : 0);
  }, []);
}

// Speakable text
function T({ children, style, speak }: { children: any; style: any; speak: (t: string) => void }) {
  if (!children) return null;
  return (
    <TouchableOpacity onPress={() => speak(String(children))} activeOpacity={0.65}>
      <Text style={style}>{children}</Text>
    </TouchableOpacity>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────

export default function App() {
  // Core state
  const [ready,           setReady]          = useState(false);
  const [screen,          setScreen]         = useState<string>('home');
  const [demoStep,        setDemoStep]        = useState(0);
  const [stars,           setStars]           = useState(0);
  const [totalEver,       setTotalEver]       = useState(0);
  const [prevTotalEver,   setPrevTotalEver]   = useState(0);
  const [completedToday,  setCompletedToday]  = useState(0);
  const [totalMissions,   setTotalMissions]   = useState(0);
  const [mission,         setMission]         = useState<any>(null);
  const [firstMission,    setFirstMission]    = useState(true);
  const [lastMission,     setLastMission]     = useState<string | null>(null);
  const [skipCount,       setSkipCount]       = useState(0);
  const [isVeryExcited,   setIsVeryExcited]   = useState(false);
  const [showSuggestion,  setShowSuggestion]  = useState(true);
  const [firstReward,     setFirstReward]     = useState(false);
  const [morningDoneDate, setMorningDoneDate] = useState('');
  const [showMorning, setShowMorning] = useState(false);

  // Onboarding
  const [childName,       setChildName]       = useState('');
  const [onboardingDone,  setOnboardingDone]  = useState(false);

  // PIN
  const [parentPin,       setParentPin]       = useState('');
  const [pinEnabled,      setPinEnabled]      = useState(false);
  const [showPinScreen,   setShowPinScreen]   = useState(false);
  const [enteredPin,      setEnteredPin]      = useState('');
  const [pendingReward,   setPendingReward]   = useState<any>(null);

  // Settings
  const [appSettings,   setAppSettings]   = useState<AppSettings>(DEFAULT_SETTINGS);

  const speak = useSpeech();

  // ── Load all state ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const vals = await AsyncStorage.multiGet([
          K.STARS, K.TOTAL_EVER, K.COMPLETED_TODAY,
          K.LAST_DATE, K.DEMO_DONE, K.TOTAL_MISSIONS,
          K.CHILD_NAME, K.LAST_MISSION, K.SKIP_COUNT, K.FIRST_REWARD,
          K.PARENT_PIN, K.PIN_ENABLED, K.ONBOARDING_DONE, K.MORNING_DONE
        ]);
        // multiGet returns [key, string|null][] — coerce nulls to '' for safe parseInt
        const v: Record<string, string> = Object.fromEntries(
          vals.map(([k, val]) => [k, val ?? ''])
        );
        const today  = todayStr();
        const newDay = v[K.LAST_DATE] !== today;

        const st   = v[K.STARS]          ? parseInt(v[K.STARS],          10) : 0;
        const tot  = v[K.TOTAL_EVER]     ? parseInt(v[K.TOTAL_EVER],     10) : st;
        const tm   = v[K.TOTAL_MISSIONS] ? parseInt(v[K.TOTAL_MISSIONS], 10) : 0;
        const comp = newDay ? 0 : (v[K.COMPLETED_TODAY] ? parseInt(v[K.COMPLETED_TODAY], 10) : 0);
        const sk   = newDay ? 0 : (v[K.SKIP_COUNT]      ? parseInt(v[K.SKIP_COUNT],      10) : 0);

        setStars(st);
        setTotalEver(tot);
        setPrevTotalEver(tot);
        setCompletedToday(comp);
        setTotalMissions(tm);
        setChildName(v[K.CHILD_NAME] || '');
        setLastMission(newDay ? (v[K.LAST_MISSION] || null) : null);
        setSkipCount(sk);
        setFirstReward(v[K.FIRST_REWARD] === 'true');
        setFirstMission(tm === 0);
        setOnboardingDone(v[K.ONBOARDING_DONE] === 'true');
        setParentPin(v[K.PARENT_PIN] || '');

        // Load full settings
        const s = await loadSettings();
         const morningDone = v[K.MORNING_DONE] ?? '';
        setMorningDoneDate(morningDone);
        if (s.morningEnabled && shouldShowMorning(morningDone)) {
          setShowMorning(true);
        }
        
        // TODO(rotation): after loadSettings, call initRotation(s) here
        // See ticket: task rotation logic
        setAppSettings(s);
        setPinEnabled(v[K.PIN_ENABLED] === 'true');

        // Only go to demo if onboarding is already done
        if (v[K.ONBOARDING_DONE] === 'true' && !v[K.DEMO_DONE]) {
          setScreen('demo_intro');
        }

        if (newDay) {
          await AsyncStorage.multiSet([
            [K.LAST_DATE,        today],
            [K.COMPLETED_TODAY,  '0'],
            [K.SKIP_COUNT,       '0'],
          ]);
        }
      } catch (e) {
        console.log('Load error', e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // Persist stars / missions / skips
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.multiSet([
      [K.STARS,          String(stars)],
      [K.TOTAL_EVER,     String(totalEver)],
      [K.TOTAL_MISSIONS, String(totalMissions)],
      [K.SKIP_COUNT,     String(skipCount)],
    ]).catch(console.log);
  }, [stars, totalEver, totalMissions, skipCount, ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(K.COMPLETED_TODAY, String(completedToday)).catch(console.log);
  }, [completedToday, ready]);

  // ── Onboarding ──────────────────────────────────────────────────────────────
  async function saveChildName() {
    const name = childName.trim();
    if (!name) {
      Alert.alert('Пожалуйста, введи имя ребёнка');
      return;
    }
    try {
      await AsyncStorage.multiSet([
        [K.CHILD_NAME,      name],
        [K.ONBOARDING_DONE, 'true'],
      ]);
      setChildName(name);
      setOnboardingDone(true);
      speak(`Привет, ${name}! Рад тебя видеть!`);
      // After onboarding go to demo if not done, else home
      setScreen('demo_intro');
    } catch (e) {
      Alert.alert('Ошибка сохранения');
    }
  }

  // ── Demo ────────────────────────────────────────────────────────────────────
  async function finishDemo() {
    await AsyncStorage.setItem(K.DEMO_DONE, 'true');
  }

  function handleDemoStepDone() {
    const nextStep = demoStep + 1;
    if (nextStep < DEMO_STEPS.length) {
      setDemoStep(nextStep);
      setScreen('demo_step');
    } else {
      setScreen('demo_complete');
    }
  }

  // ── Missions ────────────────────────────────────────────────────────────────
  const pickMission = useCallback((m: any) => {
    setMission(m);
    setSkipCount(0);
    speak(`${m.title}. ${m.subtitle}`);
    setScreen('active');
  }, [speak]);

  const handleSkip = useCallback(() => {
    setSkipCount(n => n + 1);
    setMission(null);
    setScreen('home');
  }, []);

  function completeMission() {
    if (!mission) return;
    const newEver     = totalEver + mission.stars;
    const newTotal    = totalMissions + 1;
    const veryExcited = shouldBeVeryExcited(newEver, prevTotalEver, false);

    setStars(n => n + mission.stars);
    setPrevTotalEver(totalEver);
    setTotalEver(newEver);
    setCompletedToday(n => n + 1);
    setTotalMissions(newTotal);
    setSkipCount(0);
    setFirstMission(false);
    setIsVeryExcited(veryExcited);
    AsyncStorage.setItem(K.LAST_MISSION, mission.title).catch(console.log);
    setScreen('celebrate');
  }

  function handleSuggestionAccept(suggestion: any) {
    const m = MISSIONS_EASY.find(ms => ms.id === suggestion.missionId) || MISSIONS_EASY[0];
    setShowSuggestion(false);
    pickMission(m);
  }

  // ── PIN / Reward redemption ─────────────────────────────────────────────────
  const handleRewardRedeem = useCallback((reward: any) => {
    if (stars < reward.cost) return;
    if (pinEnabled && parentPin) {
      setPendingReward(reward);
      setEnteredPin('');
      setShowPinScreen(true);
    } else {
      redeemReward(reward);
    }
    }, [stars, pinEnabled, parentPin]);

  function redeemReward(reward: any) {
    const isFirst = !firstReward;
    setStars(n => Math.max(0, n - reward.cost));
    if (isFirst) {
      setFirstReward(true);
      setIsVeryExcited(true);
      AsyncStorage.setItem(K.FIRST_REWARD, 'true').catch(console.log);
    }
    speak('Молодец! Ты заслужил награду');
    Alert.alert('🎉 Награда получена!', reward.title);
  }

  function verifyPin() {
    if (enteredPin === parentPin) {
      setShowPinScreen(false);
      setEnteredPin('');
      if (pendingReward) {
        redeemReward(pendingReward);
        setPendingReward(null);
      }
    } else {
      Alert.alert('Неверный PIN', 'Попробуй ещё раз');
      setEnteredPin('');
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!ready) {
    return (
      <SafeAreaView style={[s.root, s.center]}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={C.green} />
      </SafeAreaView>
    );
  }

  // ── ONBOARDING SCREEN (first launch only) ───────────────────────────────────
  if (!onboardingDone) {
    return (
      <SafeAreaView style={[s.root, s.center]}>
        <StatusBar style="dark" />
        <Image
          source={BUDDY.calm}
          style={{ width: 180, height: 180, backgroundColor: 'transparent' }}
          resizeMode="contain"
        />
        <Text style={s.onboardingTitle}>Привет! Как зовут твоего ребёнка?</Text>
        <TextInput
          style={s.onboardingInput}
          placeholder="Имя"
          placeholderTextColor={C.muted}
          value={childName}
          onChangeText={setChildName}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={saveChildName}
        />
        <TouchableOpacity style={s.onboardingBtn} onPress={saveChildName}>
          <Text style={s.onboardingBtnTxt}>Начать приключение</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── MAIN APP ────────────────────────────────────────────────────────────────
  const p = { speak, stars, totalEver };
  // Compute which missions to show based on day mode + settings
  const isWeekendDay = isWeekend();
  const dayModeActive = (appSettings.dayModeOverride ?? 'auto') === 'auto'
    ? isWeekendDay
    : appSettings.dayModeOverride === 'weekend';

  const selectedIds = dayModeActive
    ? (appSettings.weekendMissionIds ?? DEFAULT_WEEKEND_IDS)
    : (appSettings.weekdayMissionIds ?? DEFAULT_WEEKDAY_IDS);

  const dayMissions = MISSION_POOL.filter(m => selectedIds.includes(m.id));

  if (showMorning) {
    return (
      <SafeAreaView style={s.root}>
        <StatusBar style="dark" />
        <MorningRoutineScreen
          childName={childName}
          steps={appSettings.morningSteps?.length > 0 ? appSettings.morningSteps : DEFAULT_MORNING_STEPS}
          stars={appSettings.morningStars ?? 1}
          speak={speak}
          onComplete={async (earned) => {
            const today = todayStr();
            setStars(n => n + earned);
            setTotalEver(n => n + earned);
            setMorningDoneDate(today);
            setShowMorning(false);
            await AsyncStorage.setItem(K.MORNING_DONE, today);
          }}
          onSkip={() => setShowMorning(false)}
        />
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="dark" />

      {screen === 'demo_intro' && (
        <DemoIntroScreen
          speak={speak}
          onStart={() => { setDemoStep(0); setScreen('demo_step'); }}
          onSkip={async () => { await finishDemo(); setScreen('home'); }}
        />
      )}

      {screen === 'demo_step' && (
        <DemoStepScreen
          key={demoStep}
          speak={speak}
          step={DEMO_STEPS[demoStep]}
          stepIndex={demoStep}
          totalSteps={DEMO_STEPS.length}
          onDone={handleDemoStepDone}
        />
      )}

      {screen === 'demo_complete' && (
        <DemoCompleteScreen
          speak={speak}
          onGoToMissions={async () => { await finishDemo(); setScreen('pick'); }}
          onGoHome={async () => { await finishDemo(); setScreen('home'); }}
        />
      )}

      {screen === 'home' && (
        <HomeScreen
          {...p}
          completedToday={completedToday}
          totalMissions={totalMissions}
          childName={childName}
          lastMission={lastMission}
          showSuggestion={showSuggestion}
          onSettings={() => setScreen('settings')}
          skipCount={skipCount}
          onStart={() => setScreen('pick')}
          onRewards={() => setScreen('rewards')}
          onSuggestionAccept={handleSuggestionAccept}
          onSuggestionSkip={() => setShowSuggestion(false)}
        />
      )}

      {screen === 'pick' && (
      <MissionPickScreen
        {...p}
        firstTime={firstMission}
        missions={dayMissions.length > 0 ? dayMissions : null}
        onPick={pickMission}
        onBack={() => setScreen('home')}
      />
      )}

      {screen === 'active' && (
        <ActiveScreen
          {...p}
          mission={mission}
          onDone={completeMission}
          onSkip={handleSkip}
        />
      )}

      {screen === 'celebrate' && (
        <CelebrateScreen
          {...p}
          mission={mission}
          totalMissions={totalMissions}
          completedToday={completedToday}
          isVeryExcited={isVeryExcited}
          onContinue={() => setScreen('pick')}
          onRewards={() => setScreen('rewards')}
        />
      )}

      {screen === 'rewards' && (
        <RewardsScreen
          {...p}
          onBack={() => setScreen('home')}
          onRedeem={handleRewardRedeem}
        />
      )}

      {screen === 'settings' && (
        <SettingsScreen
          onClose={() => setScreen('home')}
          onSettingsChange={(s: AppSettings) => {
            setAppSettings(s);
            setChildName(s.childName);
            setParentPin(s.parentPin);
            setPinEnabled(s.pinEnabled);
          }}
          currentPin={parentPin}
          pinEnabled={pinEnabled}
        />
)}

             {/* ── PARENT PIN OVERLAY ─────────────────────────────────────────────── */}
      {showPinScreen && (
        <View style={s.pinOverlay}>
          <View style={s.pinCard}>
            <Image
              source={BUDDY.calm}
              style={{ width: 80, height: 80, backgroundColor: 'transparent', marginBottom: 16 }}
              resizeMode="contain"
            />
            <Text style={s.pinTitle}>PIN родителя</Text>
            {pendingReward && (
              <Text style={s.pinSub}>Разблокировать: {pendingReward.title}</Text>
            )}
            <TextInput
              style={s.pinInput}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              value={enteredPin}
              onChangeText={setEnteredPin}
              autoFocus
              onSubmitEditing={verifyPin}
            />
            <TouchableOpacity style={s.pinConfirm} onPress={verifyPin}>
              <Text style={s.pinConfirmTxt}>Подтвердить</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.pinCancel}
              onPress={() => {
                setShowPinScreen(false);
                setEnteredPin('');
                setPendingReward(null);
              }}
            >
              <Text style={s.pinCancelTxt}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  reflect: '#F0F8F4',
};

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  center:  { justifyContent: 'center', alignItems: 'center' },
  screen:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  scroll:  { alignItems: 'center', padding: 20, paddingBottom: 52 },
  homeScroll: { alignItems: 'center', padding: 20, paddingBottom: 52 },

  // Onboarding
  onboardingTitle: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginVertical: 24, color: C.text, paddingHorizontal: 20 },
  onboardingInput: { width: '80%', borderWidth: 2, borderColor: '#a1d4b8', borderRadius: 16, padding: 16, fontSize: 24, textAlign: 'center', backgroundColor: C.white, color: C.text },
  onboardingBtn:   { marginTop: 32, backgroundColor: C.green, paddingVertical: 16, paddingHorizontal: 48, borderRadius: 999 },
  onboardingBtnTxt:{ color: C.white, fontSize: 20, fontWeight: '600' },

    pinOverlay: { 
    position: 'absolute', 
    top: 0, left: 0, right: 0, bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.75)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 24 
  },
  pinCard: { 
    backgroundColor: C.white, 
    borderRadius: 20, 
    padding: 28, 
    alignItems: 'center', 
    width: '100%' 
  },
  pinTitle:   { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 4 },
  pinSub:     { fontSize: 13, color: C.muted, marginBottom: 16, textAlign: 'center' },
  pinInput: { 
    fontSize: 36, 
    textAlign: 'center', 
    letterSpacing: 12, 
    marginBottom: 24, 
    width: '100%', 
    height: 52, 
    borderBottomWidth: 2, 
    borderColor: C.border, 
    paddingBottom: 8, 
    color: C.text 
  },
  pinConfirm: { 
    backgroundColor: C.green, 
    padding: 14, 
    borderRadius: 12, 
    width: '100%', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  pinConfirmTxt: { color: C.white, textAlign: 'center', fontSize: 18, fontWeight: '600' },
  pinCancel: { 
    backgroundColor: C.bg, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: C.border, 
    padding: 14, 
    width: '100%', 
    alignItems: 'center' 
  },
  pinCancelTxt: { fontSize: 15, color: C.text, fontWeight: '500' },

  // Progress bar
  pbWrap:    { width: '100%', backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 14 },
  pbRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  pbEmotion: { fontSize: 12, color: C.green, fontWeight: '500', flex: 1, marginRight: 8 },
  pbStars:   { fontSize: 13, fontWeight: '700', color: C.green },
  pbTrack:   { height: 8, backgroundColor: C.track, borderRadius: 4, overflow: 'hidden' },
  pbFill:    { height: 8, backgroundColor: C.green, borderRadius: 4, minWidth: 8 },

  // Buddy
  buddy:     { alignItems: 'center', marginBottom: 4, padding: 4 },
  buddyName: { fontSize: 12, color: C.muted, marginTop: 4, fontWeight: '500' },

  // Home
  greetingRow:    { width: '100%', marginBottom: 4 },
  greeting:       { fontSize: 22, fontWeight: '700', color: C.text, textAlign: 'center' },
  progressionMsg: { fontSize: 15, color: C.green, textAlign: 'center', marginVertical: 6, fontWeight: '500', lineHeight: 22 },

  // Reflective boost
  reflectCard: { backgroundColor: C.reflect, borderRadius: 12, padding: 12, width: '100%', marginBottom: 10, borderWidth: 1, borderColor: C.greenLt },
  reflectText: { fontSize: 13, color: C.green, textAlign: 'center', fontStyle: 'italic', lineHeight: 19 },

  // Daily suggestion
  suggestionCard:  { backgroundColor: C.gold, borderRadius: 14, borderWidth: 1, borderColor: C.goldBdr, padding: 14, width: '100%', alignItems: 'center', marginBottom: 10 },
  suggestionIcon:  { fontSize: 28, marginBottom: 4 },
  suggestionText:  { fontSize: 14, color: '#92400E', textAlign: 'center', marginVertical: 8, lineHeight: 20 },
  suggestionRow:   { flexDirection: 'row', gap: 10 },
  suggestionYes:   { backgroundColor: C.green, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 18 },
  suggestionYesTxt:{ fontSize: 14, color: '#fff', fontWeight: '600' },
  suggestionNo:    { backgroundColor: 'transparent', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 14 },
  suggestionNoTxt: { fontSize: 14, color: C.muted },

  // Text
  msg:           { fontSize: 17, color: C.text, textAlign: 'center', marginVertical: 8, lineHeight: 25, paddingHorizontal: 8 },
  sub:           { fontSize: 13, color: C.muted, marginBottom: 6, textAlign: 'center' },
  pageTitle:     { fontSize: 21, fontWeight: '700', color: C.text, marginBottom: 14, alignSelf: 'flex-start' },
  tier:          { fontSize: 12, fontWeight: '600', color: C.muted, alignSelf: 'flex-start', marginTop: 10, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  hint:          { fontSize: 11, color: C.muted, marginTop: 8, textAlign: 'center', fontStyle: 'italic' },
  tapHint:       { fontSize: 11, color: C.muted, marginTop: 10, fontStyle: 'italic' },
  celebTitle:    { fontSize: 24, fontWeight: '800', color: C.green, marginBottom: 4, textAlign: 'center' },
  milestoneTitle:{ fontSize: 26, fontWeight: '900', color: C.green, marginBottom: 4, textAlign: 'center' },

  // Buttons
  btnPrimary:    { backgroundColor: C.green, borderRadius: 16, paddingVertical: 17, paddingHorizontal: 32, marginTop: 10, width: '100%', alignItems: 'center' },
  btnPrimaryTxt: { fontSize: 19, color: '#fff', fontWeight: '700' },
  btnSecondary:    { backgroundColor: C.gold, borderRadius: 16, borderWidth: 1, borderColor: C.goldBdr, paddingVertical: 15, paddingHorizontal: 32, marginTop: 8, width: '100%', alignItems: 'center' },
  btnSecondaryTxt: { fontSize: 17, color: '#92400E', fontWeight: '600' },
  btnSkip:    { marginTop: 10, padding: 12 },
  btnSkipTxt: { fontSize: 15, color: C.muted },
  btnBack:    { marginTop: 18, padding: 12 },
  btnBackTxt: { fontSize: 15, color: C.green, fontWeight: '500' },
  demoCompleteButtons: { width: '100%', marginTop: 8 },
  btnSettings:    { marginTop: 8, padding: 12, alignItems: 'center' },
  btnSettingsTxt: { fontSize: 14, color: C.muted },

  // Demo
  stepCounter:   { flexDirection: 'row', gap: 8, marginBottom: 16 },
  stepDot:       { width: 10, height: 10, borderRadius: 5, backgroundColor: C.border },
  stepDotActive: { backgroundColor: C.green },
  demoCard:      { backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 32, alignItems: 'center', width: '100%', marginVertical: 12 },
  demoEmoji:     { fontSize: 64, marginBottom: 12 },
  demoTitle:     { fontSize: 22, fontWeight: '700', color: C.text, textAlign: 'center' },
  praiseRow:     { marginTop: 16, alignItems: 'center' },
  praiseText:    { fontSize: 26, fontWeight: '800', color: C.green },

  // Missions
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