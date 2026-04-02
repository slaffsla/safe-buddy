// SafeBuddy v8 — Split architecture
// index.tsx is the orchestrator only: state, storage, navigation, PIN overlay.
// All screens and components live in separate files.
//
// File map:
//   _constants.ts       — shared data, types, pure helpers, colors
//   _Buddy.tsx          — Buddy character component
//   _SharedUI.tsx       — T, ProgressBar, ReflectiveBoost, DailySuggestion, Confetti
//   _DemoScreens.tsx    — DemoIntroScreen, DemoStepScreen, DemoCompleteScreen
//   _HomeScreen.tsx     — HomeScreen
//   _MissionScreens.tsx — MissionPickScreen, ActiveScreen, CelebrateScreen, RewardsScreen
//   _SettingsScreen.tsx — SettingsScreen (self-contained, unchanged)

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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DemoCompleteScreen, DemoIntroScreen, DemoStepScreen } from './_DemoScreens';
import HomeScreen from './_HomeScreen';
import { ActiveScreen, CelebrateScreen, MissionPickScreen, RewardsScreen } from './_MissionScreens';
import SettingsScreen, { AppSettings, DEFAULT_SETTINGS, loadSettings } from './_SettingsScreen';
import {
  BUDDY, DEMO_STEPS, K, MISSIONS_EASY,
  shouldBeVeryExcited, todayStr,
} from './_constants';

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
      rate: Platform.OS === 'ios' ? 0.52 : 0.85,
    };
    if (voiceRef.current?.identifier) opts.voice = voiceRef.current.identifier;
    setTimeout(() => {
      try { Speech.speak(text, opts); } catch (e) { console.log('TTS:', e); }
    }, Platform.OS === 'ios' ? 120 : 0);
  }, []);
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────

export default function App() {
  // ── Core state ──────────────────────────────────────────────────────────────
  const [ready,          setReady]          = useState(false);
  const [screen,         setScreen]         = useState<string>('home');
  const [demoStep,       setDemoStep]       = useState(0);
  const [stars,          setStars]          = useState(0);
  const [totalEver,      setTotalEver]      = useState(0);
  const [prevTotalEver,  setPrevTotalEver]  = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const [totalMissions,  setTotalMissions]  = useState(0);
  const [mission,        setMission]        = useState<any>(null);
  const [firstMission,   setFirstMission]   = useState(true);
  const [lastMission,    setLastMission]    = useState<string | null>(null);
  const [skipCount,      setSkipCount]      = useState(0);
  const [isVeryExcited,  setIsVeryExcited]  = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(true);
  const [firstReward,    setFirstReward]    = useState(false);

  // ── Onboarding ──────────────────────────────────────────────────────────────
  const [childName,      setChildName]      = useState('');
  const [onboardingDone, setOnboardingDone] = useState(false);

  // ── PIN ──────────────────────────────────────────────────────────────────────
  const [parentPin,     setParentPin]    = useState('');
  const [pinEnabled,    setPinEnabled]   = useState(false);
  const [showPinScreen, setShowPinScreen]= useState(false);
  const [enteredPin,    setEnteredPin]   = useState('');
  const [pendingReward, setPendingReward]= useState<any>(null);

  // ── Settings ─────────────────────────────────────────────────────────────────
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const speak = useSpeech();

  // ── Load all state ───────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const vals = await AsyncStorage.multiGet([
          K.STARS, K.TOTAL_EVER, K.COMPLETED_TODAY,
          K.LAST_DATE, K.DEMO_DONE, K.TOTAL_MISSIONS,
          K.CHILD_NAME, K.LAST_MISSION, K.SKIP_COUNT, K.FIRST_REWARD,
          K.PARENT_PIN, K.PIN_ENABLED, K.ONBOARDING_DONE,
        ]);
        const v      = Object.fromEntries(vals);
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

        const s = await loadSettings();
        setAppSettings(s);
        setPinEnabled(v[K.PIN_ENABLED] === 'true');

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

  // ── Persist stars / missions / skips ─────────────────────────────────────────
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

  // ── Onboarding ───────────────────────────────────────────────────────────────
  async function saveChildName() {
    const name = childName.trim();
    if (!name) { Alert.alert('Пожалуйста, введи имя ребёнка'); return; }
    try {
      await AsyncStorage.multiSet([
        [K.CHILD_NAME,      name],
        [K.ONBOARDING_DONE, 'true'],
      ]);
      setChildName(name);
      setOnboardingDone(true);
      speak(`Привет, ${name}! Рад тебя видеть!`);
      setScreen('demo_intro');
    } catch { Alert.alert('Ошибка сохранения'); }
  }

  // ── Demo ──────────────────────────────────────────────────────────────────────
  async function finishDemo() {
    await AsyncStorage.setItem(K.DEMO_DONE, 'true');
  }

  function handleDemoStepDone() {
    const next = demoStep + 1;
    if (next < DEMO_STEPS.length) { setDemoStep(next); setScreen('demo_step'); }
    else { setScreen('demo_complete'); }
  }

  // ── Missions ──────────────────────────────────────────────────────────────────
  function pickMission(m: any) {
    setMission(m);
    setSkipCount(0);
    speak(`${m.title}. ${m.subtitle}`);
    setScreen('active');
  }

  function handleSkip() {
    setSkipCount(n => n + 1);
    setMission(null);
    setScreen('home');
  }

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

  // ── PIN / Reward redemption ───────────────────────────────────────────────────
  function handleRewardRedeem(reward: any) {
    if (stars < reward.cost) return;
    if (pinEnabled && parentPin) {
      setPendingReward(reward);
      setEnteredPin('');
      setShowPinScreen(true);
    } else {
      redeemReward(reward);
    }
  }

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
      if (pendingReward) { redeemReward(pendingReward); setPendingReward(null); }
    } else {
      Alert.alert('Неверный PIN', 'Попробуй ещё раз');
      setEnteredPin('');
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  if (!ready) {
    return (
      <SafeAreaView style={[s.root, s.center]}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={C.green} />
      </SafeAreaView>
    );
  }

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

  const p = { speak, stars, totalEver };

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
          skipCount={skipCount}
          onStart={() => setScreen('pick')}
          onRewards={() => setScreen('rewards')}
          onSettings={() => setScreen('settings')}
          onSuggestionAccept={handleSuggestionAccept}
          onSuggestionSkip={() => setShowSuggestion(false)}
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

      {/* ── PARENT PIN OVERLAY ──────────────────────────────────────────────────
          Shown over any screen when a reward requires parent confirmation.    */}
      {showPinScreen && (
        <View style={s.pinOverlay}>
          <View style={s.pinCard}>
            <Image
              source={BUDDY.calm}
              style={{ width: 80, height: 80, backgroundColor: 'transparent', marginBottom: 12 }}
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
              onPress={() => { setShowPinScreen(false); setEnteredPin(''); setPendingReward(null); }}
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
  root:   { flex: 1, backgroundColor: C.bg },
  center: { justifyContent: 'center', alignItems: 'center' },

  // Onboarding
  onboardingTitle:  { fontSize: 24, fontWeight: '700', textAlign: 'center', marginVertical: 24, color: C.text, paddingHorizontal: 20 },
  onboardingInput:  { width: '80%', borderWidth: 2, borderColor: '#a1d4b8', borderRadius: 16, padding: 16, fontSize: 24, textAlign: 'center', backgroundColor: C.white, color: C.text },
  onboardingBtn:    { marginTop: 32, backgroundColor: C.green, paddingVertical: 16, paddingHorizontal: 48, borderRadius: 999 },
  onboardingBtnTxt: { color: C.white, fontSize: 20, fontWeight: '600' },

  // Parent PIN overlay (reward redemption)
  pinOverlay:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  pinCard:       { backgroundColor: C.white, borderRadius: 20, padding: 28, alignItems: 'center', width: '100%' },
  pinTitle:      { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 4 },
  pinSub:        { fontSize: 13, color: C.muted, marginBottom: 16, textAlign: 'center' },
  pinInput:      { fontSize: 32, textAlign: 'center', letterSpacing: 8, marginBottom: 24, width: '100%', height: 52, borderBottomWidth: 2, borderColor: C.border, paddingBottom: 8, color: C.text },
  pinConfirm:    { backgroundColor: C.green, padding: 14, borderRadius: 12, width: '100%', alignItems: 'center', marginBottom: 10 },
  pinConfirmTxt: { color: C.white, textAlign: 'center', fontSize: 18, fontWeight: '600' },
  pinCancel:     { backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, width: '100%', alignItems: 'center' },
  pinCancelTxt:  { fontSize: 15, color: C.text, fontWeight: '500' },
});
