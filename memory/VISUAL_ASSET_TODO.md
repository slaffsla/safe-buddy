# Visual Asset Notes

Use generated artwork as semantic micro-illustrations, not decoration. The current
direction is warm, pastel, green-forward, and calm: closer to the parent onboarding
"Start together once" screen and mission cards than to generic emoji UI.

## Current State

- Generated assets are centralized in `lib/visualAssets.ts`.
- Parent onboarding has the strongest visual language right now:
  - "How it works" uses small custom concept cards.
  - "Make it fit your family" uses settings/family artwork.
  - "Start together once" is the clearest target style: colorful, friendly, and
    still calm.
  - Breathing explanation now includes the handpan cue.
- Child onboarding uses larger Buddy artwork from `assets/Character/` plus a
  speech bubble for the tiny bear fact.
- Settings uses softer custom artwork for the child handoff / first experience
  invitation and a small handpan image for breathing music.
- Breathing screen uses the handpan image as the music toggle affordance.

## Useful Next Slices

- Improve child onboarding visuals only where they support the emotional hook:
  Buddy, petting hearts, speech bubble, and the first-star handoff.
- Consider replacing remaining emoji-leading menu buttons with small custom icons
  only if the screen stays readable on phone, 7-inch tablet, and 10-inch tablet.
- Rewards screen can use `rewardGift` as an empty/intro anchor, not on every row.
- Mission-completion and active breathing screens should stay visually quiet once
  the child is engaged.
- Later: develop a more consistent in-app Buddy asset set, ideally matching the
  original Buddy colors/shape while adding a little more life.

## Guardrails

- One strong visual anchor per screen is usually enough.
- Avoid animated or repeated background decoration.
- Do not crowd functional screens with corner art.
- Prefer visual elements that explain the action: settings, rewards, schedule,
  breathing, mission, parent handoff.
- Verify phone and tablet layouts after each visual slice.
- When in doubt, ask first. Do not delete meaningful pieces of code before asking;
  the user may want to export them as a reusable module or template.
