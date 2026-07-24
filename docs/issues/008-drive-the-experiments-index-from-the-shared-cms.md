# Drive the experiments index from the shared CMS with static fallback

depends-on: 002

## Goal

The experiments index (`public/experiments/index.html`) renders from the checked-in `public/experiments/experiments.json`, so adding an experiment requires a PR. The shared CMS now has a live `experiments` collection (public read at `https://berlayar.ai/api/experiments`, localized title/summary, team-editable in the Payload admin). Make the index fetch published experiments from the CMS first and fall back to the checked-in JSON when the API is unreachable or returns zero docs — so non-developers can add experiments in the admin while the page keeps working offline.

## Acceptance tests

- On load the index requests `https://berlayar.ai/api/experiments?limit=100&sort=-date&depth=0` with the current site locale (`?locale=<en|ko|zh|ja>` when the i18n layer exposes one); on HTTP error, network failure, or an empty `docs` array it renders `public/experiments/experiments.json` exactly as today, and shows a small "LOCAL COPY · 로컬 사본" badge when doing so. `tests/experiments.test.mjs` is extended to assert the fetch wiring, the fallback order, the badge markup, and that no hosts other than `berlayar.ai` appear.
- CMS docs and JSON entries render through one shared card renderer — a doc with `title`, `slug`, `summary`, `url`, `date` produces the same card either way; the renderer uses `textContent` only (no innerHTML).
- The two seed experiments are added to the production CMS as published docs via the admin or REST by a human; evidence includes the API response actually rendering (screenshot or curl of the endpoint plus the page).
- `npm test` fully green.

## Validation command

```bash
npm test
```

## Allowed secrets

None. The experiments API is public-read; writes stay in the Payload admin.

## Artifact outputs

- Updated `public/experiments/index.html` and extended `tests/experiments.test.mjs`
- A note in the PR body listing the exact curl to verify the live API path

## Stop conditions

- Stop if `https://berlayar.ai/api/experiments` is unreachable at implementation time — build against the documented response shape with the fixture fallback and say so in the PR.
- Do not remove or stop maintaining `experiments.json` — it is the offline/gallery fallback.
- Never modify `docs/` or `tmp/`.

## Human clarification protocol

Comment with the ambiguity and a recommendation; the fallback path must land regardless.

## Recommended response

Approve CMS-first with JSON fallback and the visible LOCAL COPY badge.

## Trade-offs

Two data paths cost a little complexity but give team-editability without sacrificing the static-page guarantee; sorting/locale logic lives client-side to keep the page build-free.

## Free-form response

Optional maintainer notes:
