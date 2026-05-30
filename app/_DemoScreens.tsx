// _DemoScreens.tsx — SafeBuddy demo / onboarding flow screens

import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { T } from "./_SharedUI";
import { C } from "./_constants";
import { t, tDemoStepPraise, tDemoStepTitle } from "./i18n";
import { BUDDY_CONTENT_SPACER, CONTENT_MAX_WIDTH } from "./_layoutMetrics";

// ── DemoIntroScreen ───────────────────────────────────────────────────────────

export function DemoIntroScreen({
  onStart,
  onSkip,
  speak,
}: {
  onStart: () => void;
  onSkip: () => void;
  speak: (t: string) => void;
}) {
  return (
    <ScrollView contentContainerStyle={s.screen}>
      <View style={{ height: BUDDY_CONTENT_SPACER }} />
      <T style={s.msg} speak={speak}>
        {t("demo.intro_title")}
      </T>
      <T style={s.sub} speak={speak}>
        {t("demo.intro_sub")}
      </T>
      <TouchableOpacity style={s.btnPrimary} onPress={onStart}>
        <Text style={s.btnPrimaryTxt}>{t("demo.intro_start")}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btnSkip} onPress={onSkip}>
        <Text style={s.btnSkipTxt}>{t("common.skip")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── DemoStepScreen ────────────────────────────────────────────────────────────

export function DemoStepScreen({
  step,
  stepIndex,
  totalSteps,
  onDone,
  speak,
}: {
  step: {
    id?: string;
    title: string;
    emoji: string;
    praise: string;
    praiseKey: string;
  };
  stepIndex: number;
  totalSteps: number;
  onDone: () => void;
  speak: (t: string) => void;
}) {
  const [done, setDone] = useState(false);
  // Resolve translated copy with the canonical Russian title/praise as fallback
  // so custom or missing-key cases never break.
  const localizedTitle = step.id
    ? tDemoStepTitle(step.id, step.title)
    : step.title;
  const localizedPraise = step.id
    ? tDemoStepPraise(step.id, t(step.praiseKey))
    : step.praise;

  function handleDone() {
    if (done) return;
    setDone(true);
    speak(localizedPraise);
    setTimeout(onDone, 1000);
  }

  return (
    <ScrollView contentContainerStyle={s.screen}>
      <View style={{ height: BUDDY_CONTENT_SPACER }} />
      <View style={s.stepCounter}>
        {Array(totalSteps)
          .fill(0)
          .map((_: any, i: number) => (
            <View
              key={i}
              style={[s.stepDot, i <= stepIndex && s.stepDotActive]}
            />
          ))}
      </View>
      <TouchableOpacity
        style={s.demoCard}
        onPress={() => speak(localizedTitle)}
        activeOpacity={0.85}
      >
        <Text style={s.demoEmoji}>{step.emoji}</Text>
        <Text style={s.demoTitle}>{localizedTitle}</Text>
        <Text style={s.tapHint}>{t("demo.step_tap_hint")}</Text>
      </TouchableOpacity>
      {!done ? (
        <TouchableOpacity style={s.btnPrimary} onPress={handleDone}>
          <Text style={s.btnPrimaryTxt}>{t("demo.step_done")}</Text>
        </TouchableOpacity>
      ) : (
        <View style={s.praiseRow}>
          <Text style={s.praiseText}>{localizedPraise} 🎉</Text>
        </View>
      )}
    </ScrollView>
  );
}

// ── DemoCompleteScreen ────────────────────────────────────────────────────────

export function DemoCompleteScreen({
  onGoToMissions,
  onGoHome,
  speak,
}: {
  onGoToMissions: () => void;
  onGoHome: () => void;
  speak: (t: string) => void;
}) {
  return (
    <ScrollView contentContainerStyle={s.screen}>
      <View style={{ height: BUDDY_CONTENT_SPACER }} />
      <Text style={s.celebTitle}>{t("demo.complete_title")}</Text>
      <T style={s.msg} speak={speak}>
        {t("demo.complete_msg")}
      </T>
      <View style={s.demoCompleteButtons}>
        <TouchableOpacity style={s.btnPrimary} onPress={onGoToMissions}>
          <Text style={s.btnPrimaryTxt}>{t("demo.complete_yes")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnSecondary} onPress={onGoHome}>
          <Text style={s.btnSecondaryTxt}>{t("demo.complete_later")}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: {
    flexGrow: 1,
    width: "100%",
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: C.bg,
  },
  msg: {
    fontSize: 17,
    color: C.text,
    textAlign: "center",
    marginVertical: 8,
    lineHeight: 25,
    paddingHorizontal: 8,
  },
  sub: { fontSize: 13, color: C.muted, marginBottom: 6, textAlign: "center" },
  tapHint: { fontSize: 11, color: C.muted, marginTop: 10, fontStyle: "italic" },
  celebTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: C.green,
    marginBottom: 4,
    textAlign: "center",
  },

  stepCounter: { flexDirection: "row", gap: 8, marginBottom: 16 },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.border,
  },
  stepDotActive: { backgroundColor: C.green },
  demoCard: {
    backgroundColor: "#FFFDF9",
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: "#DED8CE",
    padding: 32,
    alignItems: "center",
    width: "100%",
    marginVertical: 12,
  },
  demoEmoji: { fontSize: 64, marginBottom: 12 },
  demoTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: C.text,
    textAlign: "center",
  },
  praiseRow: { marginTop: 16, alignItems: "center" },
  praiseText: { fontSize: 26, fontWeight: "800", color: C.green },

  demoCompleteButtons: { width: "100%", marginTop: 8 },
  btnPrimary: {
    backgroundColor: C.green,
    borderRadius: 16,
    paddingVertical: 17,
    paddingHorizontal: 32,
    marginTop: 10,
    width: "100%",
    alignItems: "center",
  },
  btnPrimaryTxt: { fontSize: 19, color: "#fff", fontWeight: "700" },
  btnSecondary: {
    backgroundColor: "#FFF9EC",
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: "#E8D7A9",
    paddingVertical: 15,
    paddingHorizontal: 32,
    marginTop: 8,
    width: "100%",
    alignItems: "center",
  },
  btnSecondaryTxt: { fontSize: 17, color: "#92400E", fontWeight: "600" },
  btnSkip: { marginTop: 10, padding: 12 },
  btnSkipTxt: { fontSize: 15, color: C.muted },
});

// Expo Router: suppress "missing default export" warning for non-route files
export default function _DemoScreens() {
  return null;
}
