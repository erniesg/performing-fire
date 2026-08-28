# Integrated Research and Experiments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate a rights-aware research snapshot and Scores strand into the existing five-channel broadcast, rewrite the console as one coherent artist statement, and expose a truthful Fabric v0/v1/2.0 experiment lineage.

**Architecture:** A small public presentation manifest contains verified counts and representative metadata-only records. A standalone renderer validates that manifest, builds cards with text-only DOM APIs, and owns an accessible inline reader; the broadcast remains the visual shell and transmission router. The experiments index gains a static lineage layer that remains present regardless of its CMS-first feed.

**Tech Stack:** Static HTML/CSS/JavaScript, JSON presentation manifest, Node.js built-in test runner, `node:vm` contract tests.

**Spec:** `docs/superpowers/specs/2026-08-28-integrated-research-experiments.md`

## Global Constraints

- Preserve the five-channel CRT console and its fixed-viewport behavior.
- Use the approved editorial argument and exact Fabric taxonomy in `PRODUCT.md` and the spec.
- Fabric v0 is the preserved checkpoint state at `34d94eb`; Fabric v1 contains everything added afterward, including audio routing, expanded controls, explode, dissolve, glitter, and glitch.
- Fabric 2.0 is an unscoped future slot. It must be visibly `NOT YET DEFINED`, must claim no behaviour, and must not link to a nonexistent implementation.
- Research samples are metadata and source links only unless the manifest explicitly permits more.
- Keep historic score candidates separate from future Performing Fire-generated scores; use `collection record verified · score candidate` until text is human-confirmed.
- Do not sum overlapping archive categories.
- Do not modify `public/experiments/fabric-v1/index.html`, `public/experiments/fabric-v1/audio-engine.mjs`, or `tests/fabric-v1.test.mjs`.
- Do not copy corpus raw media, OCR, ASR, SRT, PDF content, or downloaded assets into this repository.
- Keep `public/js/broadcast-content.js` copy-only and its remote trust boundary unchanged.
- Keep all four locale dictionaries on byte-identical key sets; KO/ZH/JA remain `_review: machine-draft`.
- Build untrusted record content with `textContent`; allow only same-origin paths or `https:` source URLs.
- Preserve reduced motion, keyboard controls, safe links, and the 900 KB broadcast payload contract.
- Stage and commit only files owned by the current task; unrelated dirty files belong to another workstream.

---

### Task 1: Rights-aware research presentation manifest and renderer

**Files:**
- Create: `public/research/archive-snapshot.json`
- Create: `public/js/research-gallery.js`
- Create: `tests/research-gallery.test.mjs`

**Interfaces:**
- Produces: `window.PF_RESEARCH_GALLERY` with `normalize(payload)`, `safeUrl(value)`, and `init()`.
- Produces: normalized `{ meta, counts, samples, scores }` data. Sample records contain `id`, `group`, `source`, `kind`, `title`, `sourceUrl`, `status`, and `note` strings.
- Consumes later: DOM placeholders `[data-research-counts]`, `[data-research-group]`, `[data-research-scores]`, `#researchReader`, and reader field IDs created by Task 4.

- [ ] **Step 1: Write failing manifest and renderer contract tests**

Add tests that require:

```js
assert.equal(snapshot.counts.find(item => item.id === 'antiegg-posts').count, 1463)
assert.equal(snapshot.counts.find(item => item.id === 'njpvideo-catalogue').count, 678)
assert.equal(snapshot.counts.find(item => item.id === 'njpvideo-video').count, 401)
assert.equal(snapshot.counts.find(item => item.id === 'njpvideo-image').count, 205)
assert.equal(snapshot.counts.find(item => item.id === 'njpvideo-pdf').count, 72)
assert.equal(snapshot.counts.find(item => item.id === 'njpvideo-srt').count, 38)
assert.equal(snapshot.counts.find(item => item.id === 'videoarchive-pdf').count, 8)
assert.equal(snapshot.counts.find(item => item.id === 'njp-youtube').count, 156)
assert.equal(snapshot.samples.length, 10)
assert.ok(snapshot.scores.some(item => item.catalogueId === '570'))
```

Also require unique IDs, `YYYY-MM-DD` observation dates, `https:` source URLs, the exact score status `collection record verified · score candidate`, no summed-total field, and a renderer source that uses `textContent` rather than `innerHTML`.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests/research-gallery.test.mjs`

Expected: FAIL because the manifest and renderer do not exist.

- [ ] **Step 3: Add the verified manifest**

Encode the counts, ten samples, and score candidates from the spec. Use groups `a`, `b`, `c`, and `d` matching the four sample transmissions. Keep the two observation dates in `meta.observed` and include an explicit overlap note instead of a total.

- [ ] **Step 4: Implement the defensive renderer**

`normalize(payload)` must reject malformed arrays and incomplete records. `safeUrl(value)` must return an empty string for `javascript:`, `data:`, protocol-relative, non-HTTPS remote, or malformed URLs. `init()` must fetch `/research/archive-snapshot.json`, render counts, score cards, and grouped sample buttons, show `[data-research-error]` on failure, and wire the inline reader. The reader must use `textContent`, restore focus on close, and close on Escape.

- [ ] **Step 5: Run focused tests**

Run: `node --test tests/research-gallery.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit only Task 1 files**

```bash
git add public/research/archive-snapshot.json public/js/research-gallery.js tests/research-gallery.test.mjs
git commit -m "feat: add rights-aware research snapshot"
```

### Task 2: Whole-site editorial and interface localization

**Files:**
- Modify: `public/i18n/en.json`
- Modify: `public/i18n/ko.json`
- Modify: `public/i18n/zh.json`
- Modify: `public/i18n/ja.json`
- Modify: `tests/i18n.test.mjs`

**Interfaces:**
- Produces: localized keys consumed by Tasks 3 and 4.
- Preserves: every locale has the identical sorted key set.

- [ ] **Step 1: Add failing editorial contract tests**

Require these English source-copy distinctions:

```js
assert.match(dicts.en['bc.about.1.body'], /make, use, and depend on.*never fully control/i)
assert.match(dicts.en['bc.about.4.body'], /scores turn ideas into instructions, actions, and situations/i)
assert.match(dicts.en['bc.experiments.fabricV0.detail'], /checkpoint/i)
assert.match(dicts.en['bc.experiments.fabricV1.detail'], /Bass.*Body.*Treble.*Hits.*explode.*dissolve.*glitter.*glitch/i)
assert.equal(dicts.en['bc.experiments.fabric2.detail'], 'Reserved for the next Fabric experiment. Its behaviour is not defined yet.')
assert.equal(dicts.en['bc.experiments.fabric2.status'], 'NOT YET DEFINED')
assert.match(dicts.en['bc.research.scores.body'], /collection record.*score text/i)
assert.match(dicts.en['bc.log.1.body'], /what was tested, what failed, and what changed/i)
```

Keep the existing key-set, non-empty-string, and machine-draft marker tests.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests/i18n.test.mjs`

Expected: FAIL on missing/old editorial keys.

- [ ] **Step 3: Rewrite the English five-channel narrative**

Use the five About movements, contribution boundary, two Experiments transmissions, seven Research transmissions, and five decision-log movements from the spec. Add UI keys for counts, sample-card actions, reader labels, error/fallback state, score statuses, and Fabric v0/v1/2.0 lineage.

- [ ] **Step 4: Add semantically equivalent KO/ZH/JA machine drafts**

Translate every new or changed string without changing proper names, equations, URLs, version numbers, count values, or evidence statuses. Keep `_review` as `machine-draft` in KO/ZH/JA and `source-reviewed` in EN.

- [ ] **Step 5: Run focused tests**

Run: `node --test tests/i18n.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit only Task 2 files**

```bash
git add public/i18n/en.json public/i18n/ko.json public/i18n/zh.json public/i18n/ja.json tests/i18n.test.mjs
git commit -m "copy: unify the site artist statement"
```

### Task 3: Durable experiment lineage on the experiments index

**Files:**
- Modify: `public/experiments/index.html`
- Modify: `tests/experiments.test.mjs`

**Interfaces:**
- Consumes: localized `exp.lineage.*` keys from Task 2.
- Produces: static `.fabric-lineage` with `[data-version="v0"]`, `[data-version="v1"]`, and `[data-version="2.0"]` cards.
- Preserves: the CMS-first wall and one-card local JSON fallback.

- [ ] **Step 1: Replace the old two-study expectation with a failing lineage contract**

Require v0 to link `/experiments/fabric/` and identify the checkpoint state, v1 to link `/experiments/fabric-v1/` and own the later audio/transformation additions, 2.0 to contain localized `NOT YET DEFINED` status and no anchor, and the Microsite to remain linked at `/experiments/microsite/`. Keep the CMS/fallback tests unchanged.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests/experiments.test.mjs`

Expected: FAIL because the lineage is absent.

- [ ] **Step 3: Implement the static lineage**

Replace the single generic Fabric inquiry with a three-card version sequence. The visible English fallback must distinguish the v0 checkpoint, the v1 audio/transformation additions, and the undefined 2.0 future slot exactly as the spec does. Use real links only for v0 and v1. Keep Fabric 2.0 as an `<article>` with the explicit status and no `href`.

- [ ] **Step 4: Preserve and reposition the Microsite study**

Keep the visual-language narrative and `/experiments/microsite/` link after the Fabric lineage. Do not change the CMS renderer or `experiments.json`.

- [ ] **Step 5: Run focused tests**

Run: `node --test tests/experiments.test.mjs tests/i18n.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit only Task 3 files**

```bash
git add public/experiments/index.html tests/experiments.test.mjs
git commit -m "feat: show the Fabric experiment lineage"
```

### Task 4: Integrate the narrative, experiment lineage, archive, Scores, and reader into the broadcast

**Files:**
- Modify: `public/broadcast/index.html`
- Modify: `tests/site-contract.test.mjs`
- Modify: `tests/mobile.test.mjs`

