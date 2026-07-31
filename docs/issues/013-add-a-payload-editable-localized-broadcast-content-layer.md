# Add a Payload-editable localized broadcast content layer

depends-on: 012

## Provider

vm-codex

## Goal

Make the five broadcast channels ready to receive editable content from Payload CMS without making the public site depend on an endpoint that does not yet exist. Today, main broadcast copy is bundled in `public/i18n/{en,ko,zh,ja}.json`; only artist responses and experiments are already CMS-backed. Add a small, tested content adapter and a precise integration contract for a localized Payload Global or singleton collection. The checked-in localized content remains the complete offline/gallery fallback.

The client should request the selected locale, validate and normalize the response, merge only allowed presentation fields over the bundled fallback, and re-render the current channel without a page reload when the language toggle changes. Unsafe HTML, arbitrary URLs, renderer code, layout values, and executable configuration must never be accepted from CMS content.

## Acceptance tests

- A documented Payload content contract covers the five channels, their ordered transmissions, localized headings/body/labels, optional internal links, publication status, and updated timestamp.
- The frontend has one configurable same-origin or approved `https://berlayar.ai` endpoint for broadcast content and forwards `locale=en|ko|zh|ja`.
- `?lang` takes precedence, then a user's explicit persisted choice, then `navigator.language`, then English. A first visit therefore follows the browser; a later explicit toggle wins.
- Switching the language toggle refetches/reselects CMS content for that locale without a full reload and keeps the same channel/transmission where possible.
- Missing endpoint, timeout, non-2xx response, empty result, malformed JSON, missing fields, or unsupported locale falls back to the complete checked-in dictionary with no blank CRT.
- CMS data is treated as text. Rich text is converted through an allowlisted renderer or rejected; direct `innerHTML` assignment from remote content is prohibited.
- Structural/visual configuration remains code-owned: renderer keys, animation parameters, layout, progress behavior, contribution endpoints, and consent mechanics cannot be changed through copy payloads.
- Existing artist-response and experiments CMS behavior continues to pass its tests.
- Documentation states clearly that the backend Payload schema must be added in the `erniesg/berlayar` CMS repository before editors will see these fields in the admin UI.

## Validation command

```bash
npm test
scripts/agent-evidence
```

## Allowed secrets

None. The public read endpoint must not require a token in browser code.

## Artifact outputs

- Broadcast content adapter and fallback wiring
- Automated success/fallback/locale/security tests
- Payload schema/API contract documentation for the `erniesg/berlayar` follow-up
- Evidence showing CMS-shaped fixture content and forced offline fallback render identically in structure

## Stop conditions

- Do not add a fake live endpoint or claim the Payload admin is ready when the server schema is absent.
- Do not add Payload admin credentials, API keys, cookies, personal proposal data, or private content to this repository, fixtures, logs, evidence, issue comments, or PRs.
- Do not weaken Content Security Policy or accept arbitrary HTML/script/style from the CMS.
- Do not modify `docs/design/`, deploy, or write to the live CMS.

## Human clarification protocol

The frontend adapter and documented schema proceed without blocking. If the live backend endpoint is absent, keep fallback active and record the exact `erniesg/berlayar` follow-up rather than inventing server behavior.

## Recommended response

Use Payload for localized editorial content, but keep renderer/layout behavior versioned in code and retain complete static fallbacks for gallery reliability.

## Trade-offs

Editors gain control of copy after the backend schema lands; code remains the source of truth for motion and interaction, preventing a CMS edit from breaking the broadcast.

## Free-form response

Optional maintainer notes:
