# Visual Asset TODO

Use generated artwork as semantic micro-illustrations, not general decoration. Each screen should get at most one strong visual anchor plus small accents where they improve comprehension.

## Done / In Progress

- [x] Centralize generated artwork in `lib/visualAssets.ts`.
- [x] Parent onboarding: replace emoji-style parent/settings/breathing visuals with custom artwork.
- [x] Parent onboarding: add small concept art to the "How it works" sequence.
- [x] Settings screen: use parent-safe artwork for the child handoff and Parent Zone cards.

## Next Separate Slices

- [x] Child onboarding: use `buddyBubble` for Buddy's first speech/fact bubble.
- [ ] Child first mission flow: use `missionRocket` or `completeBadge` only when the child reaches the first mission step.
- [ ] Home screen: replace button emoji text with tiny left icons only if the layout stays calm on phone and tablet.
- [ ] Rewards screen: use `rewardGift` as an empty/intro anchor, not on every reward row.
- [ ] Breathing intro: consider `breathingBuddy` or `breathSwirl` only on the explanation/start state; keep the active breathing session quiet.
- [ ] Settings sub-screens: use `settingsSliders`, `sunrise`, and `schedule` as top-of-screen anchors only if the screen currently feels too dry.

## Guardrails

- Do not add animated or repeated background decorations.
- Avoid using multiple large illustrations on one screen.
- Prefer one semantic image per card/section over decorative corner art.
- Keep breathing and mission-completion screens visually quiet once the child is already engaged.
- Verify phone and tablet layouts after each slice.
