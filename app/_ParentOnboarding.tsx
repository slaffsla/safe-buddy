// _ParentOnboarding.tsx — One-time parent onboarding, 3 screens.
// Shown before child onboarding on very first launch.
// Parent can skip at any time.

import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Buddy from "./_Buddy";
import { C } from "./_constants";
import { t } from "./i18n";

interface Props {
  onDone: () => void;
}

// ── Breathing circle for screen 3 ─────────────────────────────────────────────
// Self-contained preview: no audio and no session timer.

const PHASE_KEYS = [
  "breathing.phase_in",
  "breathing.phase_hold",
  "breathing.phase_out",
] as const;
const PHASE_DURATIONS = [4000, 1000, 3000] as const;

function MiniBreathingCircle() {
  const scale = useRef(new Animated.Value(0.6)).current;
  const [phase, setPhase] = useState(0);
  const [active, setActive] = useState(false);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!active) {
      animRef.current?.stop();
      Animated.timing(scale, {
        toValue: 0.6,
        duration: 600,
        useNativeDriver: true,
      }).start();
      return;
    }

    function runPhase(idx: number) {
      if (cancelled) return;
      setPhase(idx);
      const toValue = idx === 2 ? 0.6 : 1.0;
      animRef.current = Animated.timing(scale, {
        toValue,
        duration: PHASE_DURATIONS[idx],
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      });
      animRef.current.start(({ finished }) => {
        if (finished) runPhase((idx + 1) % PHASE_KEYS.length);
      });
    }

    runPhase(0);
    return () => {
      cancelled = true;
      animRef.current?.stop();
    };
  }, [active, scale]);

  return (
    <View style={bc.wrapper}>
      <TouchableOpacity
        onPress={() => setActive((a) => !a)}
        activeOpacity={0.9}
      >
        <Animated.View style={[bc.circle, { transform: [{ scale }] }]}>
          <Text style={bc.phaseText}>
            {active ? t(PHASE_KEYS[phase]) : "▶"}
          </Text>
        </Animated.View>
      </TouchableOpacity>
      <Text style={bc.hint}>{t("parent_onboarding.screen3_try")}</Text>
    </View>
  );
}

const bc = StyleSheet.create({
  wrapper: { alignItems: "center", marginVertical: 24 },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: C.greenLt,
    borderWidth: 2,
    borderColor: C.green,
    alignItems: "center",
    justifyContent: "center",
  },
  phaseText: { fontSize: 18, fontWeight: "600", color: C.green },
  hint: {
    marginTop: 12,
    fontSize: 12,
    color: C.muted,
    textAlign: "center",
    fontStyle: "italic",
  },
});

// ── Screen 1 — Who is Buddy ───────────────────────────────────────────────────

function Screen1({ speak }: { speak: (t: string) => void }) {
  return (
    <ScrollView contentContainerStyle={s.screenScroll}>
      <Buddy mood="calm" speak={speak} celebrate={false} />
      <Text style={s.heading}>{t("parent_onboarding.screen1_heading")}</Text>
      <Text style={s.body}>{t("parent_onboarding.screen1_sub")}</Text>
      <View style={s.noteCard}>
        <Text style={s.noteText}>💬 {t("parent_onboarding.screen1_note")}</Text>
      </View>
    </ScrollView>
  );
}

// ── Screen 2 — How to use together ───────────────────────────────────────────

function Screen2() {
  const tips = [
    t("parent_onboarding.screen2_tip_1"),
    t("parent_onboarding.screen2_tip_2"),
    t("parent_onboarding.screen2_tip_3"),
    t("parent_onboarding.screen2_tip_4"),
  ];
  return (
    <ScrollView contentContainerStyle={s.screenScroll}>
      <Text style={s.bigEmoji}>🤝</Text>
      <Text style={s.heading}>{t("parent_onboarding.screen2_heading")}</Text>
      <Text style={s.body}>{t("parent_onboarding.screen2_body")}</Text>
      <View style={s.tipsCard}>
        <Text style={s.tipsLabel}>
          {t("parent_onboarding.screen2_tip_label")}
        </Text>
        {tips.map((tip, i) => (
          <View key={tip} style={s.tipRow}>
            <View style={s.tipDot}>
              <Text style={s.tipNum}>{i + 1}</Text>
            </View>
            <Text style={s.tipText}>{tip}</Text>
          </View>
        ))}
      </View>
      <Text style={s.noteText}>✨ {t("parent_onboarding.screen2_note")}</Text>
    </ScrollView>
  );
}

// ── Screen 3 — Breathing ──────────────────────────────────────────────────────

function Screen3() {
  return (
    <ScrollView contentContainerStyle={s.screenScroll}>
      <Text style={s.bigEmoji}>🌬️</Text>
      <Text style={s.heading}>{t("parent_onboarding.screen3_heading")}</Text>
      <Text style={s.body}>{t("parent_onboarding.screen3_body")}</Text>
      <View style={s.patternBadge}>
        <Text style={s.patternText}>
          {t("parent_onboarding.screen3_pattern")}
        </Text>
      </View>
      <MiniBreathingCircle />
      <View style={s.scienceCard}>
        <Text style={s.scienceText}>
          {t("parent_onboarding.screen3_science")}
        </Text>
      </View>
    </ScrollView>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const SCREENS = [Screen1, Screen2, Screen3];

export default function ParentOnboarding({ onDone }: Props) {
  const [step, setStep] = useState(0);
  const isLast = step === SCREENS.length - 1;
  const CurrentScreen = SCREENS[step];

  const speak = (_: string) => {};

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <View style={s.dots}>
          {SCREENS.map((_, i) => (
            <View key={i} style={[s.dot, i === step && s.dotActive]} />
          ))}
        </View>
        <TouchableOpacity onPress={onDone} style={s.skipBtn}>
          <Text style={s.skipTxt}>{t("parent_onboarding.skip")}</Text>
        </TouchableOpacity>
      </View>

      <View style={s.content}>
        <CurrentScreen speak={speak} />
      </View>

      <View style={s.footer}>
        {isLast ? (
          <TouchableOpacity style={s.btnPrimary} onPress={onDone}>
            <Text style={s.btnPrimaryTxt}>{t("parent_onboarding.done")}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={s.btnPrimary}
            onPress={() => setStep((n) => n + 1)}
          >
            <Text style={s.btnPrimaryTxt}>{t("parent_onboarding.next")}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  dots: { flexDirection: "row", gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.border },
  dotActive: { backgroundColor: C.green, width: 20 },
  skipBtn: { padding: 8 },
  skipTxt: { fontSize: 14, color: C.muted },

  content: { flex: 1 },
  screenScroll: { alignItems: "center", padding: 24, paddingBottom: 16 },

  bigEmoji: { fontSize: 64, marginBottom: 16, marginTop: 8 },
  heading: {
    fontSize: 24,
    fontWeight: "800",
    color: C.text,
    textAlign: "center",
    marginBottom: 14,
    lineHeight: 30,
  },
  body: {
    fontSize: 16,
    color: C.muted,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 20,
  },

  noteCard: {
    backgroundColor: C.greenLt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.green,
    padding: 14,
    width: "100%",
  },
  noteText: {
    fontSize: 13,
    color: C.green,
    lineHeight: 20,
    textAlign: "center",
    fontStyle: "italic",
  },

  tipsCard: {
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    width: "100%",
    marginBottom: 16,
  },
  tipsLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: C.muted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 12,
  },
  tipDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.green,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  tipNum: { fontSize: 12, fontWeight: "700", color: C.white },
  tipText: { fontSize: 14, color: C.text, flex: 1, lineHeight: 20 },

  patternBadge: {
    backgroundColor: C.greenLt,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginBottom: 4,
  },
  patternText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.green,
    textAlign: "center",
    letterSpacing: 0.3,
  },

  scienceCard: {
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    width: "100%",
    marginTop: 8,
  },
  scienceText: {
    fontSize: 12,
    color: C.muted,
    lineHeight: 19,
    textAlign: "center",
    fontStyle: "italic",
  },

  footer: { padding: 20, paddingBottom: 32 },
  btnPrimary: {
    backgroundColor: C.green,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: "center",
    width: "100%",
  },
  btnPrimaryTxt: { fontSize: 17, color: C.white, fontWeight: "700" },
});
