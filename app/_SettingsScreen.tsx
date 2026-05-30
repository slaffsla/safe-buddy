// SettingsScreen.tsx — SafeBuddy parent settings
// Self-contained component. Import into app/index.tsx.
// Engineered for easy extension — add new setting by:
//   1. Add key to AppSettings type
//   2. Add    to DEFAULT_SETTINGS
//   3. Add storage key to SK
//   4. Add UI row to the relevant section
//
// Usage in index.tsx:
//   import SettingsScreen from './_SettingsScreen';
//   {screen === 'settings' && (
//     <SettingsScreen
//       onClose={() => setScreen('home')}
//       onSettingsChange={(s) => applySettings(s)}
//     />
//   )}

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  DEFAULT_LOCAL_USAGE,
  incrementLocalUsage,
  loadLocalUsage,
  LocalUsage,
  resetLocalUsage,
} from "../localUsage";
import ParentOnboarding from "./_ParentOnboarding";
import { CONTENT_MAX_WIDTH } from "./_layoutMetrics";
import {
  DEFAULT_MISSION_CONFIGS,
  DEFAULT_MORNING_STEPS,
  DEFAULT_REWARD_CONFIGS,
  DEFAULT_SCHEDULE,
  DEFAULT_WEEKDAY_IDS,
  DEFAULT_WEEKEND_IDS,
  effectiveMissionEnabled,
  effectiveMissionStars,
  effectiveRewardCost,
  effectiveRewardEnabled,
  getBuddyImage,
  getMissionSubtitle,
  getMissionTitle,
  getMorningStepTitle,
  getRewardTitle,
  getScheduleTitle,
  getStoredMissionTitle,
  MISSION_POOL,
  MissionConfig,
  MissionOverride,
  MissionOverrideMap,
  MissionType,
  MorningStep,
  PoolMission,
  Reward,
  RewardOverride,
  RewardOverrideMap,
  REWARDS,
  SCHEDULE_MAX_BLOCKS,
  ScheduleBlock,
} from "./_constants";
import {
  AppLocale,
  getAppLocale,
  i18n,
  isRtl,
  normalizeAppLocale,
  setAppLocale,
  t,
} from "./i18n";

// Custom items added by parent in the Parent Zone are stored in settings.
// Limits keep storage and UI manageable.
const CUSTOM_MISSIONS_MAX = 20;
const CUSTOM_REWARDS_MAX = 20;
// IDs for user-added items start above this offset to avoid clashing with
// MISSION_POOL / REWARDS ids (and any future built-in additions).
const CUSTOM_ID_OFFSET = 10000;

// ── TYPES ─────────────────────────────────────────────────────────────────────

// Central settings type. All future settings go here.
// Adding a field: update type + DEFAULT_SETTINGS + SK + load/save + UI.
export type ControlLevel = "hands-on" | "balanced" | "independent";
export type RotationFrequency = "daily" | "every3" | "weekly" | "manual";
export type DayModeOverride = "auto" | "weekday" | "weekend";
export type RtlChildSex = "male" | "female";

export interface RewardConfig {
  id: number;
  title: string;
  cost: number;
  emoji: string;
  active: boolean;
}

export interface AppSettings {
  appLocale: AppLocale;

  // Child
  childName: string;
  ageProfileOverride: "auto" | "little" | "middle" | "teen";
  rtlChildSex: RtlChildSex;

  // Security
  parentPin: string;
  pinEnabled: boolean;
  missionCompletionPinEnabled: boolean;
  controlLevel: ControlLevel;

  // Buddy behavior
  nudgingEnabled: boolean; // daily suggestion card
  tinyFactsEnabled: boolean; // tiny facts during missions (V1.5)
  tinyFactsMinMinutes: 1 | 2 | 5 | 10; // min delay between fact bubbles
  tinyFactsMinMinutesManual: boolean; // true once parent explicitly picks interval
  breathingEnabled: boolean; // relax with buddy button (V1.5)
  breathingMusicEnabled: boolean; // ambient music during breathing sessions
  breathingGuidanceEnabled: boolean; // spoken breathing phase prompts
  ttsEnabled: boolean; // text-to-speech
  skipSensitivity: number; // skips before gentle-reminder (default 2)
  showExactStarCost: boolean; // show exact cost vs "ещё немного"

  // Mission rotation
  rotationEnabled: boolean;
  rotationFrequency: RotationFrequency;
  rotatingPoolSize: number; // how many rotating slots shown (1-3)
  missions: MissionConfig[]; // per-mission config

  // Infinity loop — daily picker (shows a small stable subset per day)
  infinityLoopEnabled: boolean;
  dailyPickerSize: number; // 3–20; default 8
  bonusAfterCompletion: boolean; // offer one extra mission once subset is done

  // Rewards
  rewards: RewardConfig[];

  // Morning routine
  morningEnabled: boolean;
  morningStars: number; // stars awarded on completion (1-5)
  morningSteps: MorningStep[]; // ordered checklist steps

  // Daily routine — day mode
  weekdayMissionIds: number[];
  weekendMissionIds: number[];
  dayModeOverride: DayModeOverride;

  // Parent zone overrides (source of truth after migration)
  missionOverrides: MissionOverrideMap;
  rewardOverrides: RewardOverrideMap;

  // Parent-added custom missions and rewards (managed from Parent Zone).
  // These extend the built-in MISSION_POOL / REWARDS lists and flow through
  // the same override / picker pipeline.
  customMissions: PoolMission[];
  customRewards: Reward[];

  // Day schedule (Option A — "what's now" card on HomeScreen; Option B reserved)
  scheduleEnabled: boolean;
  scheduleBlocks: ScheduleBlock[];

  // Notifications (V1.5 — stored but UI placeholder only)
  morningReminderEnabled: boolean;
  morningReminderTime: string; // HH:MM

  // Progress / reporting — computed at read time, not stored here
  // (see ProgressSection which reads directly from AsyncStorage)
}

function buildDefaultSettings(): AppSettings {
  return {
    appLocale: getAppLocale(),
    childName: "",
    ageProfileOverride: "auto",
    rtlChildSex: "male",
    parentPin: "",
    pinEnabled: false,
    missionCompletionPinEnabled: false,
    controlLevel: "balanced",
    nudgingEnabled: true,
    tinyFactsEnabled: false,
    tinyFactsMinMinutes: 5,
    tinyFactsMinMinutesManual: false,
    breathingEnabled: true,
    breathingMusicEnabled: false,
    breathingGuidanceEnabled: true,
    ttsEnabled: true,
    skipSensitivity: 2,
    showExactStarCost: false,
    rotationEnabled: false,
    rotationFrequency: "weekly",
    rotatingPoolSize: 2,
    infinityLoopEnabled: true,
    dailyPickerSize: 8,
    bonusAfterCompletion: true,
    missions: DEFAULT_MISSION_CONFIGS,
    rewards: DEFAULT_REWARD_CONFIGS,
    morningEnabled: true,
    morningStars: 1,
    morningSteps: DEFAULT_MORNING_STEPS,
    weekdayMissionIds: DEFAULT_WEEKDAY_IDS,
    weekendMissionIds: DEFAULT_WEEKEND_IDS,
    dayModeOverride: "auto" as DayModeOverride,
    missionOverrides: {},
    rewardOverrides: {},
    customMissions: [],
    customRewards: [],
    scheduleEnabled: true,
    scheduleBlocks: DEFAULT_SCHEDULE,
    morningReminderEnabled: false,
    morningReminderTime: "08:00",
  };
}

export const DEFAULT_SETTINGS = buildDefaultSettings();

// ── STORAGE KEYS ──────────────────────────────────────────────────────────────
// All settings stored as one JSON blob for atomicity.
// Child progress keys (sb_stars_v2 etc.) are read-only here — never written.

const SK = {
  SETTINGS: "sb_settings_v1", // full AppSettings JSON
  // Read-only progress keys (for report section)
  STARS: "sb_stars_v2",
  TOTAL_EVER: "sb_total_v2",
  TOTAL_MISSIONS: "sb_total_missions",
  COMPLETED_TODAY: "sb_today_v2",
  LAST_MISSION: "sb_last_mission",
  FIRST_REWARD: "sb_first_reward",
  MORNING_DONE: "sb_morning_done",
  DONE_IDS_TODAY: "sb_done_ids_today",
  SKIP_COUNT: "sb_skip_count",
  TINY_FACT_LAST_SHOWN: "sb_tiny_fact_last_shown",
  DEMO_DONE: "sb_demo_done",
  ONBOARDING_DONE: "sb_onboarding_done",
  CHILD_NAME: "sb_child_name",
  PARENT_PIN: "sb_parent_pin",
  PIN_ENABLED: "sb_pin_enabled",
};

// ── LOAD / SAVE ───────────────────────────────────────────────────────────────

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SK.SETTINGS);

    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with defaults so new fields added later always have values
      const merged = { ...DEFAULT_SETTINGS, ...parsed };
      merged.appLocale = parsed.appLocale
        ? normalizeAppLocale(parsed.appLocale)
        : DEFAULT_SETTINGS.appLocale;
      // Migration: rename rtlChildGender -> rtlChildSex
      const parsedAny = parsed as any;
      if (
        typeof parsedAny.rtlChildSex === "undefined" &&
        parsedAny.rtlChildGender
      ) {
        merged.rtlChildSex =
          parsedAny.rtlChildGender === "girl" ? "female" : "male";
      }
      setAppLocale(merged.appLocale);

      // Upgrade: if stored missions array is smaller than the full pool,
      // merge in any missing IDs from DEFAULT_MISSION_CONFIGS
      const storedIds = new Set(
        merged.missions.map((m: MissionConfig) => m.id),
      );
      const missingMissions = DEFAULT_MISSION_CONFIGS.filter(
        (m) => !storedIds.has(m.id),
      );
      if (missingMissions.length > 0) {
        merged.missions = [...merged.missions, ...missingMissions];
      }
      const storedRewardIds = new Set(
        merged.rewards.map((r: RewardConfig) => r.id),
      );
      const missingRewards = DEFAULT_REWARD_CONFIGS.filter(
        (r) => !storedRewardIds.has(r.id),
      );
      if (missingRewards.length > 0) {
        merged.rewards = [...merged.rewards, ...missingRewards];
      }
      const storedWeekdayIds = new Set(merged.weekdayMissionIds ?? []);
      const storedWeekendIds = new Set(merged.weekendMissionIds ?? []);

      const missingWeekday = DEFAULT_WEEKDAY_IDS.filter(
        (id) => !storedWeekdayIds.has(id),
      );
      const missingWeekend = DEFAULT_WEEKEND_IDS.filter(
        (id) => !storedWeekendIds.has(id),
      );

      if (missingWeekday.length > 0) {
        merged.weekdayMissionIds = [
          ...(merged.weekdayMissionIds ?? []),
          ...missingWeekday,
        ];
      }
      if (missingWeekend.length > 0) {
        merged.weekendMissionIds = [
          ...(merged.weekendMissionIds ?? []),
          ...missingWeekend,
        ];
      }

      // Migrate legacy weekday/weekend toggle storage into missionOverrides (one-time).
      // After migration, missionOverrides is the source of truth; legacy fields stay
      // for rollback safety but are no longer read by the app.
      if (
        !merged.missionOverrides ||
        Object.keys(merged.missionOverrides).length === 0
      ) {
        const weekdaySet = new Set<number>(
          merged.weekdayMissionIds ?? DEFAULT_WEEKDAY_IDS,
        );
        const weekendSet = new Set<number>(
          merged.weekendMissionIds ?? DEFAULT_WEEKEND_IDS,
        );
        const overrides: MissionOverrideMap = {};
        for (const m of MISSION_POOL) {
          overrides[m.id] = {
            enabledWeekday: weekdaySet.has(m.id),
            enabledWeekend: weekendSet.has(m.id),
            stars: m.stars,
          };
        }
        merged.missionOverrides = overrides;
      }
      // Migrate legacy rewards[].active/cost into rewardOverrides (one-time).
      if (
        !merged.rewardOverrides ||
        Object.keys(merged.rewardOverrides).length === 0
      ) {
        const overrides: RewardOverrideMap = {};
        for (const r of (merged.rewards ??
          DEFAULT_REWARD_CONFIGS) as RewardConfig[]) {
          overrides[r.id] = { enabled: !!r.active, cost: r.cost };
        }
        merged.rewardOverrides = overrides;
      }

      // Migrate legacy `scheduleItems` (pre-ticket rename) → `scheduleBlocks`.
      const legacyParsed = parsed as Partial<AppSettings> & {
        scheduleItems?: ScheduleBlock[];
      };
      if (
        (!merged.scheduleBlocks || merged.scheduleBlocks.length === 0) &&
        Array.isArray(legacyParsed.scheduleItems) &&
        legacyParsed.scheduleItems.length > 0
      ) {
        merged.scheduleBlocks = legacyParsed.scheduleItems;
      }
      // Migration: if interval exists from older builds but manual flag
      // doesn't, treat it as an explicit parent choice.
      if (
        typeof parsed.tinyFactsMinMinutes !== "undefined" &&
        typeof parsed.tinyFactsMinMinutesManual === "undefined"
      ) {
        merged.tinyFactsMinMinutesManual = true;
      }

      return merged;
    }

    // First load — pull legacy individual keys if they exist
    const legacy = await AsyncStorage.multiGet([
      SK.CHILD_NAME,
      SK.PARENT_PIN,
      SK.PIN_ENABLED,
    ]);
    return {
      ...DEFAULT_SETTINGS,
      appLocale: getAppLocale(),
      childName: legacy[0][1] ?? "",
      parentPin: legacy[1][1] ?? "",
      pinEnabled: legacy[2][1] === "true",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SK.SETTINGS, JSON.stringify(settings));
    // Keep legacy keys in sync for backward compatibility with index.tsx
    await AsyncStorage.multiSet([
      [SK.CHILD_NAME, settings.childName || ""],
      [SK.PARENT_PIN, settings.parentPin || ""],
      [SK.PIN_ENABLED, String(settings.pinEnabled)],
    ]);
  } catch {
    // Non-critical persistence error — app will continue but data may be lost
    // User's device storage may be full or permissions issue
  }
}

