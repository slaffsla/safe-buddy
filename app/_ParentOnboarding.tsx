// _ParentOnboarding.tsx — One-time parent onboarding, 3 screens.
// Shown before child onboarding on very first launch.
// Parent can skip at any time.

import React, { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { AppLocale, getAppLocale, setAppLocale, t } from "./i18n";
import { CONTENT_MAX_WIDTH, useLayoutMetrics } from "../lib/layoutMetrics";

interface Props {
  onDone: () => void;
  onLocaleChange?: (locale: AppLocale) => void;
}

const SETTINGS_KEY = "sb_settings_v1";
const LANGUAGE_OPTIONS: { label: string; value: AppLocale }[] = [
  { label: "RU", value: "ru" },
  { label: "EN", value: "en" },
  { label: "HE", value: "he" },
];

async function persistOnboardingLocale(appLocale: AppLocale) {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    await AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...parsed, appLocale }),
    );
  } catch (error) {
    console.log("Locale save error", error);
  }
}

function LanguageToggle({
  value,
  onChange,
}: {
  value: AppLocale;
  onChange: (locale: AppLocale) => void;
}) {
  return (
    <View style={s.langToggle}>
      {LANGUAGE_OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[s.langBtn, active && s.langBtnActive]}
            onPress={() => onChange(option.value)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[s.langBtnTxt, active && s.langBtnTxtActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
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
  const [scale] = useState(() => new Animated.Value(0.6));
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
      <Text style={bc.hint}>{t("parent_onboarding.screen4_try")}</Text>
    </View>
  );
}

const bc = StyleSheet.create({
  wrapper: { alignItems: "center", marginVertical: 16 },
  circle: {
    width: 108,
    height: 108,
    borderRadius: 54,
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
  const { isLargeTablet } = useLayoutMetrics();
  return (
    <ScrollView contentContainerStyle={s.screenScroll}>
      <Buddy
        mood="calm"
        speak={speak}
        celebrate={false}
        size={isLargeTablet ? 190 : undefined}
      />
      <Text style={[s.heading, isLargeTablet && s.headingLarge]}>
        {t("parent_onboarding.screen1_heading")}
      </Text>
      <Text style={[s.body, isLargeTablet && s.bodyLarge]}>
        {t("parent_onboarding.screen1_sub")}
      </Text>
      <View style={[s.noteCard, isLargeTablet && s.noteCardLarge]}>
        <Text style={[s.noteText, isLargeTablet && s.noteTextLarge]}>
          💬 {t("parent_onboarding.screen1_note")}
        </Text>
      </View>
    </ScrollView>
  );
}

// ── Screen 2 — How to use together ───────────────────────────────────────────

function Screen2() {
  const { isLargeTablet } = useLayoutMetrics();
  const tips = [
    t("parent_onboarding.screen2_tip_1"),
    t("parent_onboarding.screen2_tip_2"),
    t("parent_onboarding.screen2_tip_3"),
    t("parent_onboarding.screen2_tip_4"),
  ];
  return (
    <ScrollView contentContainerStyle={s.screenScroll}>
      <Text style={[s.bigEmoji, isLargeTablet && s.bigEmojiLarge]}>🤝</Text>
      <Text style={[s.heading, isLargeTablet && s.headingLarge]}>
        {t("parent_onboarding.screen2_heading")}
      </Text>
      <Text style={[s.body, isLargeTablet && s.bodyLarge]}>
        {t("parent_onboarding.screen2_body")}
      </Text>
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
  const { isLargeTablet } = useLayoutMetrics();
  const items = [
    {
      icon: "🔐",
      title: t("settings.parent_zone_title"),
      sub: t("settings.parent_zone_sub"),
    },
    {
      icon: "🌅",
      title: t("settings.morning_manage_title"),
      sub: t("settings.routine_section"),
    },
    {
      icon: "📅",
      title: t("settings.schedule_manage_title"),
      sub: t("settings.schedule_section"),
    },
  ];

  return (
    <ScrollView contentContainerStyle={s.screenScroll}>
      <Text style={[s.bigEmoji, isLargeTablet && s.bigEmojiLarge]}>🛠️</Text>
      <Text style={[s.heading, isLargeTablet && s.headingLarge]}>
        {t("parent_onboarding.screen3_heading")}
      </Text>
      <Text style={[s.body, isLargeTablet && s.bodyLarge]}>
        {t("parent_onboarding.screen3_body")}
      </Text>
      <View style={s.featureCard}>
        {items.map((item, i) => (
          <View key={item.title}>
            {i > 0 && <View style={s.featureDivider} />}
            <View style={s.featureRow}>
              <Text style={s.featureIcon}>{item.icon}</Text>
              <View style={s.featureTextWrap}>
                <Text style={s.featureTitle}>{item.title}</Text>
                <Text style={s.featureSub}>{item.sub}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
      <Text style={[s.noteText, isLargeTablet && s.noteTextLarge]}>
        ✨ {t("parent_onboarding.screen3_note")}
      </Text>
    </ScrollView>
  );
}

// ── Screen 4 — Breathing ──────────────────────────────────────────────────────

function Screen4() {
  const { isLargeTablet } = useLayoutMetrics();
  return (
    <ScrollView contentContainerStyle={s.screenScroll}>
      <Text style={[s.bigEmoji, isLargeTablet && s.bigEmojiLarge]}>🌬️</Text>
      <Text style={[s.heading, isLargeTablet && s.headingLarge]}>
        {t("parent_onboarding.screen4_heading")}
      </Text>
      <Text style={[s.body, isLargeTablet && s.bodyLarge]}>
        {t("parent_onboarding.screen4_body")}
      </Text>
      <View style={s.patternBadge}>
        <Text style={s.patternText}>
          {t("parent_onboarding.screen4_pattern")}
        </Text>
      </View>
      <MiniBreathingCircle />
      <View style={s.scienceCard}>
        <Text style={s.scienceText}>
          {t("parent_onboarding.screen4_science")}
        </Text>
      </View>
    </ScrollView>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const SCREENS = [Screen1, Screen2, Screen3, Screen4];

export default function ParentOnboarding({ onDone, onLocaleChange }: Props) {
  const { contentMaxWidth, screenPadding, isLargeTablet } = useLayoutMetrics();
  const [step, setStep] = useState(0);
  const [locale, setLocale] = useState<AppLocale>(() => getAppLocale());
  const isLast = step === SCREENS.length - 1;
  const CurrentScreen = SCREENS[step];

  const speak = (_: string) => {};

  function handleLocaleChange(nextLocale: AppLocale) {
    setAppLocale(nextLocale);
    setLocale(nextLocale);
    onLocaleChange?.(nextLocale);
    persistOnboardingLocale(nextLocale);
  }

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <View style={s.dots}>
          {SCREENS.map((_, i) => (
            <View key={i} style={[s.dot, i === step && s.dotActive]} />
          ))}
        </View>
        <View style={s.topActions}>
          <LanguageToggle value={locale} onChange={handleLocaleChange} />
          <TouchableOpacity onPress={onDone} style={s.skipBtn}>
            <Text style={s.skipTxt}>{t("parent_onboarding.skip")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View
        key={`parent-onboarding-${locale}`}
        style={[s.content, isLargeTablet && s.contentLarge]}
      >
        <CurrentScreen speak={speak} />
      </View>

      <View
        style={[
          s.footer,
          {
            maxWidth: contentMaxWidth,
            paddingHorizontal: screenPadding,
          },
        ]}
      >
        {isLast ? (
          <TouchableOpacity
            style={[s.btnPrimary, isLargeTablet && s.btnPrimaryLarge]}
            onPress={onDone}
          >
            <Text style={[s.btnPrimaryTxt, isLargeTablet && s.btnPrimaryTxtLarge]}>
              {t("parent_onboarding.done")}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[s.btnPrimary, isLargeTablet && s.btnPrimaryLarge]}
            onPress={() => setStep((n) => n + 1)}
          >
            <Text style={[s.btnPrimaryTxt, isLargeTablet && s.btnPrimaryTxtLarge]}>
              {t("parent_onboarding.next")}
            </Text>
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
  topActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  langToggle: {
    flexDirection: "row",
    backgroundColor: C.greenLt,
    borderRadius: 999,
    padding: 2,
    borderWidth: 1,
    borderColor: C.green,
  },
  langBtn: {
    minWidth: 34,
    minHeight: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  langBtnActive: { backgroundColor: C.green },
  langBtnTxt: { fontSize: 12, fontWeight: "800", color: C.green },
  langBtnTxtActive: { color: C.white },
  skipBtn: { padding: 8 },
  skipTxt: { fontSize: 14, color: C.muted },

  content: { flex: 1 },
  contentLarge: {
    justifyContent: "center",
  },
  screenScroll: {
    width: "100%",
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: "center",
    alignItems: "center",
    padding: 24,
    paddingBottom: 44,
  },

  bigEmoji: { fontSize: 58, marginBottom: 14, marginTop: 6 },
  bigEmojiLarge: { fontSize: 78, marginBottom: 20 },
  heading: {
    fontSize: 24,
    fontWeight: "800",
    color: C.text,
    textAlign: "center",
    marginBottom: 14,
    lineHeight: 30,
  },
  headingLarge: { fontSize: 32, lineHeight: 40, marginBottom: 20 },
  body: {
    fontSize: 16,
    color: C.muted,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 16,
  },
  bodyLarge: { fontSize: 21, lineHeight: 31, marginBottom: 24 },

  noteCard: {
    backgroundColor: C.greenLt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.green,
    padding: 14,
    width: "100%",
  },
  noteCardLarge: { padding: 20, borderRadius: 16 },
  noteText: {
    fontSize: 13,
    color: C.green,
    lineHeight: 20,
    textAlign: "center",
    fontStyle: "italic",
  },
  noteTextLarge: { fontSize: 18, lineHeight: 27 },

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

  featureCard: {
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    width: "100%",
    marginBottom: 16,
  },
  featureDivider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureIcon: { fontSize: 24, width: 32, textAlign: "center" },
  featureTextWrap: { flex: 1 },
  featureTitle: { fontSize: 15, fontWeight: "700", color: C.text },
  featureSub: { fontSize: 13, color: C.muted, lineHeight: 18, marginTop: 2 },

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
    marginTop: 6,
  },
  scienceText: {
    fontSize: 12,
    color: C.muted,
    lineHeight: 19,
    textAlign: "center",
    fontStyle: "italic",
  },

  footer: {
    width: "100%",
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: "center",
    padding: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  btnPrimary: {
    backgroundColor: C.green,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: "center",
    width: "100%",
  },
  btnPrimaryLarge: {
    borderRadius: 18,
    paddingVertical: 22,
  },
  btnPrimaryTxt: { fontSize: 17, color: C.white, fontWeight: "700" },
  btnPrimaryTxtLarge: { fontSize: 22 },
});
