// _BreathingScreen.tsx — SafeBuddy 3-minute guided breathing
//
// Safety constraints (non-negotiable, see ticket):
//   • Maximum session: 3 minutes. Hard-coded. Never derived from settings.
//   • Pattern is box breathing 4-4-4-4 (inhale, hold, exhale, hold).
//   • Breath holds never exceed 7s; here they are 4s.
//   • The animated circle sets the pace; the child follows it.
//   • Exit button is always visible. No guilt messaging on early exit.
//   • No stars, no economy connection.
//
// Structurally mirrors _MorningRoutineScreen.tsx — early-return for the
// "complete" state, BUDDY_FIXED_SPACER at the top so the global Buddy
// overlay is visible, same speak prop usage.

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BUDDY_FIXED_SPACER, C } from './_constants';

// Hard-coded session length. Do not lift to settings.
const BREATHING_DURATION_MS = 180_000;

// Box breathing: 4s each phase, 16s per cycle.
const PHASES: { label: string; duration: number; target: number }[] = [
  { label: 'Вдох',  duration: 4000, target: 1.0  },
  { label: 'Держи', duration: 4000, target: 1.0  },
  { label: 'Выдох', duration: 4000, target: 0.55 },
  { label: 'Держи', duration: 4000, target: 0.55 },
];

// Try to load expo-av at runtime. If the package isn't installed (or fails
// to load for any reason), audio is silently disabled — never crashes the
// app per the ticket's safety rule.
let ExpoAudio: any = null;
try {
  ExpoAudio = require('expo-av').Audio;
} catch {
  ExpoAudio = null;
}

interface Props {
  speak: (t: string) => void;
  onComplete: () => void;
  onSkip: () => void;
}

type State = 'idle' | 'active' | 'complete';

export default function BreathingScreen({ speak, onComplete, onSkip }: Props) {
  const [state, setState]       = useState<State>('idle');
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  const scale         = useRef(new Animated.Value(0.55)).current;
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStart  = useRef<number>(0);
  const soundRef      = useRef<any>(null);

  // ── Lifecycle helpers ───────────────────────────────────────────────────────
  function clearTimers() {
    if (phaseTimerRef.current) { clearTimeout(phaseTimerRef.current); phaseTimerRef.current = null; }
    if (tickRef.current)       { clearInterval(tickRef.current);     tickRef.current       = null; }
  }

  async function loadAndPlayAudio() {
    if (!ExpoAudio) return;
    try {
      // Attempt to set silent-mode playback so iOS still plays.
      try {
        await ExpoAudio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });
      } catch {}
      // Bundled file; if missing, this require throws → silently skip.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const source = require('../assets/audio/breathing.mp3');
      const { sound } = await ExpoAudio.Sound.createAsync(source, { isLooping: true, volume: 0.6 });
      soundRef.current = sound;
      await sound.playAsync();
    } catch {
      // Audio asset missing or load failed — graceful silence.
      soundRef.current = null;
    }
  }

  async function stopAudio() {
    if (!soundRef.current) return;
    try { await soundRef.current.stopAsync(); } catch {}
    try { await soundRef.current.unloadAsync(); } catch {}
    soundRef.current = null;
  }

  function runPhase(idx: number) {
    const phase = PHASES[idx];
    Animated.timing(scale, {
      toValue: phase.target,
      duration: phase.duration,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
    setPhaseIdx(idx);
    phaseTimerRef.current = setTimeout(() => {
      runPhase((idx + 1) % PHASES.length);
    }, phase.duration);
  }

  function startSession() {
    setState('active');
    setElapsedMs(0);
    setPhaseIdx(0);
    sessionStart.current = Date.now();
    speak('Дышим вместе');
    // tick the progress bar
    tickRef.current = setInterval(() => {
      const dt = Date.now() - sessionStart.current;
      if (dt >= BREATHING_DURATION_MS) {
        clearTimers();
        finishSession();
        return;
      }
      setElapsedMs(dt);
    }, 200);
    // start the breath loop
    runPhase(0);
    // best-effort audio
    loadAndPlayAudio();
  }

  function finishSession() {
    clearTimers();
    stopAudio();
    setState('complete');
    speak('Молодец. Ты отдохнул.');
    // Reset visual circle to a calm middle size.
    Animated.timing(scale, {
      toValue: 0.8,
      duration: 600,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }

  function handleExit() {
    clearTimers();
    stopAudio();
    onSkip();
  }

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      clearTimers();
      stopAudio();
    };
  }, []);

  // ── IDLE ────────────────────────────────────────────────────────────────────
  if (state === 'idle') {
    return (
      <View style={s.screen}>
        <View style={{ height: BUDDY_FIXED_SPACER }} />
        <Text style={s.title}>Дышим вместе</Text>
        <Text style={s.subtitle}>3 минуты спокойного дыхания с Бадди</Text>

        <View style={s.circleStatic}>
          <Text style={s.circleEmoji}>🌬️</Text>
        </View>

        <TouchableOpacity style={s.btnPrimary} onPress={startSession} activeOpacity={0.85}>
          <Text style={s.btnPrimaryTxt}>Начать</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnSkip} onPress={onSkip}>
          <Text style={s.btnSkipTxt}>Назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── COMPLETE ───────────────────────────────────────────────────────────────
  if (state === 'complete') {
    return (
      <View style={s.screen}>
        <View style={{ height: BUDDY_FIXED_SPACER }} />
        <Text style={s.celebTitle}>Молодец</Text>
        <Text style={s.celebSub}>Ты отдохнул.</Text>

        <Animated.View style={[s.circleActive, { transform: [{ scale }] }]}>
          <Text style={s.circleEmoji}>🌱</Text>
        </Animated.View>

        <TouchableOpacity style={s.btnPrimary} onPress={onComplete} activeOpacity={0.85}>
          <Text style={s.btnPrimaryTxt}>Готово</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── ACTIVE ──────────────────────────────────────────────────────────────────
  const phaseLabel = PHASES[phaseIdx].label;
  const remainingMs = Math.max(0, BREATHING_DURATION_MS - elapsedMs);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const mm = Math.floor(remainingSec / 60);
  const ss = (remainingSec % 60).toString().padStart(2, '0');
  const progress = Math.min(1, elapsedMs / BREATHING_DURATION_MS);

  return (
    <View style={s.screen}>
      <View style={{ height: BUDDY_FIXED_SPACER }} />
      <Text style={s.phaseLabel}>{phaseLabel}</Text>
      <Text style={s.timeLeft}>{mm}:{ss}</Text>

      <Animated.View style={[s.circleActive, { transform: [{ scale }] }]}>
        <Text style={s.circleEmoji}>🌬️</Text>
      </Animated.View>

      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <TouchableOpacity style={s.btnSkip} onPress={handleExit} activeOpacity={0.7}>
        <Text style={s.btnSkipTxt}>Завершить</Text>
      </TouchableOpacity>
    </View>
  );
}

const CIRCLE_BASE = 200;

const s = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', padding: 20 },

  title:    { fontSize: 26, fontWeight: '700', color: C.text, marginTop: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: C.muted, marginTop: 6, marginBottom: 24, textAlign: 'center' },

  phaseLabel: { fontSize: 28, fontWeight: '700', color: C.green, marginTop: 8, textAlign: 'center' },
  timeLeft:   { fontSize: 14, color: C.muted, marginTop: 6, marginBottom: 18, textAlign: 'center' },

  circleStatic: {
    width: CIRCLE_BASE, height: CIRCLE_BASE, borderRadius: CIRCLE_BASE / 2,
    backgroundColor: C.greenLt, borderWidth: 2, borderColor: C.green,
    alignItems: 'center', justifyContent: 'center',
    marginVertical: 24,
  },
  circleActive: {
    width: CIRCLE_BASE, height: CIRCLE_BASE, borderRadius: CIRCLE_BASE / 2,
    backgroundColor: C.greenLt, borderWidth: 2, borderColor: C.green,
    alignItems: 'center', justifyContent: 'center',
    marginVertical: 16,
  },
  circleEmoji: { fontSize: 56 },

  progressTrack: {
    width: '90%', height: 6, borderRadius: 3,
    backgroundColor: C.border, marginTop: 20, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: C.green,
  },

  btnPrimary:    { backgroundColor: C.green, borderRadius: 16, paddingVertical: 17, paddingHorizontal: 48, marginTop: 22, minWidth: 220, alignItems: 'center' },
  btnPrimaryTxt: { fontSize: 18, color: C.white, fontWeight: '700' },

  btnSkip:    { marginTop: 16, padding: 12 },
  btnSkipTxt: { fontSize: 14, color: C.muted },

  celebTitle: { fontSize: 30, fontWeight: '800', color: C.green, marginTop: 12, textAlign: 'center' },
  celebSub:   { fontSize: 17, color: C.text, marginTop: 6, textAlign: 'center' },
});
