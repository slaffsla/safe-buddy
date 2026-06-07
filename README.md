# RealoKids

RealoKids is an Expo/React Native app for helping children build small daily
habits with a calm Buddy character, missions, rewards, breathing, routines, and
parent-managed personalization.

The product direction is intentionally low-stimulation: supportive, playful,
and useful without turning habits into pressure or noise.

## Stack

- Expo SDK 56, React Native 0.85, React 19
- Expo Router
- TypeScript
- `i18n-js` locales: English, Russian, Hebrew
- AsyncStorage for local app state
- Expo Speech, Haptics, Audio, Image Picker

## Quick Start

```bash
npm install
npm run web
```

Useful scripts:

```bash
npm run start          # Expo dev server
npm run android        # Native Android dev build
npm run ios            # Native iOS dev build
npm run verify         # Locale checks, typecheck, lint
npm run verify:locales # Locale/version coverage only
```

Run `npm run verify` before handing off changes.

## Project Map

- `app/index.tsx` - main app state, navigation, TTS, mission completion flow
- `app/_MissionScreens.tsx` - mission picker, active mission, celebration,
  rewards
- `app/_SettingsScreen.tsx` - settings and PIN-guarded Parent Zone
- `app/_constants.ts` - built-in missions, rewards, schedule, age helpers,
  localized lookup helpers
- `locales/` - translated app copy
- `lib/childPreferences.ts` - parent-authored child loves/comforts
- `memory/RELEASE_QA.md` - manual release checklist

## Product Notes

- Parent Zone is for configuration, custom missions/rewards, child preferences,
  images, schedule, and routine setup.
- Child-facing flows should stay simple, warm, and scroll-safe on small screens.
- TTS should avoid queues/clipping by default. Playful overlapping audio belongs
  only where explicitly designed.
- Tiny facts are grouped internally so their serving chance can be tuned by age:
  mission facts, jokes, wonder facts, and Buddy wit.
- Gender-aware copy matters in Hebrew/Russian paths. Prefer `tGender` for UI and
  `tSpeak` for spoken strings when variants may exist.

## Releases

The app version must stay aligned across:

- `package.json`
- `package-lock.json`
- `app.json` `expo.version`
- `app.json` `expo.runtimeVersion`

`npm run verify:locales` checks this alignment.

EAS config:

```bash
eas build --profile preview --platform android
eas build --profile production --platform android
eas submit --profile production --platform android
```

GitLab CI currently runs:

```bash
npm ci
npm run verify
```

Before release, also run the manual checklist in `memory/RELEASE_QA.md`.

## Design Guardrails

- Keep Buddy visually protected and emotionally central.
- Avoid overstimulation: confetti, TTS, facts, and nudges should feel earned.
- Prefer compact, practical parent settings over exposing every internal knob.
- Add personalization only when it has a clear job: motivation, calming, or
  family fit.
