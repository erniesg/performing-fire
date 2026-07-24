# Polish the Broadcast for touch and small screens

depends-on: 002

## Goal

The broadcast page was composed for desktop; art audiences will open it on phones. Make the scroll film and the interactive console genuinely good on small screens and touch: readable scene typography at 360–430px widths, scroll scenes that don't overflow horizontally, a monitor wall and channel dial that are comfortable touch targets, and hover-only affordances (wall preview clarify-on-hover, credits pause-on-hover) given touch equivalents. No behavior changes on desktop.

## Acceptance tests

- No horizontal scrolling at 360, 390, and 430 CSS-pixel widths: a new test `tests/mobile.test.mjs` (new file) statically asserts the media-query coverage exists (e.g. a `max-width` block adjusting `.film-wall`, `.wall`, `.dial`, and scene typography) and that every fixed-width value in the new CSS is fluid (`clamp`/`%`/`vw`) rather than px-constant above 320px.
- Touch affordances: wall previews clarify on first tap and tune on second tap (or an equivalent single-gesture pattern), credits roll gains a tap-to-pause toggle, and the film's SKIP INTRO link has a ≥ 44x44px hit area. Test asserts the wiring exists (`touchstart`/`pointerdown` handlers or `@media (hover: none)` CSS) without asserting exact UX.
- The scroll film respects `@media (hover: none) and (pointer: coarse)`: scene hints say TAP/스크롤 대신 탭 where appropriate.
- Screenshot evidence at 390x844 and 430x932 through the iframe harness (headless Chrome crops, not resizes, below 500px window widths — capture narrow viewports inside an iframe on a wider window), plus 1440x900 desktop before/after showing no regression.
- `npm test` fully green, including all existing scroll and i18n tests.

## Validation command

```bash
npm test
```

## Allowed secrets

None.

## Artifact outputs

- Updated `public/broadcast.html` (CSS + touch handlers)
- New `tests/mobile.test.mjs`
- New `tests/harness/narrow-viewport.html` (new directory) — the iframe capture harness
- Screenshot evidence via the evidence flow

## Stop conditions

- Stop if a touch pattern would require removing a desktop affordance rather than complementing it.
- Stop if honoring the size budget from the scroll-film issue (≤ 900 KB page + vendor) would be exceeded.
- Never modify `docs/` or `tmp/`.

## Human clarification protocol

Comment with a short screen recording or screenshot pair per contested interaction and one recommendation; continue with uncontested changes while waiting.

## Recommended response

Approve the tap-to-clarify/tap-to-tune wall pattern and fluid typography pass.

## Trade-offs

`@media (hover: none)` splits the stylesheet's interaction model in two, which costs some CSS complexity but avoids user-agent sniffing and keeps one HTML file.

## Free-form response

Optional maintainer notes:
