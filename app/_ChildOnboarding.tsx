// _ChildOnboarding.tsx — first child-facing Buddy bonding flow.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLayoutMetrics } from "../lib/layoutMetrics";
import { visualAssets } from "../lib/visualAssets";
import Buddy from "./_Buddy";
import { C } from "./_constants";
import { RtlChildSex, t } from "./i18n";

type ChildOnboardingStep = "meet" | "name" | "age" | "ready";

interface ChildOnboardingProps {
  initialName: string;
  initialAge: number;
  rtlChildSex: RtlChildSex;
  speak: (text: string, options?: { volume?: number }) => void;
  onComplete: (name: string, age: number | null) => void;
}

const AGE_OPTIONS = [4, 5, 6, 7, 8, 9, 10, 11, 12];
const CHILD_BUDDY = {
  hello: require("../assets/Character/Buddy2.png"),
  calm: require("../assets/Character/Buddy1.png"),
  gentle: require("../assets/Character/Buddy3.png"),
  happy: require("../assets/Character/Buddy4.png"),
};

export default function ChildOnboarding({
  initialName,
  initialAge,
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
  const [factVisible, setFactVisible] = useState(false);
  const [name, setName] = useState(initialName);
  const [age, setAge] = useState<number | null>(
    initialAge > 0 ? initialAge : null,
  );
  const firstPetSpokenRef = useRef(false);
  const readySubSpokenRef = useRef(false);
  const factSpokenRef = useRef(false);
  const factAllowedRef = useRef(false);
  const meetStartedAtRef = useRef(0);
  const lastInteractionAtRef = useRef(0);
  const postPetSequenceTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const speakRef = useRef(speak);

  const buddySize = isLargeTablet
    ? 340
    : isTabletWidth
      ? 290
      : isShortHeight
        ? 205
        : 250;
  const maxWidth = isLargeTablet
    ? Math.min(contentMaxWidth + 120, 840)
    : contentMaxWidth;
  const stageWidth = maxWidth - screenPadding * 2;
  const factBubbleWidth = isLargeTablet ? 460 : isTabletWidth ? 410 : 340;
  const factBubbleHeight = isLargeTablet ? 300 : isTabletWidth ? 260 : 214;
  const factBubbleTailX = factBubbleWidth * 0.055;
  const factBubbleTailY = factBubbleHeight * 0.23;
  const buddyBodyRightAtMouth = stageWidth / 2 + buddySize * 0.32;
  const factBubbleLeft = Math.max(
    0,
    Math.min(
      stageWidth - factBubbleWidth * 0.34,
      buddyBodyRightAtMouth + 8 - factBubbleTailX,
    ),
  );
  const factBubbleStyle = {
    left: factBubbleLeft,
    top: Math.max(24, Math.round(buddySize / 3 - factBubbleTailY + 28)),
    width: factBubbleWidth,
    height: factBubbleHeight,
    paddingTop: isLargeTablet ? 82 : isTabletWidth ? 68 : 54,
    paddingRight: isLargeTablet ? 58 : isTabletWidth ? 50 : 40,
    paddingBottom: isLargeTablet ? 70 : isTabletWidth ? 58 : 46,
    paddingLeft: isLargeTablet ? 90 : isTabletWidth ? 82 : 66,
  };
  const tinyFactText = t("onboarding.tiny_fact_bear_sleep")
    .replace(" can sleep ", " can sleep\n")
    .replace("могут спать ", "могут спать\n")
    .replace("יכולים לישון ", "יכולים לישון\n");

  const currentLine = useMemo(() => {
    if (step === "meet") {
      return firstPetDone
        ? t("onboarding.meet_after_pet_title")
        : t("onboarding.meet_title");
    }
    if (step === "name") return t("onboarding.name_title");
    if (step === "age") return t("onboarding.age_title");
    const trimmed = name.trim();
    return trimmed
      ? t("onboarding.ready_title_named", { name: trimmed })
      : t("onboarding.ready_title");
  }, [firstPetDone, name, step]);

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

  function showTinyFact() {
    if (!factAllowedRef.current) return;
    setFactVisible(true);
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
    factSpokenRef.current = false;
    factAllowedRef.current = false;
    const initialFactDelay =
      estimateSpeechMs(t("onboarding.meet_title")) + 1000;
    postPetSequenceTimersRef.current = [
      setTimeout(() => {
        factAllowedRef.current = true;
        showTinyFact();
      }, initialFactDelay),
    ];

    let idlePoll: ReturnType<typeof setInterval> | null = null;
    const idleGate = setTimeout(() => {
      idlePoll = setInterval(() => {
        const idleFor = Date.now() - lastInteractionAtRef.current;
        if (idleFor >= 850) {
          showTinyFact();
          if (idlePoll) {
            clearInterval(idlePoll);
            idlePoll = null;
          }
        }
      }, 200);
    }, 2600);

    const hardShow = setTimeout(() => {
      showTinyFact();
      if (idlePoll) {
        clearInterval(idlePoll);
        idlePoll = null;
      }
    }, 5200);

    return () => {
      clearTimeout(idleGate);
      clearTimeout(hardShow);
      if (idlePoll) clearInterval(idlePoll);
      clearPostPetSequenceTimers();
    };
  }, [step]);

  useEffect(() => {
    if (step !== "ready") return;
    if (readySubSpokenRef.current) return;
    readySubSpokenRef.current = true;
    const readySubTimer = setTimeout(() => {
      speakRef.current(t("onboarding.ready_sub"));
    }, estimateSpeechMs(currentLine) + 220);
    return () => clearTimeout(readySubTimer);
  }, [currentLine, step]);

  function markInteraction() {
    lastInteractionAtRef.current = Date.now();
  }

  function handlePettingChange(petting: boolean) {
    if (!petting) return;
    markInteraction();
    if (firstPetDone) return;
    setFirstPetDone(true);
    setFactVisible(false);
    if (!firstPetSpokenRef.current) {
      firstPetSpokenRef.current = true;
      clearPostPetSequenceTimers();
      const afterPetTitle = t("onboarding.meet_after_pet_title");
      const companionLine = t("onboarding.meet_after_pet_sub");
      const companionDelay = estimateSpeechMs(afterPetTitle) + 220;
      const factDelay = companionDelay + estimateSpeechMs(companionLine) + 1000;
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
            <View style={s.buddyStage}>
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
                      ? t("onboarding.meet_after_pet_sub")
                      : currentLine,
                  );
                }}
                speak={speak}
                size={buddySize}
              />
              {factVisible && (
                <ImageBackground
                  source={visualAssets.graphics.buddyBubble}
                  style={[s.factBubble, factBubbleStyle]}
                  imageStyle={s.factBubbleImage}
                  resizeMode="stretch"
                >
                  <Text style={[s.factText, isLargeTablet && s.factTextLarge]}>
                    {tinyFactText}
                  </Text>
                </ImageBackground>
              )}
            </View>
            <Text style={[s.title, isLargeTablet && s.titleLarge]}>
              {firstPetDone
                ? t("onboarding.meet_after_pet_title")
                : t("onboarding.meet_title")}
            </Text>
            <Text style={[s.subtitle, isLargeTablet && s.subtitleLarge]}>
              {firstPetDone
                ? t("onboarding.meet_after_pet_sub")
                : t("onboarding.meet_prompt")}
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
                  {t("onboarding.meet_next")}
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
              {t("onboarding.name_title")}
            </Text>
            <Text style={[s.subtitle, isLargeTablet && s.subtitleLarge]}>
              {t("onboarding.name_sub")}
            </Text>
            <TextInput
              style={[
                s.input,
                { maxWidth: formMaxWidth },
                isLargeTablet && s.inputLarge,
              ]}
              placeholder={t("onboarding.name_placeholder")}
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
                {t("onboarding.name_continue")}
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
              {t("onboarding.age_title")}
            </Text>
            <Text style={[s.subtitle, isLargeTablet && s.subtitleLarge]}>
              {t("onboarding.age_sub")}
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
                {t("onboarding.age_continue")}
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
                {t("onboarding.age_skip")}
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
                ? t("onboarding.ready_title_named", { name: name.trim() })
                : t("onboarding.ready_title")}
            </Text>
            <Text style={[s.subtitle, isLargeTablet && s.subtitleLarge]}>
              {t("onboarding.ready_sub")}
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
                {t("onboarding.ready_start")}
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
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: 8,
    minHeight: 330,
  },
  factBubble: {
    position: "absolute",
    justifyContent: "center",
    pointerEvents: "none",
  },
  factBubbleImage: {
    opacity: 0.98,
  },
  factText: {
    fontSize: 12,
    lineHeight: 17,
    color: C.green,
    fontWeight: "600",
    textAlign: "center",
  },
  factTextLarge: { fontSize: 16, lineHeight: 22 },
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
