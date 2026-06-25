// _ChildOnboarding.tsx — first child-facing Buddy bonding flow.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useLayoutMetrics } from "../lib/layoutMetrics";
import { visualAssets } from "../lib/visualAssets";
import Buddy from "./_Buddy";
import { C } from "./_constants";
import { SpeakFn } from "./_speechTypes";
import { RtlChildSex, t, tGender } from "./i18n";

type ChildOnboardingStep = "meet" | "name" | "age" | "ready";

interface ChildOnboardingProps {
  initialName: string;
  initialAge: number;
  earnedStars?: number;
  rtlChildSex: RtlChildSex;
  speak: SpeakFn;
  onComplete: (name: string, age: number | null) => void;
}

const AGE_OPTIONS = [4, 5, 6, 7, 8, 9, 10, 11, 12];
const BUBBLE_AFTER_SPEECH_MS = 1000;
const BUBBLE_IDLE_GATE_MS = 2600;
const BUBBLE_IDLE_FOR_MS = 850;
const BUBBLE_IDLE_POLL_MS = 200;
const BUBBLE_HARD_SHOW_MS = 5200;
const CHILD_BUDDY = {
  hello: require("../assets/Character/soft/Buddy2-soft.png"),
  calm: require("../assets/Character/soft/Buddy1-soft.png"),
  gentle: require("../assets/Character/soft/Buddy3-soft.png"),
  happy: require("../assets/Character/soft/Buddy4-soft.png"),
};

