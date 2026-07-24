# Wire the Voices channel to the berlayar Payload CMS for artist responses

depends-on: 002

## Goal

Give the Voices channel (CH 02) real persistence. Artist responses submitted through the existing offer form in `public/broadcast.html` are stored in the shared Payload CMS at `https://berlayar.ai/api/artist-responses` (collection added by a companion issue in the `erniesg/berlayar` repo), and published responses are fetched and rendered in the Voices channel. Team members moderate and edit responses in the Payload admin panel — the microsite itself needs no auth.

## Acceptance tests

- On channel load, the site issues `GET https://berlayar.ai/api/artist-responses?where[status][equals]=published&limit=100&depth=0` and renders name (or "anonymous"), discipline, language, and response text in the Voices channel, newest first. A new test `tests/responses.test.mjs` (new file) asserts the fetch wiring, the render container, and that no other remote hosts appear in the page.
- Submitting the form issues `POST https://berlayar.ai/api/artist-responses` with JSON `{name, discipline, response, language}` (language = current site locale), keeps the existing on-air confirm UX, and appends the new response locally in a "pending review" state.
- Failure handling is graceful and testable: on fetch/submit failure the channel shows the transmission-static fallback message (in the current locale) and the form queues the submission in `localStorage` for retry — never a blank channel, never a thrown uncaught error.
- Seeded fixture `public/fixtures/artist-responses.json` (new) drives the render when the API is unreachable, so the page works offline and in gallery installs.
- `npm test` fully green.

## Validation command

```bash
npm test
```

## Allowed secrets

None. The collection allows public create and published-only public read; moderation happens in the Payload admin, not from this site.

## Artifact outputs

- Updated `public/broadcast.html` (fetch, render, submit, fallback)
- New `public/fixtures/artist-responses.json`
- New `tests/responses.test.mjs`
- Evidence: screenshot of Voices rendering fetched responses against the live or staging API, or against the fixture with the fallback banner visible if the API is not yet deployed

## Stop conditions

- Stop and mark this issue blocked (comment with the failing URL and status code) if `GET https://berlayar.ai/api/artist-responses` and the staging equivalent both return 404 — the berlayar-side collection is not deployed yet; implement against the fixture, leave the remote wiring behind the existing code path, and hand back.
- Stop if any design would require embedding credentials, API keys, or admin URLs in the page.
- Do not implement client-side moderation or deletion.

## Human clarification protocol

Comment with the exact API request/response sample (sanitized) and a single question; continue with fixture-driven rendering while waiting.

## Recommended response

Approve fetch/render/submit against the shared CMS with fixture fallback; moderation stays in Payload admin.

## Trade-offs

Reusing berlayar's Payload means team editing comes for free in an existing admin panel, at the cost of a cross-repo dependency and CORS coupling to `berlayar.ai`. A repo-local Worker+KV store would remove the dependency but duplicate auth, admin UI, and hosting.

## Free-form response

Optional maintainer notes:
