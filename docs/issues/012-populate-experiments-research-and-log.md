# Populate Experiments, Research, and Log with relevant project information

depends-on: 011

## Provider

vm-codex

## Goal

Finish CH 03 EXPERIMENTS, CH 04 RESEARCH, and CH 05 LOG in the same console. Keep each channel distinct instead of restating the About thesis.

CH 03 is the landing console's broader visual-language study. It should expose five concise transmissions: broadcast objects, water, camera/data totems, moon jars, and stupa forms. The standalone Fabric microsite at `/experiments/fabric/` is the actual interactive experiment page; it is not a sixth landing-console transmission. CH 04 is the NJP research channel, led by punch data. It should describe how the project studies Nam June Paik's public source field and turns broadcast, objects, water, and ritual forms into a visual language. It should not present the proposed audience-processing pipeline as completed research. CH 05 is the dated project log, led by moon phases, and should contain only milestones or schedule information supported by committed project sources or the existing CMS experiments feed.

## Acceptance tests

- CH 03 exposes exactly five visual-language transmissions in its progress count: broadcast objects, water, camera/data totems, moon jars, and stupa forms. The `x3` preview is labeled as visual language, not as the Fabric experiment.
- The standalone Fabric page remains the canonical interactive experiment route at `/experiments/fabric/` and is named Fabric everywhere; the retired `flame-cloth` label is not reintroduced.
- Visual-language descriptions are one sharp line each, describing the object or motion under study; they do not use invented art-theory filler.
- CH 04 uses the `r1` punch-data preview and names the NJP public source universe used by the corpus work: Art Center records, video-archive metadata, the official video library, official YouTube metadata, and the ANTIEGG Fluxus reference.
- CH 04 distinguishes source study and rights-aware metadata work from any proposed audience-processing pipeline. Do not present an unimplemented model or sensor pipeline as live research.
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

Make the landing visual-language study specific, keep the standalone Fabric experiment separate, make Research source-grounded, and keep Log chronological.

## Trade-offs

The log may initially be sparse because only verifiable milestones are allowed; its structure should make later CMS additions straightforward.

## Free-form response

Optional maintainer notes:
