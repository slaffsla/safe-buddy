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
  setAudioModeAsync,
  setIsAudioActiveAsync,
  type AudioPlayer,
} from "expo-audio";
import { FontAwesome5 } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Buddy from "./_Buddy";
import { BUDDY_FIXED_SPACER, C } from "./_constants";
import { RtlChildSex, t, tSpeak } from "./i18n";

const { width: SCREEN_W } = Dimensions.get("window");
export const BUDDY_BASE = Math.round(SCREEN_W * 0.46); // ~20% larger than before

// Hard-coded session length. Do not lift to settings.
const BREATHING_DURATION_MS = 120_000;

// Breathing rhythm: 3s inhale, 1s pause, 4s exhale.
// Labels are resolved via i18n at render time so they follow the device locale.
const PHASES: { labelKey: string; duration: number; target: number }[] = [
  { labelKey: "breathing.phase_in", duration: 3000, target: 1.0 },
  { labelKey: "breathing.phase_hold", duration: 1000, target: 1.0 },
  { labelKey: "breathing.phase_out", duration: 4000, target: 0.74 },
];
const EXHALE_PET_MULTIPLIER = 1.15;
const GUIDANCE_FULL_CYCLES = 3;
const GUIDANCE_SOFT_CYCLES = 1;
const GUIDANCE_SOFT_VOLUME = 0.65;
const PREP_HINT_DURATION_MS = 3500;
const NATURE_FACT_VISIBLE_MS = 10000;
// Shows around 2:00 in a 3:00 session; for shorter sessions, show near the end.
const NATURE_FACT_DELAY_MS = Math.min(
  120000,
  Math.max(10000, BREATHING_DURATION_MS - 20000),
);

interface Props {
  speak: (t: string, options?: { volume?: number }) => void;
  onComplete: () => void;
  onSkip: () => void;
  onHideOverlay: () => void; // ← new
  onShowOverlay: () => void; // ← new
  musicEnabled?: boolean;
  guidanceEnabled?: boolean;
  introEnabled?: boolean;
  onSessionStart?: () => void;
  onMusicChange?: (enabled: boolean) => void;
  onGuidanceChange?: (enabled: boolean) => void;
  rtlChildSex?: RtlChildSex;
}

type State = "idle" | "priming" | "active" | "complete";

