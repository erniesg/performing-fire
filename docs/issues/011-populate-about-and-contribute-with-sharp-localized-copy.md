# Populate About and Contribute with sharp localized copy

depends-on: 010

## Provider

vm-codex

## Goal

Populate CH 01 ABOUT and CH 02 CONTRIBUTE inside the new console using the checked-in `docs/Performing Fire Script.md` as the sole editorial source. Rewrite for a broadcast interface: short, concrete, unsentimental, and free of generic future-tech language. Preserve the project's actual argument—`Y = f(X) + ε`, prediction as an organizing operation, and the remainder as material for performance—without inventing claims or repeating the same status/channel labels in multiple places.

CH 01 should explain the work across a small set of navigable transmissions: the equation, what people bring as X, what the system maps as f(X), what remains as ε, and how a performer turns that remainder into light, particles, sound, glitch, and symbolic fire. CH 02 should clearly state what a visitor can contribute, what happens to it, consent/moderation expectations, and the existing response form states.

## Acceptance tests

- CH 01 and CH 02 each have an explicit finite transmission count reflected in the shared progress control.
- No headline uses “How will we greet new technology?”, “living totem of futures,” “signal live,” or similarly vague marketing copy.
- The equation is explained accurately and plainly. Suggested factual baseline: `X is what people bring. f(X) is the system's attempt to organize it. ε is what will not stay put.` The final copy may sharpen this but must not become longer or more abstract.
- The interface states the transformation accurately: audience traces are mapped; what resists the map becomes performance material; a performer changes it into light, particles, sound, glitch, and symbolic fire.
- CH 02 retains working Payload artist-response read/write behavior, offline fallback, consent, validation, pending/moderation, and private-mode resilience already covered by tests.
- Repeated channel/status text is removed. Each region has one job: preview identifies the channel, CRT header identifies the current channel/transmission, progress indicates depth.
- English copy is concise enough for the no-scroll console. Korean, Simplified Chinese, and Japanese contain every corresponding key and communicate the full meaning rather than leaving English fragments as a substitute.
- Machine-draft locale markers are removed only when the locale content in this scope has been reviewed for completeness; otherwise retain an honest review marker.
- Add/update copy and locale parity tests, including overflow-safe long translated strings.

## Validation command

```bash
npm test
scripts/agent-evidence
```

## Allowed secrets

None.

## Artifact outputs

- Updated CH 01/CH 02 console content and interaction states
- Complete EN/KO/ZH/JA dictionary entries for this scope
- Tests for copy exclusions, locale parity, and existing contribution behavior
- Evidence screenshots for CH 01 and CH 02 in English plus one CJK locale

## Stop conditions

- Use only the checked-in project script; do not ingest or quote private proposal files, personal bios, addresses, phone numbers, emails, budgets, partner contacts, or private correspondence.
- Do not invent dates, funders, technical capabilities, consent terms, or moderation promises.
- Do not change the live Payload collection schema or deploy.
- Do not modify `docs/design/`.

## Human clarification protocol

If a factual detail is missing from the checked-in script, omit it and flag the gap rather than importing personal proposal material.

## Recommended response

Use the equation as the spine of About and make Contribute operational: what to send, what happens next, and what the visitor consents to.

## Trade-offs

Short console transmissions carry less curatorial prose, but they make the core argument legible and leave long-form documentation for a later editorial surface.

## Free-form response

Optional maintainer notes:
