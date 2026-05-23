# SafeBuddy — PRD

## Problem statement
React Native / Expo companion app for autistic / ADHD kids. Core loop:
open → morning ritual → pick a mission → complete → earn stars → redeem rewards.
Bear character "Buddy" provides emotional continuity. Validated by a real child.

## User personas
- **Child (primary)** — autistic / ADHD, 6–10 y.o. Emotional, needs stability & short sessions.
- **Parent (secondary)** — configures missions, rewards, PIN, daily ritual.

## Core requirements (static)
- 10–30 min daily sessions; child never hits a "nothing left" wall.
- Emotional continuity through Buddy (9 moods); Russian TTS.
- Star economy preserved; no resets/dupes/losses.
- Surgical edits only; no new deps; respect `SAFEBUDDY_INSTRUCTIONS.md`.

## What's implemented (with dates)

### 2026-01 — Custom missions & rewards in Parent Zone
- `AppSettings` additions: `customMissions: PoolMission[]` and
  `customRewards: Reward[]` (defaults `[]`). Old saves inherit empty arrays via
  the existing `{ ...DEFAULT_SETTINGS, ...parsed }` merge in `loadSettings`.
- `ParentZoneView` in `_SettingsScreen.tsx` now renders a merged
  `missionPool = [...MISSION_POOL, ...customMissions]` and
  `rewardPool = [...REWARDS, ...customRewards]` so user-added items appear in
  both weekday/weekend mission cards and in the rewards card, with the same
  switches, star picker and cost stepper as built-ins.
- New inline "+ Добавить миссию" / "+ Добавить награду" actions, visually
  modelled on the day-schedule add UI (emoji + title + optional subtitle for
  missions; emoji + title for rewards). Limits: 20 custom missions, 20 custom
  rewards. Custom items get a small purple "Своя" pill + a ✕ delete button.
- New IDs start at `CUSTOM_ID_OFFSET = 10000` to avoid clashing with
  `MISSION_POOL` / `REWARDS`. Adding a mission also pushes a `rotating`
  `MissionConfig` into `settings.missions` so the daily picker treats it
  like any other rotating mission; adding a reward pushes a `RewardConfig`
  into `settings.rewards`.
- `index.tsx`: built `allMissionPool` and `allRewardPool` once at the top
  of the render pass; `activePool`, the Infinity-Loop `dayMissions`
  reconstruction, `effectiveRewards` and the DayScreen `onStartMission`
  lookup all now resolve against the merged pools so custom items flow
  through to the child experience automatically.
- No other behaviour changed; existing on/off switches, stars, cost stepper
  and migrations are untouched.

### 2026-04 — Infinity Loop for daily tasks
- **Daily picker** (`pickDailySubset`, `pickBonusMission` in `_constants.ts`):
  deterministic per YYYY-MM-DD, slot-diverse (1 morning + 1 afternoon + 1 evening
  then fill), stable all day, rotates naturally at midnight.
- `index.tsx`: new state `doneIdsToday` + storage key `sb_done_ids_today`
  (reset on new day, same trigger as `completed_today`). `dayMissions` now
  computed via Infinity Loop — permanents pinned first, rest filled from the
  daily picker up to `dailyPickerSize` (default 5).
- `MissionPickScreen` (`_MissionScreens.tsx`): marks completed missions with
  ✓ (still visible, not hidden → "stable for child"), shows per-slot
  `done/total` counter, renders **Encore card** when all of today's subset
  is done — gentle message "Ты сделал всё на сегодня! Завтра Бадди принесёт
  новые миссии" + optional **bonus mission** (1 pick from the leftover pool,
  deterministic per day).
- Settings (`_SettingsScreen.tsx`): new **"Бесконечный цикл"** card with
  on/off toggle, subset size selector (3/4/5/6), bonus-after-completion toggle.
  Previous "Ротация задач 🔜" placeholder retained (disabled) per request —
  will be built out alongside future mission additions.
- `AppSettings` additions: `infinityLoopEnabled: true`, `dailyPickerSize: 5`,
  `bonusAfterCompletion: true`. `loadSettings`'s `...DEFAULT_SETTINGS, ...parsed`
  merge ensures old installs inherit the new defaults.

## Prioritized backlog (from SAFEBUDDY_INSTRUCTIONS.md)
- **P0** Buddy celebration animation (bigger bounce + hold on confetti)
- **P1** Tiny facts JSON + delivery in ActiveScreen
- **P1** Breathing session screen
- **P2** Full rotation logic (weekly/every3/daily) wired to mission-count growth
- **P2** Expand `MISSION_POOL` beyond 22 so Infinity Loop has more breathing room

## Next tasks
1. Verify Infinity Loop manually on device (user will test).
2. Iterate on encore wording / Buddy mood for the "all done" state based on feedback.
3. Build out the deferred rotation UI once pool grows.
