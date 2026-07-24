# Localize the site in English, Korean, Chinese, and Japanese

depends-on: 001

## Goal

Make the microsite readable in `en`, `ko`, `zh` (Simplified Chinese), and `ja`. Externalize the primary user-facing strings of `public/broadcast.html` and `public/index.html` into per-locale JSON dictionaries, add a visible language toggle (EN · 한국어 · 中文 · 日本語), and apply correct CJK typography. The artistic bilingual EN/KO flourishes that are part of the broadcast identity (e.g. the wordmark `PERFORMING FIRE 퍼포밍 파이어`) stay as-is and are exempt from externalization.

## Acceptance tests

- New `public/i18n/en.json`, `public/i18n/ko.json`, `public/i18n/zh.json`, `public/i18n/ja.json` (new directory) with byte-identical key sets — a new test `tests/i18n.test.mjs` (new file) parses all four and asserts key parity and non-empty values.
- Language resolution order is `?lang=` query param → `localStorage` → browser `navigator.language` → `en`; switching updates `document.documentElement.lang` and re-renders strings without a reload. Tests assert the resolver function and toggle markup exist in both pages.
- CJK typography: `word-break`/`line-break` rules applied for ko/zh/ja, and system font stacks cover Hangul, Han, and Kana (no webfont downloads). Test asserts the CSS rules exist.
- All existing tests stay green (`npm test`), including the stable-wordmark assertion.
- Evidence: screenshots of the broadcast page in all four locales at 1440x900.

## Validation command

```bash
npm test
```

## Allowed secrets

None.

## Artifact outputs

- New `public/i18n/*.json` (4 locale dictionaries)
- Updated `public/broadcast.html` and `public/index.html` (toggle + string hydration)
- New `tests/i18n.test.mjs`
- Four-locale screenshot evidence

## Stop conditions

- Stop if a translation would change the meaning of the artistic statement (the script in `docs/Performing Fire Script.md` is the source of tone) — flag the specific string instead of improvising.
- Stop if externalization would break the existing test contract (wordmark line must stay literal).
- Machine-translate first drafts are acceptable, but mark ko/zh/ja dictionaries with a `"_review": "machine-draft"` key so human native review is tracked; do not remove that marker yourself.

## Human clarification protocol

Comment listing the ambiguous strings with the proposed rendering in each of the four locales in a table, and a recommended default. Continue with unambiguous strings while waiting.

## Recommended response

Approve the dictionary structure and toggle; native speakers on the team review the `_review`-marked dictionaries in a follow-up edit.

## Trade-offs

Client-side dictionaries keep the site a static page (no build step, no server) at the cost of a small flash of default-language content on first paint; pre-rendering four page variants would avoid that but adds a build pipeline this repo deliberately avoids.

## Free-form response

Optional maintainer notes:
