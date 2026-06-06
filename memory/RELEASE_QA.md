# RealoKids Release QA

Use this before the first major update. The goal is not to find every possible
edge case; it is to catch anything that makes the app feel unfinished,
confusing, noisy, or risky on a real device.

## Automated Checks

Run before every release candidate:

```bash
npm ci
npm run verify
```

`npm run verify` checks locale coverage, app/package version alignment,
TypeScript, and lint.

## Android Device Smoke Test

- Fresh install opens without errors.
- Parent onboarding can be completed.
- Child onboarding feels polished: Buddy, tap/pet, first mission handoff.
- Main screen has no overlapping text, hidden buttons, or broken background.
- Language selector shows only the intended compact state.
- Settings open and close cleanly.
- Parent Zone requires PIN when PIN is enabled.
- Parent Zone add/edit/delete works for missions, rewards, schedule, routine,
  and child preferences.
- Image picker works for at least one mission and one schedule/routine item.
- Reset progress is PIN-protected when expected.

## Child Flow

- Pick mission.
- Complete mission.
- Mission done screen is scrollable on a small/short viewport.
- Back button is visible or reachable by touch, not only keyboard focus.
- Confetti appears only at intended milestones and does not repeat strangely.
- Progress bar shows available stars and speaks useful progress text.
- Rewards show correct locked/unlocked state.
- Redeeming a reward updates available stars.
- Before Reward mode works with 1, 2, and 3 missions.
- Before Reward final button says `Get your reward(s)`.

## Audio / TTS

- TTS on/off works.
- Repeated taps do not queue stale duplicate phrases.
- Buddy DJ mode is off by default and only playful where intended.
- Hebrew male/female speech is correct in rewards, progress, morning, mission
  done, and all-done rare praise.
- English joke puns display playfully but speak naturally.
- Breathing music starts, stops, and does not continue after leaving.
- Breathing guidance does not overlap badly with card speech.

## Visual Polish

- Doodle background appears after 20 lifetime stars when enabled.
- Doodle background does not cover buttons/text.
- Buddy protected area has no visible boundary line.
- Buddy is not crowded by other UI.
- Cards look calm, not overstimulating.
- No text clips inside buttons on a small Android screen.
- Hebrew/Russian text does not overflow compact controls.
- Breathing screen feels intentional in idle, active, and complete states.

## Store Candidate Decision

Ship the candidate only if:

- Automated checks pass.
- Android smoke test passes.
- No child-facing flow has blocked navigation.
- No parent flow can accidentally lose important settings.
- No known TTS/audio bug feels scary, loud, or chaotic by default.
