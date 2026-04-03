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

export type BuddyMood = keyof typeof BUDDY;

// ── STORAGE KEYS ──────────────────────────────────────────────────────────────

export const K = {
  STARS:           'sb_stars_v2',
  TOTAL_EVER:      'sb_total_v2',
  COMPLETED_TODAY: 'sb_today_v2',
  LAST_DATE:       'sb_date_v2',
  DEMO_DONE:       'sb_demo_done',
  TOTAL_MISSIONS:  'sb_total_missions',
  CHILD_NAME:      'sb_child_name',
  LAST_MISSION:    'sb_last_mission',
  SKIP_COUNT:      'sb_skip_count',
  FIRST_REWARD:    'sb_first_reward',
  PARENT_PIN:      'sb_parent_pin',
  PIN_ENABLED:     'sb_pin_enabled',
  ONBOARDING_DONE: 'sb_onboarding_done',
};

// ── DATA ──────────────────────────────────────────────────────────────────────

export const CONFETTI_AT = [1, 5, 10, 25, 50, 100];

export const DEMO_STEPS = [
  { id: 'd1', title: 'Хлопни в ладоши', emoji: '👏', praise: 'Отлично!' },
  { id: 'd2', title: 'Прыгни!',          emoji: '🦘', praise: 'Супер!' },
  { id: 'd3', title: 'Коснись носа',     emoji: '👃', praise: 'Молодец!' },
];

export const MISSIONS_EASY = [
  { id: 1, title: 'Постой на одной ноге',   subtitle: 'Держись 5 секунд', stars: 1, emoji: '🦩' },
  { id: 2, title: 'Потянись к пальцам ног', subtitle: 'Медленно вниз',    stars: 1, emoji: '🙆' },
  { id: 3, title: 'Прыгни три раза',        subtitle: 'Как можно выше',   stars: 1, emoji: '🦘' },
  { id: 4, title: 'Выпей стакан воды',      subtitle: 'Не спеши',         stars: 1, emoji: '💧' },
];

export const MISSIONS_BIGGER = [
  { id: 5, title: 'Убери игрушки',      subtitle: 'Хотя бы один уголок', stars: 2, emoji: '🧸' },
  { id: 6, title: 'Обними кого-нибудь', subtitle: 'Подари тепло',        stars: 2, emoji: '💛' },
];

export const REWARDS = [
  { id: 1, title: 'Дополнительный мультик',      cost: 3, emoji: '📺' },
  { id: 2, title: 'Выбрать ужин сегодня',         cost: 4, emoji: '🍕' },
  { id: 3, title: 'Лечь спать на 30 минут позже', cost: 5, emoji: '🌙' },
  { id: 4, title: 'Любимый перекус',              cost: 3, emoji: '🍭' },
  { id: 5, title: 'Игра с папой',                 cost: 2, emoji: '🎮' },
];

export const DAILY_SUGGESTIONS = [
  { text: 'Попробуй сегодня выпить больше воды',       missionId: 4 },
  { text: 'Сделай что-то приятное для кого-то рядом',  missionId: 6 },
  { text: 'Потянись — твоё тело скажет спасибо',       missionId: 2 },
  { text: 'Прыгни немного — станет веселее',           missionId: 3 },
  { text: 'Убери один маленький уголок — сразу легче', missionId: 5 },
];

export const MSG = {
  idle:           'Привет! Нажми на меня',
  idle_alt:       'Я рядом',
  start:          'Давай вместе!',
  done:           'Молодец!',
  reward:         'Посмотри сколько всего!',
  encouraging:    'Ты можешь это сделать',
  thinking:       'Знаешь ли ты...',
  serene:         'Всё хорошо. Я рядом.',
  'very-excited': 'Невероятно!!!',
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
  if (totalMissions === 1) return 'Первая миссия! Ты начал!';
  if (completedToday === 1) return 'Сегодня ты уже начал — это главное';
  if (completedToday === 2) return 'Две миссии сегодня — ты становишься сильнее';
  if (completedToday === 3) return 'Три миссии! Бадди очень гордится тобой';
  if (completedToday >= 4) return 'Ты сегодня настоящий герой!';
  if (totalMissions === 5) return 'Пять миссий всего! Ты растёшь!';
  if (totalMissions === 10) return 'Десять миссий — ты уже совсем другой!';
  return 'Бадди видит как ты растёшь';
}

export function getMilestoneMessage(totalEver: number): string {
  if (totalEver >= 10  && totalEver < 11)  return 'Десять звёзд! Ты сияешь!';
  if (totalEver >= 20  && totalEver < 22)  return 'Двадцать звёзд — ты растёшь каждый день';
  if (totalEver >= 50  && totalEver < 52)  return 'Пятьдесят звёзд! Бадди так тобой гордится!';
  if (totalEver >= 100 && totalEver < 102) return 'Сто звёзд. Ты настоящая звезда!';
  return `${totalEver} звёзд — и ты продолжаешь!`;
}

// Expo Router: suppress "missing default export" warning for non-route files
export default {};
