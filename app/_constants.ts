// _constants.ts — SafeBuddy shared data, types, and pure helpers
// No React imports here — pure TS so any file can import safely.

// ── CHARACTER IMAGES ──────────────────────────────────────────────────────────

export const BUDDY = {
  calm:              require('../assets/Character/buddy-calm.png'),
  'gentle-reminder': require('../assets/Character/buddy-gentle-reminder.png'),
  serene:            require('../assets/Character/buddy-serene.png'),
  encouraging:       require('../assets/Character/buddy-encouraging.png'),
  thinking:          require('../assets/Character/buddy-thinking.png'),
  excited:           require('../assets/Character/buddy-excited.png'),
  happy:             require('../assets/Character/buddy-happy.png'),
  proud:             require('../assets/Character/buddy-proud.png'),
  'very-excited':    require('../assets/Character/buddy-very-excited.png'),
};

export const BUDDY_FIXED_SPACER = 280;
export const BUDDY_FIXED_TOP = 90;
export type BuddyMood = keyof typeof BUDDY;

// ── STORAGE KEYS ──────────────────────────────────────────────────────────────

export const K = {
  STARS:             'sb_stars_v2',
  TOTAL_EVER:        'sb_total_v2',
  COMPLETED_TODAY:   'sb_today_v2',
  LAST_DATE:         'sb_date_v2',
  DEMO_DONE:         'sb_demo_done',
  TOTAL_MISSIONS:    'sb_total_missions',
  CHILD_NAME:        'sb_child_name',
  LAST_MISSION:      'sb_last_mission',
  SKIP_COUNT:        'sb_skip_count',
  FIRST_REWARD:      'sb_first_reward',
  PARENT_PIN:        'sb_parent_pin',
  PIN_ENABLED:       'sb_pin_enabled',
  ONBOARDING_DONE:   'sb_onboarding_done',
  MORNING_DONE:      'sb_morning_done',    // ISO date of last completed morning routine
  DAY_MODE_OVERRIDE: 'sb_day_mode',        // 'weekday' | 'weekend' | '' (auto)
};

// ── MISSION TYPES ─────────────────────────────────────────────────────────────

export type MissionSlot     = 'morning' | 'afternoon' | 'evening' | 'any';
export type MissionCategory = 'movement' | 'selfcare' | 'tidy' | 'social' | 'calm';

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

// ── FULL MISSION POOL ─────────────────────────────────────────────────────────
// IDs match your son's lists: 1-5 easy, 7-12 bigger.

export const MISSION_POOL: PoolMission[] = [
  { id: 1,  title: 'Постой на одной ноге',              subtitle: 'Пять секунд',      stars: 1, emoji: '🦩', category: 'movement', slot: 'morning',   weekdayDefault: true,  weekendDefault: true  },
  { id: 2,  title: 'Потянись к пальцам ног',            subtitle: 'Медленно',          stars: 1, emoji: '🙆', category: 'movement', slot: 'morning',   weekdayDefault: true,  weekendDefault: true  },
  { id: 3,  title: 'Прыгни три раза',                   subtitle: 'Спокойно',          stars: 1, emoji: '🦘', category: 'movement', slot: 'afternoon', weekdayDefault: true,  weekendDefault: true  },
  { id: 4,  title: 'Выпей воду',                        subtitle: 'Медленно',          stars: 1, emoji: '💧', category: 'selfcare', slot: 'morning',   weekdayDefault: true,  weekendDefault: true  },
  { id: 5,  title: 'Побудь без телефона',               subtitle: 'Одна минута',       stars: 1, emoji: '📱', category: 'selfcare', slot: 'any',       weekdayDefault: true,  weekendDefault: true  },
  { id: 7,  title: 'Сожми кулачки',                     subtitle: 'Три секунды',       stars: 2, emoji: '✊', category: 'movement', slot: 'any',       weekdayDefault: true,  weekendDefault: true  },
  { id: 8,  title: 'Побудь без телефона',               subtitle: 'Две минуты',        stars: 2, emoji: '📱', category: 'selfcare', slot: 'any',       weekdayDefault: false, weekendDefault: true  },
  { id: 9,  title: 'Убери игрушки',                     subtitle: 'Один уголок',       stars: 2, emoji: '🧸', category: 'tidy',     slot: 'evening',   weekdayDefault: true,  weekendDefault: true  },
  { id: 10, title: 'Обними кого-нибудь',                subtitle: 'Тихо и спокойно',   stars: 2, emoji: '💛', category: 'social',   slot: 'any',       weekdayDefault: true,  weekendDefault: true  },
  { id: 11, title: 'Спроси папу или маму, чем помочь', subtitle: 'Небольшое дело',    stars: 2, emoji: '👨', category: 'social',   slot: 'afternoon', weekdayDefault: true,  weekendDefault: true  },
  { id: 12, title: 'Убери немного дома',                subtitle: 'Совсем чуть-чуть',  stars: 2, emoji: '🏠', category: 'tidy',     slot: 'evening',   weekdayDefault: false, weekendDefault: true  },
];

