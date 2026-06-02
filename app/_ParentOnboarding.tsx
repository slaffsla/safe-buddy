// _ParentOnboarding.tsx — One-time parent onboarding, 4 screens.
// Shown before child onboarding on very first launch.
// Parent can skip at any time.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  ImageStyle,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useLayoutMetrics } from "../lib/layoutMetrics";
import Buddy from "./_Buddy";
import { C } from "./_constants";
import { AppLocale, getAppLocale, setAppLocale, t } from "./i18n";

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
const HOW_IT_WORKS_COLORS = [
  { bg: "#F4FAF7", border: "#CFE9DD", badge: "#DFF5EC" },
  { bg: "#FFF8E7", border: "#F1D58E", badge: "#FFE7B8" },
  { bg: "#FFF1E9", border: "#F5C7B5", badge: "#FFD9CB" },
  { bg: "#F0F8F4", border: "#BFE5D5", badge: "#D8F1E7" },
];

type SoftAccentAsset =
  | "sprigLean"
  | "sprigUpright"
  | "hearts"
  | "stars"
  | "magic"
  | "settings";

const SOFT_ACCENT_IMAGES: Record<SoftAccentAsset, ImageSourcePropType> = {
  sprigLean: require("../assets/elements/Graphics Element1.png"),
  sprigUpright: require("../assets/elements/Graphics Element2.png"),
  hearts: require("../assets/elements/Graphics Element3.png"),
  stars: require("../assets/elements/Graphics Element4.png"),
  magic: require("../assets/elements/Graphics Element5.png"),
  settings: require("../assets/elements/Graphics Element6.png"),
};

function SoftAccent({
  asset,
  style,
  imageStyle,
  mirror = false,
}: {
  asset: SoftAccentAsset;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  mirror?: boolean;
}) {
  return (
    <View style={[s.accent, style]}>
      <Image
        source={SOFT_ACCENT_IMAGES[asset]}
        style={[s.accentImage, mirror && s.accentImageMirror, imageStyle]}
        resizeMode="contain"
      />
    </View>
  );
}

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

function useOnboardingLayout() {
  const {
    contentMaxWidth,
    screenPadding,
    isTabletWidth,
    isLargeTablet,
    isShortHeight,
  } = useLayoutMetrics();
  const onboardingMaxWidth = isLargeTablet
    ? Math.min(contentMaxWidth + 160, 880)
    : isTabletWidth
      ? Math.min(contentMaxWidth + 72, 660)
      : contentMaxWidth;
  const verticalPadding = isShortHeight
    ? 18
    : isLargeTablet
      ? 48
      : isTabletWidth
        ? 36
        : 24;

  return {
    contentMaxWidth,
    onboardingMaxWidth,
    screenPadding,
    isTabletWidth,
    isLargeTablet,
    screenScroll: [
      s.screenScroll,
      {
        maxWidth: onboardingMaxWidth,
        paddingHorizontal: screenPadding,
        paddingTop: verticalPadding,
        paddingBottom: verticalPadding + 24,
      },
      isTabletWidth && s.screenScrollTablet,
      isLargeTablet && s.screenScrollLarge,
    ],
  };
}

// ── Breathing circle for screen 3 ─────────────────────────────────────────────
// Self-contained preview: no audio and no session timer.

const PHASES = [
  { labelKey: "breathing.phase_in", duration: 3000, target: 1.0 },
  { labelKey: "breathing.phase_hold", duration: 1000, target: 1.0 },
  { labelKey: "breathing.phase_out", duration: 4000, target: 0.74 },
] as const;

function MiniBreathingCircle() {
  const { isTabletWidth, isLargeTablet } = useOnboardingLayout();
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
      const phase = PHASES[idx];
      animRef.current = Animated.timing(scale, {
        toValue: phase.target,
        duration: phase.duration,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      });
      animRef.current.start(({ finished }) => {
        if (finished) runPhase((idx + 1) % PHASES.length);
      });
    }

    runPhase(0);
    return () => {
      cancelled = true;
      animRef.current?.stop();
    };
  }, [active, scale]);

  return (
    <View style={[bc.wrapper, isLargeTablet && bc.wrapperLarge]}>
      <TouchableOpacity
        onPress={() => setActive((a) => !a)}
        activeOpacity={0.9}
      >
        <Animated.View
          style={[
            bc.circle,
            isTabletWidth && bc.circleTablet,
            isLargeTablet && bc.circleLarge,
            { transform: [{ scale }] },
          ]}
        >
          <Text style={[bc.phaseText, isLargeTablet && bc.phaseTextLarge]}>
            {active ? t(PHASES[phase].labelKey) : "▶"}
          </Text>
        </Animated.View>
      </TouchableOpacity>
      <Text style={[bc.hint, isLargeTablet && bc.hintLarge]}>
        {t("parent_onboarding.screen4_try")}
      </Text>
    </View>
  );
}

const bc = StyleSheet.create({
  wrapper: { alignItems: "center", marginVertical: 16 },
  wrapperLarge: { marginVertical: 28 },
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
  circleTablet: {
    width: 132,
    height: 132,
    borderRadius: 66,
  },
  circleLarge: {
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 3,
  },
  phaseText: { fontSize: 18, fontWeight: "600", color: C.green },
  phaseTextLarge: { fontSize: 24 },
  hint: {
    marginTop: 12,
    fontSize: 12,
    color: C.muted,
    textAlign: "center",
    fontStyle: "italic",
  },
  hintLarge: { marginTop: 18, fontSize: 16 },
});

// ── Screen 1 — Who is Buddy ───────────────────────────────────────────────────

function Screen1({ speak }: { speak: (t: string) => void }) {
  const { isTabletWidth, isLargeTablet, screenScroll } = useOnboardingLayout();
  return (
    <ScrollView
      style={s.screenScroller}
      contentContainerStyle={screenScroll}
      alwaysBounceVertical={false}
    >
      <Buddy
        mood="calm"
        speak={speak}
        celebrate={false}
        size={isLargeTablet ? 240 : isTabletWidth ? 190 : undefined}
      />
      <Text style={[s.heading, isLargeTablet && s.headingLarge]}>
        {t("parent_onboarding.screen1_heading")}
      </Text>
      <Text style={[s.body, isLargeTablet && s.bodyLarge]}>
        {t("parent_onboarding.screen1_sub")}
      </Text>
      <View style={[s.noteCard, isLargeTablet && s.noteCardLarge]}>
        <SoftAccent asset="sprigLean" style={s.noteAccent} mirror />
        <Text style={[s.noteText, isLargeTablet && s.noteTextLarge]}>
          💬 {t("parent_onboarding.screen1_note")}
        </Text>
      </View>
    </ScrollView>
  );
}

// ── Screen 2 — How to use together ───────────────────────────────────────────