// ── PROGRESS DATA ─────────────────────────────────────────────────────────────

interface ProgressData {
  stars: number;
  totalEver: number;
  totalMissions: number;
  completedToday: number;
  lastMissionRaw: string | null;
  firstRewardRedeemed: boolean;
  morningDoneDate: string | null;
  usage: LocalUsage;
}

async function loadProgress(): Promise<ProgressData> {
  try {
    const [vals, usage] = await Promise.all([
      AsyncStorage.multiGet([
        SK.STARS,
        SK.TOTAL_EVER,
        SK.TOTAL_MISSIONS,
        SK.COMPLETED_TODAY,
        SK.LAST_MISSION,
        SK.FIRST_REWARD,
        SK.MORNING_DONE,
      ]),
      loadLocalUsage(),
    ]);
    const v: Record<string, string> = Object.fromEntries(
      vals.map(([k, val]) => [k, val ?? ""]),
    );
    return {
      stars: v[SK.STARS] ? parseInt(v[SK.STARS], 10) : 0,
      totalEver: v[SK.TOTAL_EVER] ? parseInt(v[SK.TOTAL_EVER], 10) : 0,
      totalMissions: v[SK.TOTAL_MISSIONS]
        ? parseInt(v[SK.TOTAL_MISSIONS], 10)
        : 0,
      completedToday: v[SK.COMPLETED_TODAY]
        ? parseInt(v[SK.COMPLETED_TODAY], 10)
        : 0,
      lastMissionRaw: v[SK.LAST_MISSION] || null,
      firstRewardRedeemed: v[SK.FIRST_REWARD] === "true",
      morningDoneDate: v[SK.MORNING_DONE] || null,
      usage,
    };
  } catch {
    return {
      stars: 0,
      totalEver: 0,
      totalMissions: 0,
      completedToday: 0,
      lastMissionRaw: null,
      firstRewardRedeemed: false,
      morningDoneDate: null,
      usage: DEFAULT_LOCAL_USAGE,
    };
  }
}

// ── COLORS ────────────────────────────────────────────────────────────────────

const C = {
  bg: "#F7F6F2",
  white: "#FFFFFF",
  green: "#1D6B4F",
  greenLt: "#E1F5EE",
  text: "#1A1A18",
  muted: "#6B6B68",
  border: "#E5E5E2",
  gold: "#FFF8E7",
  goldBdr: "#F59E0B",
  red: "#E24B4A",
  redLt: "#FCEBEB",
  track: "#D8D8D4",
};

// ── UI PRIMITIVES ─────────────────────────────────────────────────────────────

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <View style={u.sectionHeader}>
      <Text style={u.sectionIcon}>{icon}</Text>
      <Text style={u.sectionTitle}>{title}</Text>
    </View>
  );
}

