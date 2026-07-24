# Make the Broadcast a scroll-driven cinematic intro with pop visuals

## Goal

Elevate `public/broadcast.html` from a fixed six-channel monitor wall into a scroll-driven cinematic introduction to Performing Fire, keeping the Nam June Paik broadcast metaphor and the interactive channel dial. Use GSAP + ScrollTrigger (vendored locally) to choreograph a narrative: station ident → monitor-wall reveal → per-channel scenes (Signal, Voices, Program Guide, Scores) → static/credits. Make the visuals pop: CRT phosphor glow, per-channel color grading, animated static transitions between scenes, and NJP-style color-bar ident moments. The page must remain a dependency-free static file served from `public/`.

## Acceptance tests

- `npm test` passes with every existing assertion in `tests/site-contract.test.mjs` unchanged and green: `ON AIR` appears exactly once, the wordmark line `>PERFORMING FIRE 퍼포밍 파이어 — THE BROADCAST<` is stable, six focusable wall previews, `prefers-reduced-motion` support, and the flame cloth stays the root index.
- New contract tests (new file `tests/broadcast-scroll.test.mjs`) assert: GSAP and ScrollTrigger are vendored under `public/vendor/` (new directory) and referenced by relative paths; the page contains no `http(s)://` script or stylesheet URLs; at least four `data-scene` scroll scenes exist; a `prefers-reduced-motion` code path bypasses scroll-triggered tweens.
- File-size budget test: `public/broadcast.html` plus everything under `public/vendor/` totals ≤ 900 KB uncompressed.
- Before/after evidence: full-page screenshots of at least three scroll positions at 1440x900 and a narrow-viewport check at 390x844. Headless Chrome crops (not resizes) below 500px width, so capture narrow widths through an iframe harness page rather than a narrow window.
- Keyboard interaction still works: channel dial buttons and wall previews reachable by Tab, channel switch on Enter.

## Validation command

```bash
npm test
```

## Allowed secrets

None. This is repo-only static-page work.

## Artifact outputs

- Updated `public/broadcast.html`
- New `public/vendor/gsap.min.js` and `public/vendor/ScrollTrigger.min.js`
- New `tests/broadcast-scroll.test.mjs`
- Screenshot evidence via the evidence flow

## Stop conditions

- Stop if the design would require a runtime CDN, external font/service, or a build step — the site must stay static files in `public/`.
- Stop if keeping the existing test contract green would require changing the wordmark line or removing a channel; ask instead.
- Stop if the file-size budget cannot be met.
- Never modify `docs/` or `tmp/`; never commit binary media over 300 KB.

## Human clarification protocol

Comment on this issue with a numbered list of the specific scenes or effects in question, one screenshot per option where visual, and a single recommended choice. Continue working on unaffected scenes while waiting.

## Recommended response

Approve the vendored-GSAP scroll narrative; request changes only on scene order or effect intensity.

## Trade-offs

Scroll choreography adds roughly 120 KB of vendored JS and more DOM structure; in exchange, first-time visitors get a guided cinematic intro instead of a control panel they must discover. Vendoring beats a CDN for determinism, privacy, and offline gallery installs.

## Free-form response

Optional maintainer notes:
