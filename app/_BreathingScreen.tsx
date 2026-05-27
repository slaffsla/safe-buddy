// _BreathingScreen.tsx — SafeBuddy 3-minute guided breathing
//
// Safety constraints (non-negotiable, see ticket):
//   • Maximum session: 3 minutes. Hard-coded. Never derived from settings.
//   • Pattern is 3-1-4 (inhale, pause, exhale).
//   • Breath holds never exceed 7s; here the pause is 1s.
//   • The animated circle sets the pace; the child follows it.
//   • Exit button is always visible. No guilt messaging on early exit.
//   • No stars, no economy connection.
//
// Structurally mirrors _MorningRoutineScreen.tsx — early-return for the
// "complete" state, BUDDY_FIXED_SPACER at the top so the global Buddy
// overlay is visible, same speak prop usage.

import {
  createAudioPlayer,
  setIsAudioActiveAsync,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
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
import { RtlChildSex, t, tSpeak } from "./i18n";

const { width: SCREEN_W } = Dimensions.get("window");
export const BUDDY_BASE = Math.round(SCREEN_W * 0.38); // ~145px phone, ~290px tablet

// Hard-coded session length. Do not lift to settings.
const BREATHING_DURATION_MS = 120_000;

// Breathing rhythm: 3s inhale, 1s pause, 4s exhale.
// Labels are resolved via i18n at render time so they follow the device locale.
const PHASES: { labelKey: string; duration: number; target: number }[] = [
  { labelKey: "breathing.phase_in", duration: 3000, target: 1.0 },
  { labelKey: "breathing.phase_hold", duration: 1000, target: 1.0 },
  { labelKey: "breathing.phase_out", duration: 4000, target: 0.55 },
];
const GUIDANCE_FULL_CYCLES = 3;
const GUIDANCE_SOFT_CYCLES = 1;
const GUIDANCE_SOFT_VOLUME = 0.65;
const AUDIO_DEBUG = true;

interface Props {
  speak: (t: string, options?: { volume?: number }) => void;
  onComplete: () => void;
  onSkip: () => void;
  onHideOverlay: () => void; // ← new
  onShowOverlay: () => void; // ← new
  musicEnabled?: boolean;
  guidanceEnabled?: boolean;
  onGuidanceChange?: (enabled: boolean) => void;
  rtlChildSex?: RtlChildSex;
}

type State = "idle" | "active" | "complete";

export default function BreathingScreen({
  speak,
  onComplete,
  onSkip,
  onHideOverlay,
  onShowOverlay,
  musicEnabled = true,
  guidanceEnabled = true,
  onGuidanceChange,
  rtlChildSex = "male",
}: Props) {
  const [state, setState] = useState<State>("idle");
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  const buddyScale = useRef(new Animated.Value(0.2)).current;
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStart = useRef<number>(0);
  const soundRef = useRef<AudioPlayer | null>(null);
  const soundSubRef = useRef<{ remove: () => void } | null>(null);
  const firstInhaleRef = useRef(true);
  const guidanceStepRef = useRef(0);
  const guidanceEnabledRef = useRef(guidanceEnabled);

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
    if (!musicEnabled) return;
    if (AUDIO_DEBUG) console.log("[breathing-audio] loadAndPlayAudio:start");
    try {
      await setIsAudioActiveAsync(true);
      if (AUDIO_DEBUG) console.log("[breathing-audio] setIsAudioActiveAsync(true):ok");
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: "doNotMix",
        allowsRecording: false,
        shouldRouteThroughEarpiece: false,
        shouldPlayInBackground: false,
      });
      if (AUDIO_DEBUG) console.log("[breathing-audio] setAudioModeAsync:ok");
    } catch (e) {
      console.warn("setAudioModeAsync failed:", e);
    }
    try {
      const source = require("../assets/audio/breathing.mp3");
      if (AUDIO_DEBUG) console.log("[breathing-audio] source:", source);
      const sound = createAudioPlayer(source, {
        keepAudioSessionActive: true,
      });
      if (AUDIO_DEBUG) console.log("[breathing-audio] player created");
      try {
        soundSubRef.current = sound.addListener(
          "playbackStatusUpdate",
          (status: any) => {
            if (!AUDIO_DEBUG) return;
            console.log("[breathing-audio] status:", {
              playing: status?.playing,
              muted: status?.muted,
              currentTime: status?.currentTime,
              duration: status?.duration,
              reason: status?.reasonForWaitingToPlay,
            });
          },
        );
      } catch (e) {
        if (AUDIO_DEBUG) {
          console.log("[breathing-audio] addListener failed:", String(e));
        }
      }
      sound.loop = true;
      sound.volume = 0.65;
      soundRef.current = sound;
      if (AUDIO_DEBUG) console.log("[breathing-audio] play()");
      sound.play();
      // iOS route/session quirk guard: retry once shortly after initial play.
      setTimeout(() => {
        try {
          sound.play();
          if (AUDIO_DEBUG) console.log("[breathing-audio] play() retry");
        } catch {}
      }, 250);
    } catch (e) {
      console.warn("Audio load/play failed:", e);
      soundRef.current = null;
    }
  }

  async function stopAudio() {
    if (AUDIO_DEBUG) console.log("[breathing-audio] stopAudio:start");
    if (!soundRef.current) return;
    try {
      soundSubRef.current?.remove();
    } catch {}
    soundSubRef.current = null;
    try {
      soundRef.current.pause();
      if (AUDIO_DEBUG) console.log("[breathing-audio] pause:ok");
    } catch {}
    try {
      soundRef.current.remove();
      if (AUDIO_DEBUG) console.log("[breathing-audio] remove:ok");
    } catch {}
    soundRef.current = null;
    try {
      await setIsAudioActiveAsync(false);
      if (AUDIO_DEBUG) console.log("[breathing-audio] setIsAudioActiveAsync(false):ok");
    } catch {}
  }

  function runPhase(idx: number) {
    const phase = PHASES[idx];
    const spokenKey =
      idx === 0 && firstInhaleRef.current
        ? "breathing.phase_first_in"
        : phase.labelKey;
    firstInhaleRef.current = false;
    const guidanceCycle = Math.floor(guidanceStepRef.current / PHASES.length);
    const guidanceVolume =
      guidanceCycle < GUIDANCE_FULL_CYCLES
        ? 1
        : guidanceCycle < GUIDANCE_FULL_CYCLES + GUIDANCE_SOFT_CYCLES
          ? GUIDANCE_SOFT_VOLUME
          : 0;
    if (guidanceEnabledRef.current) {
      if (guidanceVolume > 0) {
        speak(tSpeak(spokenKey, undefined, rtlChildSex), {
          volume: guidanceVolume,
        });
      }
    }
    guidanceStepRef.current += 1;
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
    firstInhaleRef.current = true;
    guidanceStepRef.current = 0;
    sessionStart.current = Date.now();
    // 1. Hide the global overlay Buddy
    onHideOverlay();
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
    speak(tSpeak("breathing.done_speak", undefined, rtlChildSex));
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

  useEffect(() => {
    guidanceEnabledRef.current = guidanceEnabled;
  }, [guidanceEnabled]);

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
        <TouchableOpacity
          style={s.btnSecondary}
          onPress={onSkip}
          activeOpacity={0.78}
        >
          <Text style={s.btnSecondaryTxt}>{t("breathing.btn_back")}</Text>
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
      <TouchableOpacity
        style={[
          s.guidanceToggle,
          guidanceEnabled && s.guidanceToggleEnabled,
        ]}
        onPress={() => onGuidanceChange?.(!guidanceEnabled)}
        activeOpacity={0.75}
        accessibilityRole="switch"
        accessibilityState={{ checked: guidanceEnabled }}
        accessibilityLabel={t(
          guidanceEnabled
            ? "breathing.guidance_off_a11y"
            : "breathing.guidance_on_a11y",
        )}
      >
        <Text style={s.guidanceToggleTxt}>
          {guidanceEnabled ? "🔊" : "🔇"}
        </Text>
      </TouchableOpacity>

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
        style={s.btnExit}
        onPress={handleExit}
        activeOpacity={0.7}
      >
        <Text style={s.btnExitTxt}>{t("breathing.btn_finish")}</Text>
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
  guidanceToggle: {
    position: "absolute",
    top: 14,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFDF9",
    borderWidth: 0.5,
    borderColor: "#DED8CE",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  guidanceToggleEnabled: {
    backgroundColor: C.greenLt,
    borderColor: "#CFE9DD",
  },
  guidanceToggleTxt: { fontSize: 20 },

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

  btnSecondary: {
    backgroundColor: "#FFFDF9",
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: "#CFE9DD",
    paddingVertical: 15,
    paddingHorizontal: 48,
    marginTop: 12,
    minWidth: 220,
    alignItems: "center",
  },
  btnSecondaryTxt: {
    fontSize: 16,
    color: C.green,
    fontWeight: "600",
  },
  btnExit: {
    marginTop: 24,
    backgroundColor: "#FFFDF9",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "#DED8CE",
    paddingVertical: 12,
    paddingHorizontal: 28,
    minWidth: 180,
    alignItems: "center",
  },
  btnExitTxt: {
    fontSize: 14,
    color: C.muted,
    fontWeight: "600",
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
