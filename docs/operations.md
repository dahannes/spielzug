# Operations

Cloud services, environments and how we release. Local setup and npm scripts: [README](../README.md). What is stored where: [data map](data-map.md).

**Rule:** anything that changes the cloud (migrations, deploys, env vars, AWS, auth settings) only with the maintainer's explicit go.

**Live values** (project ref, account IDs, team, production URL, sender address) and the release log are not in the repo: they live in the untracked `docs/operations.private.md` on the maintainer's machine. This file uses placeholders such as `<project-ref>`.

## Services

| Service | Purpose | Reference |
|---|---|---|
| Supabase | Postgres, Auth, Storage (private buckets `dictation-audio`, `dictation-scans`, `player-photos`, created by migrations) | project `<project-ref>`, eu-central-1 |
| Vercel | frontend + `api/` functions, region `fra1`, 60 s limit | team `<vercel-team>`, project linked in `.vercel/project.json` – `<production-url>` |
| Anthropic | LLM reads word lists and dictations (`claude-haiku-5-5`, ADR-017) | `ANTHROPIC_API_KEY` |
| Amazon Polly | dictation voice (Daniel, neural), eu-central-1 (ADR-022) | AWS account `<aws-account>`, an IAM user that may only synthesize speech; `AWS_*` |
| Amazon SES | auth emails (6-digit codes) as Supabase's SMTP, eu-central-1, sender `<ses-sender>` from the domain identity `<app-domain>` (Easy DKIM; DMARC `p=none` on the app domain) | an IAM user that may only send as that address; credentials only in the Supabase auth config. **Sandbox:** ≤ 200 mails/day, only to verified addresses – verify with `aws sesv2 create-email-identity` or request production access |
| Langfuse | traces, cost, eval datasets (EU cloud) | `LANGFUSE_*`; a dedicated `spielzug` project is still to be created |

## Environments

| Environment | Database | Env |
|---|---|---|
| Local (`npm run dev`) | Docker stack (`npm run db:start`) | `.env.development.local` overrides `.env.local` |
| Build, Supabase CLI, local server functions | Supabase cloud | `.env.local` |
| Vercel preview / production | Supabase cloud | Vercel env vars: everything from `.env.local` except `DB_PW`, plus `DEBUG_USERS`; `PIN_PEPPER` has its own cloud value (never the local one) |

## Release procedure

1. **Check:** `npm run check` green on a clean, pushed `main` (CI green).
2. **Backup:** `npm run backup:prod` (see [Backups](#backups)).
3. **Dry run:** `npm run db:push:dry` – review every migration it would apply. Pushed migrations are never edited; new data steps go into the migration itself.
4. **Push:** `npx supabase db push --remote --yes` (without `--remote` the CLI targets the local stack; without `--yes` it waits for a confirmation it does not get from a non-interactive shell and applies nothing).
5. **Env vars:** add or change Vercel env vars for production and preview if the release needs new ones.
6. **Version and deploy:** `npm run release` (next version from the commits, `CHANGELOG.md`, tag), `git push --follow-tags`, then `npm run deploy:prod` (refuses uncommitted changes; passes the commit to the build). The version, commit and build date show in the trainer area under Konto.
7. **Smoke test** on `<production-url>`: sign in, player card, trainer gate, open a list, start a round; then the open [manual checks](verification.md#manual-checks-not-automated) on the iPad.
8. **Record:** add the release to the cloud state in `docs/operations.private.md` (untracked) and update its open threads (no commit: the file is untracked).

## Backups

`npm run backup:prod` (read-only, `scripts/backup-prod.ts`) writes one folder per run to `~/Backups/spielzug/<timestamp>/` (or `$BACKUP_DIR`), never into the repo, readable only by the maintainer (folders 700, files 600):

| File | Content |
|---|---|
| `schema.sql`, `roles.sql` | the database structure and roles (`supabase db dump --remote`) |
| `data.sql` | all rows of `public`, `auth` (accounts, password hashes) and `storage` (file metadata) |
| `storage/<bucket>/<path>` | every file of every bucket (audio, sheet photos, player photos) |
| `manifest.json` | size and SHA-256 of every file; the run fails if a listed file was not saved |

**When:** before every release (step 2 above) and weekly. The folder holds children's data: keep it on the maintainer's machine or an encrypted disk, delete old runs when no longer needed (keep the last four).

**Restore** (into a fresh Supabase project, or the local stack after `npm run db:reset` with the maintainer's go): apply `roles.sql`, `schema.sql`, then `data.sql` with `psql` against the target database; upload `storage/<bucket>/…` to the same paths with the secret key. Not rehearsed yet.

## Costs and alerts

The paid calls are capped per day in `api/_lib/quota.ts` (SR-44); that bounds the number of calls, not money. On top, every paid service has its own limit or alert:

| Service | Where to see cost | Alert / limit |
|---|---|---|
| Anthropic | Console → Usage and Cost; Langfuse per trace | monthly spend limit and a notification below it (Console → Settings → Limits) |
| AWS (Polly, SES) | Billing and Cost Management → Cost Explorer, grouped by service | budget `monthly-10usd` (email at 85 % and 100 % actual, 100 % forecast; delivered through AWS User Notifications, the recipient address must be verified once); `Default-Services-Monitor` (Cost Anomaly Detection, daily email) |
| Supabase | Organization → Usage | free-plan limits; no alert |
| Vercel | Project → Usage | Hobby limits; no alert |
| Langfuse | the project's usage page | free-tier units |

AWS notes:
- Billing pages in the console need "IAM user and role access to Billing information" (Account settings, root only) in addition to the user's own permissions. The Cost Explorer API works without it.
- Cost Explorer and Budgets are global and answer from `us-east-1`; console sign-ins are logged in CloudTrail in the region of the sign-in endpoint (root: `us-east-1`).
- Budgets only send email, they never stop a service.

## Current cloud state

The release log (which migrations and commits are live, backups taken) is in `docs/operations.private.md`. Configuration that the code relies on:

- Auth (set through the Management API `PATCH /v1/projects/<project-ref>/config/auth`, never `config push`): site URL `<production-url>`, redirects `<production-url>/**` and the old Vercel URL `/**` (transition), "Confirm email" on, password ≥ 8, 6-digit codes valid 600 s, templates from `supabase/templates/otp.html` with subject "Dein Spielzug-Code" (confirm signup, reset password, magic link). Custom templates need custom SMTP on the free plan – hence SES. Sign-up is still open.
- Vercel env vars for production and preview: see [Environments](#environments); `PIN_PEPPER` has its own cloud value.

## Gotchas

- **Never `supabase config push`:** it would copy the local config (e.g. `localhost` as site URL). Change auth settings in the dashboard or via the Management API.
- The project was created with Supabase defaults: new tables and functions would be exposed to `anon`/`authenticated`, and there is no auto-RLS. The migrations revoke default privileges and enable RLS themselves.
- `supabase db query --remote` needs `--read-only` (otherwise it asks for consent).
- Tracing: `api/_lib/tracing.ts` uses `NodeTracerProvider` + `LangfuseSpanProcessor` (not `@opentelemetry/sdk-node`, whose exporters conflict with `@langfuse/otel`). Without keys, spans are no-ops. `handler()` in `api/_lib/http.ts` flushes before returning.
