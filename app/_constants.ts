// _constants.ts — SafeBuddy shared data, types, and pure helpers
// No React imports here — pure TS so any file can import safely.
//
// LOCALIZATION NOTE
// -----------------
// Mission titles, MSG phrases, DAILY_SUGGESTIONS texts and reward titles
// remain in Russian here as the **canonical source** (per i18n ticket).
// `locales/ru.json` mirrors these strings and `locales/en.json` (plus future
// locales) holds the translations. Helper functions in this file resolve
// to the active locale via i18n; the screens never see hardcoded Russian.

import { t } from "./i18n";

// ── CHARACTER IMAGES ──────────────────────────────────────────────────────────

export const BUDDY = {
  calm: require("../assets/Character/buddy-calm.png"),
  "gentle-reminder": require("../assets/Character/buddy-gentle-reminder.png"),
  serene: require("../assets/Character/buddy-serene.png"),
  encouraging: require("../assets/Character/buddy-encouraging.png"),
  thinking: require("../assets/Character/buddy-thinking.png"),
  excited: require("../assets/Character/buddy-excited.png"),
  happy: require("../assets/Character/buddy-happy.png"),
  proud: require("../assets/Character/buddy-proud.png"),
  "very-excited": require("../assets/Character/buddy-very-excited.png"),
} as const;

export const BUDDY_FIXED_SPACER = 280;
export const BUDDY_FIXED_TOP = 90;
export type BuddyMood = keyof typeof BUDDY;

// ── STORAGE KEYS ──────────────────────────────────────────────────────────────

export const K = {
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
  ONBOARDING_DONE: "sb_onboarding_done",
  MORNING_DONE: "sb_morning_done", // ISO date of last completed morning routine
  DAY_MODE_OVERRIDE: "sb_day_mode", // 'weekday' | 'weekend' | '' (auto)
  DONE_IDS_TODAY: "sb_done_ids_today", // JSON array of mission IDs completed today
  CHILD_AGE: "sb_child_age",
  MISSION_OVERRIDES: "sb_mission_overrides", // JSON map { [id]: MissionOverride }
  REWARD_OVERRIDES: "sb_reward_overrides", // JSON map { [id]: RewardOverride }
  SCHEDULE_ENABLED: "sb_schedule_enabled",
};

// ── AGE PROFILE ───────────────────────────────────────────────────────
export type AgeProfile = "little" | "middle" | "teen";

export interface ProfileConfig {
  buddySize: number;
  ttsEnabledByDefault: boolean;
  showBuddyName: boolean;
  celebrationIntensity: "full" | "subtle";
  colorTheme: "warm" | "cool";
}

export const PROFILE_CONFIGS: Record<AgeProfile, ProfileConfig> = {
  little: {
    buddySize: 140,
    ttsEnabledByDefault: true,
    showBuddyName: true,
    celebrationIntensity: "full",
    colorTheme: "warm",
  },
  middle: {
    buddySize: 120,
    ttsEnabledByDefault: true,
    showBuddyName: false,
    celebrationIntensity: "full",
    colorTheme: "warm",
  },
  teen: {
    buddySize: 100,
    ttsEnabledByDefault: false,
    showBuddyName: false,
    celebrationIntensity: "subtle",
    colorTheme: "cool",
  },
};

export function getAgeProfile(age: number): AgeProfile {
  if (age <= 7) return "little";
  if (age <= 11) return "middle";
  return "teen";
}

// ── MISSION TYPES ─────────────────────────────────────────────────────────────

export type MissionSlot = "morning" | "afternoon" | "evening" | "any";
export type MissionCategory =
  | "movement"
  | "selfcare"
  | "tidy"
  | "social"
  | "calm";

export interface PoolMission {
  id: number;
  title: string;
  subtitle: string;
  stars: 1 | 2;
  emoji: string;
  category: MissionCategory;
  slot: MissionSlot;
  weekdayDefault: boolean;
  weekendDefault: boolean;
}

export interface Reward {
  id: number;
  title: string;
  cost: number;
  emoji: string;
  maxPerDay?: number; // future-safe, unused
}

export interface DailySuggestion {
  text: string;
  missionId: number;
}

// ── FULL MISSION POOL ─────────────────────────────────────────────────────────
// IDs match son's lists: 1-5 easy, 7-12 bigger.

export const MISSION_POOL: PoolMission[] = [
  {
    id: 1,
    title: "Постой на одной ноге",
    subtitle: "Пять секунд",
    stars: 1,
    emoji: "🦩",
    category: "movement",
    slot: "morning",
    weekdayDefault: true,
    weekendDefault: true,
  },
  {
    id: 2,
    title: "Потянись к пальцам ног",
    subtitle: "Медленно",
    stars: 1,
    emoji: "🙆",
    category: "movement",
    slot: "morning",
    weekdayDefault: true,
    weekendDefault: true,
  },
  {
    id: 3,
    title: "Прыгни три раза",
    subtitle: "Спокойно",
    stars: 1,
    emoji: "🦘",
    category: "movement",
    slot: "afternoon",
    weekdayDefault: true,
    weekendDefault: true,
  },
  {
    id: 4,
    title: "Выпей воду",
    subtitle: "Медленно",
    stars: 1,
    emoji: "💧",
    category: "selfcare",
    slot: "morning",
    weekdayDefault: true,
    weekendDefault: true,
  },
  {
    id: 5,
    title: "Побудь без телефона",
    subtitle: "Одна минута",
    stars: 1,
    emoji: "📱",
    category: "selfcare",
    slot: "any",
    weekdayDefault: true,
    weekendDefault: true,
  },
  {
    id: 7,
    title: "Сожми кулак и разожми",
    subtitle: "Три секунды",
    stars: 2,
    emoji: "✊",
    category: "movement",
    slot: "any",
    weekdayDefault: true,
    weekendDefault: true,
  },
  {
    id: 8,
    title: "Побудь без телефона",
    subtitle: "Две минуты",
    stars: 2,
    emoji: "📱",
    category: "selfcare",
    slot: "any",
    weekdayDefault: false,
    weekendDefault: true,
  },
  {
    id: 9,
    title: "Убери игрушки",
    subtitle: "Один уголок",
    stars: 2,
    emoji: "🧸",
    category: "tidy",
    slot: "evening",
    weekdayDefault: true,
    weekendDefault: true,
  },
  {
    id: 10,
    title: "Обними кого-нибудь",
    subtitle: "Тихо и спокойно",
    stars: 2,
    emoji: "💛",
    category: "social",
    slot: "any",
    weekdayDefault: true,
    weekendDefault: true,
  },
  {
    id: 11,
    title: "Спроси папу или маму, чем помочь",
    subtitle: "Небольшое дело",
    stars: 2,
    emoji: "👨",
    category: "social",
    slot: "afternoon",
    weekdayDefault: true,
    weekendDefault: true,
  },
  {
    id: 12,
    title: "Убери немного дома",
    subtitle: "Самую малость",
    stars: 2,
    emoji: "🏠",
    category: "tidy",
    slot: "evening",
    weekdayDefault: false,
    weekendDefault: true,
  },
  // ── Movement (new) ──────────────────────────────────────────────────
  {
    id: 13,
    title: "Потряси руками",
    subtitle: "Десять секунд",
    stars: 1,
    emoji: "🙌",
    category: "movement",
    slot: "any",
    weekdayDefault: true,
    weekendDefault: true,
  },
  {
    id: 14,
    title: "Пройди по комнате",
    subtitle: "Туда и обратно",
    stars: 1,
    emoji: "🚶",
    category: "movement",
    slot: "afternoon",
    weekdayDefault: false,
    weekendDefault: true,
  },
  {
    id: 15,
    title: "Потянись вверх",
    subtitle: "Руки как можно выше",
    stars: 1,
    emoji: "🙋",
    category: "movement",
    slot: "morning",
    weekdayDefault: true,
    weekendDefault: true,
  },

  // ── Self-care (new) ──────────────────────────────────────────────────
  {
    id: 16,
    title: "Умойся",
    subtitle: "Холодной водой",
    stars: 1,
    emoji: "🚿",
    category: "selfcare",
    slot: "morning",
    weekdayDefault: true,
    weekendDefault: true,
  },
  {
    id: 17,
    title: "Три глубоких вдоха",
    subtitle: "Медленно и спокойно",
    stars: 1,
    emoji: "🌬️",
    category: "selfcare",
    slot: "any",
    weekdayDefault: true,
    weekendDefault: true,
  },
  {
    id: 18,
    title: "Выпей воду ещё раз",
    subtitle: "Второй стакан",
    stars: 1,
    emoji: "💦",
    category: "selfcare",
    slot: "afternoon",
    weekdayDefault: false,
    weekendDefault: true,
  },

  // ── Tidy (new) ───────────────────────────────────────────────────────
  {
    id: 19,
    title: "Застели кровать",
    subtitle: "Разгладь одеяло",
    stars: 2,
    emoji: "🛏️",
    category: "tidy",
    slot: "morning",
    weekdayDefault: true,
    weekendDefault: true,
  },
  {
    id: 20,
    title: "Убери тарелку",
    subtitle: "В раковину",
    stars: 1,
    emoji: "🍽️",
    category: "tidy",
    slot: "any",
    weekdayDefault: true,
    weekendDefault: true,
  },
  {
    id: 21,
    title: "Наведи порядок в одежде",
    subtitle: "Положи аккуратной стопкой",
    stars: 2,
    emoji: "👕",
    category: "tidy",
    slot: "evening",
    weekdayDefault: false,
    weekendDefault: true,
  },

  // ── Social (new) ─────────────────────────────────────────────────────
  {
    id: 22,
    title: "Скажи спасибо",
    subtitle: "Кому-нибудь сегодня",
    stars: 1,
    emoji: "🙏",
    category: "social",
    slot: "any",
    weekdayDefault: true,
    weekendDefault: true,
  },
  {
    id: 23,
    title: "Улыбнись кому-нибудь",
    subtitle: "Просто так",
    stars: 1,
    emoji: "😊",
    category: "social",
    slot: "any",
    weekdayDefault: false,
    weekendDefault: true,
  },
  {
    id: 24,
    title: "Расскажи что-то хорошее",
    subtitle: "Маме или папе",
    stars: 2,
    emoji: "💬",
    category: "social",
    slot: "evening",
    weekdayDefault: true,
    weekendDefault: true,
  },

  // ── Calm (new category) ──────────────────────────────────────────────
  {
    id: 25,
    title: "Посиди тихо",
    subtitle: "Одну минуту",
    stars: 1,
    emoji: "🧘",
    category: "calm",
    slot: "any",
    weekdayDefault: true,
    weekendDefault: true,
  },
  {
    id: 26,
    title: "Нарисуй что-нибудь",
    subtitle: "Что угодно",
    stars: 2,
    emoji: "🎨",
    category: "calm",
    slot: "afternoon",
    weekdayDefault: false,
    weekendDefault: true,
  },
  {
    id: 27,
    title: "Посмотри в окно",
    subtitle: "Одну минуту",
    stars: 1,
    emoji: "🪟",
    category: "calm",
    slot: "any",
    weekdayDefault: true,
    weekendDefault: true,
  },
];

// Returns localized title for a mission, falling back to pool title
export function getMissionTitle(id: number): string {
  const key = `missions.${id}.title`;
  const result = t(key);
  if (result === key) {
    return MISSION_POOL.find((m) => m.id === id)?.title ?? "";
  }
  return result;
}

// Returns localized subtitle for a mission, falling back to pool subtitle
export function getMissionSubtitle(id: number): string {
  const key = `missions.${id}.subtitle`;
  const result = t(key);
  if (result === key) {
    return MISSION_POOL.find((m) => m.id === id)?.subtitle ?? "";
  }
  return result;
}

// Derives the AppSettings missions array from MISSION_POOL.
// The first 6 original missions keep their proven types.
// All new missions default to 'rotating' so they appear in the daily picker.

export type MissionType = "permanent" | "rotating" | "inactive";

export interface MissionConfig {
  id: number;
  title: string;
  subtitle: string;
  stars: number;
  emoji: string;
  type: MissionType;
}

const LEGACY_TYPES: Record<number, MissionType> = {
  1: "permanent",
  2: "permanent",
  3: "rotating",
  4: "permanent",
  5: "rotating",
  6: "rotating",
  7: "rotating",
  8: "rotating",
  9: "rotating",
  10: "rotating",
  11: "rotating",
  12: "rotating",
};

export const DEFAULT_MISSION_CONFIGS: MissionConfig[] = MISSION_POOL.map(
  (m) => ({
    id: m.id,
    title: m.title,
    subtitle: m.subtitle,
    stars: m.stars,
    emoji: m.emoji,
    type: LEGACY_TYPES[m.id] ?? "rotating",
  }),
);

// Flat lists — backward-compatible with index.tsx inline arrays
export const MISSIONS_EASY = MISSION_POOL.filter((m) => m.stars === 1);
export const MISSIONS_BIGGER = MISSION_POOL.filter((m) => m.stars === 2);

// Default ID selections by day type
export const DEFAULT_WEEKDAY_IDS = MISSION_POOL.filter(
  (m) => m.weekdayDefault,
).map((m) => m.id);
export const DEFAULT_WEEKEND_IDS = MISSION_POOL.filter(
  (m) => m.weekendDefault,
).map((m) => m.id);

// ── PARENT ZONE OVERRIDES ─────────────────────────────────────────────────────
// Per-id parent overrides for mission enabled-state + stars and reward enabled + cost.
// When no override entry exists for an id, fall back to MISSION_POOL / REWARDS defaults.

export interface MissionOverride {
  enabledWeekday: boolean;
  enabledWeekend: boolean;
  stars: number; // 1 | 2 | 3
}

export interface RewardOverride {
  enabled: boolean;
  cost: number;
}

export type MissionOverrideMap = Record<number, MissionOverride>;
export type RewardOverrideMap = Record<number, RewardOverride>;

export function effectiveMissionStars(
  id: number,
  overrides: MissionOverrideMap,
): number {
  const o = overrides?.[id];
  if (o && typeof o.stars === "number") return o.stars;
  return MISSION_POOL.find((m) => m.id === id)?.stars ?? 1;
}

export function effectiveMissionEnabled(
  id: number,
  mode: "weekday" | "weekend",
  overrides: MissionOverrideMap,
): boolean {
  const o = overrides?.[id];
  if (o) return mode === "weekday" ? o.enabledWeekday : o.enabledWeekend;
  const m = MISSION_POOL.find((x) => x.id === id);
  return mode === "weekday" ? !!m?.weekdayDefault : !!m?.weekendDefault;
}

export function effectiveRewardCost(
  id: number,
  overrides: RewardOverrideMap,
): number {
  const o = overrides?.[id];
  if (o && typeof o.cost === "number") return o.cost;
  return REWARDS.find((r) => r.id === id)?.cost ?? 1;
}

export function effectiveRewardEnabled(
  id: number,
  overrides: RewardOverrideMap,
): boolean {
  const o = overrides?.[id];
  if (o) return o.enabled;
  return true;
}

// ── MORNING ROUTINE ───────────────────────────────────────────────────────────

export interface MorningStep {
  id: number;
  title: string;
  emoji: string;
}

export const DEFAULT_MORNING_STEPS: MorningStep[] = [
  { id: 1, title: "Выпей стакан воды", emoji: "💧" },
  { id: 2, title: "Оденься", emoji: "👕" },
  { id: 3, title: "Почисти зубы", emoji: "🪥" },
];

export const MORNING_CUTOFF_HOUR = 12;

// ── DAY SCHEDULE ──────────────────────────────────────────────────────────────
// "What's now" + "Next" support on HomeScreen (Option A) and full timeline
// (Option B). No stars, no economy. Past simply fades — never "missed".

export interface ScheduleBlock {
  id: number;
  title: string;
  emoji: string;
  startTime: string; // 'HH:MM' 24h
  endTime: string; // 'HH:MM'
  missionId?: number; // optional — tapping current block can launch this mission
  color?: string; // Option B timeline tint
  weekdays: boolean;
  weekends: boolean;
}

export const DEFAULT_SCHEDULE: ScheduleBlock[] = [
  {
    id: 1,
    title: "Просыпаемся",
    emoji: "☀️",
    startTime: "07:30",
    endTime: "08:00",
    weekdays: true,
    weekends: false,
    color: "#FFF8E7",
  },
  {
    id: 2,
    title: "Завтрак",
    emoji: "🥣",
    startTime: "08:00",
    endTime: "08:30",
    weekdays: true,
    weekends: true,
    color: "#FFF8E7",
  },
  {
    id: 3,
    title: "Собираемся",
    emoji: "🎒",
    startTime: "08:30",
    endTime: "09:00",
    weekdays: true,
    weekends: false,
    color: "#E1F5EE",
  },
  {
    id: 4,
    title: "Школа",
    emoji: "🏫",
    startTime: "09:00",
    endTime: "13:00",
    weekdays: true,
    weekends: false,
    color: "#E1F5EE",
  },
  {
    id: 5,
    title: "Обед",
    emoji: "🍜",
    startTime: "13:00",
    endTime: "13:30",
    weekdays: true,
    weekends: true,
    color: "#FFF8E7",
  },
  {
    id: 6,
    title: "Спокойное время",
    emoji: "🧸",
    startTime: "13:30",
    endTime: "14:00",
    weekdays: true,
    weekends: false,
    color: "#EEF2FF",
  },
  {
    id: 7,
    title: "Свободная игра",
    emoji: "🎨",
    startTime: "14:00",
    endTime: "15:00",
    weekdays: true,
    weekends: true,
    color: "#FFF8E7",
  },
  {
    id: 8,
    title: "Тихое время",
    emoji: "🧘",
    startTime: "15:00",
    endTime: "15:20",
    weekdays: true,
    weekends: true,
    color: "#EEF2FF",
  },
  {
    id: 9,
    title: "Перекус",
    emoji: "🍎",
    startTime: "15:30",
    endTime: "15:45",
    weekdays: true,
    weekends: true,
    color: "#FFF8E7",
  },
  {
    id: 10,
    title: "Прогулка",
    emoji: "🌳",
    startTime: "17:00",
    endTime: "17:45",
    weekdays: true,
    weekends: true,
    color: "#E1F5EE",
  },
  {
    id: 11,
    title: "Спокойная игра дома",
    emoji: "🧩",
    startTime: "18:00",
    endTime: "18:45",
    weekdays: true,
    weekends: true,
    color: "#FFF8E7",
  },
  {
    id: 12,
    title: "Ужин",
    emoji: "🍽️",
    startTime: "19:00",
    endTime: "19:30",
    weekdays: true,
    weekends: true,
    color: "#FFF8E7",
  },
  {
    id: 13,
    title: "Вместе с семьёй",
    emoji: "💛",
    startTime: "19:30",
    endTime: "20:00",
    weekdays: true,
    weekends: true,
    color: "#E1F5EE",
  },
  {
    id: 14,
    title: "Готовимся ко сну",
    emoji: "🛁",
    startTime: "20:00",
    endTime: "20:30",
    weekdays: true,
    weekends: true,
    color: "#EEF2FF",
  },
  {
    id: 15,
    title: "Время перед сном",
    emoji: "🌙",
    startTime: "20:30",
    endTime: "21:00",
    weekdays: true,
    weekends: true,
    color: "#EEF2FF",
  },
];

// Returns localized schedule block title, falling back to pool / override title
export function getScheduleTitle(id: number, fallback?: string): string {
  const key = `schedule_titles.s${id}`;
  const result = t(key);
  const poolFallback =
    fallback ?? DEFAULT_SCHEDULE.find((b) => b.id === id)?.title ?? "";
  if (result === key) return poolFallback;
  return result;
}

export const SCHEDULE_MAX_BLOCKS = 12;

function parseHM(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// The block currently active, or null between blocks
export function getCurrentBlock(
  blocks: ScheduleBlock[],
  isWeekendDay: boolean,
): ScheduleBlock | null {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  return (
    blocks.find((b) => {
      if (isWeekendDay ? !b.weekends : !b.weekdays) return false;
      return mins >= parseHM(b.startTime) && mins < parseHM(b.endTime);
    }) ?? null
  );
}

// The next upcoming block today, or null if none left
export function getNextBlock(
  blocks: ScheduleBlock[],
  isWeekendDay: boolean,
): ScheduleBlock | null {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const eligible = blocks
    .filter(
      (b) =>
        (isWeekendDay ? b.weekends : b.weekdays) && parseHM(b.startTime) > mins,
    )
    .sort((a, b) => parseHM(a.startTime) - parseHM(b.startTime));
  return eligible[0] ?? null;
}

// Classify a block relative to "now" (Option B timeline)
export type BlockStatus = "past" | "current" | "upcoming";
export function getBlockStatus(block: ScheduleBlock): BlockStatus {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const start = parseHM(block.startTime);
  const end = parseHM(block.endTime);
  if (mins < start) return "upcoming";
  if (mins >= end) return "past";
  return "current";
}

// ── OTHER DATA ────────────────────────────────────────────────────────────────

export const CONFETTI_AT: number[] = [1, 5, 10, 25, 50, 100];

export const DEMO_STEPS = [
  {
    id: "d1",
    title: "Хлопни в ладоши",
    emoji: "👏",
    praise: "Получилось",
    praiseKey: "demo.praise_1",
  },
  {
    id: "d2",
    title: "Прыгни один раз",
    emoji: "🦘",
    praise: "Хорошо",
    praiseKey: "demo.praise_2",
  },
  {
    id: "d3",
    title: "Коснись носа",
    emoji: "👃",
    praise: "Отлично получилось",
    praiseKey: "demo.praise_3",
  },
];

export const REWARDS: Reward[] = [
  { id: 1, title: "Дополнительный мультик или видео", cost: 3, emoji: "📺" },
  { id: 2, title: "Выбрать ужин", cost: 4, emoji: "🍕" },
  { id: 3, title: "Лечь спать позже", cost: 5, emoji: "🌙" },
  { id: 4, title: "Любимый перекус", cost: 3, emoji: "🍭" },
  { id: 5, title: "Игра с папой", cost: 2, emoji: "🎮" },
  { id: 6, title: "Выбрать мультфильм вечером", cost: 3, emoji: "🎬" },
  { id: 7, title: "Игра с мамой", cost: 2, emoji: "🎲" },
  { id: 8, title: "Лечь спать позже на пять минут", cost: 1, emoji: "⏰" },
  { id: 9, title: "Любимая музыка в машине", cost: 2, emoji: "🎵" },
  { id: 10, title: "Выбрать место для прогулки", cost: 4, emoji: "🌳" },
  { id: 11, title: "Читать вместе перед сном", cost: 2, emoji: "📖" },
  { id: 12, title: "Выбрать одежду на завтра", cost: 1, emoji: "👕" },
  { id: 13, title: "Приготовить что-нибудь вместе", cost: 4, emoji: "🧑‍🍳" },
  { id: 14, title: "Прыжки на батуте", cost: 3, emoji: "🦘" },
  { id: 15, title: "Остаться подольше в ванне", cost: 2, emoji: "🛁" },
];

// Returns localized reward title, falling back to pool / custom reward title
export function getRewardTitle(id: number, fallback?: string): string {
  const key = `reward_titles.r${id}`;
  const result = t(key);
  const poolFallback = fallback ?? REWARDS.find((r) => r.id === id)?.title ?? "";
  if (result === key) return poolFallback;
  return result;
}

export interface RewardConfig {
  id: number;
  title: string;
  cost: number;
  emoji: string;
  active: boolean;
}

export const DEFAULT_REWARD_CONFIGS: RewardConfig[] = REWARDS.map((r) => ({
  id: r.id,
  title: r.title,
  cost: r.cost,
  emoji: r.emoji,
  active: true,
}));

export const DAILY_SUGGESTIONS: DailySuggestion[] = [
  { text: "Попробуй выпить воду", missionId: 4 },
  { text: "Скажи что-то хорошее кому-то", missionId: 10 },
  { text: "Потянись немного", missionId: 2 },
  { text: "Прыгни немного", missionId: 3 },
  { text: "Убери один уголок", missionId: 9 },
  { text: "Попробуй посидеть тихо минуту", missionId: 25 },
  { text: "Застели кровать — сразу лучше", missionId: 19 },
  { text: "Скажи кому-то спасибо сегодня", missionId: 22 },
  { text: "Сделай глубокий вдох", missionId: 17 },
  { text: "Потянись вверх как можно выше", missionId: 15 },
];

export const MSG = {
  idle: "Я рядом",
  idle_alt: "Нажми на меня",
  start: "Давай вместе",
  done: "Отлично получилось",
  reward: "Смотри",
  encouraging: "Попробуй ещё",
  thinking: "Интересно...",
  serene: "Всё хорошо",
  "very-excited": "Это важно",
  morning: "Доброе утро! Начнём день вместе?",
} as const;

export type MsgKey = keyof typeof MSG;

export const MILESTONES = [5, 10, 20, 35, 50, 75, 100, 150, 200] as const;

// ── COLORS ────────────────────────────────────────────────────────────────────

export const C = {
  bg: "#FDFAF5",
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
  // Slot header colors for MissionPickScreen
  slotMorning: "#FFF8E7",
  slotMorningBdr: "#F59E0B",
  slotAfternoon: "#E1F5EE",
  slotAfternoonBdr: "#1D9E75",
  slotEvening: "#EEF2FF",
  slotEveningBdr: "#818CF8",
};

// ── PURE HELPERS ──────────────────────────────────────────────────────────────

export const todayStr = () => new Date().toISOString().split("T")[0];

export function getProgress(total: number) {
  const next =
    MILESTONES.find((m) => m > total) ?? MILESTONES[MILESTONES.length - 1] * 2;
  let prev = 0;
  for (const m of [0, ...MILESTONES]) {
    if (m <= total) prev = m;
    else break;
  }
  const pct = next === prev ? 1 : Math.min((total - prev) / (next - prev), 1);
  return { next, pct };
}

export const shouldShowConfetti = (n: number) => CONFETTI_AT.includes(n);

export function getDailySuggestion() {
  const dayOfYear = Math.floor(Date.now() / 86400000);
  const item = DAILY_SUGGESTIONS[dayOfYear % DAILY_SUGGESTIONS.length];
  // Localized text via daily suggestion index in locales/<lang>.json.
  // Falls back to the canonical Russian text if a key is missing.
  const index = (dayOfYear % DAILY_SUGGESTIONS.length) + 1;
  return { ...item, text: t(`dailySuggestions.${index}`) || item.text };
}

export function getBuddyImage(mood: BuddyMood) {
  return BUDDY[mood] ?? BUDDY.calm;
}

export function getBuddyLine(mood: BuddyMood): string {
  switch (mood) {
    case "calm":
      return t("buddy.idle");
    case "gentle-reminder":
      return t("buddy.idle_alt");
    case "serene":
      return t("buddy.serene");
    case "encouraging":
      return t("buddy.encouraging");
    case "thinking":
      return t("buddy.thinking");
    case "excited":
      return t("buddy.start");
    case "happy":
    case "proud":
      return t("buddy.done");
    case "very-excited":
      return t("buddy.very_excited");
    default:
      return t("buddy.idle");
  }
}

export function isAmbientMood(mood: BuddyMood): boolean {
  return mood === "calm" || mood === "gentle-reminder" || mood === "serene";
}

// ── DAILY MISSION SELECTION ────────────────────────────────────────────────────
// Deterministic daily picker that produces a stable, slot-diverse subset of missions.
// - Same date string → same selection all day
// - Different date → different shuffle (feels "alive" next day)
// - Ensures variety across morning/afternoon/evening slots before filling remaining spots

/**
 * Generates a deterministic 32-bit seed from a date string (YYYY-MM-DD format)
 * using the FNV-1a hash algorithm.
 */
function hashDateToSeed(dateStr: string): number {
  const FNV_PRIME = 16777619;
  const FNV_OFFSET_BASIS = 2166136261;

  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < dateStr.length; i++) {
    hash ^= dateStr.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0; // Ensure unsigned 32-bit integer
}

/**
 * Creates a seeded pseudo-random number generator using the Mulberry32 algorithm.
 * Returns a function that produces deterministic random values between 0 and 1.
 */
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return function random(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Selects a deterministic subset of missions for the given date.
 *
 * The selection algorithm:
 * 1. Shuffles the pool deterministically based on the date
 * 2. First pass: picks one mission from each time slot (morning/afternoon/evening)
 *    to ensure variety throughout the day
 * 3. Second pass: fills remaining slots from the shuffled pool
 *
 * @param pool - Available missions to choose from
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param size - Number of missions to select
 * @returns Selected subset of missions
 */
export function selectDailyMissions(
  pool: PoolMission[],
  dateStr: string,
  size: number,
): PoolMission[] {
  if (size <= 0 || pool.length === 0) return [];
  if (pool.length <= size) return pool.slice();

  const random = createSeededRandom(hashDateToSeed(dateStr));

  // Create a deterministic shuffle using Fisher-Yates algorithm
  const shuffled = pool.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const selected: PoolMission[] = [];
  const usedSlots = new Set<MissionSlot>();

  // First pass: ensure diversity by picking one from each time-bound slot
  const TIME_BOUND_SLOTS: MissionSlot[] = ["morning", "afternoon", "evening"];

  for (const mission of shuffled) {
    if (selected.length >= size) break;

    if (
      TIME_BOUND_SLOTS.includes(mission.slot) &&
      !usedSlots.has(mission.slot)
    ) {
      selected.push(mission);
      usedSlots.add(mission.slot);
    }
  }

  // Second pass: fill remaining slots from the shuffled pool
  for (const mission of shuffled) {
    if (selected.length >= size) break;
    if (!selected.includes(mission)) {
      selected.push(mission);
    }
  }

  return selected;
}

/**
 * Selects a bonus mission from the remaining pool (missions not in today's main selection).
 * Uses a shifted seed to ensure the bonus is different from today's picks but still
 * deterministic for the given date.
 *
 * @param leftover - Missions not included in the daily selection
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns A single bonus mission, or null if no leftovers available
 */
export function selectBonusMission(
  leftover: PoolMission[],
  dateStr: string,
): PoolMission | null {
  if (leftover.length === 0) return null;

  // XOR with golden ratio constant to shift the seed
  const BONUS_SEED_SHIFT = 0x9e3779b9;
  const random = createSeededRandom(hashDateToSeed(dateStr) ^ BONUS_SEED_SHIFT);

  const index = Math.floor(random() * leftover.length);
  return leftover[index] ?? null;
}

// True if today is Saturday or Sunday
export function isWeekend(): boolean {
  const d = new Date().getDay();
  return d === 0 || d === 6;
}

// Which time slot are we in right now
export function currentSlot(): "morning" | "afternoon" | "evening" {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

// True if morning routine should fire: before noon AND not done today
export function shouldShowMorning(morningDoneDate: string): boolean {
  if (new Date().getHours() >= MORNING_CUTOFF_HOUR) return false;
  return morningDoneDate !== todayStr();
}

export function shouldBeVeryExcited(
  totalEver: number,
  prevTotalEver: number,
  isFirstReward: boolean,
): boolean {
  if (isFirstReward) return true;
  if (prevTotalEver < 10 && totalEver >= 10) return true;
  const prevFifty = Math.floor(prevTotalEver / 50);
  const currFifty = Math.floor(totalEver / 50);
  if (currFifty > prevFifty && currFifty > 0) return true;
  return false;
}

export function getProgressionMessage(
  totalMissions: number,
  completedToday: number,
): string {
  if (totalMissions === 1) return t("progression.first_mission");
  if (completedToday === 1) return t("progression.started_today");
  if (completedToday === 2) return t("progression.two_today");
  if (completedToday === 3) return t("progression.three_today");
  if (completedToday >= 4) return t("progression.more_today");
  if (totalMissions === 5) return t("progression.five_total");
  if (totalMissions === 10) return t("progression.ten_total");
  return t("progression.default");
}

export function getMilestoneMessage(totalEver: number): string {
  if (totalEver >= 10 && totalEver < 11) return t("milestone.ten");
  if (totalEver >= 20 && totalEver < 22) return t("milestone.twenty");
  if (totalEver >= 50 && totalEver < 52) return t("milestone.fifty");
  if (totalEver >= 100 && totalEver < 102) return t("milestone.hundred");
  return t("milestone.default", { count: totalEver });
}

// Expo Router: suppress "missing default export" warning for non-route files
const PlaceholderComponent = () => null;
export default PlaceholderComponent;
