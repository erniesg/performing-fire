# Add an experiments index page

## Goal

Create a public index of the project's running experiments so the team can point collaborators at every study from one URL. New page `public/experiments/index.html` (new directory) lists each experiment with title, date, one-line summary, and link, driven by a data file `public/experiments/experiments.json` (new). Seed it with the two existing experiments: Flame Cloth v3 (served at `/`) and The Broadcast — Direction 5 (served at `/broadcast`). Link to the index from the footer of both existing pages.

## Acceptance tests

- New test `tests/experiments.test.mjs` (new file) asserts: `public/experiments/experiments.json` parses, every entry has non-empty `slug`, `title`, `date` (ISO 8601), `summary`, and `url`, slugs are unique, and the two seed entries above exist.
- `public/experiments/index.html` renders one card per JSON entry (test asserts the render wiring references the JSON by relative path) and matches the broadcast visual language (CRT/station styling, reduced-motion respected).
- Footers of `public/broadcast.html` and `public/index.html` link to `/experiments/` — asserted by test.
- `npm test` fully green.

## Validation command

```bash
npm test
```

## Allowed secrets

None.

## Artifact outputs

- New `public/experiments/index.html` and `public/experiments/experiments.json`
- New `tests/experiments.test.mjs`
- Updated footers in the two existing pages
- Screenshot evidence of the index at 1440x900

## Stop conditions

- Stop if the index would need a build step or remote data — it is a static page over a checked-in JSON file (a later issue may move this data into the shared CMS).
- Never modify `docs/` or `tmp/`.

## Human clarification protocol

Comment with the proposed card layout screenshot and one question; proceed with the JSON schema regardless.

## Recommended response

Approve the JSON-driven static index seeded with the two existing experiments.

## Trade-offs

A checked-in JSON keeps experiment curation in code review, which is right while the list is short; once non-developers need to add entries, the data moves to the shared Payload CMS alongside artist responses.

## Free-form response

Optional maintainer notes:
