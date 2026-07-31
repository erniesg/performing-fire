# Rebuild the Broadcast as the approved five-channel console

## Provider

vm-codex

## Goal

Replace the current scroll-driven front sequence in `public/index.html` with one restrained, full-height broadcast console that preserves the established Performing Fire CRT language. Use `docs/superpowers/specs/2026-07-30-broadcast-console-redesign-progress.md` as the reviewed direction and the existing local animation implementations as the technical source of truth. The page must present five channel previews above one main CRT; selecting a preview changes the channel in the same console rather than navigating through a long page.

The hierarchy is deliberate: the main CRT remains animated, the selected preview is a static tuned frame, unselected previews are dimmed/softly blurred static frames, and only the preview under pointer/focus may wake into motion. Do not animate every surface at once.

## Acceptance tests

- The desktop experience fits within the available viewport without document-level vertical scrolling at the reference sizes used by the existing narrow-viewport harness and a 1728×1117 desktop viewport.
- The console keeps the live site's restrained width: about 1180px outer console and 1124px inner viewer at a 1728px viewport, with fluid reduction below that size. It must not stretch edge-to-edge.
- The five preview channels are `CH 01 ABOUT`, `CH 02 CONTRIBUTE`, `CH 03 EXPERIMENTS`, `CH 04 RESEARCH`, and `CH 05 LOG`.
- Preview renderers use the chosen local signal implementations: `g7` chromatic lock, `hj` chimera field, `x3` magnet breathe, `r1` punch data, and `l1` moon phases. Do not replace them with concentric-circle placeholders or CSS approximations.
- The main CRT is animated. The selected preview is a static representative frame. Unselected previews are static and softened; pointer hover and keyboard focus bring exactly that preview into focus and motion without changing the selected channel.
- Channel selection supports click/tap, `ArrowLeft`, and `ArrowRight`; the visible arrow controls live inside the main CRT and are not wrapped in extra button chrome.
- A compact `current / total` indicator and five-segment progress track communicate content depth inside the CRT.
- Channel changes use one short signal-native transition (brief tuning/glitch/focus settle), with no vertical fill, upward slide, or simultaneous page-wide motion.
- The language control remains a compact EN/한국어/中文/日本語 toggle and preserves the existing language-resolution contract.
- Existing functionality for artist responses, experiments, accessibility, and reduced motion is preserved.
- Add or update automated tests for the console structure, navigation, progress state, focus/hover state, no-scroll layout, and reduced-motion behavior.

## Validation command

```bash
npm test
scripts/agent-evidence
```

## Allowed secrets

None.

## Artifact outputs

- Updated `public/index.html` and only the minimum supporting public assets
- Updated/new console contract tests
- Evidence manifest plus desktop and narrow-viewport screenshots for default state, hover/focus state, and one non-default channel

## Stop conditions

- Do not modify, delete, or commit the user's untracked `docs/design/` directory.
- Do not deploy or change Cloudflare, DNS, Payload, authentication, billing, or infrastructure configuration.
- Do not replace the chosen signal implementations with newly invented visuals.
- Stop and report if a required renderer exists only in an untracked file and cannot be reconstructed safely from committed sources; do not fabricate a substitute.
- Never include proposal contacts, personal data, private correspondence, or credentials in code, evidence, issues, or PR text.

## Human clarification protocol

Proceed from the checked-in progress brief. Ask only if a required renderer is absent from all committed sources and faithful reconstruction is impossible.

## Recommended response

Preserve the broadcast console and reduce competing motion: animated main CRT, static tuned preview, hover/focus wake-up for one preview at a time.

## Trade-offs

The viewport composition prioritizes a coherent console over showing long-form copy all at once; content is divided into explicit transmissions within each channel.

## Free-form response

Optional maintainer notes:
