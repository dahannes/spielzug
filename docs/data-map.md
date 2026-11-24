# Data map

Every kind of data the app handles: where it lives, who can reach it, and how long it stays. Derived from `supabase/migrations/`, `api/` and `src/`. Rules behind it: [working agreements](working-agreements.md#privacy-and-anonymity).

**Where "Postgres" and "Storage" are:** the Supabase project in Frankfurt (eu-central-1). Storage files sit in S3 in eu-central-1; locally in a Docker volume. File metadata lives in Postgres `storage.objects`, guarded by RLS policies. All buckets are private; the app reads files through signed URLs valid for 1 hour. "Members" = the trainer accounts of one team (`family_members`), checked by RLS (`private.is_family_member`, `private.is_own_family_object` = first path segment is the own family id).

## Stored data

| Data | Where | Who can access | Lifetime / deletion |
|---|---|---|---|
| Trainer accounts: email, password hash, sessions | Supabase Auth (`auth.users`) | the account itself; team members see trainer emails (`get_team_trainers()`) | deleted with the team ("Team löschen", admin) – the accounts of all its trainers go too |
| Team (family): name; memberships with role `admin`/`trainer` | `families`, `family_members` | members read; members may update only `families.name` | "Team löschen" in the trainer area (admin, typed team name, `/api/delete-team`): the family row cascades to all tables below, the server removes every Storage file under `<family>/` and deletes the trainer accounts |
| Invitations: invited email, SHA-256 token hash, creator, expiry, accepted/revoked time | `team_invitations` | server only (secret key); no access for members | a new invite revokes the pending one for that email and deletes the team's accepted, revoked and expired invitations; all go with the team |
| Team PIN: HMAC hash, failed attempts, lock time | `team_security_settings` | server only; check via `check_team_pin()` | overwritten on change; removed with the team |
| Usage of paid calls: account, day, kind (`read_dictation`, `read_list`, `prepare_audio`), count, fake flag – no content | `ai_usage` | server only (`consume_ai_quota()`); no access for members | rows older than 31 days are dropped on the next count; removed with the account |
| Players: name, shirt number, position (`tor`/`abwehr`/`mittelfeld`/`sturm`), Klasse (grade), colour-scheme id, league 1–5 (SR-63), `photo_path` | `children` | members (read, write); `color` is constrained to the thirteen scheme ids; earlier ids are mapped by migration | "Spieler löschen" (any trainer, `/api/delete-player`): row, rounds (cascade), their sheet photos and the player photo; with the team |
| Player photo (stylised drawing only) | bucket `player-photos`, `<family>/<child>-<timestamp>.png` (≤ 3 MB, PNG/WebP) | members (read, upload, replace, delete) | old file deleted when a new photo is set or the photo is removed; otherwise stays |
| Word lists: title, training type (`discipline`: Wort-Diktat or Vokabeln), test date, Klasse range (`grade_min`–`grade_max`), words with article, form, sentence; Vokabeln: English word with its German meaning (`translation`) | `word_lists` (`words` JSON, ≤ 100) | members | deleted in the app (`/api/delete-word-list`) together with its rounds, audio and sheet photos |
| Rounds and results: player, word ids, readings with confidence, verdict, mistakes, the model's raw lines (`read_lines`: number, text, confidence), created/started/finished/checked time, `scan_path`; a Berichtigung is a row with `corrects_round_id` and is deleted with its round | `dictation_rounds` | members | deleted by "Fortschritt zurücksetzen" (one player, one list) or with the list |
| Sheet photo (the prepared JPEG the AI read) | bucket `dictation-scans`, `<family>/<list>/<round>.jpg` (≤ 5 MB) | members (read, upload, replace, delete) | deleted with its round: by the app on reset, by the server on list deletion |
| Spoken words (Polly MP3, class material only) | bucket `dictation-audio`, `<family>/<list>/<word>-<hash>.mp3` (≤ 1 MB) | members read; only the server writes and deletes | stale files removed on the next audio run; all removed with the list |
| Selected player on this device | browser `localStorage` `spielzug.child` (player id) | this browser | until browser data is cleared |
| Chosen device voice | browser `localStorage` `spielzug.voice` | this browser | until browser data is cleared |
| Sign-in session | browser `localStorage` `sb-…-auth-token` (supabase-js default) | this browser | until sign-out or expiry |
| Trainer gate passed | browser `sessionStorage` `spielzug.trainer-gate` = `verified` | this tab | tab closed or sign-out |
| Step of an unfinished round (word number, phase; no words or answers) | browser `sessionStorage` `spielzug.round-step.<round id>` | this tab | tab closed |

## Data that passes through (not stored by the app)

| Data | Goes to | Purpose | Kept? |
|---|---|---|---|
| Word-list photo | `/api/read-word-list` → Anthropic API | read the words | not stored by the app |
| Sheet photo (prepared on the device) | `/api/read-dictation` → Anthropic API | read the handwriting blind | the same JPEG is uploaded to `dictation-scans` by the app after grading (row above) |
| Any sheet in the debug view | `/api/debug-scan` → Anthropic API | judge reading quality | not stored |
| Trace of each LLM call: name, prompt text, image **size**, effort, structured output (the words read), tokens, cost | Langfuse EU cloud | cost and quality | kept by Langfuse (retention per Langfuse project settings); **never images** |
| Word and example sentence text | Amazon Polly, eu-central-1 | make the MP3 | not stored by Polly |
| Sign-in codes | Amazon SES, eu-central-1 (locally Mailpit) | confirm / reset | – |
| Unexpected server errors | Vercel function log | debugging | Vercel log retention |

## Never stored

- **The original player photo.** It is cut out and redrawn in the browser (MediaPipe); only the drawing is uploaded (ADR-032).
- **Word-list photos.** Read once, then discarded.
- **Images in Langfuse** – only their size.
- **Children's data in the repo** – names, grades, mistakes, dates, photos (see working agreements).

## Backups

`npm run backup:prod` copies the whole cloud project (all rows incl. accounts, all Storage files) to the maintainer's machine (`~/Backups/spielzug/`, private, never in the repo; [operations](operations.md#backups)). Deleted data stays in older backup runs until those are deleted – keep only the last four.

## Deletion

| What | Who | How | What goes |
|---|---|---|---|
| A word list | any trainer | list editor → delete (`/api/delete-word-list`) | list, its rounds, audio and sheet photos |
| A player's progress on a list | any trainer | "Fortschritt zurücksetzen" | the player's rounds of that list and their sheet photos |
| A player | any trainer | player dialog → "Spieler löschen" (`/api/delete-player`) | player, all their rounds, sheet photos, player photo |
| The team with everything | team admin | Konto → "Team löschen", typed team name (`/api/delete-team`) | all rows of the team, every file under `<family>/` in all three buckets, the accounts of all its trainers |

Removing a single trainer from a team is not offered (out of scope, ADR-027).