// Flat lists — backward-compatible with index.tsx inline arrays
export const MISSIONS_EASY   = MISSION_POOL.filter(m => m.stars === 1);
export const MISSIONS_BIGGER = MISSION_POOL.filter(m => m.stars === 2);

// Default ID selections by day type
export const DEFAULT_WEEKDAY_IDS = MISSION_POOL.filter(m => m.weekdayDefault).map(m => m.id);
export const DEFAULT_WEEKEND_IDS = MISSION_POOL.filter(m => m.weekendDefault).map(m => m.id);

// ── MORNING ROUTINE ───────────────────────────────────────────────────────────

export interface MorningStep {
  id: number;
  title: string;
  emoji: string;
}

export const DEFAULT_MORNING_STEPS: MorningStep[] = [
  { id: 1, title: 'Выпей стакан воды', emoji: '💧' },
  { id: 2, title: 'Оденься',           emoji: '👕' },
  { id: 3, title: 'Почисти зубы',      emoji: '🪥' },
];

export const MORNING_CUTOFF_HOUR = 12;

// ── OTHER DATA ────────────────────────────────────────────────────────────────

export const CONFETTI_AT = [1, 5, 10, 25, 50, 100];

export const DEMO_STEPS = [
  { id: 'd1', title: 'Хлопни в ладоши', emoji: '👏', praise: 'Получилось' },
  { id: 'd2', title: 'Прыгни один раз',  emoji: '🦘', praise: 'Хорошо' },
  { id: 'd3', title: 'Коснись носа',     emoji: '👃', praise: 'Отлично получилось' },
];

export const REWARDS = [
  { id: 1, title: 'Дополнительный мультик или видео', cost: 3, emoji: '📺' },
  { id: 2, title: 'Выбрать ужин',                    cost: 4, emoji: '🍕' },
  { id: 3, title: 'Лечь спать позже',                cost: 5, emoji: '🌙' },
  { id: 4, title: 'Любимый перекус',                 cost: 3, emoji: '🍭' },
  { id: 5, title: 'Игра с папой',                    cost: 2, emoji: '🎮' },
];

export const DAILY_SUGGESTIONS = [
  { text: 'Попробуй выпить воду',          missionId: 4  },
  { text: 'Скажи что-то хорошее кому-то', missionId: 10 },
  { text: 'Потянись немного',              missionId: 2  },
  { text: 'Прыгни немного',               missionId: 3  },
  { text: 'Убери один уголок',            missionId: 9  },
];

export const MSG = {
  idle:           'Я рядом',
  idle_alt:       'Нажми на меня',
  start:          'Давай вместе',
  done:           'Отлично получилось',
  reward:         'Смотри',
  encouraging:    'Попробуй ещё',
  thinking:       'Интересно...',
  serene:         'Всё хорошо',
  'very-excited': 'Это важно',
  morning:        'Доброе утро! Начнём день вместе?',
};

export const MILESTONES = [5, 10, 20, 35, 50, 75, 100, 150, 200];

// ── COLORS ────────────────────────────────────────────────────────────────────

export const C = {
  bg:      '#F7F6F2',
  white:   '#FFFFFF',
  green:   '#1D6B4F',
  greenLt: '#E1F5EE',
  text:    '#1A1A18',
  muted:   '#6B6B68',
  border:  '#E5E5E2',
  track:   '#D8D8D4',
  gold:    '#FFF8E7',
  goldBdr: '#F59E0B',
  reflect: '#F0F8F4',
  // Slot header colors for MissionPickScreen
  slotMorning:      '#FFF8E7',
  slotMorningBdr:   '#F59E0B',
  slotAfternoon:    '#E1F5EE',
  slotAfternoonBdr: '#1D9E75',
  slotEvening:      '#EEF2FF',
  slotEveningBdr:   '#818CF8',
};

// ── PURE HELPERS ──────────────────────────────────────────────────────────────

export const todayStr = () => new Date().toISOString().split('T')[0];

export function getProgress(total: number) {
  const next = MILESTONES.find(m => m > total) ?? MILESTONES[MILESTONES.length - 1] * 2;
  let prev = 0;
  for (const m of [0, ...MILESTONES]) { if (m <= total) prev = m; else break; }
  const pct = next === prev ? 1 : Math.min((total - prev) / (next - prev), 1);
  return { next, pct };
}

export const shouldShowConfetti = (n: number) => CONFETTI_AT.includes(n);

export function getDailySuggestion() {
  const dayOfYear = Math.floor(Date.now() / 86400000);
  return DAILY_SUGGESTIONS[dayOfYear % DAILY_SUGGESTIONS.length];
}

// True if today is Saturday or Sunday
export function isWeekend(): boolean {
  const d = new Date().getDay();
  return d === 0 || d === 6;
}

// Which time slot are we in right now
export function currentSlot(): 'morning' | 'afternoon' | 'evening' {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

// True if morning routine should fire: before noon AND not done today
export function shouldShowMorning(morningDoneDate: string): boolean {
  if (new Date().getHours() >= MORNING_CUTOFF_HOUR) return false;
  return morningDoneDate !== todayStr();
}

export function shouldBeVeryExcited(
  totalEver: number,
  prevTotalEver: number,
  isFirstReward: boolean
): boolean {
  if (isFirstReward) return true;
  if (prevTotalEver < 10 && totalEver >= 10) return true;
  const prevFifty = Math.floor(prevTotalEver / 50);
  const currFifty = Math.floor(totalEver / 50);
  if (currFifty > prevFifty && currFifty > 0) return true;
  return false;
}

export function getProgressionMessage(totalMissions: number, completedToday: number): string {
  if (totalMissions === 1) return 'Первая миссия';
  if (completedToday === 1) return 'Ты начал сегодня';
  if (completedToday === 2) return 'Две миссии сегодня';
  if (completedToday === 3) return 'Три миссии сегодня';
  if (completedToday >= 4) return 'Ты продолжаешь';
  if (totalMissions === 5) return 'Пять миссий всего';
  if (totalMissions === 10) return 'Десять миссий';
  return 'Я вижу твой прогресс';
}

export function getMilestoneMessage(totalEver: number): string {
  if (totalEver >= 10  && totalEver < 11)  return 'Десять звёзд! Ты сияешь!';
  if (totalEver >= 20  && totalEver < 22)  return 'Двадцать звёзд — ты растёшь каждый день';
  if (totalEver >= 50  && totalEver < 52)  return 'Пятьдесят звёзд! Бадди так тобой гордится!';
  if (totalEver >= 100 && totalEver < 102) return 'Сто звёзд. Ты настоящая звезда!';
  return `${totalEver} звёзд — и ты продолжаешь!`;
}

// Expo Router: suppress "missing default export" warning for non-route files
const PlaceholderComponent = () => null;
export default PlaceholderComponent;