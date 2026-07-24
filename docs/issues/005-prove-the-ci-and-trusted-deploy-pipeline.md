# Prove the CI and trusted-deploy pipeline end to end

## Goal

Make the generated Rucksack pipeline real for this repo. The harness already installed a secretless CI (`.github/workflows/ci.yml`) and a fail-closed hosted deploy (`.github/workflows/deploy.yml` refuses credential-bearing deploys until a separate publisher boundary exists — do not un-hold it). Deploys run from the trusted side (`npm run deploy:staging` / `npm run deploy` per `.agent/deploy.yaml`). This issue proves the loop: CI green on a real PR, a staging deploy verified at its URL, and a deploy runbook the team can follow.

## Acceptance tests

- The Rucksack CI workflow completes green on a pull request from this issue's branch (evidence: the Actions run URL) — including the secret-scan and the `npm run test` command from `.agent/commands.yaml`.
- New `docs/DEPLOY.md` (new file) documents: the two commands from `.agent/deploy.yaml` (`wrangler deploy --env staging`, `wrangler deploy --env production`), where they may run (trusted workstation or trusted VM only), the custom domains they publish (`performingfire-stg.berlayar.ai`, `performingfire.berlayar.ai`), the rollback command (`wrangler rollback`), and the rule that the held hosted-deploy workflow must not be modified.
- New `scripts/deploy-qa` (new executable) curls both URLs and reports `<status> <url>` per line, exiting non-zero if production returns non-200; wired as `npm run deploy:qa`. Staging may 404 until its first deploy — the script treats staging non-200 as a warning, production non-200 as failure.
- `npm test` stays green; a human (or trusted runtime) runs `npm run deploy:staging` once and posts the `deploy:qa` output showing staging 200 as evidence.

## Validation command

```bash
npm test
```

## Allowed secrets

None in this repo or CI. Cloudflare credentials exist only in the trusted runtime's wrangler login; the held deploy workflow must stay fail-closed.

## Artifact outputs

- New `docs/DEPLOY.md`
- New `scripts/deploy-qa` + `deploy:qa` script entry in `package.json`
- CI run URL and `deploy:qa` output as evidence

## Stop conditions

- Stop if any step would add deploy credentials to GitHub Actions or modify `.github/workflows/deploy.yml` — that violates the publisher-boundary contract; note it and hand back.
- Stop and request a human if no trusted runtime with wrangler credentials is available to run the one staging deploy; land everything else first.

## Human clarification protocol

Comment with the exact command you need run in the trusted runtime and the expected output; land the runbook and QA script regardless.

## Recommended response

Approve the runbook + QA script; run `npm run deploy:staging` from the workstation when the PR lands and paste the QA output.

## Trade-offs

Keeping deploys on the trusted side matches the Rucksack credential-boundary model and berlayar's current practice at the cost of a manual step per deploy; hosted deploys can come later as a separate reviewed publisher.

## Free-form response

Optional maintainer notes:
