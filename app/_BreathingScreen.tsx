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

import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image as RNImage,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BUDDY_FIXED_SPACER, C, getBuddyImage } from "./_constants";
import { t } from "./i18n";

const { width: SCREEN_W } = Dimensions.get("window");
export const BUDDY_BASE = Math.round(SCREEN_W * 0.38); // ~145px phone, ~290px tablet

// Hard-coded session length. Do not lift to settings.
const BREATHING_DURATION_MS = 120_000;

// Box breathing: 4s each phase, 16s per cycle.
// Labels are resolved via i18n at render time so they follow the device locale.
const PHASES: { labelKey: string; duration: number; target: number }[] = [
  { labelKey: "breathing.phase_in", duration: 3000, target: 1.0 },
  { labelKey: "breathing.phase_hold", duration: 1000, target: 1.0 },
  { labelKey: "breathing.phase_out", duration: 4000, target: 0.55 },
];

// Try to load expo-av at runtime. If the package isn't installed (or fails
// to load for any reason), audio is silently disabled — never crashes the
// app per the ticket's safety rule.
let ExpoAudio: any = null;
try {
  ExpoAudio = require("expo-av").Audio;
} catch {
  ExpoAudio = null;
}

interface Props {
  speak: (t: string) => void;
  onComplete: () => void;
  onSkip: () => void;
  onHideOverlay: () => void; // ← new
  onShowOverlay: () => void; // ← new
  musicEnabled?: boolean;
}

type State = "idle" | "active" | "complete";

export default function BreathingScreen({
  speak,
  onComplete,
  onSkip,
  onHideOverlay,
  onShowOverlay,
  musicEnabled = true,
}: Props) {
  const [state, setState] = useState<State>("idle");
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  const buddyScale = useRef(new Animated.Value(0.2)).current;
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStart = useRef<number>(0);
  const soundRef = useRef<any>(null);

  // ── Lifecycle helpers ───────────────────────────────────────────────────────
  function clearTimers() {
    if (phaseTimerRef.current) {
      clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }

  async function loadAndPlayAudio() {
    if (!musicEnabled || !ExpoAudio) return;
    try {
      await ExpoAudio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
    } catch (e) {
      console.warn("setAudioModeAsync failed:", e);
    }
    try {
      const source = require("../assets/audio/breathing.mp3");
      const { sound } = await ExpoAudio.Sound.createAsync(source, {
        isLooping: true,
        volume: 0.65,
      });
      soundRef.current = sound;
      await sound.playAsync();
    } catch (e) {
      console.warn("Audio load/play failed:", e);
      soundRef.current = null;
    }
  }

  async function stopAudio() {
    if (!soundRef.current) return;
    try {
      await soundRef.current.stopAsync();
    } catch {}
    try {
      await soundRef.current.unloadAsync();
    } catch {}
    soundRef.current = null;
  }

  function runPhase(idx: number) {
    const phase = PHASES[idx];
    Animated.timing(buddyScale, {
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
    setState("active");
    setElapsedMs(0);
    setPhaseIdx(0);
    sessionStart.current = Date.now();
    // 1. Hide the global overlay Buddy
    onHideOverlay();
    speak(t("breathing.start_speak"));
    // 2. Entrance spring: Buddy jumps from tiny → full size
    //    When spring settles, breathing loop begins
    buddyScale.setValue(0.2);
    Animated.spring(buddyScale, {
      toValue: 1.0,
      friction: 4, // lower = more bounce, raise to 7 for subtler jump
      tension: 20,
      useNativeDriver: true,
    }).start(() => {
      // Drop to exhale size first so first inhale is immediately dramatic
      Animated.timing(buddyScale, {
        toValue: 0.65,
        duration: 650,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        runPhase(0); // now starts with a big visible inhale expansion
      });
    });
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
    //    DEL.runPhase(0);
    // best-effort audio
    if (musicEnabled) loadAndPlayAudio();
  }

  function finishSession() {
    clearTimers();
    stopAudio();
    setState("complete");
    speak(t("breathing.done_speak"));
    onShowOverlay(); // ← restore global Buddy
    // Reset visual circle to a calm middle size.
    Animated.timing(buddyScale, {
      toValue: 0.83,
      duration: 600,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }

  function handleExit() {
    clearTimers();
    stopAudio();
    onShowOverlay(); // ← restore global Buddy
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
  if (state === "idle") {
    return (
      <View style={s.screen}>
        <View style={{ height: BUDDY_FIXED_SPACER }} />
        <Text style={s.title}>{t("breathing.title")}</Text>
        <Text style={s.subtitle}>{t("breathing.subtitle")}</Text>

        <View style={s.circleStatic}>
          <Text style={s.circleEmoji}>🌬️</Text>
        </View>

        <TouchableOpacity
          style={s.btnPrimary}
          onPress={startSession}
          activeOpacity={0.85}
        >
          <Text style={s.btnPrimaryTxt}>{t("breathing.btn_start")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnSkip} onPress={onSkip}>
          <Text style={s.btnSkipTxt}>{t("breathing.btn_back")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── COMPLETE ───────────────────────────────────────────────────────────────
  if (state === "complete") {
    return (
      <View style={s.screen}>
        <View style={{ height: BUDDY_FIXED_SPACER }} />
        <Text style={s.celebTitle}>{t("breathing.celeb_title")}</Text>
        <Text style={s.celebSub}>{t("breathing.celeb_sub")}</Text>

        <Animated.View
          style={[s.circleActive, { transform: [{ scale: buddyScale }] }]}
        >
          <Text style={s.circleEmoji}>🌱</Text>
        </Animated.View>

        <TouchableOpacity
          style={s.btnPrimary}
          onPress={onComplete}
          activeOpacity={0.85}
        >
          <Text style={s.btnPrimaryTxt}>{t("breathing.btn_done")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── ACTIVE ──────────────────────────────────────────────────────────────────
  const phaseLabel = t(PHASES[phaseIdx].labelKey);
  const remainingMs = Math.max(0, BREATHING_DURATION_MS - elapsedMs);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const mm = Math.floor(remainingSec / 60);
  const ss = (remainingSec % 60).toString().padStart(2, "0");
  const progress = Math.min(1, elapsedMs / BREATHING_DURATION_MS);

  return (
    <View style={s.screen}>
      {/* Phase label + timer sit above Buddy */}
      <Text style={s.phaseLabel}>{phaseLabel}</Text>
      <Text style={s.timeLeft}>
        {mm}:{ss}
      </Text>

      {/* Buddy IS the breathing element — no separate circle */}
      <View style={s.buddyContainer}>
        <Animated.View
          style={{ transform: [{ scale: buddyScale }], alignItems: "center" }}
        >
          <RNImage
            source={getBuddyImage("serene")}
            style={s.buddyBreathing}
            resizeMode="contain"
          />
          <Text style={s.buddyName}>{t("buddy.name")}</Text>
        </Animated.View>
      </View>
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <TouchableOpacity
        style={s.btnSkip}
        onPress={handleExit}
        activeOpacity={0.7}
      >
        <Text style={s.btnSkipTxt}>{t("breathing.btn_finish")}</Text>
      </TouchableOpacity>
    </View>
  );
}
const CIRCLE_BASE = 100;

const s = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    padding: 20,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: C.text,
    marginTop: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: C.muted,
    marginTop: 6,
    marginBottom: 24,
    textAlign: "center",
  },

  phaseLabel: {
    fontSize: 28,
    fontWeight: "700",
    color: C.green,
    marginTop: 8,
    textAlign: "center",
  },
  timeLeft: {
    fontSize: 14,
    color: C.muted,
    marginTop: 6,
    marginBottom: 18,
    textAlign: "center",
  },

  circleStatic: {
    width: CIRCLE_BASE,
    height: CIRCLE_BASE,
    borderRadius: CIRCLE_BASE / 2,
    backgroundColor: C.greenLt,
    borderWidth: 2,
    borderColor: C.green,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 24,
  },
  circleActive: {
    width: CIRCLE_BASE,
    height: CIRCLE_BASE,
    borderRadius: CIRCLE_BASE / 2,
    backgroundColor: C.greenLt,
    borderWidth: 2,
    borderColor: C.green,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
  },
  circleEmoji: { fontSize: 56 },

  progressTrack: {
    width: "90%",
    height: 6,
    borderRadius: 3,
    backgroundColor: C.border,
    marginTop: 20,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: C.green,
  },

  btnPrimary: {
    backgroundColor: C.green,
    borderRadius: 16,
    paddingVertical: 17,
    paddingHorizontal: 48,
    marginTop: 22,
    minWidth: 220,
    alignItems: "center",
  },
  btnPrimaryTxt: { fontSize: 18, color: C.white, fontWeight: "700" },

  btnSkip: {
    marginTop: 32,
    padding: 12,
    backgroundColor: C.greenLt,
    borderRadius: 16,
    paddingVertical: 17,
    paddingHorizontal: 48,
    minWidth: 220,
    alignItems: "center",
  },
  btnSkipTxt: {
    fontSize: 14,
    color: C.muted,
  },

  celebTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: C.green,
    marginTop: 12,
    textAlign: "center",
  },
  celebSub: { fontSize: 17, color: C.text, marginTop: 6, textAlign: "center" },

  buddyBreathing: {
    width: BUDDY_BASE,
    height: BUDDY_BASE,
    backgroundColor: "transparent",
  },
  buddyName: {
    fontSize: 12,
    color: C.muted,
    marginTop: 4,
    fontWeight: "500",
  },
  buddyContainer: {
    width: BUDDY_BASE * 1.1, // just enough room for scale: 1.0
    height: BUDDY_BASE * 1.1,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
  },
});
