# Open-source plan

Goal: a public repository that shows responsible AI engineering in production ("AI in production with guardrails").

**Decided 2026-11-24:** one repository only. The old private repository is `spielzug-archive` (private, archived, full history); `dahannes/spielzug` started with a single commit of the tree at 1.6.0. License: PolyForm Noncommercial 1.0.0 (source-available, commercial use reserved). The live URL is linked in the README. Sign-up stays public, protected by daily quotas (SR-44, ADR-044).

**Rule:** nothing here touches the cloud, GitHub visibility or a push without the maintainer's explicit go ([working agreements](working-agreements.md)).

## Checklist

| # | Step | Status |
|---|---|---|
| 1 | Secret scan of the whole history | **done** (2026-11-21): no leaks, see [report](#secret-scan-report) |
| 2 | Docs public-safe | **done** (2026-11-21): live values in the untracked `docs/operations.private.md`, placeholders in the tracked docs; validation doc without grades or traits of real children; open threads out of `AGENTS.md` (2026-11-25) |
| 3a | Sign-up open to strangers | **open**, see [Before strangers can join](#before-strangers-can-join) |
| 3b | Abuse of the AI and voice endpoints | **done**: daily quotas per account and a global cap, `debug-scan` opt-in (SR-42, SR-44, ADR-044); live since 1.6.0 |
| 3c | Budget alerts | **open**, see [Budget alerts](#budget-alerts) |
| 4 | One repo, single initial commit | **done** (2026-11-24), still private: issues #1–#18 recreated with the same numbers, labels, comments and state (recreated, not transferred: an issue's edit history held the children's grades); commits use the GitHub noreply address |
| 5 | README for outside readers | **done** (2026-11-24): intro, screenshot with fictional data, guardrails, architecture, local setup without cloud keys |
| 6 | License | **done**: PolyForm Noncommercial 1.0.0 in `LICENSE.md`, `package.json`, README |
| 7 | Make the repository public | **open**: the maintainer decides when |

## Secret scan report

gitleaks 8.30.1, run locally on 2026-11-21 on the old repository:

| Scan | Scope | Result |
|---|---|---|
| `gitleaks git . --log-opts=--all` | all refs | no leaks |
| `git log --all -p --full-history --root \| gitleaks stdin` | every patch of all 122 commits, 7 tags, both remote branches | no leaks |
| `gitleaks dir .` | working tree incl. ignored files | hits only in ignored files (`.env.local`, `.env.development.local`, `.certs/`) |

CI runs gitleaks on every push (`.github/workflows/ci.yml`, job `commits`). Run `gitleaks git .` once more just before making the repository public.

Not secret but public already: the Supabase URL and publishable key are in the live JavaScript bundle by design (RLS protects the data). The project ref is hidden from the docs as hygiene, not as protection.

## Before strangers can join

- Amazon SES production access (in the sandbox, codes reach only verified addresses).
- Privacy texts: Datenschutzerklärung, Impressum, AV contracts, the Anthropic processing note.
- Optional: CAPTCHA (Turnstile) on sign-up (auth config, cloud).

## Budget alerts

Set by the maintainer in the consoles:

- **Anthropic:** a dedicated workspace for Spielzug with its own key, a monthly hard spend limit and an email alert.
- **AWS:** AWS Budgets with alerts at low thresholds (e.g. 5 and 10 USD/month); Polly and SES IAM users stay single-purpose.
- **Vercel:** Spend Management (or stay on Hobby, which has no overage).
- **Supabase:** keep the free plan or the spend cap on.

Earlier versions of this plan (findings per file, sign-up options, the license comparison) are in the git history.
