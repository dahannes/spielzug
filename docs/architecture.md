# Architecture

How Spielzug is built. What it must do: [requirements](requirements.md). Where data lives: [data map](data-map.md). Cloud and releases: [operations](operations.md).

**Product language:** a *Team* is a `families` row, a *Spieler* is a `children` row, *Trainer* are the team's accounts (`family_members`). Tables keep their original names. Players have no login. Training types (*Disziplinen* in code: Wort-Diktat, …) belong to a school subject (Fach); content (a word list) is meant for a Klasse range. The start page is the player's *Trainingsplan*: one flat, date-sorted list of cards for their Klasse, each labelled "Fach · Training type", with Fach and Status filters. Wort-Diktat and Vokabeln (Englisch) are available; both are word lists (`word_lists.discipline`) practised in the same loop. Einmaleins and Dividieren are shown as "kommt später" for their grades. Mockups of this: page "Fächer & Klassen" in the design artifact. Wireframes: [design artifact](https://claude.ai/artifact/UpsjxGtHUt8HTZfG8cmzLu#page-5634c5cea0db) (predates the card switcher and B612). Earlier iterations are in the git history; the first prototype is tag `v0.1-prototype`.

## Flow

```
Trainer: photo of word list ─► /api/read-word-list ──► LLM reads words + example sentences
         (Vokabeln: /api/read-vocab-list ──► English words with their German meaning)
         check / edit list  ─► word_lists          ──► /api/prepare-audio ──► Polly MP3s (private bucket)
         players, team, PIN ─► trainer area (PIN gate), player modal
Child:   player card (start) ─► ▶ Training starten ──► dictation_rounds (10 words: mistakes first, then new, then known;
                                                       an unfinished newest round is reopened)
         preparation (checklist ▶ Anpfiff), listens (MP3, fallback device voice), writes numbered words on paper
         Nachspielzeit: checks the sheet point by point (Schwerpunkt first), corrects on paper
         photo (page or part) ─► straightened, contrast, cropped on the device ─► /api/read-dictation ──► LLM transcribes blind
         match report       ◄── app compares in code: right / wrong (mistake kind, letter diff, "unleserlich"),
                                photo kept (private bucket); card metrics and progress bar built from the rounds
         Berichtigung       ─► dictation_rounds row pointing at the round (its wrong words): look, cover, write,
                                compare, photo ─► read and graded the same way; not part of the metrics
```

## Stack

| Part | Choice |
|---|---|
| Frontend | Vite, React 19, TypeScript, Tailwind v4, React Router, TanStack Query, zod; tablet first; fonts B612 + Barlow Condensed, self-hosted |
| Backend | Supabase (EU): Auth (email + password, codes by email), Postgres with RLS, private Storage |
| Server functions | `api/*.ts` as Vercel functions; locally served by the Vite dev server (`scripts/vite-dev-api.ts`) |
| AI | Claude Haiku 5.5 at effort low, structured outputs; traced in Langfuse (no images) |
| Voice | Amazon Polly, Daniel (neural), eu-central-1 |
| Photos | OpenCV.js in the browser (sheets); MediaPipe selfie segmenter in the browser (player portrait) |

## Code map

| Path | What |
|---|---|
| `shared/dictation/` | pure logic for browser and server: words, `compare.ts` (blind comparison, mistake kinds), `match.ts` (lines → words), `grading.ts`, `pick.ts` (word choice), `metrics.ts` (card metrics, list status), `schedule.ts`, `audio.ts` / `scans.ts` (storage paths) |
| `shared/league.ts` | Liga: goals per league, a player's career from their rounds, earned league (SR-63) |
| `shared/subjects.ts` | catalog of subjects and training types with their grades, grade-range helpers |
| `shared/api/` | server function contracts (schemas, response types) and model prices |
| `shared/database.types.ts` | generated from the local schema (`npm run db:types`) |
| `src/app/` | shell: router (with `ErrorPage`; start page and login eager, other pages lazy route chunks; libraries in `react`/`supabase`/`motion` chunks, `vite.config.ts`), `paths.ts`, layout, auth guard, not-found page |
| `src/features/auth/`, `family/` | login, `AuthProvider`; `useFamily` (team created at first sign-in) |
| `src/features/children/` | player queries, `schemes.ts` (club schemes: crest attributes, hero style, legacy id mapping), `useCurrentChild` (remembered per device), `ChildBar` ("Wer übt?") |
| `src/features/player/` | `PlayerCardPage` (start page: card carousel, metrics, training types), `CardFace` (sticker card, 5:7), `PlayerCrest` (crest and kit pattern from a scheme, `TierStars`), `CardSwiper` (swipe a whole card), `PlayerForm` (create/edit modal), `TrainingPage` (Spielvorbereitung), `ListParts` (subject tag, label, badges, sticker), `plan.ts` (status labels, bar segments), `RoundsBar` (read-only progress), `league.ts` (career, earned league, locked clubs), `LeaguePanel` (Liga on the start page, `PromotionWatcher` with the Aufstieg dialog in the layout) |
| `src/features/trainer/` | `TrainerPages` (PIN gate, Team / Wörterlisten / Konto, invitations), `gate.ts` |
| `src/features/dictation/` | `queries.ts`, word list pages, `RoundPage` → `DictationSteps` / `CorrectionSteps` (Berichtigung) / `RoundResult` (+ `ScanPanel`), `roundStep.ts` (step kept per tab, double-tap guard), `VoicePicker` |
| `src/features/debug/` | `/debug/scan` |
| `src/components/` | `ui.tsx` (Button, shared bottom-sheet/full-screen `Dialog`, …), `SwipeRow` (draggable horizontal list), `styles.ts`, `PhotoCapture` |
| `src/lib/` | `api.ts` (the one client for `api/`), `apiError.ts`, `supabase.ts`, `speech.ts`, `photo/` (sheet preparation with OpenCV; `stylize.ts` + `portrait.ts` for player photos) |
| `api/` | one function per endpoint: `read-word-list`, `read-vocab-list`, `read-dictation`, `prepare-audio`, `delete-word-list`, `delete-player`, `delete-team`, `debug-scan`, `create-team-invitation`, `accept-team-invitation`, `team-pin`; `_lib/`: `http.ts` (handler, error codes), `auth.ts`, `storage.ts` (removing files and folders with the secret key), `llm.ts` (the one LLM call, `AI_FAKE`), `prompts.ts`, `polly.ts`, `tracing.ts` |
| `supabase/` | `migrations/` (schema, RLS, grants, buckets), `tests/database/` (pgTAP), `templates/otp.html` |
| `e2e/` | Playwright specs, Mailpit helper, fixtures |

Relative imports in `shared/` and `api/` carry `.js`: Vercel runs them as Node ES modules.

## Routes

Patterns and URL helpers live in `src/app/paths.ts`.

| URL | Screen |
|---|---|
| `/` | player card (start page) beside two tabs (`?tab=liga`): "Trainingsplan" – one flat list of cards for the player's Klasse, filters Fach and Status (folded) – and "Liga" |
| `/training/:listId` | Spielvorbereitung: one list for the player on the device – progress, start, games with reports and Berichtigungen, words |
| `/login` | sign in, sign up, confirm by code, reset password |
| `/dictation` | word lists with progress, subject and Klasse tags, Klasse filter |
| `/dictation/lists/new`, `/dictation/lists/:listId` | create or edit a word list |
| `/dictation/rounds/:roundId` | a training: preparation, listen and write, photo, match report |
| `/trainer` | team PIN gate (set on first entry) |
| `/trainer/manage` | trainer area: Team, Wörterlisten, Konto |
| `/trainer/join?token=…` | invitation landing; sign-in with the invited email required |
| `/debug/scan` | debug view (open in `vite dev`, elsewhere only for `DEBUG_USERS`) |

## Data model

Tables, buckets, access and lifetime are in the [data map](data-map.md). Invariants worth knowing:

- Every team-owned row carries `family_id`; RLS checks `private.is_family_member(family_id)`. Storage paths start with `<family>/`.
- One team per account (`family_members.user_id` unique). `ensure_family()` and invitation acceptance share an advisory lock per account.
- Rounds reference `(list_id, family_id)` and `(child_id, family_id)`, so they cannot point into another team; they cascade with their list or player.
- Word ids are random and stable; results are looked up by word id, never by position. Progress is derived from rounds – no progress table.
- `children.grade` (1–6) is required. `word_lists.grade_min`/`grade_max` (1–6, from ≤ to, default 1–6) say which grades a list is for; a player sees a list only if their grade is in the range. The filter is a view rule in the app, not RLS: all trainers and players of the team may still read every list.
- Bracket forms ("laufen (läuft)") are stored but not dictated.

## Decisions

Numbers are kept from the earlier log (gaps = dropped decisions, see git history). Code comments cite them.

| ADR | Decision | Why / key facts |
|---|---|---|
| 015 | Email + password; emails carry 6-digit codes, never links | Links would open Safari instead of the installed web app. Social logins later via `signInWithIdToken`. |
| 017 | Claude Haiku 5.5 at effort low | Compared with Opus/Sonnet on real sheets: ~0.1 ct vs. ~5 ct per sheet. |
| 018 | Photo preparation in the browser (OpenCV.js) | Normal camera photo, whole page or part. Sheet filling ≥ 35 % of the image (largest convex quad on a 500 px copy) is warped; else text lines levelled (±15°, sharpest row profile). Shadows divided out, contrast, crop, ≤ 1600 px, grayscale. Replaced a live auto-capture scanner (needed the whole page, unreliable). OpenCV loads as a classic script from its own asset (the module is a thenable that hangs `import()`); no `cv.reduce`, so sums are in JS. |
| 020 | Scan debug view | `/debug/scan` → `/api/debug-scan`: items, cost, tokens, latency, raw output; stores nothing; model/effort selectable up to Opus/high, so on Vercel only `DEBUG_USERS` (others 404). |
| 021 | Dictation read blind | Given the target, models "read" the correct spelling. The model gets only the word count; prompt says articles are der/die/das. Matching in code by number. Below 0.3 confidence and not matching = "unleserlich" (a 0.6 threshold let sloppy writing pass; Haiku rates clear writing 0.6–0.8). |
| 022 | Voice from Amazon Polly, Daniel, **neural** | Device voices unreliable (Safari fell back to English). Generative engine mispronounced short German words that exist in English ("die Bank"). One MP3 per word; file hash covers voice, engine, text; stale files deleted on the next run; round waits ≤ 8 s, else device voice. IAM user may only synthesize. |
| 023 | Server function errors and limits | Fixed error codes (`api/_lib/http.ts`) → German text (`src/lib/apiError.ts`); details only in the server log. All endpoints via `handler()`; one LLM call `readImage()`. Server reads as the user (RLS). 45 s timeout + one retry (Vercel stops at 60 s); token caps word list 8,000, dictation 4,000, debug 8,000; images ≤ 4 MB base64 (Vercel body limit 4.5 MB). `AI_FAKE=1` for tests. |
| 024 | One team per account; list deletion via server | Parallel first calls once created two teams (prod, 2026-11-12) → unique `user_id` + advisory lock. `/api/delete-word-list` deletes as the user, then audio and photos with the secret key (members cannot delete audio). |
| 025 | Lightweight V-model | UR → SR (status, verification) → tests tagged `[SR-xx]`; one requirements page, one verification page. |
| 026 | Players as their own table, progress per player | Several children per team; typed profile columns. Lists shared, rounds per player. Device remembers who practises. The migration gave teams with rounds one player "Kind" to rename. |
| 027 | Trainers, invitations, shared-device PIN | First trainer admin, only admins invite; one-time, 7-day, email-bound links shared manually (no email sent); a new link revokes the pending one; joining never moves data. PIN = HMAC with its own secret `PIN_PEPPER` (Supabase key rotation leaves PINs intact); 5 failures → 15 min lock; gate per browser tab, cleared on sign-out. Never replaces auth/RLS. Removing trainers or teams is out of scope. |
| 028 | Player card as start page; metrics in shared code | Player colour as CSS variable `--player`. Metrics are pure functions in `shared/dictation/metrics.ts` over loaded rounds, no extra tables. Training time tracked, shown only to trainers in the round report, never to the child (no speed goals). Sign-out sits in the trainer area, except on a new account without players. |
| 029 | One player modal; grade required | Same modal for trainers and the player's own card. The PIN guards team management, not a child's own card; only trainers set the grade (it will filter learning units). Existing players got Klasse 1 as a placeholder; no column default. |
| 030 | Font B612, self-hosted | Legibility; no Google Fonts request. Digits from B612 Mono via `unicode-range`, so all numbers are monospaced. |
| 031 | Keep the sheet photo with its round | Reports can be checked against what the child wrote. The prepared JPEG is uploaded after grading as the member; a failed upload never fails the round. Lives exactly as long as its round. Confidence < 0.5 → "unsicher gelesen". |
| 032 | Player photo cut out and redrawn on the device | MediaPipe selfie segmenter (model in `public/models`, WASM from npm, CPU), `portrait.ts` redraws in cel style. Only the PNG drawing is uploaded; the original never leaves the device. Cloud image AI rejected (face to a third party). Only trainers set photos. Sticker look; names in Barlow Condensed. |
| 033 | Deletion on the server, rows first | Player and team deletion run as server functions so Storage files are removed with the secret key (members cannot list or delete audio). Rows go first (RLS checks the caller), then files and accounts: a later failure leaves unreachable files or an empty account, never half a team. Team deletion also deletes the trainer accounts – an account belongs to exactly one team (ADR-024). |
| 034 | Match lines to words by content, not only by order | A real sheet showed one skipped word turning into three errors: lines without a readable number filled the words strictly in order. Now numbered lines that clearly resemble their word are placed first; the rest is aligned in sheet order by letter similarity with gaps (`shared/dictation/match.ts`). The model still reads blind (ADR-021) – the comparison with the dictated words happens only in code. The model's raw lines are stored with the round so a matching can be checked and redone. |
| 035 | Subjects and training types in code, Klasse range on the content | The catalog (`shared/subjects.ts`: Fach → training type with suitable grades, available or "kommt später") lives in code because a new training type needs code anyway. The Klasse range sits on each list, not on the training type, so a Wort-Diktat for Klasse 2 is just another list. Existing lists got 1–6 so nothing disappeared. One flat list of labelled cards instead of headings per subject and a list picker, sorted by date (upcoming tests first, then newest); status (Neu / In Arbeit / Abgeschlossen) is derived from the secure words (Tore): none, all, else in progress – so "In Arbeit" never stands next to "0 von n sicher". |
| 036 | Crests from attributes, inspired by club colours | A scheme (`children.color`) is built from shape, kit pattern with direction, colours, rim, text and action colour (`schemes.ts`, drawn by `PlayerCrest`). Real club colours and generic kit patterns make them recognisable; names, monograms, heraldic figures and real logo layouts are never used (trademarks). Light kits show their own colour behind dark text, dark kits run into navy. The action colour (`--player`) always carries white text; unit tests check every scheme. Earlier ids are mapped forward by migration, never rewritten. The list is meant to grow (rewards later), hence a swipe row in the form. |
| 037 | Reusable modal presentation | All modal interactions use the shared `Dialog` in `src/components/ui.tsx`: bottom sheet by default, compact/wide size, or explicit full-screen for immersive photo views. Placement, transitions, safe-area spacing, backdrop and close behavior stay centralized. |
| 038 | Motion for gestures and choreographed animation | Motion (`motion/react`) is the only animation system for interactions: the shared `Dialog`'s enter/exit (sheet, backdrop through `--backdrop`), the player card and the shared `SwipeRow` (drag with finger and mouse, momentum, snapping; numeric drag limits from a ResizeObserver, because a ref is measured wrongly inside the modal's animated sheet). The card is one object: the start page and the editor share a `layoutId`, so Motion flies it from the page into the modal (scale, tilt) and back; the page leaves an empty place meanwhile. The editor is a `stage` dialog (whole screen, no transform or container-type on it): the card lies on its own layer, the form sheet scrolls over it and covers its stats. A custom flight with measured rects was tried and dropped (more code, clipping). The way back runs under the backdrop (the page is below the top layer); accepted. Reduced motion: no flight, no momentum. Whole-card swipes (players on the start page, clubs in the editor) use the small shared `CardSwiper` on plain pointer events, not Motion drag. |
| 039 | Card edge in the club's rim colour, rarity as stars | The white sticker edge (ADR-032) becomes the crest's rim colour, so the club reads from the whole card. Name and position get per-scheme colours from the scheme's own set (white/navy allowed), stat tiles turn white on coloured rims; unit tests guarantee ≥ 4.5:1 for every scheme, so a new club cannot ship unreadable. Each scheme has a rarity tier 1–5 based on how elaborate the crest is (not a ranking of clubs); shown as filled stars only, by the crest, to avoid reading as a mark. Unlocking by progress stays a separate decision. |
| 040 | Strategy before drill: sheet check and Berichtigung in the dictation loop | The child's marks suffer from missing self-checks and weak copying more than from not knowing the words. So the loop gets a sheet check before the photo (personal Schwerpunkt first; corrections on paper count, the reading ignores crossed-out writing) and a Berichtigung after the report: the wrong words, look–cover–write–compare, photographed and graded like a dictation. A Berichtigung is a `dictation_rounds` row with `corrects_round_id` (same player and list by foreign key, deleted with its round) rather than a new table: reading, grading, photo and reset work unchanged. It is not a test situation (the word was just seen), so Tore, Trefferquote, Schwerpunkt, word choice and the progress bar count dictations only; it keeps the Serie going. A next Berichtigung takes only the words still wrong. |
| 041 | Vokabeln as a word list with a training type | English vocabulary reuses the whole dictation loop (rounds, sheet check, reading, grading, Berichtigung, metrics) instead of a new one: a list carries `discipline` (`word-dictation` or `vocabulary`, fixed once it has words) and a Vokabeln word stores the English word as `word` and its German meaning as `translation`. Polly says the German meaning twice with the German voice (no English voice to pay for or tune); the child writes the English word, read blind with an English prompt (`language: en`) and compared with the same code – capitalised English nouns show up as groß/klein. The sheet check asks for small letters instead of the German noun and spelling tips. Lists are read by their own endpoint (`read-vocab-list`) so each contract keeps one output type. Direction German → English only, like a Vokabeltest; English → German or spoken English can come later. |
| 042 | Liga: jerseys unlocked by practice | Follows ADR-039 ("unlocking by progress stays a separate decision"). Five leagues match the five rarity tiers: a league opens the clubs with as many stars. Goals instead of points: a child understands "10 Spiele, 5 Trainingstage" better than a score. Goals count practice (games, days, words ever right, a finished Berichtigung), never speed, never mistakes, never other players; Trainingstage keep one long afternoon from skipping leagues. The earned league is derived in shared code from the rounds the app already loads (like ADR-028), but the reached league is stored in `children.league` as a high-water mark, because "Fortschritt zurücksetzen" and deleting a list delete rounds and a child must never lose a star. The app raises it (conditional update `league < earned`, so the Aufstieg is shown once); this catches up older rounds without a data migration. Trainers set it in the player form; not below the earned league, which the app would raise again at once. The lock is in the UI only, like the Klasse (players have no login; the PIN gate is no security boundary, SR-08). Clubs worn before stay wearable. Thresholds are a first guess, to tune with real rounds. |
| 043 | Code quality gates aimed at agent drift | Agents write most of the code. Lint, types and complexity stay clean on their own; what drifts is duplication, dead code, layering and weak tests. Gates: oxlint import rules (no cycles, layer boundaries), knip (no unused code), jscpd (≤ 1 % duplication), Stryker on `shared/` (mutation score ≥ 75 %). Thresholds sit just under the 2026-11-16 baseline and only go up. dependency-cruiser was dropped and Stryker's tsconfig rewrite turned off: neither supports TypeScript 7 yet, and the import rules fit into oxlint anyway. Fast gates run in the `pre-push` hook and in `npm run check`. Mutation testing runs only in CI, on the `shared/` tests alone (no Supabase needed): about 20 s. Feature-to-feature imports stay allowed: player, dictation and children depend on each other by design. |
| 043 | Klasse picker: one tap = one Klasse, a range only on purpose | User validation 2026-11-15: a new list starts with the device player's Klasse, and "tap a second grade = range" turned a lower-grade list into a range, so the older child got it. School word lists are almost always for one Klasse, so a tap replaces the choice; "Mehrere Klassen" switches to the range mode (a second tap spans). Unticking keeps the lowest Klasse. Existing ranges open with the box ticked. |
| 044 | Daily quotas per account and a global cap | Sign-up stays open (portfolio, other families), so every paid call (Claude reading, Polly) is counted before it runs: per account and day, and per kind over all accounts, which bounds the bill even with many throwaway accounts. Counting is a Postgres function only the server may call (`consume_ai_quota`, advisory lock per kind and day so parallel calls cannot overshoot); the limits live in `api/_lib/quota.ts` so tuning needs no migration. Per account rather than per team: on the shared family device one account is the team in practice, and an invited trainer gets their own budget. Not chosen: rate limits in Vercel or a KV store (one more service; Postgres is already there). The provider spend limits (Anthropic, AWS Budgets) stay the last net. |