**Interfaces:**
- Consumes: `window.PF_RESEARCH_GALLERY` and the manifest from Task 1.
- Consumes: localized `bc.*` keys from Task 2.
- Produces: CH03 with two transmissions and CH04 with seven transmissions plus the inline reader DOM.

- [ ] **Step 1: Add failing broadcast structure tests**

Require:

```js
assert.match(broadcast, /data-study="fabric-v0"[\s\S]*?href="\/experiments\/fabric\/"/)
assert.match(broadcast, /data-study="fabric-v1"[\s\S]*?href="\/experiments\/fabric-v1\/"/)
assert.match(broadcast, /data-study="fabric-2"[\s\S]*?bc\.experiments\.fabric2\.status/)
assert.doesNotMatch(fabric2Markup, /href=/)
assert.match(broadcast, /id="researchReader"[\s\S]*?role="dialog"/)
assert.match(broadcast, /data-research-counts/)
assert.equal((broadcast.match(/data-research-group="[a-d]"/g) ?? []).length, 4)
assert.match(broadcast, /signal: "x3"[\s\S]*?count: 2/)
assert.match(broadcast, /signal: "r1"[\s\S]*?count: 7/)
```

Extend the narrow-layout test so research grids and the reader have compact responsive rules while the page remains fixed and page-level overflow stays hidden.

- [ ] **Step 2: Run focused tests and verify they fail**

Run: `node --test tests/site-contract.test.mjs tests/mobile.test.mjs`

Expected: FAIL on the old CH03/CH04 structures.

- [ ] **Step 3: Integrate the approved whole-site copy**

Update the static English fallback in About, Contribute, and Log to match the localized source strings. Update the site meta description to “An evolving performance about what escapes the systems we build.”

- [ ] **Step 4: Build CH03 as two transmissions**

Transmission 1 shows compact v0/v1/2.0 version rows. Transmission 2 keeps the Microsite study. Update the channel count to 2. No Fabric 2.0 link may be present.

- [ ] **Step 5: Build CH04 as seven transmissions**

Add the Scores rail first, archive counts second, four sample groups next, and Evidence/rights last. Provide placeholders expected by Task 1. Add a visible fetch-error fallback. Load `/js/research-gallery.js` locally and call its initializer after the i18n layer is ready.

- [ ] **Step 6: Add the inline reader**

Create the labelled dialog-like reader with close button and fields consumed by Task 1. Keep it inside the existing content pane so opening a record does not leave the broadcast.

- [ ] **Step 7: Add compact responsive styles**

Use small count tiles and two-column record grids on wide screens, one-column compact rows on narrow screens, line clamping for long titles, and a full-content-pane reader overlay. Keep all controls at least 44px on coarse pointers and avoid page-level scrolling.

- [ ] **Step 8: Run focused tests**

Run: `node --test tests/site-contract.test.mjs tests/mobile.test.mjs tests/i18n.test.mjs tests/research-gallery.test.mjs`

Expected: PASS.

- [ ] **Step 9: Commit only Task 4 files**

```bash
git add public/broadcast/index.html tests/site-contract.test.mjs tests/mobile.test.mjs
git commit -m "feat: integrate research and scores into the broadcast"
```

### Task 5: Rendered QA, exact-head validation, and evidence

**Files:**
- Modify only if a concrete visual defect is found: files already owned by Tasks 1–4 and their focused tests.

**Interfaces:**
- Verifies the integrated exact head and preserves the dirty Fabric v1 boundary.

- [ ] **Step 1: Start a local static server**

Run the project’s existing preview command if documented; otherwise run a non-writing static server rooted at `public` on an available localhost port.

- [ ] **Step 2: Inspect the broadcast at desktop and mobile sizes**

Check at 1440×900 and 390×844:

- all five channels remain reachable;
- About reads as one argument;
- CH03 identifies v0 as the checkpoint, gives v1 the later additions, and leaves 2.0 undefined with no false link;
- CH04 starts with Scores, shows every count, and all ten sample cards are reachable across the four groups;
- the inline reader opens, closes, restores focus, and never clips its source action;
- KO/ZH/JA switching does not break the console;
- reduced-motion preference remains stable.

- [ ] **Step 3: Correct any concrete visual defects test-first**

For each defect, add or tighten the smallest focused contract, verify it fails, apply the minimal CSS/markup/renderer fix, and rerun that focused test.

- [ ] **Step 4: Run the complete suite**

Run: `npm run test`

Expected: all tests pass.

- [ ] **Step 5: Verify no whitespace or ownership regressions**

Run: `git diff --check` and `git status --short --branch`.

Expected: no diff errors; the pre-existing Fabric v1 dirty files and `docs/design/src/__pycache__/` remain uncommitted and unchanged by this plan.

- [ ] **Step 6: Generate repository evidence**

Run: `scripts/agent-evidence`

Expected: exit 0 with a new `.agent/evidence/*/manifest.json` recording the required test lane.
