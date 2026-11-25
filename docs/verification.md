# Verification

How we know it works. Every SR in [requirements](requirements.md) is verified on at least one level; test titles carry `[SR-xx]`.

## Test levels

| Level | Verifies | Where | Run |
|---|---|---|---|
| Unit | SRs with pure logic: word lists, comparison and mistake kinds, line matching, grading, word choice, audio paths, test dates, metrics, player card stats, player scheme contrast; photo geometry and portrait; API error texts; LAN Supabase URL | `shared/**/*.test.ts`, `src/**/*.test.ts` (Vitest) | `npm run check:fast` (no Docker) |
| Server | SRs at the API boundary: handler wrapper (fixed codes, body parsing, trace flush), sign-in, bad bodies, error codes, RLS reads, list deletion with audio and photos, invitations, PIN, debug allowlist, parallel `ensure_family` | `api/**/*.test.ts` (Vitest, `AI_FAKE=1`, local Supabase) | `npm test` |
| Database | SRs on access and integrity: RLS, grants, storage folders, trainer/PIN rules, profile constraints – as `anon` and `authenticated` | `supabase/tests/database/*.sql` (pgTAP) | `npm run test:db` |
| End to end | user flows (URs) on **tablet** (iPad landscape) and **phone** (Pixel 7): sign-up with code, player card and switcher, club picker (drag, keyboard), a dark and a light kit on the card with screenshots, player bottom-sheet placement and enter/exit motion, whole-card preview with the stats behind the form, trainer gate and area, word lists, a full round to the report with photo, reset, debug view, no horizontal scroll | `e2e/*.spec.ts` (Playwright, own server on port 5174, `AI_FAKE=1`) | `npm run test:e2e` |

`npm run check` runs all four and is required before each commit.

## Code quality

Most code is written by agents. They keep lint, types and complexity clean. What drifts is duplication, dead code, layering and test strength. So these are measured and gated ([ADR-043](architecture.md#decisions)):

| Check | Catches | Gate | Config | Runs in |
|---|---|---|---|---|
| Import rules (oxlint) | Import cycles; `shared/` importing `src/` or `api/`; `src/` importing `api/` (HTTP only); `api/` importing `src/`; `components/` and `lib/` importing features or app | Error | `.oxlintrc.json` | `lint`: pre-push, `check`, CI |
| knip | Unused files, exports, dependencies | 0 findings | `knip.json` | `quality`: pre-push, `check`, CI |
| jscpd | Copy-paste in `src/`, `shared/`, `api/` (tests excluded) | ≤ 1 % lines (baseline 0.58 %, 2026-11-16) | `.jscpd.json` | `quality`: pre-push, `check`, CI |
| Mutation testing (Stryker) | Tests that run code without really checking it: logic in `shared/` (not `shared/api/`) | Score ≥ 75 % (baseline 77.3 %, 2026-11-16; `shared/` tests only, `vitest.mutation.config.ts`) | `stryker.config.json` | `npm run test:mutation`; CI job `quality` (incremental, cached) |
| Quality report | Trends: size, test share, duplication, knip count, fix/feat ratio, churn hotspots (changes × lines, 30 days) | None | `scripts/quality-report.ts` | `npm run quality:report`; CI job summary |

Rules:

- **Fix the finding, never the threshold.** Remove dead code or an export instead of adding it to an ignore list. Extract a helper instead of copying. Write a test that kills the mutant. Raise the thresholds when the baseline improves; never lower them without the maintainer's go.
- A `pre-push` hook runs `npm run check:fast` (lint, quality, types, unit tests; about 3 s). The hook skips DB and E2E tests; `npm run check` before each commit and CI run them.
- Weakest mutation scores (2026-11-16): `compare.ts` 68 % (the letter-by-letter comparison), `league.ts` 66 %, `audio.ts` 71 %. The HTML report (`reports/mutation/index.html`, or the CI artifact `mutation-report`) lists the surviving mutants.

## Fakes

- **`AI_FAKE=1`**: LLM calls return fixed outputs (a two-word list; every dictation line "die Wise"; one debug item); no Polly audio. Tests cost nothing.
- Sheet photos in E2E are drawn on a canvas (a skewed sheet on a dark table). The player photo is `e2e/fixtures/player.jpg`, a licensed stock photo of an adult – never a child.
- Auth emails locally go to Mailpit (`e2e/mailpit.ts`).

## User validation

Simulated persona runs (agents drive the local app with `AI_FAKE`, a facilitator merges the reports); results anonymised in `docs/validation/`. Latest: [2026-11-15](validation/2026-11-15-user-validation.md), with manual checks for a test with the real children.

## Manual checks (not automated)

Do these before relying on a change in reading, audio, photos or touch input. Still open for the current release:

| Check | SR | How |
|---|---|---|
| Full dictation with real handwritten, numbered words; der/des and short words | SR-31, SR-32 | real round on the iPad; compare models in `/debug/scan` |
| Crossed-out and rewritten words after the sheet check are read as the correction | SR-24, SR-31 | real sheet with a crossed-out word in `/debug/scan` and in a round |
| Polly playback (and device-voice fallback) | SR-21 | real round on the iPad |
| Vokabeln: a printed English list and a handwritten English sheet (capitalised nouns, crossed-out words) | SR-15, SR-31 | `/debug/scan`, then a real round |
| Sheet photo with the device camera, whole page and part | SR-30, SR-34 | real round on the iPad and a phone |
| Player photo taken on the device, cut-out and drawing | SR-06 | trainer area on the iPad |
| Card swipe and PIN keypad by touch | SR-53, SR-08 | iPad |
| Liga after the release: players with older rounds see their Aufstieg once; a club worn from before stays, the others above the league are locked and skipped | SR-63 | iPad, each player |
| Number rolls and position pitch by touch (swipe a digit up/down, tap a zone) | SR-06 | iPad and a phone. Known flake: the own-card E2E test (`dictation.spec.ts`, player edits their own card) occasionally times out in a `boundingBox` under full parallel load; it passes alone and on rerun |
| Verein row swipe and the card flying into the editor and back | SR-62, SR-06 | iPad and a phone, by touch, also back from the row's end. E2E drags the row with the mouse on the tablet only, from the middle: in emulation a mouse drag from the row's end (and any on the phone) does not start, cause unknown |
| Layout in the browser actually used | SR-50 | iPad: Safari and the home-screen app. Chrome on iPad requests desktop sites by default and keeps the first orientation's width: test there only with "Mobile Website" |
| Cost per call | SR-41 | debug view, Langfuse |
