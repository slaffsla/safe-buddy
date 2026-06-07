// _MorningRoutineScreen.tsx — SafeBuddy morning ritual
// Step-by-step checklist. Triggered once per day before noon.
// Earns morningStars on full completion.

import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  C,
  MorningStep,
  getMorningStepTitle,
} from "./_constants";
import { RtlChildSex, t, tGender, tSpeak } from "./i18n";
import { useLayoutMetrics } from "../lib/layoutMetrics";
import { visualAssets } from "../lib/visualAssets";

interface Props {
  childName: string;
  steps: MorningStep[];
  stars: number; // star reward from settings (default 1)
  rtlChildSex?: RtlChildSex;
  speak: (t: string) => void;
  onComplete: (starsEarned: number) => void;
  onSkip: () => void;
}

const STEP_COLORS = [
  { bg: "#F4FAF7", border: "#CFE9DD", well: "#DFF5EC" },
  { bg: "#FFF8E7", border: "#F1D58E", well: "#FFE7B8" },
  { bg: "#EEF2FF", border: "#D6DDFC", well: "#E1E7FF" },
  { bg: "#FFF1E9", border: "#F5C7B5", well: "#FFD9CB" },
];

export default function MorningRoutineScreen({
  childName,
  steps = [],
  stars,
  rtlChildSex = "male",
  speak,
  onComplete,
  onSkip,
}: Props) {
  const { contentMaxWidth, noOverlayTopPadding, screenPadding } =
    useLayoutMetrics();
  const [doneIds, setDoneIds] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Defensive: handle empty or invalid steps
  const validSteps = steps.filter((s) => s && s.id != null);

  useEffect(() => {
    return () => {
      if (skipTimerRef.current) {
        clearTimeout(skipTimerRef.current);
        skipTimerRef.current = null;
      }
      if (completeTimerRef.current) {
        clearTimeout(completeTimerRef.current);
        completeTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (validSteps.length > 0) return;
    if (skipTimerRef.current) {
      clearTimeout(skipTimerRef.current);
    }
    // If no valid steps, skip directly to avoid soft lock
    skipTimerRef.current = setTimeout(() => onSkip(), 100);
    return () => {
      if (skipTimerRef.current) {
        clearTimeout(skipTimerRef.current);
        skipTimerRef.current = null;
      }
    };
  }, [onSkip, validSteps.length]);

  if (validSteps.length === 0) return null;

  const allDone = doneIds.length === validSteps.length && validSteps.length > 0;
  const greeting = childName
    ? t("morning.greeting_with_name", { name: childName })
    : t("morning.greeting");
  function toggleStep(step: MorningStep) {
    if (!step?.id) return; // Defensive check
    if (finished) return;
    setDoneIds((prev) => {
      if (prev.includes(step.id)) return prev.filter((x) => x !== step.id);
      speak(getMorningStepTitle(step.id, step.title));
      return [...prev, step.id];
    });
  }

  function handleComplete() {
    setFinished(true);
    speak(tSpeak("morning.complete_speak", undefined, rtlChildSex));
    if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    completeTimerRef.current = setTimeout(() => onComplete(stars), 3500);
  }

  // Calm completion state — shown briefly before the app returns home.
  if (finished) {
    return (
      <View style={s.screenRoot}>
        <View
          style={[
            s.screen,
            {
              maxWidth: contentMaxWidth,
              padding: screenPadding,
              paddingTop: noOverlayTopPadding,
            },
          ]}
        >
          <View style={s.completeCard}>
            <Image
              source={visualAssets.graphics.sunrise}
              style={s.completeGraphic}
              resizeMode="contain"
            />
            <Text style={s.celebTitle}>{t("morning.celeb_title")}</Text>
            <Text style={s.celebSub}>
              {stars === 1
                ? tGender("morning.earned_one", undefined, rtlChildSex)
                : tGender(
                    "morning.earned_many",
                    {
                      stars: Array(stars).fill("⭐").join(""),
                    },
                    rtlChildSex,
                  )}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        s.scroll,
        {
          maxWidth: contentMaxWidth,
          padding: screenPadding,
          paddingTop: noOverlayTopPadding,
        },
      ]}
    >
      <View style={s.headerText}>
        <Text style={s.greeting}>{greeting}</Text>
        <TouchableOpacity
          onPress={() => speak(tSpeak("buddy.morning", undefined, rtlChildSex))}
        >
          <Text style={s.subGreeting}>{t("morning.subgreeting")}</Text>
        </TouchableOpacity>
      </View>

      {/* Step checklist */}
      <View style={s.stepList}>
        {validSteps.map((step, idx) => {
          const done = doneIds.includes(step.id);
          const colors = STEP_COLORS[idx % STEP_COLORS.length];
          return (
            <TouchableOpacity
              key={`morning-step-${step.id}-${idx}`}
              style={[
                s.stepRow,
                {
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                },
                done && s.stepRowDone,
              ]}
              onPress={() => toggleStep(step)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  s.stepIconWell,
                  { backgroundColor: colors.well, borderColor: colors.border },
                  done && s.stepIconWellDone,
                ]}
              >
                {step.imageUri ? (
                  <Image
                    source={{ uri: step.imageUri }}
                    style={s.stepThumb}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={s.stepEmoji}>{step.emoji}</Text>
                )}
              </View>
              <Text style={[s.stepTitle, done && s.stepDone]}>
                {getMorningStepTitle(step.id, step.title)}
              </Text>
              <View style={[s.checkbox, done && s.checkboxDone]}>
                {done && <Text style={s.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Progress dots */}
      <View style={s.dotsRow}>
        {validSteps.map((step, idx) => (
          <View
            key={`morning-dot-${step.id}-${idx}`}
            style={[s.dot, doneIds.includes(step.id) && s.dotDone]}
          />
        ))}
      </View>

      <Text style={s.rewardLabel}>
        {tGender(
          "morning.reward_label",
          { stars: Array(stars).fill("⭐").join("") },
          rtlChildSex,
        )}
      </Text>

      {/* Complete — disabled until all steps done */}
      <TouchableOpacity
        style={[s.btnPrimary, !allDone && s.btnDisabled]}
        onPress={allDone ? handleComplete : undefined}
        activeOpacity={allDone ? 0.8 : 1}
      >
        <Text style={s.btnPrimaryTxt}>
          {allDone
            ? tGender("morning.btn_done", undefined, rtlChildSex)
            : tGender(
                "morning.btn_remaining",
                { count: validSteps.length - doneIds.length },
                rtlChildSex,
              )}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.btnSkip} onPress={onSkip}>
        <Text style={s.btnSkipTxt}>
          {tGender("morning.btn_skip", undefined, rtlChildSex)}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screenRoot: {
    flex: 1,
    width: "100%",
    backgroundColor: C.bg,
  },
  screen: {
    flexGrow: 1,
    width: "100%",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    width: "100%",
    alignSelf: "center",
    alignItems: "center",
    paddingBottom: 52,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    width: "100%",
    marginBottom: 24,
  },
  headerText: { width: "100%", alignItems: "center", marginBottom: 10 },
  greeting: {
    fontSize: 22,
    fontWeight: "700",
    color: C.text,
    textAlign: "center",
  },
  subGreeting: {
    fontSize: 14,
    color: C.muted,
    marginTop: 4,
    textAlign: "center",
  },

  stepList: {
    width: "100%",
    gap: 8,
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  stepRowDone: { opacity: 0.66 },
  stepIconWell: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  },
  stepIconWellDone: {
    backgroundColor: "#F0F0EC",
    borderColor: "#DDD8CF",
  },
  stepEmoji: { fontSize: 25 },
  stepThumb: {
    width: "100%",
    height: "100%",
    borderRadius: 13,
    backgroundColor: C.bg,
  },
  stepTitle: { flex: 1, fontSize: 16, fontWeight: "600", color: C.text },
  stepDone: { color: C.muted, textDecorationLine: "line-through" },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "rgba(107,107,104,0.24)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.62)",
  },
  checkboxDone: { backgroundColor: C.green, borderColor: C.green },
  checkmark: { color: C.white, fontSize: 14, fontWeight: "700" },

  dotsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.border },
  dotDone: { backgroundColor: C.green },

  rewardLabel: {
    fontSize: 13,
    color: C.muted,
    marginBottom: 20,
    textAlign: "center",
  },

  btnPrimary: {
    backgroundColor: C.green,
    borderRadius: 16,
    paddingVertical: 17,
    width: "100%",
    alignItems: "center",
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.45 },
  btnPrimaryTxt: { fontSize: 19, color: C.white, fontWeight: "700" },
  btnSkip: { marginTop: 14, padding: 10 },
  btnSkipTxt: { fontSize: 13, color: C.muted, textAlign: "center" },

  completeCard: {
    width: "100%",
    backgroundColor: "#FFFDF9",
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: "#DED8CE",
    paddingVertical: 24,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  completeGraphic: {
    width: 92,
    height: 92,
    marginBottom: 4,
  },
  celebTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: C.green,
    textAlign: "center",
  },
  celebSub: {
    fontSize: 17,
    color: C.muted,
    marginTop: 8,
    textAlign: "center",
  },
});
