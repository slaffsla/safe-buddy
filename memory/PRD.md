# Realo Kids — PRD

## Product

React Native / Expo companion app for autistic and ADHD children. Core loop:
open app -> connect with Buddy -> pick a small real-world mission -> complete it
offline -> earn stars -> redeem parent-set rewards.

Buddy is the emotional continuity layer: gentle, predictable, and present without
turning the app into endless screen time.

## Users

- **Child** — ages roughly 5-10, autistic / ADHD, benefits from short sessions,
  stable flow, calm language, and visible progress.
- **Parent** — configures routines, day schedule, missions, rewards, language,
  TTS/music, and safety controls.

## Product Principles

- Real-world action over screen engagement.
- Calm defaults; no streak pressure, analytics, or data leaving the device.
- Parent can tune the app, but the child experience should work with defaults.
- Buddy should feel emotionally warm, never manipulative or parent-replacing.
- Small, surgical code changes are preferred over broad rewrites.
- When in doubt, ask first. Do not delete meaningful pieces of code before asking;
  the user may want to export them as a reusable module or template.

## Current V1 Scope

- Parent onboarding explains the app, encourages settings review, and then lands
  on the main screen with settings subtly highlighted.
- Parent can start the child first experience from Settings.
- Child onboarding is a Buddy bonding moment:
  - big Buddy
  - petting required before continuing
  - pronounced hearts while petting
  - a tiny fact bubble timed so most children see it
  - TTS sequencing that respects the app TTS toggle
  - optional name and age steps
- Main home screen shows Buddy, progress, schedule context, and entry points for:
  missions, day view, rewards, breathing, and parent settings.
- Morning routine, day schedule, missions, rewards, and settings are local-only
  and editable by the parent.
- Star economy persists locally and should never duplicate, reset unexpectedly,
  or lose earned progress.
- Breathing screen supports guided breathing with optional voice and original
  handpan music.
- Localization exists for English, Russian, and Hebrew.

## Current Visual Direction

- Warm pastel, child-friendly, green-forward UI.
- Best current reference inside the app: parent onboarding's "Start together
  once" screen and mission-style cards.
- Generated artwork should be semantic, sparse, and reusable through
  `lib/visualAssets.ts`.
- Buddy artwork should remain consistent with the in-app Buddy as much as
  possible; later asset work can improve Buddy's expressiveness without changing
  identity.

## Non-Goals For V1

- Cloud LLM chat.
- Cloud STT or child transcript upload.
- Analytics / tracking.
- Therapy or diagnosis claims.
- Complex gamification, streaks, leaderboards, or endless content feeds.

## Future Roadmap

### V2/V3 — Buddy Listens (local-only, constrained voice interaction)

Goal: give the child a feeling that Buddy can listen and respond without sending
child data off-device and without shipping open-ended cloud chat.

Safer target:
- Child taps/holds a Buddy-listen affordance.
- Speech is processed locally where feasible.
- App maps utterances to safe intents, for example:
  - "I'm sad / upset"
  - "I need help"
  - "I don't want to"
  - "I'm done"
  - "Again"
  - "Reward"
  - "Breathe"
  - "What now?"
- Buddy responds with short, prewritten local responses and offers one or two
  concrete next actions.
- Parent can disable the feature completely.

Hard constraints:
- No cloud STT, cloud LLM, analytics, or remote transcript storage.
- No secrecy, diagnosis, therapy claims, or emotional dependency framing.
- Buddy must not pretend to be a human, clinician, or parent replacement.
- Responses stay brief, predictable, multilingual, and aligned with missions,
  breathing, and rewards.

Main feasibility risks:
- Local speech quality for English / Russian / Hebrew.
- App size, battery, memory, latency, and Android device variability.

### Later — Parent Image Overrides

Let parents optionally attach local images to missions, schedule blocks, and
morning routine steps so family-specific activities can look familiar and less
emoji-like.

Implementation guardrails:
- Store only local image URIs / metadata in settings.
- Always keep the existing emoji/generated icon as fallback.
- If an image is missing, revoked, deleted, or fails to load, the app must keep
  working without user-visible breakage.
- Keep image picking/editing inside Parent Zone / Settings, never in the child
  flow.
- Avoid adding this until the current V1 visual system and settings editing are
  stable.

## Near-Term Work

- Keep polishing parent and child onboarding based on real-device testing.
- Watch first-user feedback closely around editing initial routines/rewards.
- Verify 7-inch and 10-inch tablet layouts before store-facing releases.
- Keep visual asset additions sparse and purposeful.
