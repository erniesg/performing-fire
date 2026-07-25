# Gate the flame-cloth camera behind a gesture and add a performance pass

depends-on: 002

## Goal

`public/experiments/flame-cloth/index.html` (the flame-cloth study, moved off the root) requests webcam access immediately on page load — visitors get a permission prompt before they understand what the page is, and browsers that deny leave the study half-dead. Gate the camera behind an explicit on-brand gesture ("TOUCH THE FIRE · 불을 만지기" button or equivalent), let the cloth simulation run beautifully without the camera until then, and take a performance pass: the WebGL loop should pause when the tab is hidden, and the page should stay responsive on battery-powered laptops.

## Acceptance tests

- No `getUserMedia` call happens before a user gesture: `tests/camera-gate.test.mjs` (new file) asserts the call site is inside a gesture handler and not in the load path, and that a visible enable control with bilingual label exists.
- Denied or unavailable camera keeps the cloth animating with a non-blocking status line (no full-screen error), asserted statically.
- The render loop pauses on `document.visibilitychange` (hidden → no rAF) — asserted by test on the wiring.
- With the camera never enabled, the page must not show the browser permission prompt — verified in the evidence screenshots/recording.
- All existing tests stay green (`npm test`), including the i18n string coverage for the new labels.

## Validation command

```bash
npm test
```

## Allowed secrets

None.

## Artifact outputs

- Updated `public/experiments/flame-cloth/index.html`
- New `tests/camera-gate.test.mjs`
- Before/after evidence of load without a permission prompt

## Stop conditions

- Stop if pausing/resuming would require restructuring the simulation beyond moving loop control — flag instead.
- Do not change the visual behavior once the camera IS enabled; hand-tracking interaction stays as-is.
- Never modify `docs/` or `tmp/`.

## Human clarification protocol

Comment with a screenshot of the proposed enable control and one recommendation; the visibility-pause work proceeds regardless.

## Recommended response

Approve the gesture gate and visibility pause.

## Trade-offs

An extra tap before hand-tracking is a small cost for not front-loading a permission prompt on the project's front door; galleries that want instant-on can preapprove camera permission at the browser level.

## Free-form response

Optional maintainer notes:
