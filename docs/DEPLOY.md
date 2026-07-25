# Deploy Runbook

Deploys for Performing Fire run from the **trusted side only** — a trusted
workstation or the trusted VM with an authenticated `wrangler` login. No deploy
credentials exist in this repo or in GitHub Actions, and that is intentional.

## Commands

Both commands come from `.agent/deploy.yaml` and are wired in `package.json`:

| Environment | Command | npm alias | Publishes |
|---|---|---|---|
| Staging | `wrangler deploy --env staging` | `npm run deploy:staging` | https://performingfire-stg.berlayar.ai |
| Production | `wrangler deploy --env production` | `npm run deploy` | https://performingfire.berlayar.ai |

Run them only from a trusted workstation or the trusted VM where `wrangler` is
already logged in to the Cloudflare account. Never run them from CI, an
untrusted sandbox, or any environment where you would need to paste
credentials to make them work.

## Post-deploy QA

After any deploy, verify both URLs:

```bash
npm run deploy:qa
```

This runs `scripts/deploy-qa`, which prints `<status> <url>` for each
environment. Staging returning non-200 is a warning (staging may 404 until its
first deploy); production returning non-200 fails the check with a non-zero
exit.

## Rollback

```bash
wrangler rollback
```

Rollback is also trusted-side only. Per `.agent/deploy.yaml`, a human approves
the rollback version before execution — never roll back automatically.

## Hosted-deploy workflow is held — do not modify it

`.github/workflows/deploy.yml` is intentionally fail-closed: it refuses
credential-bearing deploys until a separate, reviewed publisher boundary
exists. Do not edit it, un-hold it, or add Cloudflare secrets to GitHub
Actions. Any change to the hosted-deploy path must go through its own reviewed
publisher-boundary work, not this runbook.