function Screen2({ speak }: { speak: (t: string) => void }) {
  const { isTabletWidth, isLargeTablet, screenScroll } = useOnboardingLayout();
  const tips = [
    t("parent_onboarding.screen2_tip_1"),
    t("parent_onboarding.screen2_tip_2"),
    t("parent_onboarding.screen2_tip_3"),
    t("parent_onboarding.screen2_tip_4"),
  ];
  return (
    <ScrollView
      style={s.screenScroller}
      contentContainerStyle={screenScroll}
      alwaysBounceVertical={false}
    >
      <View
        style={[
          s.handoffStage,
          isTabletWidth && s.handoffStageTablet,
          isLargeTablet && s.handoffStageLarge,
        ]}
      >
        <View style={[s.handoffGlow, s.handoffGlowLeft]} />
        <View style={[s.handoffGlow, s.handoffGlowRight]} />
        <SoftAccent asset="sprigLean" style={s.handoffSprigLeft} />
        <SoftAccent asset="magic" style={s.handoffMagic} />
        <View style={[s.handoffChip, s.handoffChipRight]}>
          <Text style={s.handoffChipText}>⭐</Text>
        </View>
        <Buddy
          mood="happy"
          speak={speak}
          size={isLargeTablet ? 230 : isTabletWidth ? 188 : 158}
        />
      </View>
      <Text style={[s.heading, isLargeTablet && s.headingLarge]}>
        {t("parent_onboarding.screen2_heading")}
      </Text>
      <Text style={[s.body, isLargeTablet && s.bodyLarge]}>
        {t("parent_onboarding.screen2_body")}
      </Text>
      <View
        style={[
          s.tipsCard,
          isTabletWidth && s.tipsCardTablet,
          isLargeTablet && s.tipsCardLarge,
        ]}
      >
        <Text style={[s.tipsLabel, isLargeTablet && s.tipsLabelLarge]}>
          {t("parent_onboarding.screen2_tip_label")}
        </Text>
        <View style={s.tipSequence}>
          {tips.map((tip, i) => (
            <View
              key={`parent-tip-${i}`}
              style={[
                s.tipCard,
                {
                  backgroundColor: HOW_IT_WORKS_COLORS[i].bg,
                  borderColor: HOW_IT_WORKS_COLORS[i].border,
                },
                isLargeTablet && s.tipCardLarge,
              ]}
            >
              <View
                style={[
                  s.tipDot,
                  { backgroundColor: HOW_IT_WORKS_COLORS[i].badge },
                  isLargeTablet && s.tipDotLarge,
                ]}
              >
                <Text style={[s.tipNum, isLargeTablet && s.tipNumLarge]}>
                  {i + 1}
                </Text>
              </View>
              <Text style={[s.tipText, isLargeTablet && s.tipTextLarge]}>
                {tip}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={[s.noteText, isLargeTablet && s.noteTextLarge]}>
        ✨ {t("parent_onboarding.screen2_note")}
      </Text>
    </ScrollView>
  );
}

// ── Screen 3 — Breathing ──────────────────────────────────────────────────────

function Screen3() {
  const { isTabletWidth, isLargeTablet, screenScroll } = useOnboardingLayout();
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
    <ScrollView
      style={s.screenScroller}
      contentContainerStyle={screenScroll}
      alwaysBounceVertical={false}
    >
      <Text style={[s.bigEmoji, isLargeTablet && s.bigEmojiLarge]}>⚙️</Text>
      <Text style={[s.heading, isLargeTablet && s.headingLarge]}>
        {t("parent_onboarding.screen3_heading")}
      </Text>
      <Text style={[s.body, isLargeTablet && s.bodyLarge]}>
        {t("parent_onboarding.screen3_body")}
      </Text>
      <View
        style={[
          s.featureCard,
          isTabletWidth && s.featureCardTablet,
          isLargeTablet && s.featureCardLarge,
        ]}
      >
        <SoftAccent asset="settings" style={s.featureAccent} mirror />
        {items.map((item, i) => (
          <View key={item.title}>
            {i > 0 && (
              <View
                style={[
                  s.featureDivider,
                  isLargeTablet && s.featureDividerLarge,
                ]}
              />
            )}
            <View style={[s.featureRow, isLargeTablet && s.featureRowLarge]}>
              <Text
                style={[s.featureIcon, isLargeTablet && s.featureIconLarge]}
              >
                {item.icon}
              </Text>
              <View style={s.featureTextWrap}>
                <Text
                  style={[s.featureTitle, isLargeTablet && s.featureTitleLarge]}
                >
                  {item.title}
                </Text>
                <Text
                  style={[s.featureSub, isLargeTablet && s.featureSubLarge]}
                >
                  {item.sub}
                </Text>
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
  const { isLargeTablet, screenScroll } = useOnboardingLayout();
  return (
    <ScrollView
      style={s.screenScroller}
      contentContainerStyle={screenScroll}
      alwaysBounceVertical={false}
    >
      <Text style={[s.bigEmoji, isLargeTablet && s.bigEmojiLarge]}>🌬️</Text>
      <Text style={[s.heading, isLargeTablet && s.headingLarge]}>
        {t("parent_onboarding.screen4_heading")}
      </Text>
      <Text style={[s.body, isLargeTablet && s.bodyLarge]}>
        {t("parent_onboarding.screen4_body")}
      </Text>
      <View style={[s.patternBadge, isLargeTablet && s.patternBadgeLarge]}>
        <Text style={[s.patternText, isLargeTablet && s.patternTextLarge]}>
          {t("parent_onboarding.screen4_pattern")}
        </Text>
      </View>
      <MiniBreathingCircle />
      <View style={[s.scienceCard, isLargeTablet && s.scienceCardLarge]}>
        <Text style={[s.scienceText, isLargeTablet && s.scienceTextLarge]}>
          {t("parent_onboarding.screen4_science")}
        </Text>
      </View>
    </ScrollView>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const SCREENS = [Screen1, Screen2, Screen3, Screen4];

export default function ParentOnboarding({ onDone, onLocaleChange }: Props) {
  const { onboardingMaxWidth, screenPadding, isTabletWidth, isLargeTablet } =
    useOnboardingLayout();
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
        <View
          style={[
            s.topBarInner,
            {
              maxWidth: onboardingMaxWidth,
              paddingHorizontal: screenPadding,
            },
          ]}
        >
          <View style={s.dots}>
            {SCREENS.map((_, i) => (
              <View
                key={`parent-onboarding-dot-${i}`}
                style={[
                  s.dot,
                  isTabletWidth && s.dotTablet,
                  i === step && s.dotActive,
                  i === step && isTabletWidth && s.dotActiveTablet,
                ]}
              />
            ))}
          </View>
          <View style={s.topActions} key={locale}>
            <LanguageToggle value={locale} onChange={handleLocaleChange} />
            <TouchableOpacity onPress={onDone} style={s.skipBtn}>
              <Text style={[s.skipTxt, isLargeTablet && s.skipTxtLarge]}>
                {t("parent_onboarding.skip")}
              </Text>
            </TouchableOpacity>
          </View>
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
            maxWidth: onboardingMaxWidth,
            paddingHorizontal: screenPadding,
          },
          isTabletWidth && s.footerTablet,
          isLargeTablet && s.footerLarge,
        ]}
      >
        {isLast ? (
          <TouchableOpacity
            style={[s.btnPrimary, isLargeTablet && s.btnPrimaryLarge]}
            onPress={onDone}
          >
            <Text
              style={[s.btnPrimaryTxt, isLargeTablet && s.btnPrimaryTxtLarge]}
            >
              {t("parent_onboarding.done")}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[s.btnPrimary, isLargeTablet && s.btnPrimaryLarge]}
            onPress={() => setStep((n) => n + 1)}
          >
            <Text
              style={[s.btnPrimaryTxt, isLargeTablet && s.btnPrimaryTxtLarge]}
            >
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
    width: "100%",
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 8,
  },
  topBarInner: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dots: { flexDirection: "row", gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.border },
  dotTablet: { width: 9, height: 9, borderRadius: 4.5 },
  dotActive: { backgroundColor: C.green, width: 20 },
  dotActiveTablet: { width: 28 },
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
  skipTxtLarge: { fontSize: 18 },

  accent: {
    position: "absolute",
    pointerEvents: "none",
  },
  accentImage: {
    width: "100%",
    height: "100%",
  },
  accentImageMirror: {
    transform: [{ scaleX: -1 }],
  },

  content: { flex: 1 },
  contentLarge: {
    justifyContent: "center",
  },
  screenScroller: { flex: 1 },
  screenScroll: {
    flexGrow: 1,
    width: "100%",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  screenScrollTablet: { justifyContent: "center" },
  screenScrollLarge: { justifyContent: "center" },

  bigEmoji: { fontSize: 58, marginBottom: 14, marginTop: 6 },
  bigEmojiLarge: { fontSize: 78, marginBottom: 20 },
  handoffStage: {
    width: "100%",
    minHeight: 188,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 20,
    backgroundColor: "#FFF3DE",
    borderWidth: 1,
    borderColor: "#F6D8A8",
    overflow: "hidden",
  },
  handoffStageTablet: {
    minHeight: 224,
    borderRadius: 32,
    marginBottom: 24,
  },
  handoffStageLarge: {
    minHeight: 286,
    borderRadius: 38,
    marginBottom: 30,
  },
  handoffGlow: {
    position: "absolute",
    width: 126,
    height: 126,
    borderRadius: 63,
    opacity: 0.8,
  },
  handoffGlowLeft: {
    left: -38,
    bottom: -34,
    backgroundColor: "#DFF5EC",
  },
  handoffGlowRight: {
    right: -42,
    top: -36,
    backgroundColor: "#FFE1D6",
  },
  handoffSprigLeft: {
    left: 28,
    bottom: 24,
    width: 88,
    height: 88,
    opacity: 0.82,
  },
  handoffMagic: {
    right: 56,
    top: 28,
    width: 74,
    height: 74,
    opacity: 0.88,
    transform: [{ rotate: "10deg" }],
  },
  handoffChip: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: 1,
    borderColor: "rgba(29,107,79,0.16)",
  },
  handoffChipRight: {
    right: 28,
    bottom: 30,
    transform: [{ rotate: "9deg" }],
  },
  handoffChipText: { fontSize: 22 },
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
    overflow: "hidden",
  },
  noteCardLarge: { padding: 24, borderRadius: 16 },
  noteAccent: {
    right: -6,
    top: -6,
    width: 72,
    height: 72,
    opacity: 0.62,
  },
  noteText: {
    fontSize: 13,
    color: C.green,
    lineHeight: 20,
    textAlign: "center",
    fontStyle: "italic",
  },
  noteTextLarge: { fontSize: 18, lineHeight: 27 },

  tipsCard: {
    backgroundColor: "rgba(255,255,255,0.66)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EBDDC7",
    padding: 12,
    width: "100%",
    marginBottom: 16,
  },
  tipsCardTablet: { padding: 20, borderRadius: 16 },
  tipsCardLarge: { padding: 28, borderRadius: 18, marginBottom: 24 },
  tipsLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: C.muted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  tipsLabelLarge: { fontSize: 13, marginBottom: 18 },
  tipSequence: {
    width: "100%",
    gap: 8,
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  tipCardLarge: {
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 18,
  },
  tipDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderWidth: 1,
    borderColor: "rgba(29,107,79,0.18)",
  },
  tipDotLarge: { width: 38, height: 38, borderRadius: 19 },
  tipNum: { fontSize: 12, fontWeight: "800", color: C.green },
  tipNumLarge: { fontSize: 16 },
  tipText: {
    fontSize: 14,
    color: C.text,
    flex: 1,
    lineHeight: 20,
    fontWeight: "600",
  },
  tipTextLarge: { fontSize: 19, lineHeight: 28 },

  featureCard: {
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    width: "100%",
    marginBottom: 16,
    overflow: "hidden",
  },
  featureCardTablet: { padding: 20, borderRadius: 16 },
  featureCardLarge: { padding: 28, borderRadius: 18, marginBottom: 24 },
  featureAccent: {
    right: -8,
    top: -8,
    width: 72,
    height: 72,
    opacity: 0.72,
  },
  featureDivider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 12,
  },
  featureDividerLarge: { marginVertical: 18 },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureRowLarge: { gap: 20 },
  featureIcon: { fontSize: 24, width: 32, textAlign: "center" },
  featureIconLarge: { fontSize: 34, width: 48 },
  featureTextWrap: { flex: 1 },
  featureTitle: { fontSize: 15, fontWeight: "700", color: C.text },
  featureTitleLarge: { fontSize: 21, lineHeight: 28 },
  featureSub: { fontSize: 13, color: C.muted, lineHeight: 18, marginTop: 2 },
  featureSubLarge: { fontSize: 17, lineHeight: 25, marginTop: 4 },

  patternBadge: {
    backgroundColor: C.greenLt,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginBottom: 4,
  },
  patternBadgeLarge: {
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 26,
    marginBottom: 10,
  },
  patternText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.green,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  patternTextLarge: { fontSize: 18 },

  scienceCard: {
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    width: "100%",
    marginTop: 6,
  },
  scienceCardLarge: { padding: 22, borderRadius: 16, marginTop: 12 },
  scienceText: {
    fontSize: 12,
    color: C.muted,
    lineHeight: 19,
    textAlign: "center",
    fontStyle: "italic",
  },
  scienceTextLarge: { fontSize: 17, lineHeight: 26 },

  footer: {
    width: "100%",
    alignSelf: "center",
    padding: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  footerTablet: { paddingTop: 14, paddingBottom: 30 },
  footerLarge: { paddingTop: 18, paddingBottom: 42 },
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
