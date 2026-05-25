// _MorningRoutineScreen.tsx — SafeBuddy morning ritual
// Step-by-step checklist. Triggered once per day before noon.
// Earns morningStars on full completion.

import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  BUDDY_FIXED_SPACER,
  C,
  MorningStep,
  getMorningStepTitle,
} from "./_constants";
import { Confetti } from "./_SharedUI";
import { t } from "./i18n";

interface Props {
  childName: string;
  steps: MorningStep[];
  stars: number; // star reward from settings (default 1)
  speak: (t: string) => void;
  onComplete: (starsEarned: number) => void;
  onSkip: () => void;
}

export default function MorningRoutineScreen({
  childName,
  steps = [],
  stars,
  speak,
  onComplete,
  onSkip,
}: Props) {
  const [doneIds, setDoneIds] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  // Defensive: handle empty or invalid steps
  const validSteps = steps.filter((s) => s && s.id != null);
  if (validSteps.length === 0) {
    // If no valid steps, skip directly to avoid soft lock
    setTimeout(() => onSkip(), 100);
    return null;
  }

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
    speak(t("morning.ready_speak"));
    setTimeout(() => onComplete(stars), 1900);
  }

  // Celebrate state — shown briefly before onComplete fires
  if (finished) {
    return (
      <View style={s.screen}>
        <Confetti trigger />
        <View style={{ height: BUDDY_FIXED_SPACER }} />
        <Text style={s.celebTitle}>{t("morning.celeb_title")}</Text>
        <Text style={s.celebSub}>
          {stars === 1
            ? t("morning.earned_one")
            : t("morning.earned_many", {
                stars: Array(stars).fill("⭐").join(""),
              })}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.scroll}>
      <View style={{ height: BUDDY_FIXED_SPACER }} />
      <View style={s.headerText}>
        <Text style={s.greeting}>{greeting}</Text>
        <TouchableOpacity onPress={() => speak(t("buddy.morning"))}>
          <Text style={s.subGreeting}>{t("morning.subgreeting")}</Text>
        </TouchableOpacity>
      </View>

      {/* Step checklist */}
      <View style={s.card}>
        {validSteps.map((step, idx) => {
          const done = doneIds.includes(step.id);
          return (
            <View key={step.id}>
              {idx > 0 && <View style={s.divider} />}
              <TouchableOpacity
                style={s.stepRow}
                onPress={() => toggleStep(step)}
                activeOpacity={0.7}
              >
                <Text style={s.stepEmoji}>{step.emoji}</Text>
                <Text style={[s.stepTitle, done && s.stepDone]}>
                  {getMorningStepTitle(step.id, step.title)}
                </Text>
                <View style={[s.checkbox, done && s.checkboxDone]}>
                  {done && <Text style={s.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Progress dots */}
      <View style={s.dotsRow}>
        {validSteps.map((step) => (
          <View
            key={step.id}
            style={[s.dot, doneIds.includes(step.id) && s.dotDone]}
          />
        ))}
      </View>

      <Text style={s.rewardLabel}>
        {t("morning.reward_label", {
          stars: Array(stars).fill("⭐").join(""),
        })}
      </Text>

      {/* Complete — disabled until all steps done */}
      <TouchableOpacity
        style={[s.btnPrimary, !allDone && s.btnDisabled]}
        onPress={allDone ? handleComplete : undefined}
        activeOpacity={allDone ? 0.8 : 1}
      >
        <Text style={s.btnPrimaryTxt}>
          {allDone
            ? t("morning.btn_done")
            : t("morning.btn_remaining", {
                count: validSteps.length - doneIds.length,
              })}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.btnSkip} onPress={onSkip}>
        <Text style={s.btnSkipTxt}>{t("morning.btn_skip")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: C.bg,
  },
  scroll: {
    alignItems: "center",
    padding: 20,
    paddingBottom: 52,
    backgroundColor: C.bg,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    width: "100%",
    marginBottom: 24,
  },
  headerText: { flex: 1 },
  greeting: { fontSize: 22, fontWeight: "700", color: C.text },
  subGreeting: { fontSize: 14, color: C.muted, marginTop: 4 },

  card: {
    width: "100%",
    backgroundColor: "#FFFDF9",
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: "#DED8CE",
    overflow: "hidden",
    marginBottom: 16,
  },
  stepRow: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  stepEmoji: { fontSize: 26, width: 34 },
  stepTitle: { flex: 1, fontSize: 16, fontWeight: "500", color: C.text },
  stepDone: { color: C.muted, textDecorationLine: "line-through" },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#DED8CE",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
  },
  checkboxDone: { backgroundColor: C.green, borderColor: C.green },
  checkmark: { color: C.white, fontSize: 14, fontWeight: "700" },
  divider: {
    height: 0.5,
    backgroundColor: "rgba(107,107,104,0.16)",
    marginHorizontal: 16,
  },

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

  celebTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: C.green,
    marginTop: 8,
    textAlign: "center",
  },
  celebSub: { fontSize: 18, color: C.muted, marginTop: 8 },
});
