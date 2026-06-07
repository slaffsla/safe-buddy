// _SharedUI.tsx — SafeBuddy small shared UI components
// T, ProgressBar, ReflectiveBoost, DailySuggestion, Confetti

import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import { C, DAILY_SUGGESTIONS, getProgress } from "./_constants";
import { RtlChildSex, t, tSpeak } from "./i18n";

// ── T — Speakable text wrapper ─────────────────────────────────────────────────

export function T({
  children,
  style,
  speak,
}: {
  children: any;
  style: any;
  speak: (t: string) => void;
}) {
  if (!children) return null;
  return (
    <TouchableOpacity
      onPress={() => speak(String(children))}
      activeOpacity={0.65}
    >
      <Text style={style}>{children}</Text>
    </TouchableOpacity>
  );
}

// ── ProgressBar ───────────────────────────────────────────────────────────────

export function ProgressBar({
  total,
  available,
  speak,
  rtlChildSex = "male",
}: {
  total: number;
  available?: number;
  speak: (t: string) => void;
  rtlChildSex?: RtlChildSex;
}) {
  const { pct, prev } = getProgress(total);
  const redeemable = available ?? total;
  const emotionalLabel =
    total === 0
      ? tSpeak("progress.label_first", undefined, rtlChildSex)
      : total < 5
        ? tSpeak("progress.label_lt5", undefined, rtlChildSex)
        : total < 10
          ? tSpeak("progress.label_lt10", undefined, rtlChildSex)
          : total < 20
            ? tSpeak("progress.label_lt20", undefined, rtlChildSex)
            : total < 50
              ? tSpeak("progress.label_lt50", undefined, rtlChildSex)
              : tSpeak("progress.label_max", undefined, rtlChildSex);

  return (
    <TouchableOpacity
      style={s.pbWrap}
      onPress={() =>
        speak(
          tSpeak(
            "progress.stars_speak",
            { label: emotionalLabel, available: redeemable, total },
            rtlChildSex,
          ),
        )
      }
      activeOpacity={0.82}
    >
      <View style={s.pbRow}>
        <Text style={s.pbEmotion}>{emotionalLabel}</Text>
        <View style={s.pbStarsPill}>
          <Text style={s.pbStarsLabel}>{t("progress.available_short")}</Text>
          <Text style={s.pbStars}>⭐ {redeemable}</Text>
        </View>
      </View>
      <View
        style={[
          s.pbTrack,
          { backgroundColor: prev >= 35 ? C.greenLt : C.track },
        ]}
      >
        <View style={[s.pbFill, { width: `${Math.round(pct * 100)}%` }]} />
      </View>
    </TouchableOpacity>
  );
}

// ── ReflectiveBoost ───────────────────────────────────────────────────────────

export function ReflectiveBoost({
  lastMission,
  speak,
  rtlChildSex = "male",
}: {
  lastMission: string | null;
  speak: (t: string) => void;
  rtlChildSex?: RtlChildSex;
}) {
  if (!lastMission) return null;
  const text = tSpeak("reflect.boost", { title: lastMission }, rtlChildSex);
  return (
    <TouchableOpacity
      style={s.reflectCard}
      onPress={() => speak(text)}
      activeOpacity={0.8}
    >
      <Text style={s.reflectText}>{text}</Text>
    </TouchableOpacity>
  );
}

// ── DailySuggestion ───────────────────────────────────────────────────────────

export function DailySuggestion({
  suggestion,
  onAccept,
  onSkip,
  speak,
}: {
  suggestion: (typeof DAILY_SUGGESTIONS)[0];
  onAccept: () => void;
  onSkip: () => void;
  speak: (t: string) => void;
}) {
  return (
    <View style={s.suggestionCard}>
      <Text style={s.suggestionIcon}>💡</Text>
      <T style={s.suggestionText} speak={speak}>
        {suggestion.text}
      </T>
      <View style={s.suggestionRow}>
        <TouchableOpacity style={s.suggestionYes} onPress={onAccept}>
          <Text style={s.suggestionYesTxt}>{t("suggestion.yes")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.suggestionNo} onPress={onSkip}>
          <Text style={s.suggestionNoTxt}>{t("suggestion.no")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Confetti ──────────────────────────────────────────────────────────────────
export function Confetti({ trigger }: { trigger: boolean }) {
  if (!trigger) return null;
  const { width } = Dimensions.get("window");
  return (
    <View style={[s.confettiOverlay, s.noPointerEvents]}>
      <ConfettiCannon
        count={84}
        origin={{ x: width / 2, y: 0 }}
        autoStart={true}
        fadeOut={true}
        explosionSpeed={460}
        fallSpeed={3200}
        colors={[C.green, C.greenLt, C.gold, C.border, "#8FCFB8", "#EEF2FF"]}
      />
    </View>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  confettiOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 2000,
    elevation: 2000,
  },
  noPointerEvents: { pointerEvents: "none" },

  // Progress bar
  pbWrap: {
    width: "100%",
    backgroundColor: "#FFFDF9",
    borderRadius: 14,
    padding: 10,
    marginBottom: 14,
  },
  pbRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  pbEmotion: {
    fontSize: 12,
    color: C.green,
    fontWeight: "500",
    flex: 1,
    marginRight: 8,
  },
  pbStarsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "#F4FAF7",
    borderWidth: 0.5,
    borderColor: "#CFE9DD",
  },
  pbStarsLabel: {
    fontSize: 10,
    color: C.muted,
    fontWeight: "600",
  },
  pbStars: { fontSize: 13, fontWeight: "800", color: C.green },
  pbTrack: {
    height: 8,
    backgroundColor: C.track,
    borderRadius: 4,
    overflow: "hidden",
  },
  pbFill: { height: 8, backgroundColor: C.green, borderRadius: 4, minWidth: 8 },

  // Reflective boost
  reflectCard: {
    backgroundColor: "#F4FAF7",
    borderRadius: 12,
    padding: 12,
    width: "100%",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#CFE9DD",
  },
  reflectText: {
    fontSize: 13,
    color: C.green,
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 19,
  },

  // Daily suggestion
  suggestionCard: {
    backgroundColor: "#FFF9EC",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "#E8D7A9",
    padding: 14,
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },
  suggestionIcon: { fontSize: 28, marginBottom: 4 },
  suggestionText: {
    fontSize: 14,
    color: "#92400E",
    textAlign: "center",
    marginVertical: 8,
    lineHeight: 20,
  },
  suggestionRow: { flexDirection: "row", gap: 10 },
  suggestionYes: {
    backgroundColor: C.green,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  suggestionYesTxt: { fontSize: 14, color: "#fff", fontWeight: "600" },
  suggestionNo: {
    backgroundColor: "transparent",
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  suggestionNoTxt: { fontSize: 14, color: C.muted },
});

// Expo Router: suppress "missing default export" warning for non-route files
export default function _SharedUI() {
  return null;
}
