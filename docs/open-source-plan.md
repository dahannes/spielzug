# Open-source plan

Goal: a public repository that shows responsible AI engineering in production ("AI in production with guardrails").

**Decided 2026-11-24:** one repository only. The current private repository is renamed to `spielzug-archive` (stays private, full history); a new public `dahannes/spielzug` starts with a single commit of the current tree, and development continues there. License: PolyForm Noncommercial 1.0.0 (source-available, commercial use reserved). The live URL is linked in the README.

**Rule:** nothing here touches the cloud, GitHub visibility or a push without the maintainer's explicit go ([working agreements](working-agreements.md)).

## Checklist

| # | Step | Status |
|---|---|---|
| 1 | Secret scan of the whole history | **done** (2026-11-21): no leaks, see [report](#1-secret-scan-report) |
| 2 | Docs public-safe | **done** on private `main` (2026-11-21): live values in untracked `docs/operations.private.md`, placeholders in `operations.md`, `.env.example`, `README.md`, `polly.ts`; `deploy:prod` without `--scope` (the linked `.vercel/project.json` names the team; first check at the next deploy); `.claude/settings.json` cleaned. Validation doc generalised (no grades, no traits of real children); `CHANGELOG.md` without links to the private repo |
| 3a | Sign-up | **decided 2026-11-24: stays public**, protected by quotas (3b). Before strangers can join: SES production access, privacy (Datenschutzerklärung, Impressum, AV contracts, the Anthropic processing note); optional CAPTCHA (Turnstile) |
| 3b | Abuse of the AI and voice endpoints | **built locally** (2026-11-24, SR-44, ADR-044): daily quotas per account and a global cap; `debug-scan` opt-in (`DEBUG_OPEN`, set only by `vite dev`). **live since 1.6.0** (2026-11-24) |
| 3c | Budget alerts (Anthropic, AWS, Vercel, Supabase) | **needs go**: maintainer sets them in the consoles |
| 4 | One repo, single initial commit | **done 2026-11-24, still private**: old repo renamed to `spielzug-archive` and archived; new `dahannes/spielzug` (private) with one commit and tag `v1.6.0`; issues #1–#18 recreated with the same numbers, labels, comments and state (recreated, not transferred: GitHub keeps an issue's edit history, which held the children's grades); local copy switched, commit email set to the GitHub noreply address. **Open:** make it public (maintainer) |
| 5 | README for outside readers | **done** (2026-11-24): in `README.md` (intro, `docs/screenshot.png` with fictional data, guardrails, architecture diagram, local setup without cloud keys). Clean-clone test: `npm run check` green with only the local Supabase values plus `PIN_PEPPER` in `.env.local` (without it 15 E2E tests fail; now in the README). |
| 6 | License | **done**: PolyForm Noncommercial 1.0.0 in `LICENSE.md`, `package.json`, README |

## 1. Secret scan report

gitleaks 8.30.1, run locally on 2026-11-21:

| Scan | Scope | Result |
|---|---|---|
| `gitleaks git . --log-opts=--all` | all refs (gitleaks counts 86 commits with content changes) | no leaks |
| `git log --all -p --full-history --root \| gitleaks stdin` | every patch of all 122 commits, 7 tags, both remote branches (5.3 MB) | no leaks |
| `gitleaks dir .` | working tree incl. ignored files | 8 hits, all in ignored files: `.env.local` (AWS key, API keys, JWT), `.env.development.local`, `.certs/dev-key.pem` (mkcert). `git check-ignore` confirms all three are ignored. |

No stashes. CI already runs gitleaks 8.21.2 on every push (`.github/workflows/ci.yml`, job `checks`). Run gitleaks again against the export directory just before the public initial commit.

Not secret but public already: the Supabase URL and publishable key are in the live JavaScript bundle by design (RLS protects the data). The project ref is hidden from the docs as hygiene, not as protection.

## 2. Public-safe docs

Found in tracked files (search for account IDs, project ref, team, IAM users, email, home paths, family references):

| File | What | Public version |
|---|---|---|
| `docs/operations.md` | AWS account ID, IAM user names, Supabase project ref and dashboard link, Vercel team, SES sender address, backup paths, the release log with commits | Generic: services and roles stay (e.g. "IAM user with `polly:SynthesizeSpeech` only"), values become placeholders (`<project-ref>`, `<aws-account>`). The "Current cloud state" log moves to an untracked `docs/operations.private.md` (add `*.private.md` to `.gitignore`). |
| `.env.example` | project ref in comment and URL | `https://<project-ref>.supabase.co` |
| `README.md` | `supabase link --project-ref <ref>`; `~/Backups/spielzug/` | placeholder; backup path stays (generic) |
| `package.json` | `deploy:prod` with `--scope <vercel-team>` | team from `$VERCEL_SCOPE` |
| `api/_lib/polly.ts` | IAM user name in a comment | "an IAM user that may only synthesize" |
| `AGENTS.md` | open threads: live URL, release log, prod to-dos, the maintainer's devices | public `AGENTS.md` keeps the rules and the read-first list; the open threads go to the private file – **done** 2026-11-25 |
| `docs/working-agreements.md` | private repo URL | public repo URL |
| `CHANGELOG.md` | 36 compare links to the private repo | start fresh in the public repo ("1.5.0 – initial public release", link to this history summary), or rewrite links |
| `.claude/settings.json` | absolute home path | relative path, or leave `.claude/` out |
| `docs/validation/2026-11-15-user-validation.md` | anonymised, but "Child A – Klasse 4, football fan" and "Child B – Klasse 2" next to the author's real name identify real children's grades | **Recommendation:** drop the grades and traits ("older child", "younger sibling") or leave the file out. The working agreement forbids grades of real children in the repo. |
| `src/features/children/schemes.ts` | club colour schemes resemble real clubs' colours (exact hex values); no names, logos or monograms (stated in the file) | low risk; mention in the README that the schemes are generic colours, not club marks |
| git author | every commit carries the maintainer's domain address | the public initial commit uses the GitHub noreply address |

Checked and fine: no child names, real mistakes or class material tracked; `e2e/fixtures/player.jpg` is an adult Unsplash photo with credit in `e2e/fixtures/README.md`; the design canvas link is a private claude.ai artifact.

## 3. Harden the live app

### 3a. Sign-up

Today anyone can create an account. In practice the SES sandbox blocks it: "Confirm email" is on and codes reach only verified addresses, so an unknown address never gets a session. That protection ends the day SES production access is granted.

Options (both are cloud changes; need a go):

- **A (recommended): Supabase "Before User Created" auth hook.** A Postgres function allows a new account only if its email has an open `team_invitations` row (the table already stores the email) or is in a small `signup_allowlist` table that the maintainer fills for new families. Needs a migration plus enabling the hook in the auth config (Management API, not `config push`). The invitation flow stays as it is.
- **B: turn off sign-up** (`disable_signup`) and create trainers with `auth.admin.inviteUserByEmail` in `create-team-invitation`. Simpler config, but changes the invitation flow and its tests.

### 3b. API abuse

All 11 functions in `api/` start with `authUser()` (Supabase access token, checked with `auth.getUser`). `debug-scan` also needs `DEBUG_USERS` on Vercel. Limits that already apply: image ≤ 4 MB base64, ≤ 40 dictation lines, `max_tokens` 4000/8000, 45 s timeout with one retry, ≤ 100 words per list (DB check), Polly only for missing recordings.

Gaps:

- The three Claude endpoints (`read-word-list`, `read-vocab-list`, `read-dictation`) have **no quota**: any signed-in account can call them as often as it likes.
- `prepare-audio` is bounded per list, but nothing limits how many lists an account creates.
- `debug-scan` is open whenever `VERCEL_ENV` is unset, so a self-hosted deployment off Vercel exposes it. Make it opt-in (`DEBUG_ENABLED=1`) before the code is public.

Proposed (one migration + API change; deploy needs a go):

- Table `ai_usage (family_id, day, kind, count)`, RLS on, no grants; RPC `consume_ai_quota(kind)` (security definer, family from `auth.uid()`) that increments and refuses above the limit; new error code `quota_exceeded` (429) with a child-friendly German text.
- Starting limits per team and day: 30 dictation readings, 10 list readings, 20 audio preparations. Tune with real usage from Langfuse.
- Server and pgTAP tests for the limit; new SR under UR-06.

### 3c. Budget alerts (maintainer, in the consoles)

- **Anthropic:** a dedicated workspace for Spielzug with its own key and a monthly spend limit (hard cap) plus an email alert.
- **AWS:** AWS Budgets with alerts at low thresholds (e.g. 5 and 10 USD/month); Polly and SES IAM users stay single-purpose.
- **Vercel:** Spend Management (or stay on Hobby, which has no overage).
- **Supabase:** keep the free plan or the spend cap on.

## 4. Public repository

1. Back up the private repository: `git bundle create ~/Backups/spielzug/spielzug-history-<date>.bundle --all` (outside the repo).
2. Export the current tree (`git archive HEAD`, tracked files only: no `.env*`, `.certs`, `.vercel`, `*.private.md`) into a fresh directory; `git init`, one commit `feat: initial public release (1.6.0)` with the GitHub noreply author; tag `v1.6.0` so `npm run release` continues from it.
3. In the export: gitleaks over the commit and the tree, `npm ci`, `npm run check`.
4. **With go**, in this order:
   1. Edit issues #3, #4, #10 and #17: their text names the real children's grades.
   2. Rename `dahannes/spielzug` to `spielzug-archive` (stays private).
   3. `gh repo create dahannes/spielzug --public`, push `main` and the tag.
   4. Transfer issues #1–#18 in order (numbers stay the same, so the links in the docs and the changelog keep working). PRs #19 and #20 stay in the archive.
   5. Archive `spielzug-archive` (read-only); delete it later if wanted.
5. Switch the local working copy to the new repository and carry over the untracked files (`.env.local`, `.env.development.local`, `.certs/`, `.vercel/`, `docs/operations.private.md`). Deploys stay manual via the Vercel CLI (no Git integration to relink).
6. Update the repository line in `docs/working-agreements.md` and AGENTS.md (public).

## 5. README

Done: the intro, guardrails, architecture and local setup without cloud keys are in [`README.md`](../README.md); the earlier draft is in the git history.

## 6. License

The maintainer decides; trade-off only:

| | MIT / Apache-2.0 | AGPL-3.0 |
|---|---|---|
| Purpose fit | pure showcase; the most familiar to employers and reviewers | showcase with an option to commercialise later |
| What others may do | anything, including a closed SaaS built on the code | they may run it as a service only if they publish their changes under AGPL |
| Later commercialisation | anyone may compete with the same code; the maintainer can still sell (sole copyright holder) | competitors must open their changes; the maintainer can still dual-license (sole copyright holder, as long as no outside contributions without a CLA) |
| Adoption | no friction | many companies ban AGPL code internally, so fewer people try or reuse it |
| Patents | Apache-2.0 has an explicit patent grant; MIT is shorter | explicit patent grant |

Either way: the license applies only from the public commit on, the maintainer keeps the copyright, and contributions need a CLA or DCO if dual-licensing might come later. Assets: B612 font (OFL), Unsplash photo (Unsplash License, test fixture only) – list them in a `NOTICE` or the README.

## Needs the maintainer's go

1. **Public sign-up** (decided): SES production access; privacy texts and AV contracts; optionally Turnstile CAPTCHA (auth config, cloud).
2. ~~Quotas~~: live since 1.6.0.
3. **Budget alerts:** set in the Anthropic, AWS, Vercel and Supabase consoles (maintainer, or me with access and a go).
4. **Validation doc:** generalise or leave out.
5. **Doc edits on private `main`:** move the operational details to `docs/operations.private.md` and use placeholders (local commits; push only with a go).
6. **Public repo:** name, create, first push. No change to the existing repo's visibility.
7. **License:** MIT, Apache-2.0 or AGPL-3.0.
8. **Sync model** between the private and the public repo.
9. **Live URL:** link it from the public README or not (a public link invites sign-up attempts; after 3a that is harmless).
