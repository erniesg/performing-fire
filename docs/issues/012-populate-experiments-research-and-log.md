# Populate Experiments, Research, and Log with relevant project information

depends-on: 011

## Provider

vm-codex

## Goal

Finish CH 03 EXPERIMENTS, CH 04 RESEARCH, and CH 05 LOG in the same console. Keep each channel distinct instead of restating the About thesis.

CH 03 is the working visual laboratory and should expose six concise experiment transmissions: scope sweep, magnet breathe, lissajous morph, noise to order, grid pulse, and rgb drift. CH 04 is the research/technical channel, led by punch data, and should explain the actual pipeline from audience traces through embedding/clustering and non-linear mapping (t-SNE or UMAP) to the residual material and performer interaction. CH 05 is the dated project log, led by moon phases, and should contain only milestones or schedule information supported by committed project sources or the existing CMS experiments feed.

## Acceptance tests

- CH 03 exposes exactly the six named experiment studies in its progress count and preserves the chosen `x3` magnet-breathe channel preview.
- Experiment descriptions are one sharp line each, describing what changes visually or interactively; they do not use invented art-theory filler.
- Where a study has a real route or CMS experiment entry, it links correctly. Concept-only studies are labeled as studies and must not lead to dead routes.
- CH 04 uses the `r1` punch-data preview and explains the project pipeline accurately: traces → embedding/clustering → t-SNE or UMAP projection → remainder/ε → performer-mediated light/particles/sound/glitch/fire.
- CH 04 distinguishes what currently exists from proposed/research-stage capabilities. Do not present an unimplemented model or sensor pipeline as live.
- CH 05 uses the `l1` moon-phases preview and renders a compact chronological log. Dates come only from committed sources or successful CMS responses; uncertain dates are omitted.
- CMS-backed experiments retain static fallback behavior and locale forwarding.
- Every new string exists in EN/KO/ZH/JA with complete meaning and layout-safe text lengths.
- Progress, arrow navigation, keyboard state, reduced motion, and no-scroll behavior remain correct for the largest channel content count.

## Validation command

```bash
npm test
scripts/agent-evidence
```

## Allowed secrets

None.

## Artifact outputs

- Populated CH 03/CH 04/CH 05 console states
- Complete EN/KO/ZH/JA dictionary entries for this scope
- Updated CMS/static experiment adapters only where necessary
- Evidence screenshots for all three channels, including one narrow viewport and one CJK locale

## Stop conditions

- Do not invent milestone dates or imply unfinished research is live.
- Do not include personal details from proposals or private files.
- Do not modify `docs/design/`, deploy, or change external CMS data.
- Stop if a requested study name conflicts with an existing public route or copyrighted third-party asset; report the conflict without adding a substitute asset.

## Human clarification protocol

Use the checked-in script and existing CMS/public data. Flag unsupported dates or technical claims for later editorial review without blocking the rest.

## Recommended response

Make Experiments visual and specific, Research technically honest, and Log chronological.

## Trade-offs

The log may initially be sparse because only verifiable milestones are allowed; its structure should make later CMS additions straightforward.

## Free-form response

Optional maintainer notes:
