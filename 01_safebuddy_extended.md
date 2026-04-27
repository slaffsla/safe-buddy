## ARCHITECTURE (DO NOT ALTER)

- `index.tsx` = orchestrator
- `_constants.ts` = pure (no React)
- `_SettingsScreen.tsx` owns its own storage
- AsyncStorage keys use `sb_*`
- Settings stored as single JSON blob

---

## BUDDY SYSTEM

States:
calm, gentle-reminder, serene, encouraging, thinking,
excited, happy, proud, very-excited (rare)

Rules:
- Use correct emotional state per context
- `celebrate` prop triggers bounce animation
- Ambient states use breathing loop

---

## MISSION SYSTEM

- Defined in `_constants.ts`
- Slots: morning / afternoon / evening / any

Rules:
- Completed missions are crossed out
- When exhausted:
  - show gentle message
  - suggest random mission

- `index.tsx` computes `dayMissions`

---

## MORNING ROUTINE

- Trigger: first open before 12:00
- Must use early return (NOT inline rendering)

On complete:
- award stars
- save date
- go to home

On skip:
- no penalty
- do not save date

---

## STAR ECONOMY (CRITICAL)

- Stars = only child currency
- Used for real-world rewards
- NEVER mix with other systems

Skins:
- Use `totalMissions`, NOT stars
- Unlock at 10 / 25 / 50

---

## UX RULES

- No punishment
- No urgency
- No negative feedback
- Always supportive tone

---

## COMMON PITFALLS (AVOID)

- Hooks outside components
- Breaking `App()` return
- Inline `showMorning` rendering
- AsyncStorage null handling
- Passing null to TTS
- Missing imports
- Variable name conflicts