export default function BreathingScreen({
  speak,
  onComplete,
  onSkip,
  onHideOverlay,
  onShowOverlay,
  musicEnabled = true,
  guidanceEnabled = true,
  introEnabled = true,
  onSessionStart,
  onMusicChange,
  onGuidanceChange,
  rtlChildSex = "male",
}: Props) {
  const [state, setState] = useState<State>("idle");
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [isPetting, setIsPetting] = useState(false);
  const [showNatureFact, setShowNatureFact] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [phaseElapsedMs, setPhaseElapsedMs] = useState(0);
  const [prepRemainingMs, setPrepRemainingMs] = useState(PREP_HINT_DURATION_MS);

  const buddyScale = useRef(new Animated.Value(0.2)).current;
  const pulseOpacity = useRef(new Animated.Value(0)).current;
  const prepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prepTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const natureFactTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const natureFactHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const natureFactShown = useRef(false);
  const isPettingRef = useRef(false);
  const phaseStartedAtRef = useRef(0);
  const phaseDurationRef = useRef(PHASES[0].duration);
  const sessionStart = useRef<number>(0);
  const stateRef = useRef<State>("idle");
  const soundRef = useRef<AudioPlayer | null>(null);
  const audioLoadTokenRef = useRef(0);
  const audioLoadingRef = useRef(false);
  const lastCardSpeakAtRef = useRef(0);
  const firstInhaleRef = useRef(true);
  const guidanceStepRef = useRef(0);
  const guidanceEnabledRef = useRef(guidanceEnabled);
  const guidanceMuteUntilRef = useRef(0);

  // ── Lifecycle helpers ───────────────────────────────────────────────────────
  function clearTimers() {
    if (prepTimerRef.current) {
      clearTimeout(prepTimerRef.current);
      prepTimerRef.current = null;
    }
    if (prepTickRef.current) {
      clearInterval(prepTickRef.current);
      prepTickRef.current = null;
    }
    if (phaseTimerRef.current) {
      clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (natureFactTimerRef.current) {
      clearTimeout(natureFactTimerRef.current);
      natureFactTimerRef.current = null;
    }
    if (natureFactHideTimerRef.current) {
      clearTimeout(natureFactHideTimerRef.current);
      natureFactHideTimerRef.current = null;
    }
  }

  const loadAndPlayAudio = useCallback(async () => {
    if (!musicEnabled) return;
    if (stateRef.current !== "active") return;
    if (soundRef.current) return;
    if (audioLoadingRef.current) return;
    audioLoadingRef.current = true;
    const token = ++audioLoadTokenRef.current;
    try {
      await setIsAudioActiveAsync(true);
      if (token !== audioLoadTokenRef.current || stateRef.current !== "active") {
        return;
      }
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: "mixWithOthers",
        allowsRecording: false,
        shouldRouteThroughEarpiece: false,
        shouldPlayInBackground: false,
      });
      if (token !== audioLoadTokenRef.current || stateRef.current !== "active") {
        return;
      }
    } catch (e) {
      console.warn("setAudioModeAsync failed:", e);
    }
    try {
      const source = require("../assets/audio/breathing.mp3");
      const sound = createAudioPlayer(source, {
        keepAudioSessionActive: true,
      });
      sound.loop = true;
      sound.volume = 0.65;
      if (token !== audioLoadTokenRef.current || stateRef.current !== "active") {
        try {
          sound.remove();
        } catch {}
        return;
      }
      soundRef.current = sound;
      sound.play();
      // iOS route/session quirk guard: retry once shortly after initial play.
      setTimeout(() => {
        try {
          if (token !== audioLoadTokenRef.current) return;
          if (stateRef.current !== "active") return;
          if (soundRef.current === sound && !sound.playing) sound.play();
        } catch {}
      }, 250);
    } catch (e) {
      const msg = String(e);
      if (
        msg.includes("Received 4 arguments, but 3 was expected") ||
        msg.includes("Received 3 arguments, but 4 was expected")
      ) {
        console.warn(
          "Audio native/JS mismatch detected. Rebuild the iOS dev client so native expo modules match package versions.",
        );
      }
      console.warn("Audio load/play failed:", e);
      soundRef.current = null;
    } finally {
      if (token === audioLoadTokenRef.current) {
        audioLoadingRef.current = false;
      }
    }
  }, [musicEnabled]);

  const stopAudio = useCallback(() => {
    audioLoadTokenRef.current += 1;
    audioLoadingRef.current = false;
    const sound = soundRef.current;
    soundRef.current = null;
    if (!sound) return;
    try {
      sound.pause();
    } catch {}
    try {
      sound.remove();
    } catch {}
    setIsAudioActiveAsync(false).catch(() => {});
  }, []);

  function runPhase(idx: number) {
    const phase = PHASES[idx];
    const phaseDuration =
      idx === 2
        ? Math.round(
            phase.duration * (isPettingRef.current ? EXHALE_PET_MULTIPLIER : 1),
          )
        : phase.duration;
    phaseStartedAtRef.current = Date.now();
    phaseDurationRef.current = phaseDuration;
    setPhaseElapsedMs(0);
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
    if (
      guidanceEnabledRef.current &&
      !showNatureFact &&
      Date.now() >= guidanceMuteUntilRef.current
    ) {
      if (guidanceVolume > 0) {
        speak(tSpeak(spokenKey, undefined, rtlChildSex), {
          volume: guidanceVolume,
        });
      }
    }
    guidanceStepRef.current += 1;
    setCurrentPhaseIndex(idx);
    Animated.timing(buddyScale, {
      toValue: phase.target,
      duration: phaseDuration,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
    setPhaseIdx(idx);
    phaseTimerRef.current = setTimeout(() => {
      runPhase((idx + 1) % PHASES.length);
    }, phaseDuration);
  }

  function startSessionCore() {
    if (prepTimerRef.current) {
      clearTimeout(prepTimerRef.current);
      prepTimerRef.current = null;
    }
    if (prepTickRef.current) {
      clearInterval(prepTickRef.current);
      prepTickRef.current = null;
    }
    setPrepRemainingMs(0);
    setState("active");
    setElapsedMs(0);
    setPhaseElapsedMs(0);
    setPhaseIdx(0);
    setCurrentPhaseIndex(0);
    setIsPetting(false);
    isPettingRef.current = false;
    setShowNatureFact(false);
    natureFactShown.current = false;
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
        toValue: 0.83,
        duration: 650,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        runPhase(0); // now starts with a big visible inhale expansion
      });
    });
    // tick the progress bar
    tickRef.current = setInterval(() => {
      const now = Date.now();
      const dt = now - sessionStart.current;
      if (dt >= BREATHING_DURATION_MS) {
        clearTimers();
        finishSession();
        return;
      }
      setElapsedMs(dt);
      if (phaseStartedAtRef.current > 0) {
        setPhaseElapsedMs(Math.max(0, now - phaseStartedAtRef.current));
      }
    }, 200);
    natureFactTimerRef.current = setTimeout(() => {
      if (natureFactShown.current) return;
      natureFactShown.current = true;
      setShowNatureFact(true);
      natureFactHideTimerRef.current = setTimeout(() => {
        setShowNatureFact(false);
      }, NATURE_FACT_VISIBLE_MS);
    }, NATURE_FACT_DELAY_MS);
  }

  function startSession() {
    onSessionStart?.();
    clearTimers();
    if (!introEnabled) {
      startSessionCore();
      return;
    }
    setPrepRemainingMs(PREP_HINT_DURATION_MS);
    setState("priming");
    speak(petHintText);
    const prepStart = Date.now();
    prepTickRef.current = setInterval(() => {
      const dt = Date.now() - prepStart;
      const remaining = Math.max(0, PREP_HINT_DURATION_MS - dt);
      setPrepRemainingMs(remaining);
    }, 100);
    prepTimerRef.current = setTimeout(() => {
      startSessionCore();
    }, PREP_HINT_DURATION_MS);
  }

  function finishSession() {
    clearTimers();
    stopAudio();
    setIsPetting(false);
    isPettingRef.current = false;
    setShowNatureFact(false);
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
    setIsPetting(false);
    isPettingRef.current = false;
    setShowNatureFact(false);
    onShowOverlay(); // ← restore global Buddy
    onSkip();
  }

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      clearTimers();
      stopAudio();
    };
  }, [stopAudio]);

  useEffect(() => {
    guidanceEnabledRef.current = guidanceEnabled;
  }, [guidanceEnabled]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (state !== "active") return;
    if (musicEnabled) {
      loadAndPlayAudio();
      return;
    }
    stopAudio();
  }, [musicEnabled, state, loadAndPlayAudio, stopAudio]);

  useEffect(() => {
    if (state === "active") return;
    stopAudio();
  }, [state, stopAudio]);

  useEffect(() => {
    isPettingRef.current = isPetting;
  }, [isPetting]);

  const guideStep =
    phaseIdx === 0
      ? 1 + Math.min(2, Math.floor(phaseElapsedMs / 1000))
      : phaseIdx === 1
        ? 4
        : 5 +
          Math.min(
            3,
            Math.floor((phaseElapsedMs / Math.max(1, phaseDurationRef.current)) * 4),
          );

  useEffect(() => {
    if (state !== "active") {
      pulseOpacity.setValue(0);
      return;
    }
    Animated.sequence([
      Animated.timing(pulseOpacity, {
        toValue: 0.65,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(pulseOpacity, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [guideStep, pulseOpacity, state]);

  const petHintText = tSpeak("breathing.pet_hint", undefined, rtlChildSex);
  const natureFactText = tSpeak(
    "tiny_facts.breathing_nature",
    undefined,
    rtlChildSex,
  );
  const speakCardText = useCallback(
    (text: string) => {
      const now = Date.now();
      if (now - lastCardSpeakAtRef.current < 350) return;
      lastCardSpeakAtRef.current = now;
      // Prevent phase prompts from cutting off the card text.
      guidanceMuteUntilRef.current = Date.now() + 10000;
      speak(text, { volume: 1 });
    },
    [speak],
  );
  const prepCountdown =
    prepRemainingMs > 2000 ? 3 : prepRemainingMs > 1000 ? 2 : 1;

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

  if (state === "priming") {
    return (
      <View style={s.screen}>
        <View style={{ height: BUDDY_FIXED_SPACER }} />
        <Text style={s.title}>{t("breathing.title")}</Text>
        <Text style={s.subtitle}>{t("breathing.subtitle")}</Text>

        <View style={s.circleStatic}>
          <Text style={s.circleEmoji}>🌬️</Text>
          <View style={s.prepCountdownOverlay} pointerEvents="none">
            <Text style={s.prepCountdownTxt}>{prepCountdown}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={s.natureFact}
          onPressIn={() => speakCardText(petHintText)}
          onPress={() => speakCardText(petHintText)}
          activeOpacity={0.8}
        >
          <Text style={s.natureFactText}>💡 {petHintText}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.btnSecondary}
          onPress={handleExit}
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
      <View style={s.topRightControls}>
        <TouchableOpacity
          style={[s.controlToggle, musicEnabled && s.controlToggleEnabled]}
          onPress={() => onMusicChange?.(!musicEnabled)}
          activeOpacity={0.75}
          accessibilityRole="switch"
          accessibilityState={{ checked: musicEnabled }}
          accessibilityLabel={t(
            musicEnabled ? "breathing.music_off_a11y" : "breathing.music_on_a11y",
          )}
        >
          <FontAwesome5
            name="drum-steelpan"
            size={18}
            color={musicEnabled ? C.green : C.muted}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.controlToggle, guidanceEnabled && s.controlToggleEnabled]}
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
          <Text style={s.guidanceToggleTxt}>{guidanceEnabled ? "🔊" : "🔇"}</Text>
        </TouchableOpacity>
      </View>

      {/* Phase label + timer sit above Buddy */}
      <Text style={s.phaseLabel}>{phaseLabel}</Text>
      <Text style={s.timeLeft}>
        {mm}:{ss}
      </Text>

      {/* Buddy IS the breathing element — no separate circle */}
      <View style={s.buddyContainer}>
        <Buddy
          mood="serene"
          speak={speak}
          size={BUDDY_BASE}
          phaseScale={buddyScale}
          pettable={currentPhaseIndex !== 0}
          onPettingChange={(petting) => {
            setIsPetting(petting);
            isPettingRef.current = petting;
          }}
        />
      </View>
      {showNatureFact && (
        <TouchableOpacity
          style={s.natureFact}
          onPressIn={() => speakCardText(natureFactText)}
          onPress={() => speakCardText(natureFactText)}
          activeOpacity={0.8}
        >
          <Text style={s.natureFactText}>🌿 {natureFactText}</Text>
        </TouchableOpacity>
      )}
      <View style={s.cycleGuideWrap}>
        <View style={s.cycleGuideRow}>
          {[1, 2, 3, "|", 4, "|", 5, 6, 7, 8].map((item, idx) => {
            if (item === "|") {
              return (
                <Text key={`sep-${idx}`} style={s.cycleSep}>
                  |
                </Text>
              );
            }
            const active = guideStep === item;
            return (
              <Text key={`step-${item}`} style={[s.cycleStep, active && s.cycleStepActive]}>
                {item}
              </Text>
            );
          })}
        </View>
        <Animated.View style={[s.cyclePulse, { opacity: pulseOpacity }]} />
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
  topRightControls: {
    position: "absolute",
    top: 14,
    right: 16,
    flexDirection: "row",
    gap: 10,
    zIndex: 5,
  },
  controlToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFDF9",
    borderWidth: 0.5,
    borderColor: "#DED8CE",
    alignItems: "center",
    justifyContent: "center",
  },
  controlToggleEnabled: {
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
  prepCountdownOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: CIRCLE_BASE / 2,
    backgroundColor: C.greenLt,
    alignItems: "center",
    justifyContent: "center",
  },
  prepCountdownTxt: {
    fontSize: 34,
    fontWeight: "800",
    color: C.green,
  },

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
  cycleGuideWrap: {
    width: "100%",
    marginTop: 8,
    alignItems: "center",
  },
  cycleGuideRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFDF9",
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "#DED8CE",
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  cycleStep: {
    minWidth: 14,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: C.muted,
  },
  cycleStepActive: {
    color: C.green,
    fontWeight: "800",
  },
  cycleSep: {
    fontSize: 12,
    fontWeight: "700",
    color: C.border,
    marginHorizontal: 2,
  },
  cyclePulse: {
    width: 26,
    height: 2,
    borderRadius: 1,
    marginTop: 4,
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
  buddyContainer: {
    width: BUDDY_BASE * 1.45,
    height: BUDDY_BASE * 1.45,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
    overflow: "visible",
  },
  natureFact: {
    backgroundColor: C.greenLt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.green,
    padding: 14,
    marginTop: 4,
    width: "100%",
  },
  natureFactText: {
    fontSize: 13,
    color: C.green,
    textAlign: "center",
    lineHeight: 20,
    fontStyle: "italic",
  },
});
