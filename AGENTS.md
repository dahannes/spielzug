# Spielzug – instructions for agents

Learning web app for primary school children. Iteration 1 is a **Lernwörter-Diktat**: parents photograph the school word list, the app dictates the words, the child writes on paper, scans the sheet and sees mistakes letter by letter. Trainers manage a team of player cards. Project language is English; the UI is German.

## Read first

All project knowledge lives in the repo, not in personal or tool-specific memory. At the start of a session read:

1. `docs/working-agreements.md` – rules (language, child data, secrets, DB, git, effort). **Binding.**
2. `docs/requirements.md` – UR and SR with status and verification: the traceability matrix. Update SR status/verification in the same commit as the change; tag tests with `[SR-xx]`; never renumber ids.
3. `docs/architecture.md` – flow, stack, code map, routes, data invariants, decisions (ADRs). Record lasting decisions there.
4. `docs/data-map.md` – what data is stored where, who can access it, when it is deleted.
5. `docs/design.md` – design tool (the [design canvas](https://claude.ai/artifact/UpsjxGtHUt8HTZfG8cmzLu) with sitemap and wireframes), fonts, type scale, spacing, radii, colours, UI patterns and the review checklist. Follow it for every UI change; add new patterns there.
6. `docs/verification.md` – test levels, fakes, manual checks.
7. `docs/operations.md` – cloud services, environments, release procedure. The live values behind its placeholders and the release log are in the untracked `docs/operations.private.md` (maintainer's machine only; never commit it).
8. `README.md` – developer workflow (setup, npm scripts, local services, troubleshooting). Keep it in sync with `package.json`.

## Before committing

`npm run check` (lint, quality gates, types, unit, DB, E2E). A quality gate fails → fix the code, not the threshold ([code quality](docs/verification.md#code-quality)). UI changes: go through the [design review checklist](docs/design.md#review-checklist-every-ui-change) with screenshots at tablet and phone width. Ask before `npm run db:reset` if the maintainer is using the local app. Never touch the cloud (push, deploy, env vars, AWS) without explicit approval.

## Open threads (2026-11-24)

- Open source (decided 2026-11-24): one public repo with a single initial commit, PolyForm Noncommercial license; plan and remaining approvals in [docs/open-source-plan.md](docs/open-source-plan.md).
- Parked decisions (2026-11-21), recommendations in the issues: #5 team PIN (recommended: current PIN required + email-code reset), #6 shared device (name only via trainer PIN + "Rückgängig"), #7 Spielvorbereitung (words folded behind "Wörter ansehen"). Decide before #10 and #16; next build items #8, #9.
- Live at the production URL (`docs/operations.private.md`). Each deploy only with the maintainer's go ([release procedure](docs/operations.md#release-procedure)).
- Released 1.6.0 on 2026-11-24 (migration `20261124000000_ai_quotas`, `cadda58`): daily quotas for paid calls per account and a global cap (SR-44, ADR-044); debug view opt-in (SR-42). Tune the limits in `api/_lib/quota.ts` with real usage. Still to do by the maintainer: hard spend limit at Anthropic, AWS Budgets alert.
- Released 1.5.0 on 2026-11-17 (no migrations, `05f4d89`): the whole player card opens its editor; player editor fixed for the iPhone (form scrolls, club row on pointer events – tested on the maintainer's iPhone against the local app); code quality gates (ADR-043). 1.4.1 (2026-11-16): fixes from the [user validation of 2026-11-15](docs/validation/2026-11-15-user-validation.md) (GitHub issues #1–#13).
- Code quality gates since 2026-11-16 ([code quality](docs/verification.md#code-quality)): import rules, knip, jscpd in `check` and a `pre-push` hook; mutation testing of `shared/` in CI. Next: tests for `shared/dictation/compare.ts` (mutation score 68 %, the letter-by-letter comparison) and `shared/league.ts` (66 %); then raise the 75 % threshold. Hotspots by churn: `PlayerForm.tsx`, `PlayerCardPage.tsx`.
- Released 1.4.0 on 2026-11-14 (no migrations): Trainingsplan and Liga as tabs, subject tags (De/Ma/En), list cards open the new Spielvorbereitung (SR-64) with games, Berichtigungen and words; player card with film look, paper edge and a small random tilt – check on the iPad that the card swipe and the flight into the editor stay smooth (backdrop blur), else drop `film-focus` first.
- Released 1.3.0 on 2026-11-13 (all migrations up to `20261113170000`, `main` deployed): new players start with Schwarz-Weiß; positions from a fixed set (every player was set to Mittelfeld – correct them in the editor); Nachspielzeit sheet check (SR-24, check a crossed-out word on a real sheet); Berichtigung as its own round (SR-25); Vokabeln Englisch (SR-15, two vocabulary lists on prod); Liga (SR-63, ADR-042): everyone starts in the Kreisliga, clubs above the league are locked, a club worn before stays. Tune the league goals in `shared/league.ts` with real rounds after 2–3 weeks. Still to do on prod by the maintainer: set the team PIN and correct the players' Klasse (placeholder 1) in the trainer area.
- Not tested on a real device yet: swiping the Verein row and the card in the editor, full dictation with handwritten numbered words, Polly playback, card swipe and PIN keypad on the iPad ([manual checks](docs/verification.md#manual-checks-not-automated)).
- Amazon SES is in sandbox mode: sign-up codes reach only verified addresses. Verify each invited trainer's address or request production access first.
- Sign-up stays public (decided 2026-11-24); paid calls have daily quotas per account and a global cap (SR-44, ADR-044, live since 1.6.0). Before strangers can join: SES production access and the privacy texts (see the open-source plan).
- Reading the preparation steps aloud is deferred (needs a Polly recording).
- Bracket forms ("laufen (läuft)") are stored but not dictated.
- Backups: `npm run backup:prod` exists (manual, before releases and weekly); a restore has not been rehearsed yet.
- Repository on GitHub (`dahannes/spielzug`, public since the switch in the [open-source plan](docs/open-source-plan.md); history before 1.6.0 in the private `spielzug-archive`) with CI; versions via `npm run release` (SemVer from Conventional Commits), version shown under Konto.
- Langfuse keys still point to a demo project; a dedicated `spielzug` project is recommended.
- Visual design pass: list card done (2026-11-13, `docs/design.md`); player card review open (eyebrow and radius alignment, column width). The wireframes predate the card switcher and B612.
- Left open on purpose (review 2026-11-12): `LoginPage` stays one component; OpenCV.js stays (cached immutably on Vercel).