function SettingRow({
  label,
  sublabel,
  children,
  danger,
}: {
  label: React.ReactNode;
  sublabel?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  const labelNode =
    typeof label === "string" ? (
      <Text style={[u.rowLabel, danger && { color: C.red }]}>{label}</Text>
    ) : (
      label
    );
  return (
    <View style={u.row}>
      <View style={u.rowLabels}>
        {labelNode}
        {sublabel ? <Text style={u.rowSublabel}>{sublabel}</Text> : null}
      </View>
      <View style={u.rowControl}>{children}</View>
    </View>
  );
}

function Divider() {
  return <View style={u.divider} />;
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={u.card}>{children}</View>;
}

function PillSelector<T extends string>({
  options,
  value,
  onChange,
  compact = false,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  compact?: boolean;
}) {
  return (
    <View style={[u.pillRow, compact && u.pillRowCompact]}>
      {options.map((o) => (
        <TouchableOpacity
          key={o.value}
          style={[
            u.pill,
            compact && u.pillCompact,
            o.value === value && u.pillActive,
          ]}
          onPress={() => onChange(o.value)}
        >
          <Text
            style={[
              u.pillTxt,
              compact && u.pillTxtCompact,
              o.value === value && u.pillTxtActive,
            ]}
          >
            {o.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── PROGRESS SECTION ──────────────────────────────────────────────────────────

function formatProgressDate(value: string | null) {
  if (!value) return t("settings.progress_not_yet");
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(getAppLocale(), {
    month: "short",
    day: "numeric",
  });
}

function ProgressSection({ progress }: { progress: ProgressData }) {
  const {
    totalEver,
    totalMissions,
    completedToday,
    stars,
    lastMissionRaw,
    firstRewardRedeemed,
    morningDoneDate,
    usage,
  } = progress;
  const lastMission = getStoredMissionTitle(lastMissionRaw);
  const completionRate =
    usage.missionsStarted > 0
      ? Math.round((usage.missionsCompleted / usage.missionsStarted) * 100)
      : 0;
  const usageRows = [
    {
      label: t("settings.usage_completion"),
      value:
        usage.missionsStarted > 0
          ? t("settings.usage_completion_value", {
              percent: completionRate,
              completed: usage.missionsCompleted,
              started: usage.missionsStarted,
            })
          : t("settings.progress_not_yet"),
    },
    {
      label: t("settings.usage_skips"),
      value: String(usage.missionsSkipped),
    },
    {
      label: t("settings.usage_breathing"),
      value: t("settings.usage_breathing_value", {
        completed: usage.breathingCompleted,
        started: usage.breathingStarted,
      }),
    },
    {
      label: t("settings.usage_rewards"),
      value: t("settings.usage_rewards_value", {
        redeemed: usage.rewardsRedeemed,
        viewed: usage.rewardsViewed,
      }),
    },
  ];
  const insightChips = [
    {
      label: t("settings.insight_routine"),
      value: morningDoneDate
        ? t("settings.insight_active")
        : t("settings.progress_not_yet"),
    },
    {
      label: t("settings.insight_rewards"),
      value:
        usage.rewardsRedeemed > 0
          ? String(usage.rewardsRedeemed)
          : t("settings.progress_not_yet"),
    },
    {
      label: t("settings.insight_breathing"),
      value:
        usage.breathingStarted > 0
          ? String(usage.breathingStarted)
          : t("settings.progress_not_yet"),
    },
  ];

  const statCards = [
    {
      label: t("settings.stat_stars_total"),
      value: String(totalEver),
      emoji: "⭐",
    },
    {
      label: t("settings.stat_missions_total"),
      value: String(totalMissions),
      emoji: "🎯",
    },
    {
      label: t("settings.stat_today"),
      value: String(completedToday),
      emoji: "📅",
    },
    {
      label: t("settings.stat_stars_left"),
      value: String(stars),
      emoji: "💰",
    },
  ];
  const snapshotRows = [
    {
      label: t("settings.snapshot_today"),
      value: t("settings.snapshot_today_value", {
        count: completedToday,
      }),
    },
    {
      label: t("settings.snapshot_all_time"),
      value: t("settings.snapshot_all_time_value", {
        count: totalMissions,
      }),
    },
    {
      label: t("settings.snapshot_morning"),
      value: morningDoneDate
        ? t("settings.snapshot_morning_done", {
            date: formatProgressDate(morningDoneDate),
          })
        : t("settings.progress_not_yet"),
    },
    {
      label: t("settings.snapshot_first_reward"),
      value: firstRewardRedeemed
        ? t("settings.snapshot_yes")
        : t("settings.progress_not_yet"),
    },
  ];

  return (
    <View>
      <SectionHeader title={t("settings.progress_section")} icon="📊" />
      <Card>
        <View style={u.snapshotCard}>
          <View style={u.snapshotHero}>
            <View style={u.snapshotHeroText}>
              <Text style={u.snapshotTitle}>
                {t("settings.snapshot_title")}
              </Text>
              <Text style={u.snapshotPrivacy}>
                {t("settings.snapshot_privacy")}
              </Text>
            </View>
            <Image
              source={getBuddyImage("serene")}
              style={u.snapshotBuddy}
              resizeMode="contain"
            />
          </View>
          <View style={u.insightChips}>
            {insightChips.map((chip) => (
              <View key={chip.label} style={u.insightChip}>
                <Text style={u.insightChipLabel}>{chip.label}</Text>
                <Text style={u.insightChipValue}>{chip.value}</Text>
              </View>
            ))}
          </View>
          <View style={u.snapshotRows}>
            {snapshotRows.map((row) => (
              <View key={row.label} style={u.snapshotRow}>
                <Text style={u.snapshotLabel}>{row.label}</Text>
                <Text style={u.snapshotValue}>{row.value}</Text>
              </View>
            ))}
          </View>
          <View style={u.snapshotLastWin}>
            <Text style={u.snapshotLabel}>
              {t("settings.snapshot_last_win")}
            </Text>
            <Text style={u.snapshotLastWinValue}>
              {lastMission || t("settings.progress_not_yet")}
            </Text>
          </View>
        </View>
      </Card>
      <View style={u.statsGrid}>
        {statCards.map((sc) => (
          <View key={sc.label} style={u.statCard}>
            <Text style={u.statEmoji}>{sc.emoji}</Text>
            <Text style={u.statValue}>{sc.value}</Text>
            <Text style={u.statLabel}>{sc.label}</Text>
          </View>
        ))}
      </View>
      <Card>
        <View style={u.usageCard}>
          <Text style={u.usageTitle}>{t("settings.usage_title")}</Text>
          {usageRows.map((row) => (
            <View key={row.label} style={u.usageRow}>
              <Text style={u.snapshotLabel}>{row.label}</Text>
              <Text style={u.snapshotValue}>{row.value}</Text>
            </View>
          ))}
        </View>
      </Card>
      {totalMissions === 0 && (
        <Card>
          <Text style={[u.rowSublabel, { textAlign: "center", padding: 8 }]}>
            {t("settings.progress_empty")}
          </Text>
        </Card>
      )}
    </View>
  );
}

// ── PIN SECTION ───────────────────────────────────────────────────────────────

function PinSection({
  settings,
  onChange,
}: {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
}) {
  const [showSetPin, setShowSetPin] = useState(false);
  const [showRemovePin, setShowRemovePin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [removePinInput, setRemovePinInput] = useState("");
  const [pinChallengeAction, setPinChallengeAction] = useState<
    "remove" | "change" | null
  >(null);
  const [setPinError, setSetPinError] = useState("");
  const [removePinError, setRemovePinError] = useState("");
  const [setPinFocused, setSetPinFocused] = useState(false);
  const [removePinFocused, setRemovePinFocused] = useState(false);

  function handleSetPin() {
    if (!newPin || !confirmPin) {
      setSetPinError(t("pinChild.empty_msg"));
      return;
    }
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setSetPinError(t("pinChild.short_msg"));
      Alert.alert(t("settings.pin_invalid"));
      return;
    }
    if (newPin !== confirmPin) {
      setSetPinError(t("settings.pin_mismatch"));
      Alert.alert(t("settings.pin_mismatch"));
      return;
    }
    setSetPinError("");
    onChange({ parentPin: newPin, pinEnabled: true });
    setShowSetPin(false);
    setNewPin("");
    setConfirmPin("");
    setSetPinFocused(false);
    Alert.alert(t("settings.pin_set_ok"));
  }

  function confirmRemovePin() {
    Alert.alert(t("settings.pin_delete_title"), t("settings.pin_delete_msg"), [
      { text: t("settings.cancel"), style: "cancel" },
      {
        text: t("settings.delete"),
        style: "destructive",
        onPress: () => onChange({ parentPin: "", pinEnabled: false }),
      },
    ]);
  }

  function requestRemovePin() {
    if (!settings.parentPin) {
      confirmRemovePin();
      return;
    }
    setPinChallengeAction("remove");
    setRemovePinInput("");
    setRemovePinError("");
    setRemovePinFocused(false);
    setShowSetPin(false);
    setShowRemovePin(true);
  }

  function requestChangePin() {
    if (!settings.parentPin) {
      setShowSetPin(true);
      return;
    }
    setPinChallengeAction("change");
    setRemovePinInput("");
    setRemovePinError("");
    setRemovePinFocused(false);
    setShowSetPin(false);
    setShowRemovePin(true);
  }

  function verifyRemovePin() {
    if (!removePinInput) {
      setRemovePinError(t("pinChild.empty_msg"));
      return;
    }
    if (removePinInput.length < 4) {
      setRemovePinError(t("pinChild.short_msg"));
      return;
    }
    if (removePinInput === settings.parentPin) {
      setShowRemovePin(false);
      setRemovePinInput("");
      setRemovePinError("");
      setRemovePinFocused(false);
      const action = pinChallengeAction;
      setPinChallengeAction(null);
      if (action === "change") {
        setShowSetPin(true);
      } else {
        confirmRemovePin();
      }
    } else {
      Alert.alert(t("settings.pin_wrong"));
      setRemovePinInput("");
      setRemovePinError("");
      setRemovePinFocused(false);
    }
  }

  function showControlLevelHint() {
    const key =
      settings.controlLevel === "hands-on"
        ? "hands_on"
        : settings.controlLevel === "balanced"
          ? "standard"
          : "independent";
    Alert.alert(
      t(`settings.control_${key}_hint_title`),
      t(`settings.control_${key}_hint_body`),
    );
  }

  return (
    <View>
      <SectionHeader title={t("settings.security_section")} icon="🔒" />
      <Card>
        <SettingRow
          label={t("settings.pin_label")}
          sublabel={t("settings.pin_sublabel")}
        >
          <Switch
            value={settings.pinEnabled}
            onValueChange={(v) => {
              if (v && !settings.parentPin) {
                setShowSetPin(true);
              } else if (!v && settings.parentPin) {
                requestRemovePin();
              } else {
                onChange({ pinEnabled: v });
              }
            }}
            trackColor={{ false: C.track, true: C.green }}
            thumbColor={C.white}
          />
        </SettingRow>
        <Divider />
        <SettingRow
          label={t("settings.pin_mission_label")}
          sublabel={t("settings.pin_mission_sublabel")}
        >
          <Switch
            value={settings.missionCompletionPinEnabled}
            onValueChange={(v) => onChange({ missionCompletionPinEnabled: v })}
            trackColor={{ false: C.track, true: C.green }}
            thumbColor={C.white}
            disabled={!settings.pinEnabled || !settings.parentPin}
          />
        </SettingRow>

        {settings.pinEnabled && settings.parentPin ? (
          <>
            <Divider />
            <SettingRow
              label={t("settings.pin_change_label")}
              sublabel={t("settings.pin_change_sublabel")}
            >
              <TouchableOpacity onPress={requestChangePin} style={u.linkBtn}>
                <Text style={u.linkBtnTxt}>{t("settings.edit")}</Text>
              </TouchableOpacity>
            </SettingRow>
          </>
        ) : null}

        {!settings.pinEnabled || !settings.parentPin ? (
          <>
            <Divider />
            <TouchableOpacity
              style={u.inlineAction}
              onPress={() => {
                if (settings.parentPin) {
                  requestChangePin();
                } else {
                  setShowSetPin(true);
                }
              }}
            >
              <Text style={u.inlineActionTxt}>
                {t("settings.pin_set_link")}
              </Text>
            </TouchableOpacity>
          </>
        ) : null}
      </Card>

      <Modal
        visible={showSetPin || showRemovePin}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSetPin(false);
          setShowRemovePin(false);
          setPinChallengeAction(null);
          setSetPinFocused(false);
          setRemovePinFocused(false);
        }}
      >
        <View style={ss.pinOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={20}
            style={ss.pinKeyboardWrap}
          >
            <View style={ss.pinCard}>
              {showSetPin ? (
                <>
                  <Text style={ss.pinTitle}>
                    {t("settings.pin_new_heading")}
                  </Text>
                  <TextInput
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                    placeholder="····"
                    placeholderTextColor={C.muted}
                    value={newPin}
                    onChangeText={(v) => {
                      setNewPin(v);
                      if (setPinError) setSetPinError("");
                    }}
                    onFocus={() => setSetPinFocused(true)}
                    onBlur={() => setSetPinFocused(false)}
                    style={[
                      ss.pinInput,
                      setPinFocused ? ss.pinInputFocused : null,
                      setPinError ? ss.pinInputError : null,
                    ]}
                  />
                  <Text style={ss.pinTitle}>
                    {t("settings.pin_confirm_heading")}
                  </Text>
                  <TextInput
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                    placeholder="····"
                    placeholderTextColor={C.muted}
                    value={confirmPin}
                    onChangeText={(v) => {
                      setConfirmPin(v);
                      if (setPinError) setSetPinError("");
                    }}
                    onFocus={() => setSetPinFocused(true)}
                    onBlur={() => setSetPinFocused(false)}
                    onSubmitEditing={handleSetPin}
                    style={[
                      ss.pinInput,
                      setPinFocused ? ss.pinInputFocused : null,
                      setPinError ? ss.pinInputError : null,
                    ]}
                  />
                  <Text
                    style={[
                      ss.pinErrorText,
                      !setPinError ? ss.pinErrorTextHidden : null,
                    ]}
                  >
                    {setPinError || " "}
                  </Text>
                  <TouchableOpacity
                    style={ss.pinBtnPrimary}
                    onPress={handleSetPin}
                  >
                    <Text style={ss.pinBtnPrimaryTxt}>
                      {t("settings.save")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={ss.pinBtnCancel}
                    onPress={() => {
                      setShowSetPin(false);
                      setNewPin("");
                      setConfirmPin("");
                      setSetPinError("");
                      setSetPinFocused(false);
                    }}
                  >
                    <Text style={ss.pinBtnCancelTxt}>
                      {t("settings.cancel")}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={ss.pinTitle}>
                    {t("settings.pin_enter_title")}
                  </Text>
                  <TextInput
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                    placeholder="····"
                    placeholderTextColor={C.muted}
                    value={removePinInput}
                    onChangeText={(v) => {
                      setRemovePinInput(v);
                      if (removePinError) setRemovePinError("");
                    }}
                    onFocus={() => setRemovePinFocused(true)}
                    onBlur={() => setRemovePinFocused(false)}
                    onSubmitEditing={verifyRemovePin}
                    style={[
                      ss.pinInput,
                      removePinFocused ? ss.pinInputFocused : null,
                      removePinError ? ss.pinInputError : null,
                    ]}
                  />
                  <Text
                    style={[
                      ss.pinErrorText,
                      !removePinError ? ss.pinErrorTextHidden : null,
                    ]}
                  >
                    {removePinError || " "}
                  </Text>
                  <TouchableOpacity
                    style={ss.pinBtnPrimary}
                    onPress={verifyRemovePin}
                  >
                    <Text style={ss.pinBtnPrimaryTxt}>
                      {t("settings.confirm")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={ss.pinBtnCancel}
                    onPress={() => {
                      setShowRemovePin(false);
                      setPinChallengeAction(null);
                      setRemovePinInput("");
                      setRemovePinError("");
                      setRemovePinFocused(false);
                    }}
                  >
                    <Text style={ss.pinBtnCancelTxt}>
                      {t("settings.cancel")}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Card>
        <Text
          style={[
            u.rowLabel,
            { marginBottom: 1, marginLeft: 12, marginTop: 10 },
          ]}
        >
          {t("settings.control_level")}
        </Text>
        <View
          style={[
            u.rowLabelWithInfo,
            { marginLeft: 10, marginTop: 2, marginBottom: 2 },
          ]}
        >
          <Text style={u.rowSublabel}>
            {settings.controlLevel === "hands-on"
              ? t("settings.control_hands_on")
              : settings.controlLevel === "balanced"
                ? t("settings.control_balanced")
                : t("settings.control_independent")}
          </Text>
          <TouchableOpacity
            style={u.infoDot}
            onPress={showControlLevelHint}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={u.infoDotTxt}>i</Text>
          </TouchableOpacity>
        </View>
        <PillSelector
          options={[
            { label: t("settings.control_pill_together"), value: "hands-on" },
            { label: t("settings.control_pill_standard"), value: "balanced" },
            { label: t("settings.control_pill_alone"), value: "independent" },
          ]}
          value={settings.controlLevel}
          onChange={(v) => onChange({ controlLevel: v })}
        />
      </Card>
    </View>
  );
}

// ── MISSIONS SECTION ──────────────────────────────────────────────────────────

function MissionsSection({
  settings,
  onChange,
}: {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
}) {
  return (
    <View>
      <SectionHeader title={t("settings.missions_section")} icon="🎯" />
      <Card>
        <Text style={[u.rowSublabel, { padding: 12, textAlign: "center" }]}>
          {t("settings.missions_parent_hint")}
        </Text>
      </Card>

      <Card>
        <SettingRow
          label={t("settings.infinity_loop")}
          sublabel={t("settings.infinity_loop_sub")}
        >
          <Switch
            value={settings.infinityLoopEnabled}
            onValueChange={(v) =>
              onChange({ infinityLoopEnabled: v, rotationEnabled: !v })
            }
            trackColor={{ false: C.track, true: C.green }}
            thumbColor={C.white}
          />
        </SettingRow>
        {settings.infinityLoopEnabled && (
          <>
            <Divider />
            <SettingRow
              label={t("settings.missions_per_day")}
              sublabel={t("settings.missions_per_day_sub")}
            >
              <PillSelector
                compact
                options={[
                  { label: "5", value: "5" },
                  { label: "8", value: "8" },
                  { label: "10", value: "10" },
                  { label: "12", value: "12" },
                  { label: "15", value: "15" },
                ]}
                value={
                  (["5", "8", "10", "12", "15"].includes(
                    String(settings.dailyPickerSize),
                  )
                    ? String(settings.dailyPickerSize)
                    : "8") as "5" | "8" | "10" | "12" | "15"
                }
                onChange={(v) => onChange({ dailyPickerSize: parseInt(v, 10) })}
              />
            </SettingRow>
            <Divider />
            <SettingRow
              label={t("settings.bonus_mission")}
              sublabel={t("settings.bonus_mission_sub")}
            >
              <Switch
                value={settings.bonusAfterCompletion}
                onValueChange={(v) => onChange({ bonusAfterCompletion: v })}
                trackColor={{ false: C.track, true: C.green }}
                thumbColor={C.white}
              />
            </SettingRow>
          </>
        )}
      </Card>

      <Card>
        <SettingRow
          label={t("settings.rotation_soon")}
          sublabel={t("settings.rotation_soon_sub")}
        >
          <Switch
            value={settings.rotationEnabled}
            onValueChange={(v) =>
              onChange({ rotationEnabled: v, infinityLoopEnabled: !v })
            }
            trackColor={{ false: C.track, true: C.green }}
            thumbColor={C.white}
          />
        </SettingRow>
      </Card>
    </View>
  );
}

// ── BUDDY BEHAVIOR SECTION ────────────────────────────────────────────────────

function BuddySection({
  settings,
  onChange,
}: {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
}) {
  function showTinyFactsHint() {
    Alert.alert(t("settings.facts_hint_title"), t("settings.facts_hint_body"));
  }

  return (
    <View>
      <SectionHeader title={t("settings.buddy_section")} icon="🐻" />
      <Card>
        <SettingRow
          label={t("settings.tts_label")}
          sublabel={t("settings.tts_sub")}
        >
          <Switch
            value={settings.ttsEnabled}
            onValueChange={(v) => onChange({ ttsEnabled: v })}
            trackColor={{ false: C.track, true: C.green }}
            thumbColor={C.white}
          />
        </SettingRow>
        <Divider />
        <SettingRow
          label={t("settings.breathing_music_label")}
          sublabel={t("settings.breathing_music_sub")}
        >
          <Switch
            value={settings.breathingMusicEnabled}
            onValueChange={(v) => onChange({ breathingMusicEnabled: v })}
            trackColor={{ false: C.track, true: C.green }}
            thumbColor={C.white}
          />
        </SettingRow>
        <Divider />
        <SettingRow
          label={t("settings.nudge_label")}
          sublabel={t("settings.nudge_sub")}
        >
          <Switch
            value={settings.nudgingEnabled}
            onValueChange={(v) => onChange({ nudgingEnabled: v })}
            trackColor={{ false: C.track, true: C.green }}
            thumbColor={C.white}
          />
        </SettingRow>
        <Divider />
        <SettingRow
          label={t("settings.skip_label")}
          sublabel={t("settings.skip_sub", {
            count: settings.skipSensitivity,
          })}
        >
          <View style={u.stepperRow}>
            <TouchableOpacity
              style={u.stepperBtn}
              onPress={() =>
                onChange({
                  skipSensitivity: Math.max(1, settings.skipSensitivity - 1),
                })
              }
            >
              <Text style={u.stepperTxt}>−</Text>
            </TouchableOpacity>
            <Text style={u.stepperVal}>{settings.skipSensitivity}</Text>
            <TouchableOpacity
              style={u.stepperBtn}
              onPress={() =>
                onChange({
                  skipSensitivity: Math.min(5, settings.skipSensitivity + 1),
                })
              }
            >
              <Text style={u.stepperTxt}>+</Text>
            </TouchableOpacity>
          </View>
        </SettingRow>
        <Divider />
        <SettingRow
          label={t("settings.exact_cost_label")}
          sublabel={
            settings.showExactStarCost
              ? t("settings.exact_cost_on")
              : t("settings.exact_cost_off")
          }
        >
          <Switch
            value={settings.showExactStarCost}
            onValueChange={(v) => onChange({ showExactStarCost: v })}
            trackColor={{ false: C.track, true: C.green }}
            thumbColor={C.white}
          />
        </SettingRow>
        <Divider />
        <SettingRow
          label={t("settings.age_profile_label")}
          sublabel={t("settings.age_profile_sub")}
        >
          <View>
            <PillSelector
              compact
              options={[
                { label: t("settings.age_auto"), value: "auto" },
                { label: t("settings.age_little"), value: "little" },
                { label: t("settings.age_middle"), value: "middle" },
                { label: t("settings.age_teen"), value: "teen" },
              ]}
              value={settings.ageProfileOverride ?? "auto"}
              onChange={(v) =>
                onChange({
                  ageProfileOverride: v as AppSettings["ageProfileOverride"],
                })
              }
            />
          </View>
        </SettingRow>
        <Divider />
        <SettingRow
          label={
            <View style={u.rowLabelWithInfo}>
              <Text style={u.rowLabel}>{t("settings.facts_soon")}</Text>
              <TouchableOpacity
                style={u.infoDot}
                onPress={showTinyFactsHint}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={u.infoDotTxt}>i</Text>
              </TouchableOpacity>
            </View>
          }
          sublabel={t("settings.facts_soon_sub")}
        >
          <Switch
            value={settings.tinyFactsEnabled}
            onValueChange={(v) => onChange({ tinyFactsEnabled: v })}
            trackColor={{ false: C.track, true: C.green }}
            thumbColor={C.white}
          />
        </SettingRow>
        <Divider />
        <SettingRow
          label={t("settings.facts_min_gap")}
          sublabel={t("settings.facts_min_gap_sub")}
        >
          <View>
            <PillSelector
              compact
              options={[
                { label: "1m", value: "1" },
                { label: "2m", value: "2" },
                { label: "5m", value: "5" },
                { label: "10m", value: "10" },
              ]}
              value={String(settings.tinyFactsMinMinutes ?? 5)}
              onChange={(v) =>
                onChange({
                  tinyFactsMinMinutes: parseInt(v, 10) as 1 | 2 | 5 | 10,
                  tinyFactsMinMinutesManual: true,
                })
              }
            />
          </View>
        </SettingRow>
        <Divider />
        <SettingRow
          label={t("settings.breathing_label")}
          sublabel={t("settings.breathing_sub")}
        >
          <Switch
            value={settings.breathingEnabled}
            onValueChange={(v) => onChange({ breathingEnabled: v })}
            trackColor={{ false: C.track, true: C.green }}
            thumbColor={C.white}
          />
        </SettingRow>
      </Card>
    </View>
  );
}

// ── CHILD SECTION ─────────────────────────────────────────────────────────────

function ChildSection({
  settings,
  onChange,
  onResetProgress,
}: {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
  onResetProgress: () => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(settings.childName);
  const showRtlGender = true;

  function saveName() {
    if (!nameInput.trim()) {
      Alert.alert(t("settings.name_empty"));
      return;
    }
    onChange({ childName: nameInput.trim() });
    setEditingName(false);
  }

  return (
    <View>
      <SectionHeader title={t("settings.profile_section")} icon="👤" />
      <Card>
        {editingName ? (
          <View style={u.editBlock}>
            <TextInput
              style={u.editInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder={t("settings.name_placeholder")}
              placeholderTextColor={C.muted}
              autoFocus
            />
            <View style={u.rowBtns}>
              <TouchableOpacity style={u.btnPrimary} onPress={saveName}>
                <Text style={u.btnPrimaryTxt}>{t("settings.save")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={u.btnCancel}
                onPress={() => setEditingName(false)}
              >
                <Text style={u.btnCancelTxt}>{t("settings.cancel")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <SettingRow
            label={t("settings.name_label")}
            sublabel={settings.childName || t("settings.empty_dash")}
          >
            <TouchableOpacity
              onPress={() => {
                setNameInput(settings.childName);
                setEditingName(true);
              }}
              style={u.linkBtn}
            >
              <Text style={u.linkBtnTxt}>{t("settings.edit")}</Text>
            </TouchableOpacity>
          </SettingRow>
        )}
        <Divider />
        {showRtlGender && (
          <>
            <SettingRow
              label={t("settings.rtl_sex_label")}
              sublabel={t("settings.rtl_sex_sub")}
            >
              <PillSelector
                compact
                options={[
                  { label: t("settings.rtl_sex_male"), value: "male" },
                  { label: t("settings.rtl_sex_female"), value: "female" },
                ]}
                value={settings.rtlChildSex ?? "male"}
                onChange={(v) => onChange({ rtlChildSex: v as RtlChildSex })}
              />
            </SettingRow>
            <Divider />
          </>
        )}
        <SettingRow
          label={t("settings.reset_progress")}
          sublabel={t("settings.reset_progress_sub")}
          danger
        >
          <TouchableOpacity style={u.dangerBtn} onPress={onResetProgress}>
            <Text style={u.dangerBtnTxt}>{t("settings.reset")}</Text>
          </TouchableOpacity>
        </SettingRow>
      </Card>
    </View>
  );
}

// ── DAILY ROUTINE SECTION ─────────────────────────────────────────────────────

function DailyRoutineSection({
  settings,
  onChange,
  showStepsEditor = true,
  showDayModeCard = true,
  onOpenStepsManager,
}: {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
  showStepsEditor?: boolean;
  showDayModeCard?: boolean;
  onOpenStepsManager?: () => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [stepTitle, setStepTitle] = useState("");
  const [stepEmoji, setStepEmoji] = useState("");

  // Move a morning step up or down by index offset (-1 or +1)
  function moveStep(id: number, dir: -1 | 1) {
    const steps = [...settings.morningSteps];
    const idx = steps.findIndex((s) => s.id === id);
    const swap = idx + dir;
    if (swap < 0 || swap >= steps.length) return;
    [steps[idx], steps[swap]] = [steps[swap], steps[idx]];
    onChange({ morningSteps: steps });
  }

  function saveStep() {
    if (!stepTitle.trim()) return;
    if (editingId === -1) {
      const newId = Math.max(0, ...settings.morningSteps.map((s) => s.id)) + 1;
      onChange({
        morningSteps: [
          ...settings.morningSteps,
          { id: newId, title: stepTitle.trim(), emoji: stepEmoji || "✅" },
        ],
      });
    } else {
      onChange({
        morningSteps: settings.morningSteps.map((s) =>
          s.id === editingId
            ? { ...s, title: stepTitle.trim(), emoji: stepEmoji || s.emoji }
            : s,
        ),
      });
    }
    setEditingId(null);
    setStepTitle("");
    setStepEmoji("");
  }

  function deleteStep(id: number) {
    onChange({
      morningSteps: settings.morningSteps.filter((s) => s.id !== id),
    });
  }

  return (
    <View>
      <SectionHeader title={t("settings.routine_section")} icon="🌅" />

      {/* Morning routine toggle + star count + steps editor */}
      <Card>
        <SettingRow
          label={t("settings.morning_label")}
          sublabel={t("settings.morning_sub")}
        >
          <Switch
            value={settings.morningEnabled}
            onValueChange={(v) => onChange({ morningEnabled: v })}
            trackColor={{ false: C.track, true: C.green }}
            thumbColor={C.white}
          />
        </SettingRow>

        {settings.morningEnabled && (
          <>
            <Divider />
            <SettingRow
              label={t("settings.morning_stars")}
              sublabel={t("settings.morning_stars_sub")}
            >
              <View style={u.stepperRow}>
                <TouchableOpacity
                  style={u.stepperBtn}
                  onPress={() =>
                    onChange({
                      morningStars: Math.max(1, settings.morningStars - 1),
                    })
                  }
                >
                  <Text style={u.stepperTxt}>−</Text>
                </TouchableOpacity>
                <Text style={u.stepperVal}>{settings.morningStars}</Text>
                <TouchableOpacity
                  style={u.stepperBtn}
                  onPress={() =>
                    onChange({
                      morningStars: Math.min(5, settings.morningStars + 1),
                    })
                  }
                >
                  <Text style={u.stepperTxt}>+</Text>
                </TouchableOpacity>
              </View>
            </SettingRow>

            {showStepsEditor ? (
              <>
                <Divider />
                <Text style={u.subheading}>
                  {t("settings.morning_steps_heading")}
                </Text>

                {settings.morningSteps.map((step, idx) => (
                  <View key={step.id}>
                    {idx > 0 && <Divider />}
                    {editingId === step.id ? (
                      <View style={u.editBlock}>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <TextInput
                            style={[u.editInput, { width: 52 }]}
                            value={stepEmoji}
                            onChangeText={setStepEmoji}
                            placeholder="🌟"
                            placeholderTextColor={C.muted}
                          />
                          <TextInput
                            style={[u.editInput, { flex: 1 }]}
                            value={stepTitle}
                            onChangeText={setStepTitle}
                            placeholder={t("settings.step_name_placeholder")}
                            placeholderTextColor={C.muted}
                            autoFocus
                          />
                        </View>
                        <View style={u.rowBtns}>
                          <TouchableOpacity
                            style={u.btnPrimary}
                            onPress={saveStep}
                          >
                            <Text style={u.btnPrimaryTxt}>
                              {t("settings.save")}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={u.btnCancel}
                            onPress={() => {
                              setEditingId(null);
                              setStepTitle("");
                              setStepEmoji("");
                            }}
                          >
                            <Text style={u.btnCancelTxt}>
                              {t("settings.cancel")}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={u.row}>
                        <Text style={{ fontSize: 22, marginRight: 10 }}>
                          {step.emoji}
                        </Text>
                        <Text style={[u.rowLabel, { flex: 1 }]}>
                          {getMorningStepTitle(step.id, step.title)}
                        </Text>
                        <TouchableOpacity
                          style={u.stepperBtn}
                          onPress={() => moveStep(step.id, -1)}
                          disabled={idx === 0}
                        >
                          <Text
                            style={[
                              u.stepperTxt,
                              idx === 0 && { opacity: 0.25 },
                            ]}
                          >
                            ↑
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[u.stepperBtn, { marginLeft: 4 }]}
                          onPress={() => moveStep(step.id, 1)}
                          disabled={idx === settings.morningSteps.length - 1}
                        >
                          <Text
                            style={[
                              u.stepperTxt,
                              idx === settings.morningSteps.length - 1 && {
                                opacity: 0.25,
                              },
                            ]}
                          >
                            ↓
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[u.linkBtn, { marginLeft: 4 }]}
                          onPress={() => {
                            setEditingId(step.id);
                            setStepTitle(
                              getMorningStepTitle(step.id, step.title),
                            );
                            setStepEmoji(step.emoji);
                          }}
                        >
                          <Text style={u.linkBtnTxt}>
                            {t("settings.edit_short")}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={u.dangerBtn}
                          onPress={() => deleteStep(step.id)}
                        >
                          <Text style={u.dangerBtnTxt}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}

                {settings.morningSteps.length < 6 && editingId !== -1 && (
                  <>
                    <Divider />
                    <TouchableOpacity
                      style={ss.scheduleManageBtn}
                      onPress={() => {
                        setEditingId(-1);
                        setStepTitle("");
                        setStepEmoji("");
                      }}
                    >
                      <Text style={ss.scheduleManageBtnTitle}>
                        {t("settings.add_step")}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
                {editingId === -1 && (
                  <View style={u.editBlock}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TextInput
                        style={[u.editInput, { width: 52 }]}
                        value={stepEmoji}
                        onChangeText={setStepEmoji}
                        placeholder="🌟"
                        placeholderTextColor={C.muted}
                      />
                      <TextInput
                        style={[u.editInput, { flex: 1 }]}
                        value={stepTitle}
                        onChangeText={setStepTitle}
                        placeholder={t("settings.step_name_placeholder")}
                        placeholderTextColor={C.muted}
                        autoFocus
                      />
                    </View>
                    <View style={u.rowBtns}>
                      <TouchableOpacity style={u.btnPrimary} onPress={saveStep}>
                        <Text style={u.btnPrimaryTxt}>{t("settings.add")}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={u.btnCancel}
                        onPress={() => {
                          setEditingId(null);
                          setStepTitle("");
                          setStepEmoji("");
                        }}
                      >
                        <Text style={u.btnCancelTxt}>
                          {t("settings.cancel")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            ) : (
              <>
                <Divider />
                <TouchableOpacity
                  style={ss.scheduleManageBtn}
                  onPress={onOpenStepsManager}
                  activeOpacity={0.78}
                >
                  <View style={ss.subscreenRowLeft}>
                    <Text style={ss.scheduleManageBtnTitle}>
                      {t("settings.morning_manage_title")}
                    </Text>
                    <Text style={ss.scheduleManageBtnSub}>
                      {t("settings.morning_summary_steps", {
                        count: String(settings.morningSteps.length),
                      })}
                    </Text>
                  </View>
                  <Text style={ss.scheduleManageBtnArrow}>→</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </Card>

      {showDayModeCard && (
        <Card>
          <Text style={[u.rowLabel, { padding: 14, paddingBottom: 4 }]}>
            {t("settings.day_mode")}
          </Text>
          <Text
            style={[u.rowSublabel, { paddingHorizontal: 14, paddingBottom: 8 }]}
          >
            {(settings.dayModeOverride ?? "auto") === "auto"
              ? t("settings.day_mode_auto")
              : settings.dayModeOverride === "weekday"
                ? t("settings.day_mode_weekday")
                : t("settings.day_mode_weekend")}
          </Text>
          <PillSelector
            options={[
              { label: t("settings.day_pill_auto"), value: "auto" },
              { label: t("settings.day_pill_weekday"), value: "weekday" },
              { label: t("settings.day_pill_weekend"), value: "weekend" },
            ]}
            value={settings.dayModeOverride ?? "auto"}
            onChange={(v) =>
              onChange({ dayModeOverride: v as DayModeOverride })
            }
          />
        </Card>
      )}
    </View>
  );
}

// ── DAY SCHEDULE SECTION ──────────────────────────────────────────────────────
// Option A — parents manage the "what's now" item pool.
// Each item: emoji, title, start/end time (HH:MM), weekday/weekend flags.

function ScheduleSection({
  settings,
  onChange,
}: {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
}) {
  const blocks = settings.scheduleBlocks ?? DEFAULT_SCHEDULE;
  const sortedBlocks = sortScheduleBlocks(blocks);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftEmoji, setDraftEmoji] = useState("");
  const [draftStart, setDraftStart] = useState("");
  const [draftEnd, setDraftEnd] = useState("");

  function startEdit(it: ScheduleBlock) {
    setEditingId(it.id);
    setDraftTitle(getScheduleTitle(it.id, it.title));
    setDraftEmoji(it.emoji);
    setDraftStart(it.startTime);
    setDraftEnd(it.endTime);
  }

  function startAdd() {
    if (blocks.length >= SCHEDULE_MAX_BLOCKS) {
      Alert.alert(
        t("settings.schedule_limit_title"),
        t("settings.schedule_limit_msg", { max: SCHEDULE_MAX_BLOCKS }),
      );
      return;
    }
    setEditingId(-1);
    setDraftTitle("");
    setDraftEmoji("");
    setDraftStart("");
    setDraftEnd("");
  }

  function isValidTime(t: string): boolean {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
  }

  function sortScheduleBlocks(items: ScheduleBlock[]) {
    return [...items].sort((a, b) => {
      const byStart = a.startTime.localeCompare(b.startTime);
      if (byStart !== 0) return byStart;
      return a.endTime.localeCompare(b.endTime);
    });
  }

  function saveDraft() {
    const title = draftTitle.trim();
    if (!title || !isValidTime(draftStart) || !isValidTime(draftEnd)) {
      Alert.alert(
        t("settings.schedule_invalid_title"),
        t("settings.schedule_invalid_msg"),
      );
      return;
    }
    if (editingId === -1) {
      const newId = Math.max(0, ...blocks.map((i) => i.id)) + 1;
      onChange({
        scheduleBlocks: sortScheduleBlocks([
          ...blocks,
          {
            id: newId,
            title,
            emoji: draftEmoji || "⏰",
            startTime: draftStart,
            endTime: draftEnd,
            weekdays: true,
            weekends: true,
          },
        ]),
      });
    } else {
      onChange({
        scheduleBlocks: sortScheduleBlocks(
          blocks.map((i) =>
            i.id === editingId
              ? {
                  ...i,
                  title,
                  emoji: draftEmoji || i.emoji,
                  startTime: draftStart,
                  endTime: draftEnd,
                }
              : i,
          ),
        ),
      });
    }
    setEditingId(null);
  }

  function deleteBlock(id: number) {
    onChange({
      scheduleBlocks: sortScheduleBlocks(blocks.filter((i) => i.id !== id)),
    });
  }

  function toggleFlag(id: number, key: "weekdays" | "weekends") {
    onChange({
      scheduleBlocks: sortScheduleBlocks(
        blocks.map((i) => (i.id === id ? { ...i, [key]: !i[key] } : i)),
      ),
    });
  }

  return (
    <View>
      <SectionHeader title={t("settings.schedule_section")} icon="📅" />
      <Card>
        <SettingRow
          label={t("settings.schedule_now_card")}
          sublabel={t("settings.schedule_now_sub")}
        >
          <Switch
            value={settings.scheduleEnabled}
            onValueChange={(v) => onChange({ scheduleEnabled: v })}
            trackColor={{ false: C.track, true: C.green }}
            thumbColor={C.white}
          />
        </SettingRow>
      </Card>

      {settings.scheduleEnabled && (
        <Card>
          {sortedBlocks.map((it, idx) => (
            <View key={it.id}>
              {idx > 0 && <Divider />}
              {editingId === it.id ? (
                <View style={u.editBlock}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TextInput
                      style={[u.editInput, { width: 52 }]}
                      value={draftEmoji}
                      onChangeText={setDraftEmoji}
                      placeholder="⏰"
                      placeholderTextColor={C.muted}
                    />
                    <TextInput
                      style={[u.editInput, { flex: 1 }]}
                      value={draftTitle}
                      onChangeText={setDraftTitle}
                      placeholder={t("settings.schedule_name_placeholder")}
                      placeholderTextColor={C.muted}
                      autoFocus
                    />
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TextInput
                      style={[u.editInput, { flex: 1 }]}
                      value={draftStart}
                      onChangeText={setDraftStart}
                      placeholder={t("settings.schedule_time_start")}
                      placeholderTextColor={C.muted}
                      maxLength={5}
                    />
                    <TextInput
                      style={[u.editInput, { flex: 1 }]}
                      value={draftEnd}
                      onChangeText={setDraftEnd}
                      placeholder={t("settings.schedule_time_end")}
                      placeholderTextColor={C.muted}
                      maxLength={5}
                    />
                  </View>
                  <View style={u.rowBtns}>
                    <TouchableOpacity style={u.btnPrimary} onPress={saveDraft}>
                      <Text style={u.btnPrimaryTxt}>{t("settings.save")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={u.btnCancel}
                      onPress={() => setEditingId(null)}
                    >
                      <Text style={u.btnCancelTxt}>{t("settings.cancel")}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={u.scheduleItemWrap}>
                  <View style={u.scheduleMainRow}>
                    <Text style={u.scheduleEmoji}>{it.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={u.scheduleLabel}>
                        {getScheduleTitle(it.id, it.title)}
                      </Text>
                      <Text style={u.scheduleSublabel}>
                        {it.startTime} — {it.endTime}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={u.scheduleLinkBtn}
                      onPress={() => startEdit(it)}
                    >
                      <Text style={u.scheduleLinkBtnTxt}>
                        {t("settings.edit_short")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={u.scheduleDangerBtn}
                      onPress={() => deleteBlock(it.id)}
                    >
                      <Text style={u.scheduleDangerBtnTxt}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={u.scheduleSubRow}>
                    <Text style={[u.scheduleSublabel, { flex: 1 }]}>
                      {t("settings.schedule_weekdays")}
                    </Text>
                    <Switch
                      value={it.weekdays}
                      onValueChange={() => toggleFlag(it.id, "weekdays")}
                      trackColor={{ false: C.track, true: C.green }}
                      thumbColor={C.white}
                    />
                  </View>
                  <View style={u.scheduleSubRow}>
                    <Text style={[u.scheduleSublabel, { flex: 1 }]}>
                      {t("settings.schedule_weekends")}
                    </Text>
                    <Switch
                      value={it.weekends}
                      onValueChange={() => toggleFlag(it.id, "weekends")}
                      trackColor={{ false: C.track, true: C.green }}
                      thumbColor={C.white}
                    />
                  </View>
                </View>
              )}
            </View>
          ))}

          {editingId === -1 && (
            <View style={u.editBlock}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                  style={[u.editInput, { width: 52 }]}
                  value={draftEmoji}
                  onChangeText={setDraftEmoji}
                  placeholder="⏰"
                  placeholderTextColor={C.muted}
                />
                <TextInput
                  style={[u.editInput, { flex: 1 }]}
                  value={draftTitle}
                  onChangeText={setDraftTitle}
                  placeholder={t("settings.schedule_name_placeholder")}
                  placeholderTextColor={C.muted}
                  autoFocus
                />
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                  style={[u.editInput, { flex: 1 }]}
                  value={draftStart}
                  onChangeText={setDraftStart}
                  placeholder={t("settings.schedule_time_start")}
                  placeholderTextColor={C.muted}
                  maxLength={5}
                />
                <TextInput
                  style={[u.editInput, { flex: 1 }]}
                  value={draftEnd}
                  onChangeText={setDraftEnd}
                  placeholder={t("settings.schedule_time_end")}
                  placeholderTextColor={C.muted}
                  maxLength={5}
                />
              </View>
              <View style={u.rowBtns}>
                <TouchableOpacity style={u.btnPrimary} onPress={saveDraft}>
                  <Text style={u.btnPrimaryTxt}>{t("settings.add")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={u.btnCancel}
                  onPress={() => setEditingId(null)}
                >
                  <Text style={u.btnCancelTxt}>{t("settings.cancel")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {editingId !== -1 && blocks.length < SCHEDULE_MAX_BLOCKS && (
            <>
              <Divider />
              <TouchableOpacity style={ss.scheduleManageBtn} onPress={startAdd}>
                <Text style={ss.scheduleManageBtnTitle}>
                  {t("settings.add_schedule_item")}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </Card>
      )}
    </View>
  );
}

// ── NOTIFICATIONS SECTION ─────────────────────────────────────────────────────

function NotificationsSection({
  settings,
  onChange,
}: {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
}) {
  return (
    <View>
      <SectionHeader title={t("settings.notifications_section")} icon="🔔" />
      <Card>
        <SettingRow
          label={t("settings.morning_reminder")}
          sublabel={t("settings.morning_reminder_sub")}
        >
          <Switch
            value={settings.morningReminderEnabled}
            onValueChange={(v) => onChange({ morningReminderEnabled: v })}
            trackColor={{ false: C.track, true: C.green }}
            thumbColor={C.white}
          />
        </SettingRow>
      </Card>
    </View>
  );
}

function CreditsSection() {
  return (
    <View>
      <SectionHeader title={t("settings.credits_section")} icon="♡" />
      <Card>
        <Text style={[u.creditsText, isRtl() && u.creditsTextRtl]}>
          {t("settings.credits_body")}
        </Text>
      </Card>
    </View>
  );
}

function FeedbackSection() {
  async function openFeedbackEmail() {
    incrementLocalUsage("feedbackTapped").catch(console.log);
    const email = "hello@realokids.com";
    const subject = encodeURIComponent(t("settings.feedback_email_subject"));
    const body = encodeURIComponent(t("settings.feedback_email_body"));
    const url = `mailto:${email}?subject=${subject}&body=${body}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        t("settings.feedback_email_error_title"),
        t("settings.feedback_email_error_msg", { email }),
      );
    }
  }

  return (
    <View>
      <SectionHeader title={t("settings.feedback_section")} icon="✉️" />
      <Card>
        <View style={u.feedbackCard}>
          <Text style={u.feedbackText}>{t("settings.feedback_body")}</Text>
          <TouchableOpacity
            style={u.feedbackBtn}
            onPress={openFeedbackEmail}
            activeOpacity={0.82}
          >
            <Text style={u.feedbackBtnTxt}>
              {t("settings.feedback_button")}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    </View>
  );
}

// ── PARENT ZONE ────────────────────────────────────────────────────────────────
// PIN-gated screen for per-mission and per-reward overrides.
// Sections: Weekday Missions, Weekend Missions, Rewards.

function ParentZoneView({
  settings,
  onChange,
  onBack,
}: {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
  onBack: () => void;
}) {
  const tx = (key: string, params?: Record<string, unknown>) =>
    i18n.t(key, { ...(params ?? {}), locale: settings.appLocale });
  const missionOverrides = settings.missionOverrides ?? {};
  const rewardOverrides = settings.rewardOverrides ?? {};
  const customMissions = settings.customMissions ?? [];
  const customRewards = settings.customRewards ?? [];
  // Effective pools — built-ins plus parent-added custom items.
  const missionPool: PoolMission[] = [...MISSION_POOL, ...customMissions];
  const rewardPool: Reward[] = [...REWARDS, ...customRewards];
  const customMissionIds = new Set(customMissions.map((m) => m.id));
  const customRewardIds = new Set(customRewards.map((r) => r.id));
  const missionTypeById: Record<number, MissionType> = Object.fromEntries(
    settings.missions.map((m) => [m.id, m.type]),
  );
  const missionTypeOrder: MissionType[] = ["permanent", "rotating", "inactive"];

  // Add-form state for custom missions (shared between weekday/weekend cards).
  const [showAddMission, setShowAddMission] = useState(false);
  const [draftMissionEmoji, setDraftMissionEmoji] = useState("");
  const [draftMissionTitle, setDraftMissionTitle] = useState("");
  const [draftMissionSubtitle, setDraftMissionSubtitle] = useState("");

  // Add-form state for custom rewards.
  const [showAddReward, setShowAddReward] = useState(false);
  const [draftRewardEmoji, setDraftRewardEmoji] = useState("");
  const [draftRewardTitle, setDraftRewardTitle] = useState("");
  const [aboutOpen, setAboutOpen] = useState(false);

  if (aboutOpen) {
    return (
      <SafeAreaView key={`about-${settings.appLocale}`} style={ss.root}>
        <ParentOnboarding onDone={() => setAboutOpen(false)} />
      </SafeAreaView>
    );
  }

  function patchMission(id: number, patch: Partial<MissionOverride>) {
    const cur: MissionOverride = missionOverrides[id] ?? {
      enabledWeekday: effectiveMissionEnabled(id, "weekday", missionOverrides),
      enabledWeekend: effectiveMissionEnabled(id, "weekend", missionOverrides),
      stars: effectiveMissionStars(id, missionOverrides),
    };
    onChange({
      missionOverrides: { ...missionOverrides, [id]: { ...cur, ...patch } },
    });
  }

  function patchReward(id: number, patch: Partial<RewardOverride>) {
    const cur: RewardOverride = rewardOverrides[id] ?? {
      enabled: effectiveRewardEnabled(id, rewardOverrides),
      cost: effectiveRewardCost(id, rewardOverrides),
    };
    onChange({
      rewardOverrides: { ...rewardOverrides, [id]: { ...cur, ...patch } },
    });
  }

  function cycleMissionType(mission: PoolMission) {
    const currentType = missionTypeById[mission.id] ?? "rotating";
    const nextType =
      missionTypeOrder[
        (missionTypeOrder.indexOf(currentType) + 1) % missionTypeOrder.length
      ];
    const existing = settings.missions.find((m) => m.id === mission.id);
    const nextMissions = existing
      ? settings.missions.map((m) =>
          m.id === mission.id ? { ...m, type: nextType } : m,
        )
      : [
          ...settings.missions,
          {
            id: mission.id,
            title: mission.title,
            subtitle: mission.subtitle,
            stars: mission.stars,
            emoji: mission.emoji,
            type: nextType,
          },
        ];
    onChange({ missions: nextMissions });
  }

  function MissionTypePill({
    mission,
    type,
  }: {
    mission: PoolMission;
    type: MissionType;
  }) {
    const style =
      type === "permanent"
        ? pz.typePillPermanent
        : type === "rotating"
          ? pz.typePillRotating
          : pz.typePillInactive;
    const label =
      type === "permanent"
        ? t("settings.type_permanent")
        : type === "rotating"
          ? t("settings.type_rotating")
          : t("settings.type_inactive");

    return (
      <TouchableOpacity
        style={[pz.typePill, style]}
        onPress={() => cycleMissionType(mission)}
        activeOpacity={0.75}
      >
        <Text style={pz.typePillTxt}>{label}</Text>
      </TouchableOpacity>
    );
  }

  function nextCustomMissionId(): number {
    const existing = customMissions.map((m) => m.id);
    return Math.max(CUSTOM_ID_OFFSET, ...existing) + 1;
  }

  function nextCustomRewardId(): number {
    const existing = customRewards.map((r) => r.id);
    return Math.max(CUSTOM_ID_OFFSET, ...existing) + 1;
  }

  function addCustomMission() {
    const title = draftMissionTitle.trim();
    if (!title) {
      Alert.alert(
        t("settings.mission_check_title"),
        t("settings.mission_check_msg"),
      );
      return;
    }
    if (customMissions.length >= CUSTOM_MISSIONS_MAX) {
      Alert.alert(
        t("settings.schedule_limit_title"),
        t("settings.mission_limit_msg", { max: CUSTOM_MISSIONS_MAX }),
      );
      return;
    }
    const newMission: PoolMission = {
      id: nextCustomMissionId(),
      title,
      subtitle:
        draftMissionSubtitle.trim() || t("settings.custom_mission_subtitle"),
      stars: 1,
      emoji: draftMissionEmoji || "✨",
      category: "movement",
      slot: "any",
      weekdayDefault: true,
      weekendDefault: true,
    };
    // Also register a MissionConfig so the daily picker treats it like
    // any rotating mission (visible in the daily pool, with an editable type).
    const newConfig: MissionConfig = {
      id: newMission.id,
      title: newMission.title,
      subtitle: newMission.subtitle,
      stars: newMission.stars,
      emoji: newMission.emoji,
      type: "rotating",
    };
    onChange({
      customMissions: [...customMissions, newMission],
      missions: [...settings.missions, newConfig],
    });
    setShowAddMission(false);
    setDraftMissionEmoji("");
    setDraftMissionTitle("");
    setDraftMissionSubtitle("");
  }

  function deleteCustomMission(id: number) {
    Alert.alert(
      t("settings.mission_delete_title"),
      t("settings.mission_delete_msg"),
      [
        { text: t("settings.cancel"), style: "cancel" },
        {
          text: t("settings.delete"),
          style: "destructive",
          onPress: () => {
            const nextOverrides = { ...missionOverrides };
            delete nextOverrides[id];
            onChange({
              customMissions: customMissions.filter((m) => m.id !== id),
              missions: settings.missions.filter((m) => m.id !== id),
              missionOverrides: nextOverrides,
            });
          },
        },
      ],
    );
  }

  function addCustomReward() {
    const title = draftRewardTitle.trim();
    if (!title) {
      Alert.alert(
        t("settings.mission_check_title"),
        t("settings.reward_check_msg"),
      );
      return;
    }
    if (customRewards.length >= CUSTOM_REWARDS_MAX) {
      Alert.alert(
        t("settings.schedule_limit_title"),
        t("settings.reward_limit_msg", { max: CUSTOM_REWARDS_MAX }),
      );
      return;
    }
    const newReward: Reward = {
      id: nextCustomRewardId(),
      title,
      cost: 3,
      emoji: draftRewardEmoji || "🎁",
    };
    const newConfig: RewardConfig = {
      id: newReward.id,
      title: newReward.title,
      cost: newReward.cost,
      emoji: newReward.emoji,
      active: true,
    };
    onChange({
      customRewards: [...customRewards, newReward],
      rewards: [...settings.rewards, newConfig],
    });
    setShowAddReward(false);
    setDraftRewardEmoji("");
    setDraftRewardTitle("");
  }

  function deleteCustomReward(id: number) {
    Alert.alert(
      t("settings.reward_delete_title"),
      t("settings.reward_delete_msg"),
      [
        { text: t("settings.cancel"), style: "cancel" },
        {
          text: t("settings.delete"),
          style: "destructive",
          onPress: () => {
            const nextOverrides = { ...rewardOverrides };
            delete nextOverrides[id];
            onChange({
              customRewards: customRewards.filter((r) => r.id !== id),
              rewards: settings.rewards.filter((r) => r.id !== id),
              rewardOverrides: nextOverrides,
            });
          },
        },
      ],
    );
  }

  function StarPicker({ id }: { id: number }) {
    const value = effectiveMissionStars(id, missionOverrides);
    return (
      <View style={pz.starPickerRow}>
        {[1, 2, 3].map((n) => {
          const filled = n <= value;
          return (
            <TouchableOpacity
              key={n}
              style={pz.starTap}
              onPress={() => patchMission(id, { stars: n })}
              activeOpacity={0.7}
            >
              <Text
                style={[pz.starIcon, filled ? pz.starFilled : pz.starOutline]}
              >
                {filled ? "★" : "☆"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  function MissionRow({
    id,
    mode,
  }: {
    id: number;
    mode: "weekday" | "weekend";
  }) {
    const m = missionPool.find((x) => x.id === id);
    if (!m) return null;
    const enabled = effectiveMissionEnabled(id, mode, missionOverrides);
    const isCustom = customMissionIds.has(id);
    const mType = missionTypeById[id] ?? "rotating";
    const tintStyle =
      mType === "permanent"
        ? pz.blockPermanent
        : mType === "rotating"
          ? pz.blockRotating
          : null;
    return (
      <View style={[pz.missionBlock, tintStyle]}>
        <View style={[u.row, pz.compactRow]}>
          <Text style={{ fontSize: 22, marginRight: 10 }}>{m.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={u.rowLabel}>{getMissionTitle(m.id, m.title)}</Text>
            <Text style={u.rowSublabel}>
              {getMissionSubtitle(m.id, m.subtitle)}
            </Text>
            {isCustom && (
              <View style={[pz.typePill, pz.typePillCustom]}>
                <Text style={pz.typePillTxt}>{t("settings.type_custom")}</Text>
              </View>
            )}
            <MissionTypePill mission={m} type={mType} />
          </View>
          <Switch
            value={enabled}
            onValueChange={(v) =>
              patchMission(
                id,
                mode === "weekday"
                  ? { enabledWeekday: v }
                  : { enabledWeekend: v },
              )
            }
            trackColor={{ false: C.track, true: C.green }}
            thumbColor={C.white}
          />
          {isCustom && (
            <TouchableOpacity
              style={[u.dangerBtn, { marginLeft: 8 }]}
              onPress={() => deleteCustomMission(id)}
            >
              <Text style={u.dangerBtnTxt}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <StarPicker id={id} />
      </View>
    );
  }

  function RewardRow({ id }: { id: number }) {
    const r = rewardPool.find((x) => x.id === id);
    if (!r) return null;
    const enabled = effectiveRewardEnabled(id, rewardOverrides);
    const cost = effectiveRewardCost(id, rewardOverrides);
    const clampedCost = Math.max(1, Math.min(7, cost));
    const isCustom = customRewardIds.has(id);
    return (
      <View style={pz.missionBlock}>
        <View style={[u.row, pz.compactRow]}>
          <Text style={{ fontSize: 22, marginRight: 10 }}>{r.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={u.rowLabel}>{getRewardTitle(r.id, r.title)}</Text>
            <Text style={u.rowSublabel}>
              {Array(clampedCost).fill("⭐").join("")}
            </Text>
            {isCustom && (
              <View style={[pz.typePill, pz.typePillCustom]}>
                <Text style={pz.typePillTxt}>{t("settings.type_custom")}</Text>
              </View>
            )}
          </View>
          <Switch
            value={enabled}
            onValueChange={(v) => patchReward(id, { enabled: v })}
            trackColor={{ false: C.track, true: C.green }}
            thumbColor={C.white}
          />
          {isCustom && (
            <TouchableOpacity
              style={[u.dangerBtn, { marginLeft: 8 }]}
              onPress={() => deleteCustomReward(id)}
            >
              <Text style={u.dangerBtnTxt}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={[u.row, pz.compactSubRow]}>
          <Text style={[u.rowSublabel, { flex: 1 }]}>
            {t("settings.cost_label")}
          </Text>
          <View style={pz.starStepperRow}>
            <TouchableOpacity
              style={u.stepperBtn}
              onPress={() =>
                patchReward(id, { cost: Math.max(1, clampedCost - 1) })
              }
            >
              <Text style={u.stepperTxt}>−</Text>
            </TouchableOpacity>
            <View style={pz.starStepperStars}>
              {Array.from({ length: clampedCost }).map((_, i) => (
                <Text key={i} style={pz.starStepperStar}>
                  ★
                </Text>
              ))}
            </View>
            <Text style={pz.starStepperNum}>{clampedCost}</Text>
            <TouchableOpacity
              style={u.stepperBtn}
              onPress={() =>
                patchReward(id, { cost: Math.min(7, clampedCost + 1) })
              }
            >
              <Text style={u.stepperTxt}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Inline editor for new mission — mirrors the day-schedule add UI.
  function AddMissionBlock() {
    return (
      <View style={u.editBlock}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            style={[u.editInput, { width: 52 }]}
            value={draftMissionEmoji}
            onChangeText={setDraftMissionEmoji}
            placeholder="✨"
            placeholderTextColor={C.muted}
          />
          <TextInput
            style={[u.editInput, { flex: 1 }]}
            value={draftMissionTitle}
            onChangeText={setDraftMissionTitle}
            placeholder={t("settings.mission_name_placeholder")}
            placeholderTextColor={C.muted}
            autoFocus
          />
        </View>
        <TextInput
          style={u.editInput}
          value={draftMissionSubtitle}
          onChangeText={setDraftMissionSubtitle}
          placeholder={t("settings.mission_hint_placeholder")}
          placeholderTextColor={C.muted}
        />
        <View style={u.rowBtns}>
          <TouchableOpacity style={u.btnPrimary} onPress={addCustomMission}>
            <Text style={u.btnPrimaryTxt}>{t("settings.add")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={u.btnCancel}
            onPress={() => {
              setShowAddMission(false);
              setDraftMissionEmoji("");
              setDraftMissionTitle("");
              setDraftMissionSubtitle("");
            }}
          >
            <Text style={u.btnCancelTxt}>{t("settings.cancel")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Inline editor for new reward — mirrors the day-schedule add UI.
  function AddRewardBlock() {
    return (
      <View style={u.editBlock}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            style={[u.editInput, { width: 52 }]}
            value={draftRewardEmoji}
            onChangeText={setDraftRewardEmoji}
            placeholder="🎁"
            placeholderTextColor={C.muted}
          />
          <TextInput
            style={[u.editInput, { flex: 1 }]}
            value={draftRewardTitle}
            onChangeText={setDraftRewardTitle}
            placeholder={t("settings.reward_name_placeholder")}
            placeholderTextColor={C.muted}
          />
        </View>
        <View style={u.rowBtns}>
          <TouchableOpacity style={u.btnPrimary} onPress={addCustomReward}>
            <Text style={u.btnPrimaryTxt}>{t("settings.add")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={u.btnCancel}
            onPress={() => {
              setShowAddReward(false);
              setDraftRewardEmoji("");
              setDraftRewardTitle("");
            }}
          >
            <Text style={u.btnCancelTxt}>{t("settings.cancel")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView key={`pz-${settings.appLocale}`} style={ss.root}>
      <View style={ss.header}>
        <TouchableOpacity onPress={onBack} style={ss.backBtn}>
          <Text style={ss.backBtnTxt}>{tx("settings.back")}</Text>
        </TouchableOpacity>
        <Text style={ss.headerTitle}>{tx("settings.parent_zone_header")}</Text>
        <View style={{ width: 80 }} />
      </View>
      <ScrollView
        key={`pz-scroll-${settings.appLocale}`}
        style={ss.scroll}
        contentContainerStyle={ss.content}
        keyboardShouldPersistTaps="handled"
      >
        <SectionHeader title={t("settings.missions_weekday")} icon="📅" />
        <Card>
          {missionPool.map((m, idx) => (
            <View key={m.id}>
              {idx > 0 && <Divider />}
              <MissionRow id={m.id} mode="weekday" />
            </View>
          ))}
        </Card>

        <View style={pz.sectionSpacer} />

        <SectionHeader title={t("settings.missions_weekend")} icon="🌈" />
        <Card>
          {missionPool.map((m, idx) => (
            <View key={m.id}>
              {idx > 0 && <Divider />}
              <MissionRow id={m.id} mode="weekend" />
            </View>
          ))}

          {showAddMission ? (
            <>
              <Divider />
              {AddMissionBlock()}
            </>
          ) : (
            customMissions.length < CUSTOM_MISSIONS_MAX && (
              <>
                <Divider />
                <TouchableOpacity
                  style={pz.addAction}
                  onPress={() => setShowAddMission(true)}
                >
                  <Text style={pz.addActionTxt}>
                    {t("settings.add_mission")}
                  </Text>
                </TouchableOpacity>
              </>
            )
          )}
        </Card>

        <View style={pz.sectionSpacer} />

        <SectionHeader title={t("settings.rewards_section")} icon="🎁" />
        <Card>
          {rewardPool.map((r, idx) => (
            <View key={r.id}>
              {idx > 0 && <Divider />}
              {RewardRow({ id: r.id })}
            </View>
          ))}

          {showAddReward ? (
            <>
              <Divider />
              {AddRewardBlock()}
            </>
          ) : (
            customRewards.length < CUSTOM_REWARDS_MAX && (
              <>
                <Divider />
                <TouchableOpacity
                  style={pz.addAction}
                  onPress={() => setShowAddReward(true)}
                >
                  <Text style={pz.addActionTxt}>
                    {t("settings.add_reward")}
                  </Text>
                </TouchableOpacity>
              </>
            )
          )}
        </Card>

        <View style={pz.sectionSpacer} />

        <SectionHeader title={t("settings.about_section")} icon="ℹ️" />
        <Card>
          <View style={pz.aboutWrap}>
            <Text style={u.rowSublabel}>{t("settings.about_realo_sub")}</Text>
            <TouchableOpacity
              style={pz.aboutBtn}
              onPress={() => setAboutOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={pz.aboutBtnTxt}>
                {t("settings.about_realo_btn")}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const pz = StyleSheet.create({
  missionBlock: { paddingBottom: 8 },
  compactRow: { paddingVertical: 10, paddingHorizontal: 12, gap: 10 },
  compactSubRow: { paddingTop: 0, paddingBottom: 8, paddingHorizontal: 12 },
  sectionSpacer: { height: 18 },
  blockPermanent: { backgroundColor: "#F1FAF6" },
  blockRotating: { backgroundColor: "#FFF8E7" },

  // Type pills (mission rows in ParentZone)
  typePill: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  typePillPermanent: { backgroundColor: C.green },
  typePillRotating: { backgroundColor: C.goldBdr },
  typePillInactive: { backgroundColor: C.muted },
  typePillCustom: { backgroundColor: "#7C5CFF" },
  typePillTxt: {
    fontSize: 10,
    fontWeight: "700",
    color: C.white,
    letterSpacing: 0.3,
  },

  // Star picker (missions): 3 tappable stars
  starPickerRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  starTap: { padding: 4 },
  starIcon: { fontSize: 28, lineHeight: 32 },
  starFilled: { color: C.goldBdr },
  starOutline: { color: C.muted },

  // Reward stepper with rendered stars + numeric label
  starStepperRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  starStepperStars: {
    flexDirection: "row",
    minWidth: 96,
    justifyContent: "flex-end",
  },
  starStepperStar: { fontSize: 14, color: C.goldBdr, marginHorizontal: 0.5 },
  starStepperNum: {
    fontSize: 12,
    color: C.muted,
    minWidth: 16,
    textAlign: "center",
  },
  addAction: {
    margin: 12,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CFE6DD",
    backgroundColor: C.greenLt,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addActionTxt: { fontSize: 14, color: C.green, fontWeight: "700" },
  aboutWrap: {
    padding: 14,
    gap: 10,
  },
  aboutBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CFE6DD",
    backgroundColor: C.greenLt,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  aboutBtnTxt: { fontSize: 14, color: C.green, fontWeight: "700" },
});

// ── MAIN SETTINGS SCREEN ──────────────────────────────────────────────────────

interface SettingsScreenProps {
  onClose: () => void;
  // Called whenever settings change so index.tsx can update its own state
  onSettingsChange: (settings: AppSettings) => void;
  // Called after full progress reset so index.tsx can sync in-memory counters
  onProgressReset?: () => void;
  // Optional: pass current PIN for protected reset
  currentPin?: string;
  pinEnabled?: boolean;
}

function LanguageToggle({
  value,
  onChange,
}: {
  value: AppLocale;
  onChange: (locale: AppLocale) => void;
}) {
  const options: { label: string; value: AppLocale }[] = [
    { label: "RU", value: "ru" },
    { label: "EN", value: "en" },
    { label: "HE", value: "he" },
  ];

  return (
    <View style={ss.langToggle}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[ss.langBtn, active && ss.langBtnActive]}
            onPress={() => onChange(option.value)}
            activeOpacity={0.75}
          >
            <Text style={[ss.langBtnTxt, active && ss.langBtnTxtActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function SettingsScreen({
  onClose,
  onSettingsChange,
  onProgressReset,
  currentPin = "",
  pinEnabled = false,
}: SettingsScreenProps) {
  const tx = (key: string, params?: Record<string, unknown>) =>
    i18n.t(key, { ...(params ?? {}), locale: settings.appLocale });
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinFocused, setPinFocused] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [parentZoneOpen, setParentZoneOpen] = useState(false);
  const [activeSubscreen, setActiveSubscreen] = useState<
    "main" | "schedule" | "routine"
  >("main");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load on mount
  useEffect(() => {
    Promise.all([loadSettings(), loadProgress()]).then(([s, p]) => {
      setSettings(s);
      setProgress(p);
      setLoading(false);
    });
  }, []);

  // Auto-save with debounce — 800ms after last change
  function updateSettings(patch: Partial<AppSettings>) {
    const next = { ...settings, ...patch };
    if (patch.appLocale) {
      setAppLocale(patch.appLocale);
      setProgress((prev) => (prev ? { ...prev } : prev));
    }
    setSettings(next);
    onSettingsChange(next); // notify parent immediately for live updates
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (patch.appLocale) {
      saveSettings(next).catch(console.log);
      saveTimer.current = null;
    } else {
      saveTimer.current = setTimeout(() => saveSettings(next), 800);
    }
  }

  // PIN-protected action (reset progress)
  function requirePin(action: () => void) {
    if (pinEnabled && currentPin) {
      setPendingAction(() => action);
      setPinInput("");
      setPinError("");
      setPinFocused(false);
      setShowPin(true);
    } else {
      action();
    }
  }

  function verifyAndRun() {
    if (!pinInput) {
      setPinError(t("pinChild.empty_msg"));
      return;
    }
    if (pinInput.length < 4) {
      setPinError(t("pinChild.short_msg"));
      return;
    }
    if (pinInput === currentPin) {
      setShowPin(false);
      setPinError("");
      setPinFocused(false);
      pendingAction?.();
      setPendingAction(null);
    } else {
      Alert.alert(t("settings.pin_wrong"));
      setPinInput("");
      setPinError("");
      setPinFocused(false);
    }
  }

  function handleResetProgress() {
    requirePin(() => {
      Alert.alert(
        t("settings.reset_full_title"),
        t("settings.reset_full_msg"),
        [
          { text: t("settings.cancel"), style: "cancel" },
          {
            text: t("settings.reset_full_btn"),
            style: "destructive",
            onPress: async () => {
              await AsyncStorage.multiSet([
                [SK.STARS, "0"],
                [SK.TOTAL_EVER, "0"],
                [SK.TOTAL_MISSIONS, "0"],
                [SK.COMPLETED_TODAY, "0"],
                [SK.LAST_MISSION, ""],
                [SK.FIRST_REWARD, "false"],
                [SK.MORNING_DONE, ""],
                [SK.DONE_IDS_TODAY, "[]"],
                [SK.SKIP_COUNT, "0"],
                [SK.TINY_FACT_LAST_SHOWN, "0"],
              ]);
              await resetLocalUsage();
              setProgress({
                stars: 0,
                totalEver: 0,
                totalMissions: 0,
                completedToday: 0,
                lastMissionRaw: null,
                firstRewardRedeemed: false,
                morningDoneDate: null,
                usage: DEFAULT_LOCAL_USAGE,
              });
              onProgressReset?.();
              Alert.alert(t("settings.reset_done"));
            },
          },
        ],
      );
    });
  }

  if (loading) {
    return (
      <SafeAreaView style={ss.root}>
        <View style={ss.loadingCenter}>
          <Text style={ss.loadingText}>{t("settings.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (parentZoneOpen) {
    return (
      <ParentZoneView
        key={settings.appLocale}
        settings={settings}
        onChange={updateSettings}
        onBack={() => setParentZoneOpen(false)}
      />
    );
  }

  if (activeSubscreen === "schedule") {
    const scheduleCount = (settings.scheduleBlocks ?? []).length;
    return (
      <SafeAreaView key={`schedule-${settings.appLocale}`} style={ss.root}>
        <View pointerEvents="none" style={ss.bgBandTop} />
        <View pointerEvents="none" style={ss.bgBandMid} />
        <View style={ss.header}>
          <TouchableOpacity
            onPress={() => setActiveSubscreen("main")}
            style={ss.backBtn}
          >
            <Text style={ss.backBtnTxt}>{tx("settings.back")}</Text>
          </TouchableOpacity>
          <Text style={ss.headerTitle}>{tx("settings.schedule_section")}</Text>
          <View style={ss.headerRight}>
            <Text style={ss.subHeaderMeta}>{scheduleCount}</Text>
          </View>
        </View>
        <ScrollView
          key={`${settings.appLocale}-schedule`}
          style={ss.scroll}
          contentContainerStyle={ss.content}
          keyboardShouldPersistTaps="handled"
        >
          <ScheduleSection settings={settings} onChange={updateSettings} />
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (activeSubscreen === "routine") {
    const stepsCount = settings.morningSteps.length;
    return (
      <SafeAreaView key={`routine-${settings.appLocale}`} style={ss.root}>
        <View pointerEvents="none" style={ss.bgBandTop} />
        <View pointerEvents="none" style={ss.bgBandMid} />
        <View style={ss.header}>
          <TouchableOpacity
            onPress={() => setActiveSubscreen("main")}
            style={ss.backBtn}
          >
            <Text style={ss.backBtnTxt}>{tx("settings.back")}</Text>
          </TouchableOpacity>
          <Text style={ss.headerTitle}>{tx("settings.routine_section")}</Text>
          <View style={ss.headerRight}>
            <Text style={ss.subHeaderMeta}>{stepsCount}</Text>
          </View>
        </View>
        <ScrollView
          key={`${settings.appLocale}-routine`}
          style={ss.scroll}
          contentContainerStyle={ss.content}
          keyboardShouldPersistTaps="handled"
        >
          <DailyRoutineSection
            settings={settings}
            onChange={updateSettings}
            showDayModeCard={false}
          />
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={ss.root}>
      <View pointerEvents="none" style={ss.bgBandTop} />
      <View pointerEvents="none" style={ss.bgBandMid} />
      {/* Header */}
      <View style={ss.header}>
        <TouchableOpacity onPress={onClose} style={ss.backBtn}>
          <Text style={ss.backBtnTxt}>{tx("settings.back")}</Text>
        </TouchableOpacity>
        <Text style={ss.headerTitle}>{tx("settings.title")}</Text>
        <View style={ss.headerRight}>
          <LanguageToggle
            value={settings.appLocale}
            onChange={(appLocale) => updateSettings({ appLocale })}
          />
        </View>
      </View>

      <ScrollView
        key={settings.appLocale}
        style={ss.scroll}
        contentContainerStyle={ss.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Progress report — high priority, first */}
        {progress && <ProgressSection progress={progress} />}

        <View style={pz.sectionSpacer} />

        {/* Parent zone — PIN-gated overrides */}
        <TouchableOpacity
          style={ss.parentZoneCard}
          onPress={() => requirePin(() => setParentZoneOpen(true))}
          activeOpacity={0.75}
        >
          <View style={ss.parentZoneLeft}>
            <Text style={ss.parentZoneIcon}>🔐</Text>
            <View style={{ flex: 1 }}>
              <Text style={ss.parentZoneTitle}>
                {t("settings.parent_zone_title")}
              </Text>
              <Text style={ss.parentZoneSub}>
                {t("settings.parent_zone_sub")}
              </Text>
            </View>
          </View>
          <Text style={ss.parentZoneArrow}>→</Text>
        </TouchableOpacity>

        <View style={ss.spacer} />

        {/* Child profile */}
        <ChildSection
          settings={settings}
          onChange={updateSettings}
          onResetProgress={handleResetProgress}
        />

        <View style={ss.spacer} />

        {/* Security */}
        <PinSection settings={settings} onChange={updateSettings} />

        <View style={ss.spacer} />

        {/* Missions */}
        <MissionsSection settings={settings} onChange={updateSettings} />

        <View style={ss.spacer} />

        {/* Daily routine */}
        <DailyRoutineSection
          settings={settings}
          onChange={updateSettings}
          showStepsEditor={false}
          showDayModeCard={true}
          onOpenStepsManager={() => setActiveSubscreen("routine")}
        />

        <View style={ss.spacer} />

        {/* Day schedule */}
        <SectionHeader title={t("settings.schedule_section")} icon="📅" />
        <Card>
          <SettingRow
            label={t("settings.schedule_home_card_label")}
            sublabel={t("settings.schedule_home_card_sub")}
          >
            <Switch
              value={settings.scheduleEnabled}
              onValueChange={(v) => updateSettings({ scheduleEnabled: v })}
              trackColor={{ false: C.track, true: C.green }}
              thumbColor={C.white}
            />
          </SettingRow>
          <Divider />
          <TouchableOpacity
            style={ss.scheduleManageBtn}
            onPress={() => setActiveSubscreen("schedule")}
            activeOpacity={0.78}
          >
            <View style={ss.subscreenRowLeft}>
              <Text style={ss.scheduleManageBtnTitle}>
                {t("settings.schedule_manage_title")}
              </Text>
              <Text style={ss.scheduleManageBtnSub}>
                {settings.scheduleEnabled
                  ? t("settings.schedule_summary_on", {
                      count: String((settings.scheduleBlocks ?? []).length),
                    })
                  : t("settings.schedule_summary_off")}
              </Text>
            </View>
            <Text style={ss.scheduleManageBtnArrow}>→</Text>
          </TouchableOpacity>
        </Card>

        <View style={ss.spacer} />

        {/* Buddy behavior */}
        <BuddySection settings={settings} onChange={updateSettings} />

        <View style={ss.spacer} />

        {/* Notifications (placeholder) */}
        <NotificationsSection settings={settings} onChange={updateSettings} />

        <View style={ss.spacer} />

        {/* Feedback */}
        <FeedbackSection />

        <View style={ss.spacer} />

        {/* Credits */}
        <CreditsSection />

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* PIN overlay for protected actions */}
      {showPin && (
        <View style={ss.pinOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={20}
            style={ss.pinKeyboardWrap}
          >
            <View style={ss.pinCard}>
              <Text style={ss.pinTitle}>{t("settings.pin_enter_title")}</Text>
              <TextInput
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                value={pinInput}
                onChangeText={(v) => {
                  setPinInput(v);
                  if (pinError) setPinError("");
                }}
                onFocus={() => setPinFocused(true)}
                onBlur={() => setPinFocused(false)}
                onSubmitEditing={verifyAndRun}
                style={[
                  ss.pinInput,
                  pinFocused ? ss.pinInputFocused : null,
                  pinError ? ss.pinInputError : null,
                ]}
              />
              <Text
                style={[
                  ss.pinErrorText,
                  !pinError ? ss.pinErrorTextHidden : null,
                ]}
              >
                {pinError || " "}
              </Text>
              <TouchableOpacity style={ss.pinBtnPrimary} onPress={verifyAndRun}>
                <Text style={ss.pinBtnPrimaryTxt}>{t("settings.confirm")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={ss.pinBtnCancel}
                onPress={() => {
                  setShowPin(false);
                  setPinInput("");
                  setPinError("");
                  setPinFocused(false);
                  setPendingAction(null);
                }}
              >
                <Text style={ss.pinBtnCancelTxt}>{t("settings.cancel")}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}
    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  bgBandTop: {
    position: "absolute",
    top: 74,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: "rgba(225,245,238,0.38)",
  },
  bgBandMid: {
    position: "absolute",
    top: 330,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: "rgba(255,248,231,0.42)",
  },
  loadingCenter: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 16, color: C.muted },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderColor: C.border,
    backgroundColor: C.white,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    color: C.text,
    textAlign: "center",
  },
  backBtn: { width: 114, paddingVertical: 4, paddingHorizontal: 8 },
  backBtnTxt: { fontSize: 15, color: C.green, fontWeight: "500" },
  headerRight: { width: 114, alignItems: "flex-end" },
  subHeaderMeta: { fontSize: 15, color: C.muted, fontWeight: "600" },
  langToggle: {
    flexDirection: "row",
    backgroundColor: C.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 2,
  },
  langBtn: {
    minWidth: 34,
    paddingVertical: 5,
    alignItems: "center",
    borderRadius: 9,
  },
  langBtnActive: { backgroundColor: C.green },
  langBtnTxt: { fontSize: 11, color: C.muted, fontWeight: "700" },
  langBtnTxtActive: { color: C.white },
  scroll: { flex: 1 },
  content: {
    width: "100%",
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: "center",
    padding: 16,
  },
  spacer: { height: 24 },
  subscreenRowLeft: { flex: 1, minWidth: 0 },
  scheduleManageBtn: {
    margin: 12,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CFE6DD",
    backgroundColor: C.greenLt,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  scheduleManageBtnTitle: { fontSize: 14, fontWeight: "600", color: C.green },
  scheduleManageBtnSub: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
    lineHeight: 16,
  },
  scheduleManageBtnArrow: { fontSize: 18, color: C.green, fontWeight: "600" },
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
  pinTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: C.text,
    marginBottom: 16,
  },
  pinInput: {
    fontSize: 30,
    textAlign: "center",
    letterSpacing: 10,
    marginBottom: 18,
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
  pinBtnPrimary: {
    backgroundColor: C.green,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: "center",
    width: "100%",
    marginBottom: 10,
  },
  pinBtnPrimaryTxt: { fontSize: 15, color: C.white, fontWeight: "600" },
  pinBtnCancel: {
    backgroundColor: C.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: "center",
    width: "100%",
  },
  pinBtnCancelTxt: { fontSize: 15, color: C.text, fontWeight: "500" },
  pinInputError: {
    borderColor: C.red,
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
    color: C.red,
    fontWeight: "500",
    minHeight: 18,
  },
  pinErrorTextHidden: {
    opacity: 0,
  },
  parentZoneCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.green,
    borderRadius: 16,
    padding: 18,
    marginBottom: 8,
  },
  parentZoneLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  parentZoneIcon: { fontSize: 28 },
  parentZoneTitle: { fontSize: 16, fontWeight: "700", color: C.white },
  parentZoneSub: {
    fontSize: 12,
    color: C.greenLt,
    marginTop: 3,
    lineHeight: 17,
  },
  parentZoneArrow: { fontSize: 18, color: C.white, opacity: 0.8 },
});

const u = StyleSheet.create({
  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  sectionIcon: { fontSize: 18 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: C.text,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Card
  card: {
    backgroundColor: "#FFFDF9",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "#DED8CE",
    overflow: "hidden",
    marginBottom: 8,
  },

  // Row
  row: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  rowLabels: { flex: 1, minWidth: 0 },
  rowLabel: { fontSize: 14, fontWeight: "500", color: C.text },
  rowSublabel: { fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 17 },
  rowLabelWithInfo: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.muted,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  infoDotTxt: { fontSize: 10, color: C.muted, fontWeight: "700" },
  creditsText: {
    fontSize: 12,
    color: C.muted,
    lineHeight: 18,
    padding: 14,
  },
  creditsTextRtl: {
    writingDirection: "rtl",
    textAlign: "right",
  },
  feedbackCard: { padding: 14 },
  feedbackText: {
    fontSize: 13,
    color: C.muted,
    lineHeight: 19,
    marginBottom: 12,
  },
  feedbackBtn: {
    backgroundColor: C.green,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  feedbackBtnTxt: {
    fontSize: 14,
    color: C.white,
    fontWeight: "600",
    textAlign: "center",
  },
  rowControl: {
    alignItems: "flex-end",
    justifyContent: "center",
    flexShrink: 0,
  },
  subheading: {
    fontSize: 13,
    fontWeight: "500",
    color: C.muted,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },

  divider: {
    height: 0.5,
    backgroundColor: "rgba(107,107,104,0.16)",
    marginHorizontal: 14,
  },

  // Pill selector
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    padding: 14,
    paddingTop: 8,
  },
  pillRowCompact: {
    flexWrap: "nowrap",
    padding: 0,
    gap: 4,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  pillActive: { backgroundColor: C.green, borderColor: C.green },
  pillTxt: { fontSize: 13, color: C.muted, fontWeight: "500" },
  pillCompact: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 14 },
  pillTxtCompact: { fontSize: 11 },
  pillTxtActive: { color: C.white },

  // Stepper
  stepperRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepperBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
  },
  stepperTxt: {
    fontSize: 18,
    color: C.green,
    fontWeight: "600",
    lineHeight: 22,
  },
  stepperVal: {
    fontSize: 16,
    fontWeight: "600",
    color: C.text,
    minWidth: 24,
    textAlign: "center",
  },

  // Mission rows
  missionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  missionEmoji: { fontSize: 26 },
  missionInfo: { flex: 1 },
  missionTitle: { fontSize: 13, fontWeight: "600", color: C.text },
  missionSub: { fontSize: 11, color: C.muted, marginTop: 1 },
  typePill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  typePillTxt: { fontSize: 11, fontWeight: "600" },

  // Buttons
  btnPrimary: {
    backgroundColor: C.green,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    flex: 1,
  },
  btnPrimaryTxt: { fontSize: 14, color: C.white, fontWeight: "600" },
  btnCancel: {
    backgroundColor: C.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    flex: 1,
  },
  btnCancelTxt: { fontSize: 14, color: C.muted, fontWeight: "500" },
  dangerBtn: {
    backgroundColor: C.redLt,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  dangerBtnTxt: { fontSize: 13, color: C.red, fontWeight: "600" },
  linkBtn: { paddingVertical: 4, paddingHorizontal: 10 },
  linkBtnTxt: { fontSize: 13, color: C.green, fontWeight: "500" },
  inlineAction: { padding: 14, alignItems: "center" },
  inlineActionTxt: { fontSize: 14, color: C.green, fontWeight: "500" },
  rowBtns: { flexDirection: "row", gap: 10, marginTop: 12 },

  // Edit block
  editBlock: { padding: 14 },
  editInput: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: C.text,
    backgroundColor: C.bg,
    marginBottom: 8,
  },
  editCostRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  scheduleItemWrap: { paddingHorizontal: 4, paddingVertical: 2 },
  scheduleMainRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  scheduleSubRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 8,
    gap: 10,
  },
  scheduleEmoji: { fontSize: 20, marginRight: 4 },
  scheduleLabel: { fontSize: 14, fontWeight: "500", color: C.text },
  scheduleSublabel: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
    lineHeight: 16,
  },
  scheduleLinkBtn: { paddingVertical: 3, paddingHorizontal: 8 },
  scheduleLinkBtnTxt: { fontSize: 13, color: C.green, fontWeight: "500" },
  scheduleDangerBtn: {
    backgroundColor: C.redLt,
    borderRadius: 9,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  scheduleDangerBtnTxt: { fontSize: 13, color: C.red, fontWeight: "600" },

  // Progress stats
  snapshotCard: {
    padding: 14,
    backgroundColor: "#FFFDF9",
  },
  snapshotHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  snapshotHeroText: { flex: 1 },
  snapshotBuddy: {
    width: 62,
    height: 62,
  },
  snapshotTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
    marginBottom: 4,
  },
  snapshotPrivacy: {
    fontSize: 11,
    color: C.muted,
    lineHeight: 16,
  },
  insightChips: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  insightChip: {
    flex: 1,
    backgroundColor: C.bg,
    borderWidth: 0.5,
    borderColor: "#DED8CE",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  insightChipLabel: {
    fontSize: 10,
    color: C.muted,
    fontWeight: "600",
  },
  insightChipValue: {
    fontSize: 12,
    color: C.text,
    fontWeight: "700",
    marginTop: 2,
  },
  snapshotRows: {
    borderTopWidth: 0.5,
    borderTopColor: "rgba(107,107,104,0.16)",
  },
  snapshotRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(107,107,104,0.16)",
    paddingVertical: 9,
  },
  snapshotLabel: {
    fontSize: 12,
    color: C.muted,
    flex: 1,
  },
  snapshotValue: {
    fontSize: 12,
    color: C.text,
    fontWeight: "600",
    textAlign: "right",
    flexShrink: 0,
    maxWidth: "58%",
  },
  snapshotLastWin: {
    backgroundColor: C.greenLt,
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  snapshotLastWinValue: {
    fontSize: 13,
    color: C.green,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 3,
  },
  usageCard: { padding: 14 },
  usageTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.text,
    marginBottom: 8,
  },
  usageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 7,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(107,107,104,0.16)",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#FFFDF9",
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "#DED8CE",
    padding: 14,
    alignItems: "center",
  },
  statEmoji: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: 26, fontWeight: "700", color: C.green },
  statLabel: {
    fontSize: 11,
    color: C.muted,
    marginTop: 2,
    textAlign: "center",
  },
  lastMissionLabel: {
    fontSize: 12,
    color: C.muted,
    marginBottom: 4,
    padding: 14,
    paddingBottom: 0,
  },
  lastMissionValue: {
    fontSize: 14,
    fontWeight: "500",
    color: C.text,
    padding: 14,
    paddingTop: 4,
  },
});