export default function ChildOnboarding({
  initialName,
  initialAge,
  earnedStars = 0,
  rtlChildSex,
  speak,
  onComplete,
}: ChildOnboardingProps) {
  const {
    contentMaxWidth,
    formMaxWidth,
    screenPadding,
    isLargeTablet,
    isTabletWidth,
    isShortHeight,
  } = useLayoutMetrics();
  const [step, setStep] = useState<ChildOnboardingStep>("meet");
  const [firstPetDone, setFirstPetDone] = useState(false);
  const [meetBubble, setMeetBubble] = useState<"pet" | "fact" | null>(null);
  const [name, setName] = useState(initialName);
  const [age, setAge] = useState<number | null>(
    initialAge > 0 ? initialAge : null,
  );
  const firstPetSpokenRef = useRef(false);
  const readySubSpokenRef = useRef(false);
  const petPromptAllowedRef = useRef(false);
  const petPromptSpokenRef = useRef(false);
  const factSpokenRef = useRef(false);
  const factAllowedRef = useRef(false);
  const meetStartedAtRef = useRef(0);
  const lastInteractionAtRef = useRef(0);
  const postPetSequenceTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const speakRef = useRef(speak);
  const tg = useCallback(
    (key: string, params?: Record<string, unknown>) =>
      tGender(key, params, rtlChildSex),
    [rtlChildSex],
  );

  const { width: windowWidth } = useWindowDimensions();
  const buddySize = isLargeTablet
    ? 300
    : isTabletWidth
      ? 255
      : isShortHeight
        ? 176
        : 212;
  const maxWidth = isLargeTablet
    ? Math.min(contentMaxWidth + 120, 840)
    : contentMaxWidth;
  const meetStageWidth = Math.max(
    220,
    Math.min(
      windowWidth - 4,
      isLargeTablet ? 1040 : isTabletWidth ? 820 : 560,
    ),
  );
  const meetLayout =
    meetStageWidth < 300
      ? "narrow"
      : meetStageWidth < 380
        ? "compact"
        : meetStageWidth < 520
          ? "phone"
          : "tablet";
  const meetBuddySize =
    meetLayout === "narrow"
      ? Math.round(meetStageWidth * 0.49)
      : meetLayout === "compact"
        ? 154
        : meetLayout === "phone"
          ? 180
          : isLargeTablet
            ? 260
            : 220;
  const factBubbleCap =
    meetLayout === "narrow"
      ? 180
      : meetLayout === "compact"
        ? 210
        : meetLayout === "phone"
          ? 280
          : isLargeTablet
            ? 520
            : 430;
  const mouthAnchorOffsetRatio = 0.07;
  const bubbleTailXRatio = 0.045;
  const bubbleTailYRatio = 0.24;
  const bubbleRightOfTailRatio = 1 - bubbleTailXRatio;
  const meetBuddyLeft = Math.round(
    (meetStageWidth - meetBuddySize - 8) / 2,
  );
  const meetBuddyTop = meetLayout === "tablet" ? 14 : 10;
  const mouthAnchorX =
    meetStageWidth / 2 + meetBuddySize * mouthAnchorOffsetRatio;
  const mouthAnchorY =
    meetBuddyTop + meetBuddySize * 0.44;
  const maxBubbleWidth = Math.max(
    104,
    Math.floor(
      (meetStageWidth - 4 - mouthAnchorX) /
        bubbleRightOfTailRatio,
    ),
  );
  const factBubbleWidth = Math.min(factBubbleCap, maxBubbleWidth);
  const factBubbleHeightCap =
    meetLayout === "tablet"
      ? isLargeTablet
        ? 280
        : 240
      : meetLayout === "phone"
        ? 175
        : 150;
  const factBubbleHeight = Math.round(
    Math.max(
      118,
      Math.min(factBubbleHeightCap, factBubbleWidth * 0.66),
    ),
  );
  const factBubbleLeft = Math.round(
    mouthAnchorX - factBubbleWidth * bubbleTailXRatio,
  );
  const factBubbleTop = Math.round(
    mouthAnchorY - factBubbleHeight * bubbleTailYRatio + 7,
  );
  const buddyStageMinHeight = Math.max(
    250,
    Math.ceil(
      Math.max(
        meetBuddyTop + meetBuddySize + 32,
        factBubbleTop + factBubbleHeight,
      ) + 12,
    ),
  );
  const compactFactBubble = factBubbleWidth < 220;
  const meetBuddyStyle = {
    left: meetBuddyLeft,
    top: meetBuddyTop,
    width: meetBuddySize + 8,
  };
  const factBubbleStyle = {
    left: factBubbleLeft,
    top: factBubbleTop,
    width: factBubbleWidth,
    height: factBubbleHeight,
    paddingTop: Math.max(20, Math.round(factBubbleHeight * 0.2)),
    paddingRight: Math.max(16, Math.round(factBubbleWidth * 0.1)),
    paddingBottom: Math.max(26, Math.round(factBubbleHeight * 0.25)),
    paddingLeft: Math.max(18, Math.round(factBubbleWidth * 0.1)),
  };
  const tinyFactText = t("onboarding.tiny_fact_bear_sleep");
  const meetBubbleText =
    meetBubble === "pet" ? tg("onboarding.meet_bubble_prompt") : tinyFactText;
  const readySubKey =
    earnedStars > 0 ? "onboarding.ready_sub_next" : "onboarding.ready_sub";

  const currentLine = useMemo(() => {
    if (step === "meet") {
      return firstPetDone
        ? tg("onboarding.meet_after_pet_title")
        : tg("onboarding.meet_title");
    }
    if (step === "name") return tg("onboarding.name_title");
    if (step === "age") return tg("onboarding.age_title");
    const trimmed = name.trim();
    return trimmed
      ? tg("onboarding.ready_title_named", { name: trimmed })
      : tg("onboarding.ready_title");
  }, [firstPetDone, name, step, tg]);

  useEffect(() => {
    speakRef.current = speak;
  }, [speak]);

  useEffect(() => {
    speak(currentLine);
  }, [currentLine, speak]);

  function clearPostPetSequenceTimers() {
    postPetSequenceTimersRef.current.forEach(clearTimeout);
    postPetSequenceTimersRef.current = [];
  }

  function estimateSpeechMs(text: string) {
    return Math.max(1100, Math.min(4200, text.length * 55 + 650));
  }

  const showPetPrompt = useCallback(() => {
    if (!petPromptAllowedRef.current) return;
    setMeetBubble("pet");
    if (!petPromptSpokenRef.current) {
      petPromptSpokenRef.current = true;
      speakRef.current(tg("onboarding.meet_bubble_prompt"), {
        volume: 0.85,
      });
    }
  }, [tg]);

  function showTinyFact() {
    if (!factAllowedRef.current) return;
    setMeetBubble("fact");
    if (!factSpokenRef.current) {
      factSpokenRef.current = true;
      speakRef.current(t("onboarding.tiny_fact_bear_sleep"), {
        volume: 0.85,
      });
    }
  }

  useEffect(() => {
    if (step !== "meet") return;
    meetStartedAtRef.current = Date.now();
    lastInteractionAtRef.current = Date.now();
    petPromptAllowedRef.current = true;
    petPromptSpokenRef.current = false;
    factSpokenRef.current = false;
    factAllowedRef.current = false;
    const initialPromptDelay =
      estimateSpeechMs(tg("onboarding.meet_title")) + BUBBLE_AFTER_SPEECH_MS;
    postPetSequenceTimersRef.current = [
      setTimeout(showPetPrompt, initialPromptDelay),
    ];

    let idlePoll: ReturnType<typeof setInterval> | null = null;
    const idleGate = setTimeout(() => {
      idlePoll = setInterval(() => {
        const idleFor = Date.now() - lastInteractionAtRef.current;
        if (idleFor >= BUBBLE_IDLE_FOR_MS) {
          showPetPrompt();
          if (idlePoll) {
            clearInterval(idlePoll);
            idlePoll = null;
          }
        }
      }, BUBBLE_IDLE_POLL_MS);
    }, BUBBLE_IDLE_GATE_MS);

    const hardShow = setTimeout(() => {
      showPetPrompt();
      if (idlePoll) {
        clearInterval(idlePoll);
        idlePoll = null;
      }
    }, BUBBLE_HARD_SHOW_MS);

    return () => {
      petPromptAllowedRef.current = false;
      clearTimeout(idleGate);
      clearTimeout(hardShow);
      if (idlePoll) clearInterval(idlePoll);
      clearPostPetSequenceTimers();
    };
  }, [showPetPrompt, step, tg]);

  useEffect(() => {
    if (step !== "ready") return;
    if (readySubSpokenRef.current) return;
    readySubSpokenRef.current = true;
    const readySubTimer = setTimeout(
      () => {
        speakRef.current(tg(readySubKey));
      },
      estimateSpeechMs(currentLine) + 220,
    );
    return () => clearTimeout(readySubTimer);
  }, [currentLine, readySubKey, step, tg]);

  function markInteraction() {
    lastInteractionAtRef.current = Date.now();
  }

  function handlePettingChange(petting: boolean) {
    if (!petting) return;
    markInteraction();
    if (firstPetDone) return;
    petPromptAllowedRef.current = false;
    setFirstPetDone(true);
    setMeetBubble(null);
    if (!firstPetSpokenRef.current) {
      firstPetSpokenRef.current = true;
      clearPostPetSequenceTimers();
      const afterPetTitle = tg("onboarding.meet_after_pet_title");
      const companionLine = tg("onboarding.meet_after_pet_sub");
      const companionDelay = estimateSpeechMs(afterPetTitle) + 220;
      const factDelay =
        companionDelay +
        estimateSpeechMs(companionLine) +
        BUBBLE_AFTER_SPEECH_MS;
      postPetSequenceTimersRef.current = [
        setTimeout(() => speakRef.current(companionLine), companionDelay),
        setTimeout(() => {
          factAllowedRef.current = true;
          showTinyFact();
        }, factDelay),
      ];
    }
  }

  function complete() {
    onComplete(name.trim(), age);
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.content,
          isLargeTablet && s.contentLarge,
          {
            maxWidth,
            paddingHorizontal: screenPadding,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        alwaysBounceVertical={false}
      >
        {step === "meet" && (
          <>
            <View
              style={[
                s.buddyStage,
                {
                  width: meetStageWidth,
                  minHeight: buddyStageMinHeight,
                },
              ]}
            >
              <View style={[s.meetBuddy, meetBuddyStyle]}>
                <Buddy
                  mood={firstPetDone ? "happy" : "calm"}
                  imageSource={
                    firstPetDone ? CHILD_BUDDY.happy : CHILD_BUDDY.hello
                  }
                  pettable
                  pettingMood="happy"
                  pettingHeartMode="pronounced"
                  tapHeartsInPetting
                  pettingStartDelayMs={180}
                  onPettingChange={handlePettingChange}
                  onTap={() => {
                    markInteraction();
                    speak(
                      firstPetDone
                        ? tg("onboarding.meet_after_pet_sub")
                        : currentLine,
                    );
                  }}
                  speak={speak}
                  size={meetBuddySize}
                />
              </View>
              {meetBubble && (
                <ImageBackground
                  source={visualAssets.graphics.buddyBubble}
                  style={[s.factBubble, factBubbleStyle]}
                  imageStyle={s.factBubbleImage}
                  resizeMode="stretch"
                >
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                    numberOfLines={5}
                    style={[
                      s.factText,
                      isLargeTablet && s.factTextLarge,
                      compactFactBubble && s.factTextSmall,
                      meetBubble === "pet" && s.petPromptText,
                    ]}
                  >
                    {meetBubbleText}
                  </Text>
                </ImageBackground>
              )}
            </View>
            <Text style={[s.title, isLargeTablet && s.titleLarge]}>
              {firstPetDone
                ? tg("onboarding.meet_after_pet_title")
                : tg("onboarding.meet_title")}
            </Text>
            <Text style={[s.subtitle, isLargeTablet && s.subtitleLarge]}>
              {firstPetDone
                ? tg("onboarding.meet_after_pet_sub")
                : tg("onboarding.meet_prompt")}
            </Text>
            {firstPetDone && (
              <TouchableOpacity
                style={[s.primaryBtn, isLargeTablet && s.primaryBtnLarge]}
                onPress={() => setStep("name")}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    s.primaryBtnText,
                    isLargeTablet && s.primaryBtnTextLarge,
                  ]}
                >
                  {tg("onboarding.meet_next")}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {step === "name" && (
          <>
            <Buddy
              mood="happy"
              imageSource={CHILD_BUDDY.calm}
              speak={speak}
              size={Math.round(buddySize * 0.7)}
            />
            <Text style={[s.title, isLargeTablet && s.titleLarge]}>
              {tg("onboarding.name_title")}
            </Text>
            <Text style={[s.subtitle, isLargeTablet && s.subtitleLarge]}>
              {tg("onboarding.name_sub")}
            </Text>
            <TextInput
              style={[
                s.input,
                { maxWidth: formMaxWidth },
                isLargeTablet && s.inputLarge,
              ]}
              placeholder={tg("onboarding.name_placeholder")}
              placeholderTextColor={C.muted}
              value={name}
              onChangeText={setName}
              returnKeyType="next"
              onSubmitEditing={() => {
                if (name.trim()) setStep("age");
              }}
            />
            <TouchableOpacity
              style={[
                s.primaryBtn,
                (!name.trim() || isLargeTablet) &&
                  isLargeTablet &&
                  s.primaryBtnLarge,
                !name.trim() && s.primaryBtnDisabled,
              ]}
              disabled={!name.trim()}
              onPress={() => setStep("age")}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  s.primaryBtnText,
                  isLargeTablet && s.primaryBtnTextLarge,
                ]}
              >
                {tg("onboarding.name_continue")}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {step === "age" && (
          <>
            <Buddy
              mood="encouraging"
              imageSource={CHILD_BUDDY.gentle}
              speak={speak}
              size={Math.round(buddySize * 0.62)}
            />
            <Text style={[s.title, isLargeTablet && s.titleLarge]}>
              {tg("onboarding.age_title")}
            </Text>
            <Text style={[s.subtitle, isLargeTablet && s.subtitleLarge]}>
              {tg("onboarding.age_sub")}
            </Text>
            <View style={[s.ageGrid, { maxWidth: formMaxWidth }]}>
              {AGE_OPTIONS.map((option) => {
                const active = age === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[
                      s.agePill,
                      isLargeTablet && s.agePillLarge,
                      active && s.agePillActive,
                    ]}
                    onPress={() => setAge(option)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        s.agePillText,
                        isLargeTablet && s.agePillTextLarge,
                        active && s.agePillTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={[s.primaryBtn, isLargeTablet && s.primaryBtnLarge]}
              onPress={() => setStep("ready")}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  s.primaryBtnText,
                  isLargeTablet && s.primaryBtnTextLarge,
                ]}
              >
                {tg("onboarding.age_continue")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.textBtn}
              onPress={() => {
                setAge(null);
                setStep("ready");
              }}
            >
              <Text
                style={[s.textBtnText, isLargeTablet && s.textBtnTextLarge]}
              >
                {tg("onboarding.age_skip")}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {step === "ready" && (
          <>
            <Buddy
              mood="proud"
              imageSource={CHILD_BUDDY.happy}
              celebrate
              speak={speak}
              size={Math.round(buddySize * 0.72)}
            />
            <Text style={[s.title, isLargeTablet && s.titleLarge]}>
              {name.trim()
                ? tg("onboarding.ready_title_named", { name: name.trim() })
                : tg("onboarding.ready_title")}
            </Text>
            <Text style={[s.subtitle, isLargeTablet && s.subtitleLarge]}>
              {tg(readySubKey)}
            </Text>
            <TouchableOpacity
              style={[s.primaryBtn, isLargeTablet && s.primaryBtnLarge]}
              onPress={complete}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  s.primaryBtnText,
                  isLargeTablet && s.primaryBtnTextLarge,
                ]}
              >
                {tg("onboarding.ready_start")}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    width: "100%",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
  },
  contentLarge: { paddingVertical: 52 },
  buddyStage: {
    width: "100%",
    position: "relative",
    marginBottom: 8,
    minHeight: 330,
  },
  meetBuddy: {
    position: "absolute",
    alignItems: "center",
  },
  factBubble: {
    position: "absolute",
    justifyContent: "center",
    zIndex: 1,
    pointerEvents: "none",
  },
  factBubbleImage: {
    opacity: 0.98,
  },
  factText: {
    fontSize: 13,
    lineHeight: 18,
    color: C.green,
    fontWeight: "600",
    textAlign: "center",
    includeFontPadding: false,
  },
  factTextSmall: {
    fontSize: 12,
    lineHeight: 16,
  },
  factTextLarge: { fontSize: 16, lineHeight: 22 },
  petPromptText: {
    fontSize: 18,
    lineHeight: 24,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    color: C.text,
    textAlign: "center",
    marginBottom: 10,
  },
  titleLarge: { fontSize: 42, lineHeight: 50, marginBottom: 16 },
  subtitle: {
    fontSize: 20,
    lineHeight: 28,
    color: C.muted,
    textAlign: "center",
    marginBottom: 22,
  },
  subtitleLarge: { fontSize: 27, lineHeight: 38, marginBottom: 34 },
  input: {
    width: "100%",
    borderWidth: 2,
    borderColor: "#A1D4B8",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    fontSize: 24,
    textAlign: "center",
    backgroundColor: C.white,
    color: C.text,
    marginBottom: 18,
  },
  inputLarge: { fontSize: 30, paddingVertical: 20, borderRadius: 22 },
  primaryBtn: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: C.green,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 28,
    alignItems: "center",
  },
  primaryBtnLarge: {
    maxWidth: 660,
    borderRadius: 24,
    paddingVertical: 24,
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: C.white, fontSize: 22, fontWeight: "800" },
  primaryBtnTextLarge: { fontSize: 30 },
  ageGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginBottom: 20,
  },
  agePill: {
    width: 72,
    height: 60,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#CFE9DD",
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },
  agePillLarge: { width: 92, height: 74, borderRadius: 22 },
  agePillActive: { backgroundColor: C.green, borderColor: C.green },
  agePillText: { fontSize: 24, color: C.green, fontWeight: "800" },
  agePillTextLarge: { fontSize: 32 },
  agePillTextActive: { color: C.white },
  textBtn: { marginTop: 18, padding: 12 },
  textBtnText: { color: C.muted, fontSize: 18, fontWeight: "600" },
  textBtnTextLarge: { fontSize: 24 },
});
