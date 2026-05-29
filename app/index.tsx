// npx expo install expo-speech @react-native-async-storage/async-storage react-native-confetti-cannon

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";
import { StatusBar } from "expo-status-bar";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { incrementLocalUsage } from "../localUsage";
import BreathingScreen from "./_BreathingScreen";
import Buddy from "./_Buddy";
import {
  AgeProfile,
  BuddyMood,
  DEFAULT_MORNING_STEPS,
  DEMO_STEPS,
  effectiveMissionEnabled,
  effectiveMissionStars,
  effectiveRewardCost,
  effectiveRewardEnabled,
  getAgeProfile,
  getCurrentBlock,
  getMissionSubtitle,
  getMissionTitle,
  getNextBlock,
  getRewardTitle,
  getStoredMissionTitle,
  getTinyFact,
  getTinyJokes,
  isWeekend,
  MISSION_POOL,
  MISSIONS_EASY,
  PoolMission,
  PROFILE_CONFIGS,
  Reward,
  REWARDS,
  selectBonusMission,
  selectDailyMissions,
  shouldBeVeryExcited,
  shouldShowConfetti,
  shouldShowMorning,
  todayStr,
} from "./_constants";
import DayScreen from "./_DayScreen";
import {
  DemoCompleteScreen,
  DemoIntroScreen,
  DemoStepScreen,
} from "./_DemoScreens";
import HomeScreen from "./_HomeScreen";
import {
  ActiveScreen,
  CelebrateScreen,
  MissionPickScreen,
  RewardsScreen,
} from "./_MissionScreens";
import MorningRoutineScreen from "./_MorningRoutineScreen";
import ParentOnboarding from "./_ParentOnboarding";
import SettingsScreen, {
  AppSettings,
  DEFAULT_SETTINGS,
  loadSettings,
  RotationFrequency,
  saveSettings,
} from "./_SettingsScreen";
import { Confetti, ProgressBar, T } from "./_SharedUI";
import { getTtsLanguage, t, tGender, tSpeak } from "./i18n";

// ── CHARACTER IMAGES ──────────────────────────────────────────────────────────

const BUDDY = {
  calm: require("../assets/Character/buddy-calm.png"),
  "gentle-reminder": require("../assets/Character/buddy-gentle-reminder.png"),
  serene: require("../assets/Character/buddy-serene.png"),
  encouraging: require("../assets/Character/buddy-encouraging.png"),
  thinking: require("../assets/Character/buddy-thinking.png"),
  excited: require("../assets/Character/buddy-excited.png"),
  happy: require("../assets/Character/buddy-happy.png"),
  proud: require("../assets/Character/buddy-proud.png"),
  "very-excited": require("../assets/Character/buddy-very-excited.png"),
};

// ── MOOD TRIGGER LOGIC ────────────────────────────────────────────────────────
// calm            → home default, quiet idle, breathing sessions
// gentle-reminder → home alternate (~30%), morning, after 2 skips
// serene          → rewards browsing, reflective boost, breathing end
// encouraging     → mission pick, hesitation, daily suggestion
// thinking        → tiny facts delivery
// excited         → active mission, big mission ⭐⭐
// happy           → easy mission done ⭐, demo praise
// proud           → demo complete, milestone, reward redemption
// very-excited    → first 10 stars, every 50 stars, first reward redeemed (RARE)

// ── STORAGE KEYS ──────────────────────────────────────────────────────────────

const K = {
  STARS: "sb_stars_v2",
  TOTAL_EVER: "sb_total_v2",
  COMPLETED_TODAY: "sb_today_v2",
  LAST_DATE: "sb_date_v2",
  DEMO_DONE: "sb_demo_done",
  TOTAL_MISSIONS: "sb_total_missions",
  CHILD_NAME: "sb_child_name",
  LAST_MISSION: "sb_last_mission",
  SKIP_COUNT: "sb_skip_count",
  FIRST_REWARD: "sb_first_reward",
  PARENT_PIN: "sb_parent_pin",
  PIN_ENABLED: "sb_pin_enabled",
  PARENT_ONBOARDING_DONE: "sb_parent_onboarding_done",
  ONBOARDING_DONE: "sb_onboarding_done",
  MORNING_DONE: "sb_morning_done",
  DONE_IDS_TODAY: "sb_done_ids_today",
  CHILD_AGE: "sb_child_age",
  TINY_FACT_LAST_SHOWN: "sb_tiny_fact_last_shown",
  BREATHING_INTRO_RUNS: "sb_breathing_intro_runs",
};

const TINY_FACT_IDLE_MIN_MS = 2000;
const TINY_FACT_IDLE_JITTER_MS = 3000;
const TINY_FACT_VISIBLE_MS = 10000;

// ── HELPERS ───────────────────────────────────────────────────────────────────

function getRotationSeed(freq: RotationFrequency) {
  const dayIndex = Math.floor(Date.now() / 86400000);
  if (freq === "weekly") return Math.floor(dayIndex / 7);
  if (freq === "every3") return Math.floor(dayIndex / 3);
  return dayIndex;
}

function parseTimeToMinutes(hhmm: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

// ── TTS ───────────────────────────────────────────────────────────────────────

function ttsLanguagePrefix(tag: string): string {
  return tag.toLowerCase().split(/[-_]/)[0] ?? tag.toLowerCase();
}

function voiceMatchesLanguage(
  voice: { language?: string } | null | undefined,
  language: string,
): boolean {
  if (!voice?.language) return false;
  const voiceLang = voice.language.toLowerCase().replace("_", "-");
  const normalizedLanguage = language.toLowerCase().replace("_", "-");
  const prefix = ttsLanguagePrefix(normalizedLanguage);
  return voiceLang === normalizedLanguage || voiceLang.startsWith(prefix);
}

async function resolveVoiceForLanguage(language: string) {
  try {
    await new Promise((r) => setTimeout(r, 800));
    const voices = await Speech.getAvailableVoicesAsync();
    if (!voices?.length) return null;
    const normalizedLanguage = language.toLowerCase().replace("_", "-");
    const prefix = ttsLanguagePrefix(normalizedLanguage);
    const enhanced = (Speech as any).VoiceQuality?.Enhanced;
    const byLanguage = voices.filter((v) =>
      voiceMatchesLanguage(v, normalizedLanguage),
    );
    // iOS/Samsung sometimes expose multiple he voices where one spells letters.
    // Prefer enhanced/default and de-prioritize novelty voices.
    const byNameScore = (v: any) => {
      const name = String(v?.name ?? "").toLowerCase();
      const qualityBonus = v?.quality === enhanced ? 10 : 0;
      const minusNovelty = /compact|novelty|enhanced\(novelty\)|eloquence/.test(
        name,
      )
        ? -4
        : 0;
      const plusDefault = /default|siri|female|male/.test(name) ? 2 : 0;
      return qualityBonus + plusDefault + minusNovelty;
    };
    const preferredByName = [...byLanguage].sort(
      (a, b) => byNameScore(b) - byNameScore(a),
    );
    return (
      preferredByName[0] ||
      voices.find(
        (v) =>
          v.language?.toLowerCase().replace("_", "-") === normalizedLanguage &&
          v.quality === enhanced,
      ) ||
      voices.find(
        (v) =>
          v.language?.toLowerCase().replace("_", "-") === normalizedLanguage,
      ) ||
      voices.find((v) =>
        v.language?.toLowerCase().replace("_", "-").startsWith(prefix),
      ) ||
      null
    );
  } catch {
    return null;
  }
}

type SpeechCallOptions = {
  volume?: number;
};

function applyRtlGenderSpeech(
  text: string,
  language: string,
  sex: "male" | "female",
) {
  if (sex !== "female") return text;
  const prefix = ttsLanguagePrefix(language);
  if (prefix !== "he" && prefix !== "ar") return text;

  // Lightweight practical fixes for common masculine Hebrew forms in prompts.
  return text
    .replace(/\bשמח\b/g, "שמחה")
    .replace(/\bמוכן\b/g, "מוכנה")
    .replace(/\bרגוע\b/g, "רגועה")
    .replace(/\bבטוח\b/g, "בטוחה")
    .replace(/\bעצמאי\b/g, "עצמאית");
}

function useSpeech(enabled: boolean, rtlChildSex: "male" | "female" = "male") {
  const voiceRef = useRef<any>(null);
  const languageRef = useRef(getTtsLanguage());
  const enabledRef = useRef(enabled);
  const speakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    enabledRef.current = enabled;
    if (!enabled) {
      if (speakTimerRef.current) {
        clearTimeout(speakTimerRef.current);
        speakTimerRef.current = null;
      }
      try {
        Speech.stop();
      } catch {}
    }
  }, [enabled]);

  useEffect(() => {
    const lang = getTtsLanguage();
    languageRef.current = lang;
    resolveVoiceForLanguage(lang).then((v) => {
      voiceRef.current = v;
    });
    return () => {
      if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
      try {
        Speech.stop();
      } catch {}
    };
  }, []);

  return useCallback(
    (text: string, options: SpeechCallOptions = {}) => {
      if (!enabledRef.current || !text) return;
      if (speakTimerRef.current) {
        clearTimeout(speakTimerRef.current);
        speakTimerRef.current = null;
      }
      try {
        Speech.stop();
      } catch {}
      const lang = getTtsLanguage();
      const genderedText = applyRtlGenderSpeech(text, lang, rtlChildSex);
      const cleanedText = genderedText
        .replace(
          /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
          "",
        )
        .replace(/[⭐★☆•▪︎▶️→←]/g, " ")
        .replace(/\s*[—–-]\s*/g, ", ")
        .replace(/\s*\.\s*/g, ". ")
        .replace(/\s+/g, " ")
        .trim();
      if (!cleanedText) return;
      if (languageRef.current !== lang) {
        languageRef.current = lang;
        resolveVoiceForLanguage(lang).then((v) => {
          voiceRef.current = v;
        });
      }
      const opts: any = {
        language: lang,
        pitch: 1.05,
        rate: Platform.OS === "ios" ? 0.52 : 0.65,
      };
      if (typeof options.volume === "number") {
        opts.volume = Math.max(0, Math.min(1, options.volume));
      }
      if (
        voiceMatchesLanguage(voiceRef.current, lang) &&
        voiceRef.current?.identifier
      ) {
        opts.voice = voiceRef.current.identifier;
      }
      speakTimerRef.current = setTimeout(
        () => {
          speakTimerRef.current = null;
          if (!enabledRef.current) return;
          const fallbackOpts: any = { ...opts };
          delete fallbackOpts.voice;
          const speakWithFallback = () => {
            try {
              Speech.speak(cleanedText, {
                ...fallbackOpts,
                onError: () => {
                  // Last resort for Hebrew engines that reject selected voice.
                  try {
                    Speech.speak(cleanedText, fallbackOpts);
                  } catch {}
                },
              });
            } catch {}
          };
          try {
            Speech.speak(cleanedText, {
              ...opts,
              onError: () => {
                voiceRef.current = null;
                speakWithFallback();
              },
            });
          } catch {
            speakWithFallback();
          }
        },
        Platform.OS === "ios" ? 120 : 0,
      );
    },
    [rtlChildSex],
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────

export default function App() {
  // Core state
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<string>("home");
  const [demoStep, setDemoStep] = useState(0);
  const [stars, setStars] = useState(0);
  const [totalEver, setTotalEver] = useState(0);
  const [prevTotalEver, setPrevTotalEver] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const [totalMissions, setTotalMissions] = useState(0);
  const [mission, setMission] = useState<any>(null);
  const [firstMission, setFirstMission] = useState(true);
  const [lastMission, setLastMission] = useState<string | null>(null);
  const [skipCount, setSkipCount] = useState(0);
  const [isVeryExcited, setIsVeryExcited] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(true);
  const [firstReward, setFirstReward] = useState(false);
  const [showMorning, setShowMorning] = useState(false);
  const [doneIdsToday, setDoneIdsToday] = useState<number[]>([]);
  const [showGlobalBuddy, setShowGlobalBuddy] = useState(true);
  const [breathingIntroRuns, setBreathingIntroRuns] = useState(0);

  // Onboarding
  const [parentOnboardingDone, setParentOnboardingDone] = useState(false);
  const [childName, setChildName] = useState("");
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [childAge, setChildAge] = useState(7);

  // PIN
  const [parentPin, setParentPin] = useState("");
  const [pinEnabled, setPinEnabled] = useState(false);
  const [showPinScreen, setShowPinScreen] = useState(false);
  const [enteredPin, setEnteredPin] = useState("");
  const [pendingReward, setPendingReward] = useState<any>(null);
  const [pendingMissionComplete, setPendingMissionComplete] = useState(false);
  const [pinError, setPinError] = useState("");
  const [pinFocused, setPinFocused] = useState(false);

  // Settings
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [ttsEnabled, setTtsEnabled] = useState(DEFAULT_SETTINGS.ttsEnabled);

  const [transientMood, setTransientMood] = useState<BuddyMood | null>(null);
  const transientMoodTimer = useRef<any>(null);
  const [tinyFactBubble, setTinyFactBubble] = useState<string | null>(null);
  const tinyFactTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tinyFactHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tinyFactLastShownRef = useRef(0);
  const tinyFactLastTextRef = useRef<string | null>(null);
  const [showCelebrateConfetti, setShowCelebrateConfetti] = useState(false);
  const [celebrateConfettiKey, setCelebrateConfettiKey] = useState(0);
  const celebrateConfettiTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const speak = useSpeech(ttsEnabled, appSettings.rtlChildSex ?? "male");
  const ageProfile: AgeProfile =
    appSettings.ageProfileOverride && appSettings.ageProfileOverride !== "auto"
      ? appSettings.ageProfileOverride
      : getAgeProfile(childAge);

  const fixedOverlayMood = useMemo(() => {
    if (transientMood) return transientMood;
    if (screen === "home") {
      const threshold = Math.max(1, appSettings.skipSensitivity ?? 2);
      return skipCount >= threshold
        ? "gentle-reminder"
        : Math.random() > 0.7
          ? "gentle-reminder"
          : "calm";
    }
    if (screen === "pick") return "encouraging";
    if (screen === "active") {
      return "encouraging";
    }
    if (screen === "celebrate") {
      return isVeryExcited ? "very-excited" : "proud";
    }
    if (screen === "rewards") return "serene";
    if (screen === "breathing") return "serene";
    if (screen === "demo_intro") return "calm";
    if (screen === "demo_step") return "excited";
    if (screen === "demo_complete") return "proud";
    return "calm";
  }, [
    screen,
    skipCount,
    appSettings.skipSensitivity,
    isVeryExcited,
    transientMood,
  ]);

  const fixedOverlayCelebrate = screen === "celebrate";

  // ── Load all state ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const vals = await AsyncStorage.multiGet([
          K.STARS,
          K.TOTAL_EVER,
          K.COMPLETED_TODAY,
          K.LAST_DATE,
          K.DEMO_DONE,
          K.TOTAL_MISSIONS,
          K.CHILD_NAME,
          K.LAST_MISSION,
          K.SKIP_COUNT,
          K.FIRST_REWARD,
          K.PARENT_PIN,
          K.PIN_ENABLED,
          K.PARENT_ONBOARDING_DONE,
          K.ONBOARDING_DONE,
          K.MORNING_DONE,
          K.DONE_IDS_TODAY,
          K.CHILD_AGE,
          K.TINY_FACT_LAST_SHOWN,
          K.BREATHING_INTRO_RUNS,
        ]);
        // multiGet returns [key, string|null][] — coerce nulls to '' for safe parseInt
        const v: Record<string, string> = Object.fromEntries(
          vals.map(([k, val]) => [k, val ?? ""]),
        );
        const today = todayStr();
        const newDay = v[K.LAST_DATE] !== today;

        const st = v[K.STARS] ? parseInt(v[K.STARS], 10) : 0;
        const tot = v[K.TOTAL_EVER] ? parseInt(v[K.TOTAL_EVER], 10) : st;
        const tm = v[K.TOTAL_MISSIONS] ? parseInt(v[K.TOTAL_MISSIONS], 10) : 0;
        const comp = newDay
          ? 0
          : v[K.COMPLETED_TODAY]
            ? parseInt(v[K.COMPLETED_TODAY], 10)
            : 0;
        const sk = newDay
          ? 0
          : v[K.SKIP_COUNT]
            ? parseInt(v[K.SKIP_COUNT], 10)
            : 0;

        setStars(st);
        setTotalEver(tot);
        setPrevTotalEver(tot);
        setCompletedToday(comp);
        setTotalMissions(tm);
        setChildName(v[K.CHILD_NAME] || "");
        setSkipCount(sk);
        setFirstReward(v[K.FIRST_REWARD] === "true");
        setFirstMission(tm === 0);
        setParentOnboardingDone(v[K.PARENT_ONBOARDING_DONE] === "true");
        setOnboardingDone(v[K.ONBOARDING_DONE] === "true");
        setParentPin(v[K.PARENT_PIN] || "");
        const age = v[K.CHILD_AGE] ? parseInt(v[K.CHILD_AGE], 10) : 7;
        setChildAge(age);
        tinyFactLastShownRef.current = v[K.TINY_FACT_LAST_SHOWN]
          ? parseInt(v[K.TINY_FACT_LAST_SHOWN], 10)
          : 0;
        setBreathingIntroRuns(
          v[K.BREATHING_INTRO_RUNS]
            ? Math.max(0, parseInt(v[K.BREATHING_INTRO_RUNS], 10) || 0)
            : 0,
        );

        // Restore today's completed mission IDs (reset on new day)
        if (newDay) {
          setDoneIdsToday([]);
        } else {
          try {
            const parsed = v[K.DONE_IDS_TODAY]
              ? JSON.parse(v[K.DONE_IDS_TODAY])
              : [];
            setDoneIdsToday(
              Array.isArray(parsed)
                ? parsed.filter((n: any) => typeof n === "number")
                : [],
            );
          } catch {
            setDoneIdsToday([]);
          }
        }

        // Load full settings
        const s = await loadSettings();
        setLastMission(
          newDay ? null : getStoredMissionTitle(v[K.LAST_MISSION]),
        );
        const onboardingAlreadyComplete =
          v[K.PARENT_ONBOARDING_DONE] === "true" &&
          v[K.ONBOARDING_DONE] === "true";
        const morningDone = v[K.MORNING_DONE] ?? "";
        if (
          onboardingAlreadyComplete &&
          s.morningEnabled &&
          shouldShowMorning(morningDone)
        ) {
          setShowMorning(true);
        }

        setAppSettings(s);
        setTtsEnabled(s.ttsEnabled);
        setShowSuggestion(s.nudgingEnabled);
        setPinEnabled(v[K.PIN_ENABLED] === "true");

        // Only go to demo if onboarding is already done
        if (v[K.ONBOARDING_DONE] === "true" && !v[K.DEMO_DONE]) {
          setScreen("demo_intro");
        }

        if (newDay) {
          await AsyncStorage.multiSet([
            [K.LAST_DATE, today],
            [K.COMPLETED_TODAY, "0"],
            [K.SKIP_COUNT, "0"],
          ]);
        }
      } catch (e) {
        console.log("Load error", e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // Persist stars / missions / skips
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.multiSet([
      [K.STARS, String(stars)],
      [K.TOTAL_EVER, String(totalEver)],
      [K.TOTAL_MISSIONS, String(totalMissions)],
      [K.SKIP_COUNT, String(skipCount)],
    ]).catch(console.log);
  }, [stars, totalEver, totalMissions, skipCount, ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(K.COMPLETED_TODAY, String(completedToday)).catch(
      console.log,
    );
  }, [completedToday, ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(K.DONE_IDS_TODAY, JSON.stringify(doneIdsToday)).catch(
      console.log,
    );
  }, [doneIdsToday, ready]);

  // ── Onboarding ──────────────────────────────────────────────────────────────
  async function saveChildName() {
    const name = childName.trim();
    if (!name) {
      Alert.alert(t("onboarding.name_required"));
      return;
    }
    try {
      await AsyncStorage.multiSet([
        [K.CHILD_NAME, name],
        [K.CHILD_AGE, String(childAge)],
        [K.ONBOARDING_DONE, "true"],
      ]);
      setChildName(name);
      setOnboardingDone(true);
      speak(
        tSpeak(
          "onboarding.welcome_greeting",
          { name },
          appSettings.rtlChildSex ?? "male",
        ),
      );
      // After onboarding go to demo if not done, else home
      setScreen("demo_intro");
    } catch {
      Alert.alert(t("onboarding.save_error"));
    }
  }

  // ── Demo ────────────────────────────────────────────────────────────────────
  async function finishDemo() {
    await AsyncStorage.setItem(K.DEMO_DONE, "true");
  }

  function handleDemoStepDone() {
    const nextStep = demoStep + 1;
    if (nextStep < DEMO_STEPS.length) {
      setDemoStep(nextStep);
      setScreen("demo_step");
    } else {
      setScreen("demo_complete");
    }
  }

  // ── Missions ────────────────────────────────────────────────────────────────
  const pickMission = useCallback(
    (m: any) => {
      incrementLocalUsage("missionsStarted").catch(console.log);
      setMission(m);
      setSkipCount(0);
      speak(
        `${getMissionTitle(m.id, m.title)}. ${getMissionSubtitle(m.id, m.subtitle)}`,
      );
      setScreen("active");
    },
    [speak],
  );

  const handleSkip = useCallback(() => {
    incrementLocalUsage("missionsSkipped").catch(console.log);
    setSkipCount((n) => n + 1);
    setMission(null);
    setScreen("home");
  }, []);

  const flashBuddyMood = useCallback((mood: BuddyMood, duration = 2200) => {
    setTransientMood(mood);
    if (transientMoodTimer.current) {
      clearTimeout(transientMoodTimer.current);
    }
    transientMoodTimer.current = setTimeout(
      () => setTransientMood(null),
      duration,
    );
  }, []);

  useEffect(() => {
    return () => {
      if (transientMoodTimer.current) clearTimeout(transientMoodTimer.current);
      if (tinyFactTimer.current) clearTimeout(tinyFactTimer.current);
      if (tinyFactHideTimer.current) clearTimeout(tinyFactHideTimer.current);
      if (celebrateConfettiTimer.current) {
        clearTimeout(celebrateConfettiTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (tinyFactTimer.current) clearTimeout(tinyFactTimer.current);
    if (tinyFactHideTimer.current) clearTimeout(tinyFactHideTimer.current);
    setTinyFactBubble(null);

    if (screen !== "active" || !mission || !appSettings.tinyFactsEnabled) {
      return;
    }

    const allFacts = MISSION_POOL.map((m) => getTinyFact(m.id)).filter(
      (f): f is string => !!f,
    );
    const allJokes = getTinyJokes();
    if (allFacts.length === 0 && allJokes.length === 0) {
      return;
    }

    let cancelled = false;

    function pickFact(): string {
      const missionFact = getTinyFact(mission.id);
      // Mix jokes into the tiny-facts stream, but keep mission fact slightly
      // preferred when one exists.
      const mixed = [...allFacts, ...allJokes];
      const pool = missionFact
        ? [missionFact, ...mixed.filter((f) => f !== missionFact)]
        : mixed;
      const withoutLast = pool.filter((f) => f !== tinyFactLastTextRef.current);
      const source = withoutLast.length > 0 ? withoutLast : pool;
      return source[Math.floor(Math.random() * source.length)];
    }

    function scheduleFact() {
      const profileDefaultMinutes: 1 | 2 | 5 | 10 =
        ageProfile === "little" ? 10 : ageProfile === "teen" ? 2 : 5;
      const effectiveMinutes =
        appSettings.tinyFactsMinMinutesManual === true
          ? appSettings.tinyFactsMinMinutes
          : profileDefaultMinutes;
      const minutes =
        effectiveMinutes === 1 ||
        effectiveMinutes === 2 ||
        effectiveMinutes === 5 ||
        effectiveMinutes === 10
          ? effectiveMinutes
          : 5;
      const cooldownMs = minutes * 60 * 1000;
      const lastShown = Number.isFinite(tinyFactLastShownRef.current)
        ? tinyFactLastShownRef.current
        : 0;
      const cooldownRemaining =
        lastShown > 0 ? Math.max(0, cooldownMs - (Date.now() - lastShown)) : 0;
      const idleDelay =
        TINY_FACT_IDLE_MIN_MS +
        Math.round(Math.random() * TINY_FACT_IDLE_JITTER_MS);
      const delay = cooldownRemaining + idleDelay;

      tinyFactTimer.current = setTimeout(() => {
        if (cancelled) return;
        const factText = pickFact();
        const now = Date.now();
        tinyFactLastShownRef.current = now;
        tinyFactLastTextRef.current = factText;
        AsyncStorage.setItem(K.TINY_FACT_LAST_SHOWN, String(now)).catch(
          console.log,
        );
        setTinyFactBubble(factText);
        flashBuddyMood("thinking", TINY_FACT_VISIBLE_MS);
        tinyFactHideTimer.current = setTimeout(() => {
          if (cancelled) return;
          setTinyFactBubble(null);
          scheduleFact();
        }, TINY_FACT_VISIBLE_MS);
      }, delay);
    }

    scheduleFact();
    return () => {
      cancelled = true;
      if (tinyFactTimer.current) clearTimeout(tinyFactTimer.current);
      if (tinyFactHideTimer.current) clearTimeout(tinyFactHideTimer.current);
    };
  }, [
    screen,
    mission,
    appSettings.tinyFactsEnabled,
    appSettings.tinyFactsMinMinutes,
    appSettings.tinyFactsMinMinutesManual,
    flashBuddyMood,
    ageProfile,
  ]);

  function triggerCelebrateConfetti(elevatedMood: BuddyMood = "excited") {
    if (celebrateConfettiTimer.current) {
      clearTimeout(celebrateConfettiTimer.current);
    }
    // Ensure confetti is paired with a visible mood lift, then naturally
    // fall back through the existing transient mood cooldown path.
    flashBuddyMood(elevatedMood, 3950);
    setCelebrateConfettiKey((n) => n + 1);
    setShowCelebrateConfetti(true);
    celebrateConfettiTimer.current = setTimeout(() => {
      setShowCelebrateConfetti(false);
      celebrateConfettiTimer.current = null;
    }, 5200);
  }

  function completeMissionInternal() {
    if (!mission) return;
    const newEver = totalEver + mission.stars;
    const newTotal = totalMissions + 1;
    const veryExcited = shouldBeVeryExcited(newEver, prevTotalEver, false);
    const completionMood = veryExcited
      ? "very-excited"
      : mission.stars >= 2
        ? "excited"
        : "happy";

    setStars((n) => n + mission.stars);
    setPrevTotalEver(totalEver);
    setTotalEver(newEver);
    setCompletedToday((n) => n + 1);
    setTotalMissions(newTotal);
    incrementLocalUsage("missionsCompleted").catch(console.log);
    setSkipCount(0);
    setFirstMission(false);
    setIsVeryExcited(veryExcited);
    if (typeof mission.id === "number") {
      setDoneIdsToday((ids) =>
        ids.includes(mission.id) ? ids : [...ids, mission.id],
      );
    }
    setLastMission(getMissionTitle(mission.id, mission.title));
    AsyncStorage.setItem(
      K.LAST_MISSION,
      JSON.stringify({ id: mission.id, title: mission.title }),
    ).catch(console.log);
    flashBuddyMood(completionMood);
    if (shouldShowConfetti(newTotal) || veryExcited) {
      triggerCelebrateConfetti(veryExcited ? "very-excited" : "excited");
    }
    setScreen("celebrate");
  }

  function completeMission() {
    if (
      appSettings.missionCompletionPinEnabled &&
      pinEnabled &&
      parentPin &&
      mission
    ) {
      setPendingReward(null);
      setPendingMissionComplete(true);
      setEnteredPin("");
      setPinError("");
      setPinFocused(false);
      setShowPinScreen(true);
      return;
    }
    completeMissionInternal();
  }

  function handleSuggestionAccept(suggestion: any) {
    const m =
      MISSIONS_EASY.find((ms) => ms.id === suggestion.missionId) ||
      MISSIONS_EASY[0];
    setShowSuggestion(false);
    pickMission(m);
  }

  // ── PIN / Reward redemption ─────────────────────────────────────────────────
  const redeemReward = useCallback(
    (reward: any) => {
      const isFirst = !firstReward;
      setStars((n) => Math.max(0, n - reward.cost));
      if (isFirst) {
        setFirstReward(true);
        setIsVeryExcited(true);
        AsyncStorage.setItem(K.FIRST_REWARD, "true").catch(console.log);
      }
      incrementLocalUsage("rewardsRedeemed").catch(console.log);
      speak(
        tSpeak(
          "rewards.redeemed_speak",
          undefined,
          appSettings.rtlChildSex ?? "male",
        ),
      );
      Alert.alert(
        t("rewards.redeemed_alert_title"),
        getRewardTitle(reward.id, reward.title),
      );
    },
    [firstReward, speak, appSettings.rtlChildSex],
  );

  const handleRewardRedeem = useCallback(
    (reward: any) => {
      if (stars < reward.cost) return;
      if (pinEnabled && parentPin) {
        setPendingReward(reward);
        setEnteredPin("");
        setPinError("");
        setPinFocused(false);
        setShowPinScreen(true);
      } else {
        redeemReward(reward);
      }
    },
    [stars, pinEnabled, parentPin, redeemReward],
  );

  const handleBreathingGuidanceChange = useCallback((enabled: boolean) => {
    setAppSettings((prev) => {
      const next = { ...prev, breathingGuidanceEnabled: enabled };
      saveSettings(next).catch(console.log);
      return next;
    });
  }, []);

  const handleBreathingMusicChange = useCallback((enabled: boolean) => {
    setAppSettings((prev) => {
      const next = { ...prev, breathingMusicEnabled: enabled };
      saveSettings(next).catch(console.log);
      return next;
    });
  }, []);

  const handleBreathingSessionStart = useCallback(() => {
    setBreathingIntroRuns((prev) => {
      const next = Math.min(10, prev + 1);
      if (next !== prev) {
        AsyncStorage.setItem(K.BREATHING_INTRO_RUNS, String(next)).catch(
          console.log,
        );
      }
      return next;
    });
  }, []);

  const syncProgressFromStorage = useCallback(async () => {
    try {
      const vals = await AsyncStorage.multiGet([
        K.STARS,
        K.TOTAL_EVER,
        K.COMPLETED_TODAY,
        K.TOTAL_MISSIONS,
        K.LAST_MISSION,
        K.FIRST_REWARD,
        K.SKIP_COUNT,
        K.DONE_IDS_TODAY,
        K.TINY_FACT_LAST_SHOWN,
      ]);
      const v: Record<string, string> = Object.fromEntries(
        vals.map(([k, val]) => [k, val ?? ""]),
      );
      const st = v[K.STARS] ? parseInt(v[K.STARS], 10) : 0;
      const tot = v[K.TOTAL_EVER] ? parseInt(v[K.TOTAL_EVER], 10) : st;
      const tm = v[K.TOTAL_MISSIONS] ? parseInt(v[K.TOTAL_MISSIONS], 10) : 0;
      const comp = v[K.COMPLETED_TODAY]
        ? parseInt(v[K.COMPLETED_TODAY], 10)
        : 0;
      const sk = v[K.SKIP_COUNT] ? parseInt(v[K.SKIP_COUNT], 10) : 0;
      let doneIds: number[] = [];
      try {
        const parsed = v[K.DONE_IDS_TODAY]
          ? JSON.parse(v[K.DONE_IDS_TODAY])
          : [];
        doneIds = Array.isArray(parsed)
          ? parsed.filter((n: unknown) => typeof n === "number")
          : [];
      } catch {
        doneIds = [];
      }
      setStars(st);
      setTotalEver(tot);
      setPrevTotalEver(tot);
      setCompletedToday(comp);
      setTotalMissions(tm);
      setLastMission(getStoredMissionTitle(v[K.LAST_MISSION]));
      setFirstReward(v[K.FIRST_REWARD] === "true");
      setSkipCount(sk);
      setDoneIdsToday(doneIds);
      setFirstMission(tm === 0);
      tinyFactLastShownRef.current = v[K.TINY_FACT_LAST_SHOWN]
        ? parseInt(v[K.TINY_FACT_LAST_SHOWN], 10)
        : 0;
    } catch (e) {
      console.log("syncProgressFromStorage error", e);
    }
  }, []);

  function openRewardsScreen() {
    incrementLocalUsage("rewardsViewed").catch(console.log);
    setScreen("rewards");
  }

  function openBreathingScreen() {
    incrementLocalUsage("breathingStarted").catch(console.log);
    setScreen("breathing");
  }

  function verifyPin() {
    if (enteredPin.length === 0) {
      setPinError(t("pinChild.empty_msg"));
      return;
    }
    if (enteredPin.length < 4) {
      setPinError(t("pinChild.short_msg"));
      return;
    }
    if (enteredPin === parentPin) {
      setShowPinScreen(false);
      setEnteredPin("");
      setPinError("");
      setPinFocused(false);
      if (pendingReward) {
        redeemReward(pendingReward);
        setPendingReward(null);
      } else if (pendingMissionComplete) {
        setPendingMissionComplete(false);
        completeMissionInternal();
      }
    } else {
      Alert.alert(t("pinChild.wrong_title"), t("pinChild.wrong_msg"));
      setEnteredPin("");
      setPinError("");
      setPinFocused(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!ready) {
    return (
      <SafeAreaView style={[s.root, s.center]}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={C.green} />
      </SafeAreaView>
    );
  }

  // ── ONBOARDING SCREEN (first launch only) ───────────────────────────────────
  if (!parentOnboardingDone) {
    return (
      <SafeAreaView style={s.root}>
        <StatusBar style="dark" />
        <ParentOnboarding
          onDone={async () => {
            await AsyncStorage.setItem(K.PARENT_ONBOARDING_DONE, "true");
            setParentOnboardingDone(true);
          }}
        />
      </SafeAreaView>
    );
  }

  if (!onboardingDone) {
    return (
      <SafeAreaView style={[s.root, s.center]}>
        <StatusBar style="dark" />
        <Image
          source={BUDDY.calm}
          style={{ width: 180, height: 180, backgroundColor: "transparent" }}
          resizeMode="contain"
        />
        <Text style={s.onboardingTitle}>{t("onboarding.title")}</Text>
        <TextInput
          style={s.onboardingInput}
          placeholder={t("onboarding.name_placeholder")}
          placeholderTextColor={C.muted}
          value={childName}
          onChangeText={setChildName}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={saveChildName}
        />
        <TextInput
          style={s.onboardingInput}
          placeholder={t("onboarding.age_placeholder")}
          placeholderTextColor={C.muted}
          value={childAge > 0 ? String(childAge) : ""}
          onChangeText={(t) => setChildAge(parseInt(t) || 7)}
          keyboardType="numeric"
          maxLength={2}
        />
        <TouchableOpacity style={s.onboardingBtn} onPress={saveChildName}>
          <Text style={s.onboardingBtnTxt}>
            {tGender(
              "onboarding.start_btn",
              undefined,
              appSettings.rtlChildSex ?? "male",
            )}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── MAIN APP ────────────────────────────────────────────────────────────────
  const p = { speak, stars, totalEver };
  // Compute which missions to show based on day mode + parent overrides
  const isWeekendDay = isWeekend();
  const dayModeActive =
    (appSettings.dayModeOverride ?? "auto") === "auto"
      ? isWeekendDay
      : appSettings.dayModeOverride === "weekend";

  const dayMode: "weekday" | "weekend" = dayModeActive ? "weekend" : "weekday";
  const missionOverrides = appSettings.missionOverrides ?? {};
  const rewardOverrides = appSettings.rewardOverrides ?? {};

  const missionTypeById = Object.fromEntries(
    appSettings.missions.map((m) => [m.id, m.type]),
  );

  // Effective pools merge built-ins with parent-added custom items from
  // the Parent Zone. Custom items participate in overrides + daily picker
  // exactly like built-ins.
  const allMissionPool: PoolMission[] = [
    ...MISSION_POOL,
    ...(appSettings.customMissions ?? []),
  ];
  const allRewardPool: Reward[] = [
    ...REWARDS,
    ...(appSettings.customRewards ?? []),
  ];

  // Active pool: enabled for this day mode by parent override, and not inactive (mission-type setting)
  // Each mission's `stars` is replaced with the parent-override value (falls back to pool default).
  const activePool: PoolMission[] = allMissionPool
    .filter(
      (m) =>
        effectiveMissionEnabled(m.id, dayMode, missionOverrides) &&
        missionTypeById[m.id] !== "inactive",
    )
    .map((m) => ({
      ...m,
      stars: effectiveMissionStars(m.id, missionOverrides) as 1 | 2,
    }));

  let dayMissions: PoolMission[] = activePool;
  let bonusMission: PoolMission | null = null;

  if (appSettings.infinityLoopEnabled) {
    // Infinity Loop: small, stable, date-seeded subset.
    // Permanents are always included first; remaining slots filled from the
    // rest of the active pool via the deterministic daily picker.
    const size = Math.max(4, Math.min(10, appSettings.dailyPickerSize ?? 5));
    const today = todayStr();
    const permanent = activePool.filter(
      (m) => missionTypeById[m.id] === "permanent",
    );
    const others = activePool.filter(
      (m) => missionTypeById[m.id] !== "permanent",
    );
    const remaining = Math.max(0, size - permanent.length);
    const fillers = selectDailyMissions(others, today, remaining);
    const subsetIds = new Set<number>([
      ...permanent.map((m) => m.id),
      ...fillers.map((m) => m.id),
    ]);
    // Keep MISSION_POOL order within the subset for stable slot-grouping in UI;
    // apply override stars so cards display the right value.
    dayMissions = allMissionPool
      .filter((m) => subsetIds.has(m.id))
      .map((m) => ({
        ...m,
        stars: effectiveMissionStars(m.id, missionOverrides) as 1 | 2,
      }));

    if (appSettings.bonusAfterCompletion) {
      const leftover = activePool.filter(
        (m) => !subsetIds.has(m.id) && !doneIdsToday.includes(m.id),
      );
      bonusMission = selectBonusMission(leftover, today);
    }
  } else if (appSettings.rotationEnabled) {
    const permanent = activePool.filter(
      (m) => missionTypeById[m.id] === "permanent",
    );
    const rotating = activePool.filter(
      (m) => missionTypeById[m.id] === "rotating",
    );
    const rotateCount = Math.min(appSettings.rotatingPoolSize, rotating.length);
    const seed = rotating.length
      ? getRotationSeed(appSettings.rotationFrequency) % rotating.length
      : 0;
    const rotated = Array.from(
      { length: rotateCount },
      (_, index) => rotating[(seed + index) % rotating.length],
    );
    dayMissions = [...permanent, ...rotated];
  }

  // Effective rewards list (parent overrides applied; disabled rewards hidden).
  const effectiveRewards: Reward[] = allRewardPool
    .filter((r) => effectiveRewardEnabled(r.id, rewardOverrides))
    .map((r) => ({ ...r, cost: effectiveRewardCost(r.id, rewardOverrides) }));

  const currentBlock = appSettings.scheduleEnabled
    ? getCurrentBlock(appSettings.scheduleBlocks, isWeekendDay)
    : null;
  const nextBlock = appSettings.scheduleEnabled
    ? getNextBlock(appSettings.scheduleBlocks, isWeekendDay)
    : null;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const reminderMinutes = parseTimeToMinutes(appSettings.morningReminderTime);
  const showMorningNudge =
    appSettings.morningReminderEnabled &&
    completedToday === 0 &&
    nowMinutes < 12 * 60 &&
    nowMinutes >= (reminderMinutes ?? 8 * 60);
  const overlayBuddySize = PROFILE_CONFIGS[ageProfile].buddySize;
  const tinyFactBubbleTop = Math.round(overlayBuddySize * 0.56);

  if (showMorning) {
    return (
      <SafeAreaView style={s.root}>
        <StatusBar style="dark" />
        <MorningRoutineScreen
          childName={childName}
          steps={
            appSettings.morningSteps?.length > 0
              ? appSettings.morningSteps
              : DEFAULT_MORNING_STEPS
          }
          stars={appSettings.morningStars ?? 1}
          rtlChildSex={appSettings.rtlChildSex ?? "male"}
          speak={speak}
          onComplete={async (earned) => {
            const today = todayStr();
            setStars((n) => n + earned);
            setTotalEver((n) => n + earned);
            incrementLocalUsage("morningCompleted").catch(console.log);
            setShowMorning(false);
            setScreen("home");
            await AsyncStorage.setItem(K.MORNING_DONE, today);
          }}
          onSkip={() => {
            incrementLocalUsage("morningSkipped").catch(console.log);
            setShowMorning(false);
            setScreen("home");
          }}
        />
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="dark" />

      {screen === "demo_intro" && (
        <DemoIntroScreen
          speak={speak}
          onStart={() => {
            setDemoStep(0);
            setScreen("demo_step");
          }}
          onSkip={async () => {
            await finishDemo();
            setScreen("home");
          }}
        />
      )}

      {screen === "demo_step" && (
        <DemoStepScreen
          key={demoStep}
          speak={speak}
          step={DEMO_STEPS[demoStep]}
          stepIndex={demoStep}
          totalSteps={DEMO_STEPS.length}
          onDone={handleDemoStepDone}
        />
      )}

      {screen === "demo_complete" && (
        <DemoCompleteScreen
          speak={speak}
          onGoToMissions={async () => {
            await finishDemo();
            setScreen("pick");
          }}
          onGoHome={async () => {
            await finishDemo();
            setScreen("home");
          }}
        />
      )}

      {screen === "home" && (
        <HomeScreen
          {...p}
          completedToday={completedToday}
          totalMissions={totalMissions}
          childName={childName}
          lastMission={lastMission}
          showSuggestion={appSettings.nudgingEnabled ? showSuggestion : false}
          skipSensitivity={appSettings.skipSensitivity}
          onSettings={() => setScreen("settings")}
          skipCount={skipCount}
          onStart={() => setScreen("pick")}
          onRewards={openRewardsScreen}
          onSuggestionAccept={handleSuggestionAccept}
          onSuggestionSkip={() => setShowSuggestion(false)}
          currentBlock={currentBlock}
          nextBlock={nextBlock}
          scheduleEnabled={appSettings.scheduleEnabled}
          onOpenDay={() => setScreen("day")}
          onBreathing={
            appSettings.breathingEnabled ? openBreathingScreen : undefined
          }
          showMorningNudge={showMorningNudge}
          onMorningNudge={() => {
            speak(
              tSpeak(
                "home.morning_nudge_speak",
                undefined,
                appSettings.rtlChildSex ?? "male",
              ),
            );
            setScreen("pick");
          }}
          rtlChildSex={appSettings.rtlChildSex ?? "male"}
        />
      )}

      {screen === "pick" && (
        <MissionPickScreen
          {...p}
          firstTime={firstMission}
          missions={dayMissions.length > 0 ? dayMissions : null}
          missionTypeById={missionTypeById}
          doneIds={doneIdsToday}
          bonusMission={
            appSettings.infinityLoopEnabled && appSettings.bonusAfterCompletion
              ? bonusMission
              : null
          }
          rtlChildSex={appSettings.rtlChildSex ?? "male"}
          onPick={pickMission}
          onBack={() => setScreen("home")}
        />
      )}

      {screen === "active" && (
        <ActiveScreen
          {...p}
          mission={mission}
          rtlChildSex={appSettings.rtlChildSex ?? "male"}
          onDone={completeMission}
          onSkip={handleSkip}
        />
      )}

      {screen === "celebrate" && (
        <CelebrateScreen
          {...p}
          mission={mission}
          totalMissions={totalMissions}
          completedToday={completedToday}
          isVeryExcited={isVeryExcited}
          rtlChildSex={appSettings.rtlChildSex ?? "male"}
          onContinue={() => setScreen("pick")}
          onRewards={openRewardsScreen}
          onBack={() => setScreen("home")}
        />
      )}

      {screen === "rewards" && (
        <RewardsScreen
          {...p}
          rewards={effectiveRewards}
          rtlChildSex={appSettings.rtlChildSex ?? "male"}
          onBack={() => setScreen("home")}
          onRedeem={handleRewardRedeem}
          showExactStarCost={appSettings.showExactStarCost}
        />
      )}

      {screen === "settings" && (
        <SettingsScreen
          onClose={async () => {
            await syncProgressFromStorage();
            setScreen("home");
          }}
          onSettingsChange={(s: AppSettings) => {
            setAppSettings(s);
            setChildName(s.childName);
            setParentPin(s.parentPin);
            setPinEnabled(s.pinEnabled);
            setTtsEnabled(s.ttsEnabled);
          }}
          onProgressReset={() => {
            setStars(0);
            setTotalEver(0);
            setPrevTotalEver(0);
            setCompletedToday(0);
            setTotalMissions(0);
            setLastMission(null);
            setFirstReward(false);
            setSkipCount(0);
            setDoneIdsToday([]);
            setFirstMission(true);
            setIsVeryExcited(false);
            syncProgressFromStorage().catch(console.log);
          }}
          currentPin={parentPin}
          pinEnabled={pinEnabled}
        />
      )}

      {screen === "day" && (
        <DayScreen
          blocks={appSettings.scheduleBlocks}
          isWeekendDay={isWeekendDay}
          speak={speak}
          onClose={() => setScreen("home")}
          onStartMission={(missionId: number) => {
            const m = allMissionPool.find((x) => x.id === missionId);
            if (m) pickMission(m);
          }}
        />
      )}

      {screen === "breathing" && (
        <BreathingScreen
          speak={speak}
          rtlChildSex={appSettings.rtlChildSex ?? "male"}
          musicEnabled={appSettings.breathingMusicEnabled}
          guidanceEnabled={appSettings.breathingGuidanceEnabled}
          introEnabled={breathingIntroRuns < 10}
          onSessionStart={handleBreathingSessionStart}
          onMusicChange={handleBreathingMusicChange}
          onGuidanceChange={handleBreathingGuidanceChange}
          onComplete={() => {
            incrementLocalUsage("breathingCompleted").catch(console.log);
            setScreen("home");
          }}
          onSkip={() => {
            incrementLocalUsage("breathingSkipped").catch(console.log);
            setScreen("home");
          }}
          onHideOverlay={() => setShowGlobalBuddy(false)}
          onShowOverlay={() => setShowGlobalBuddy(true)}
        />
      )}

      {/* ── FIXED BUDDY + PROGRESS BAR OVERLAY (all screens except Settings) ───────── */}
      {onboardingDone &&
        !showPinScreen &&
        screen !== "settings" &&
        showGlobalBuddy && (
          <View style={s.topOverlay} pointerEvents="box-none">
            <View style={s.topOverlayContent}>
              <View
                style={[
                  s.buddyBubbleWrap,
                  {
                    minHeight:
                      overlayBuddySize +
                      (screen === "active" && tinyFactBubble ? 70 : 10),
                  },
                ]}
              >
                <Buddy
                  mood={fixedOverlayMood}
                  speak={speak}
                  size={overlayBuddySize}
                  celebrate={fixedOverlayCelebrate}
                  onTap={() => {
                    const elevatedMood: BuddyMood =
                      fixedOverlayMood === "very-excited" ||
                      fixedOverlayMood === "proud"
                        ? "very-excited"
                        : "happy";
                    flashBuddyMood(elevatedMood, 1400);
                  }}
                />
                {screen === "active" && tinyFactBubble && (
                  <View style={[s.tinyFactBubble, { top: tinyFactBubbleTop }]}>
                    <T style={s.tinyFactText} speak={speak}>
                      {`💡 ${tinyFactBubble}`}
                    </T>
                    <View style={s.tinyFactTail} />
                  </View>
                )}
              </View>
              <ProgressBar
                total={totalEver}
                speak={speak}
                rtlChildSex={appSettings.rtlChildSex ?? "male"}
              />
            </View>
          </View>
        )}

      {/* ── PARENT PIN OVERLAY ──────────────────────────────────────────────── */}
      {showPinScreen && (
        <View style={s.pinOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={20}
            style={s.pinKeyboardWrap}
          >
            <View style={s.pinCard}>
              <Image
                source={BUDDY.calm}
                style={{
                  width: 80,
                  height: 80,
                  backgroundColor: "transparent",
                  marginBottom: 16,
                }}
                resizeMode="contain"
              />
              <Text style={s.pinTitle}>{t("pinChild.title")}</Text>
              {pendingReward && (
                <Text style={s.pinSub}>
                  {t("pinChild.unlock_label", {
                    title: getRewardTitle(
                      pendingReward.id,
                      pendingReward.title,
                    ),
                  })}
                </Text>
              )}
              <TextInput
                style={[
                  s.pinInput,
                  pinFocused ? s.pinInputFocused : null,
                  pinError ? s.pinInputError : null,
                ]}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                value={enteredPin}
                onChangeText={(v) => {
                  setEnteredPin(v);
                  if (pinError) setPinError("");
                }}
                onFocus={() => setPinFocused(true)}
                onBlur={() => setPinFocused(false)}
                onSubmitEditing={verifyPin}
              />
              <Text
                style={[
                  s.pinErrorText,
                  !pinError ? s.pinErrorTextHidden : null,
                ]}
              >
                {pinError || " "}
              </Text>
              <TouchableOpacity style={s.pinConfirm} onPress={verifyPin}>
                <Text style={s.pinConfirmTxt}>{t("pinChild.confirm")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.pinCancel}
                onPress={() => {
                  setShowPinScreen(false);
                  setEnteredPin("");
                  setPinError("");
                  setPinFocused(false);
                  setPendingReward(null);
                  setPendingMissionComplete(false);
                }}
              >
                <Text style={s.pinCancelTxt}>{t("pinChild.cancel")}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      <Confetti
        key={celebrateConfettiKey}
        trigger={screen === "celebrate" && showCelebrateConfetti}
      />
    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const C = {
  bg: "#F7F6F2",
  white: "#FFFFFF",
  green: "#1D6B4F",
  greenLt: "#E1F5EE",
  text: "#1A1A18",
  muted: "#6B6B68",
  border: "#E5E5E2",
  track: "#D8D8D4",
  gold: "#FFF8E7",
  goldBdr: "#F59E0B",
  reflect: "#F0F8F4",
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { justifyContent: "center", alignItems: "center" },
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  scroll: { alignItems: "center", padding: 20, paddingBottom: 52 },
  homeScroll: { alignItems: "center", padding: 20, paddingBottom: 52 },
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: "center",
    paddingTop: 18,
    backgroundColor: C.bg, // solid backing — content scrolls behind, not through

    paddingHorizontal: 20,
    pointerEvents: "box-none",
  },
  topOverlayContent: {
    width: "100%",
    alignItems: "center",
    backgroundColor: C.bg, // solid backing — content scrolls behind, not through
    paddingTop: 12,
    paddingBottom: 8,
    pointerEvents: "auto",
  },
  buddyBubbleWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
    position: "relative",
    marginBottom: 6,
  },
  tinyFactBubble: {
    position: "absolute",
    left: "56%",
    width: "47%",
    backgroundColor: "#FFFDF9",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "#DED8CE",
    paddingVertical: 7,
    paddingHorizontal: 7,
    minHeight: 46,
    justifyContent: "center",
  },
  tinyFactText: {
    fontSize: 11,
    color: C.text,
    lineHeight: 16,
    textAlign: "left",
  },
  tinyFactTail: {
    position: "absolute",
    left: -7,
    top: 16,
    width: 13,
    height: 13,
    backgroundColor: "#FFFDF9",
    borderLeftWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: "#DED8CE",
    transform: [{ rotate: "45deg" }],
  },

  // Onboarding
  onboardingTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginVertical: 24,
    color: C.text,
    paddingHorizontal: 20,
  },
  onboardingInput: {
    width: "80%",
    borderWidth: 2,
    borderColor: "#a1d4b8",
    borderRadius: 16,
    padding: 16,
    fontSize: 24,
    textAlign: "center",
    backgroundColor: C.white,
    color: C.text,
  },
  onboardingBtn: {
    marginTop: 32,
    backgroundColor: C.green,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 999,
  },
  onboardingBtnTxt: { color: C.white, fontSize: 20, fontWeight: "600" },

  pinOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
    zIndex: 2000,
  },
  pinKeyboardWrap: {
    width: "100%",
    alignItems: "center",
  },
  pinCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: "center",
    width: "100%",
    maxWidth: 640,
  },
  pinTitle: { fontSize: 20, fontWeight: "700", color: C.text, marginBottom: 4 },
  pinSub: {
    fontSize: 13,
    color: C.muted,
    marginBottom: 16,
    textAlign: "center",
  },
  pinInput: {
    fontSize: 36,
    textAlign: "center",
    letterSpacing: 12,
    marginBottom: 16,
    width: "100%",
    height: 52,
    borderBottomWidth: 2,
    borderColor: C.border,
    paddingBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#FAFBFA",
    color: C.text,
  },
  pinConfirm: {
    backgroundColor: C.green,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  pinConfirmTxt: {
    color: C.white,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
  },
  pinCancel: {
    backgroundColor: C.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
    width: "100%",
    alignItems: "center",
  },
  pinCancelTxt: { fontSize: 15, color: C.text, fontWeight: "500" },
  pinInputError: {
    borderColor: "#E24B4A",
    backgroundColor: "#FCEBEB",
  },
  pinInputFocused: {
    borderColor: C.green,
    backgroundColor: "#EAF7F1",
  },
  pinErrorText: {
    alignSelf: "flex-start",
    marginTop: -4,
    marginBottom: 10,
    fontSize: 12,
    color: "#E24B4A",
    fontWeight: "500",
    minHeight: 18,
  },
  pinErrorTextHidden: {
    opacity: 0,
  },

  // Progress bar
  pbWrap: {
    width: "100%",
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
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
  pbStars: { fontSize: 13, fontWeight: "700", color: C.green },
  pbTrack: {
    height: 8,
    backgroundColor: C.track,
    borderRadius: 4,
    overflow: "hidden",
  },
  pbFill: { height: 8, backgroundColor: C.green, borderRadius: 4, minWidth: 8 },

  // Buddy
  buddy: { alignItems: "center", marginBottom: 4, padding: 4 },
  buddyName: { fontSize: 12, color: C.muted, marginTop: 4, fontWeight: "500" },

  // Home
  greetingRow: { width: "100%", marginBottom: 4 },
  greeting: {
    fontSize: 22,
    fontWeight: "700",
    color: C.text,
    textAlign: "center",
  },
  progressionMsg: {
    fontSize: 15,
    color: C.green,
    textAlign: "center",
    marginVertical: 6,
    fontWeight: "500",
    lineHeight: 22,
  },

  // Reflective boost
  reflectCard: {
    backgroundColor: C.reflect,
    borderRadius: 12,
    padding: 12,
    width: "100%",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.greenLt,
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
    backgroundColor: C.gold,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.goldBdr,
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

  // Text
  msg: {
    fontSize: 17,
    color: C.text,
    textAlign: "center",
    marginVertical: 8,
    lineHeight: 25,
    paddingHorizontal: 8,
  },
  sub: { fontSize: 13, color: C.muted, marginBottom: 6, textAlign: "center" },
  pageTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: C.text,
    marginBottom: 14,
    alignSelf: "flex-start",
  },
  tier: {
    fontSize: 12,
    fontWeight: "600",
    color: C.muted,
    alignSelf: "flex-start",
    marginTop: 10,
    marginBottom: 5,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  hint: {
    fontSize: 11,
    color: C.muted,
    marginTop: 8,
    textAlign: "center",
    fontStyle: "italic",
  },
  tapHint: { fontSize: 11, color: C.muted, marginTop: 10, fontStyle: "italic" },
  celebTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: C.green,
    marginBottom: 4,
    textAlign: "center",
  },
  milestoneTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: C.green,
    marginBottom: 4,
    textAlign: "center",
  },

  // Buttons
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
    backgroundColor: C.gold,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.goldBdr,
    paddingVertical: 15,
    paddingHorizontal: 32,
    marginTop: 8,
    width: "100%",
    alignItems: "center",
  },
  btnSecondaryTxt: { fontSize: 17, color: "#92400E", fontWeight: "600" },
  btnSkip: { marginTop: 10, padding: 12 },
  btnSkipTxt: { fontSize: 15, color: C.muted },
  btnBack: { marginTop: 18, padding: 12 },
  btnBackTxt: { fontSize: 15, color: C.green, fontWeight: "500" },
  demoCompleteButtons: { width: "100%", marginTop: 8 },
  btnSettings: { marginTop: 8, padding: 12, alignItems: "center" },
  btnSettingsTxt: { fontSize: 14, color: C.muted },

  // Demo
  stepCounter: { flexDirection: "row", gap: 8, marginBottom: 16 },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.border,
  },
  stepDotActive: { backgroundColor: C.green },
  demoCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
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

  // Missions
  mCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 13,
    marginBottom: 7,
    width: "100%",
  },
  mCardBig: { backgroundColor: C.gold, borderColor: C.goldBdr },
  mEmoji: { fontSize: 30, marginRight: 11 },
  mInfo: { flex: 1 },
  mTitle: { fontSize: 15, fontWeight: "600", color: C.text },
  mSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  mStar: { fontSize: 17 },

  // Active
  activeCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 26,
    alignItems: "center",
    width: "100%",
    marginVertical: 12,
  },
  activeEmoji: { fontSize: 58, marginBottom: 10 },
  activeTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: C.text,
    textAlign: "center",
  },
  activeSub: {
    fontSize: 14,
    color: C.muted,
    marginTop: 5,
    textAlign: "center",
  },
  starsRow: { flexDirection: "row", marginTop: 12, gap: 4 },
  starBig: { fontSize: 24 },

  // Celebrate
  earnedCard: {
    backgroundColor: C.greenLt,
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    width: "100%",
    marginVertical: 12,
  },
  earnedEmoji: { fontSize: 44, marginBottom: 6 },
  earnedName: { fontSize: 16, fontWeight: "600", color: C.green },
  earnedStars: { fontSize: 26, marginTop: 6 },
  earnedTotal: {
    fontSize: 14,
    color: C.green,
    marginTop: 4,
    fontWeight: "500",
  },

  // Rewards
  rCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 13,
    marginBottom: 7,
    width: "100%",
  },
  rLocked: { opacity: 0.42 },
  rEmoji: { fontSize: 29, marginRight: 11 },
  rInfo: { flex: 1 },
  rTitle: { fontSize: 15, fontWeight: "600", color: C.text },
  rCost: { fontSize: 12, color: C.muted, marginTop: 2 },
  rReady: { fontSize: 13, color: C.green, fontWeight: "700" },
  rNeed: { fontSize: 11, color: C.muted, textAlign: "right" },
});
