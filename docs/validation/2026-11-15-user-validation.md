# User validation test 2026-11-15

Simulated user validation with three persona agents that drove the app live (Playwright, tablet landscape and phone) and a facilitator agent that merged their reports and checked the suspected bugs in code. The personas are fictional user types (an older and a younger primary school child, a second parent); no real child's data is in the repo ([working agreements](../working-agreements.md#privacy-and-anonymity)).

| Persona | Device | Focus |
|---|---|---|
| Child A – older primary school child, main user, reads fast, skips long text | family iPad, phone | card, Liga, dictation round, correction, Berichtigung |
| Child B – younger child, early reader, taps everything | family iPad | card, robustness (double taps, back, wrong card, PIN guesses), empty states, round |
| Trainer B – second parent, invited by the admin, phone first, new to the app | phone, tablet | invitation, sign-up, trainer area, word list, player card, round report |

Setup: local stack, own dev server with `AI_FAKE=1` (no LLM, no Polly), a fresh family team (admin, two players, one list for the older child's Klasse, an invitation). Children use the admin's session on the family device, as in real use.

## Test artefacts (not findings)

- `AI_FAKE` reads the same wrong word on every line: every result is 0 of n. Only the framing of a bad result was judged.
- No audio (headless, no Polly).
- An implausible round duration came from an agent pause during the round.
- The team PIN was set by the setup; only the lock message and lock-out exposure count.
- Headless clicks hung during word steps on browser speech playback; stubbing `speechSynthesis` fixed it. Verify on a real iPad (manual check 1).

## Suspected bugs checked in code

| # | Suspicion | Verdict | Evidence |
|---|---|---|---|
| a | Double tap on "Weiter →" skips a word | confirmed | `DictationSteps.tsx:42-51,67,108`: no guard; after the first tap the same button carries the next index. `say()` fires twice. Same pattern in `CorrectionSteps.tsx:77`; on the last word `whistle` may be tracked twice (`:49`). |
| b | Round lost on reload | confirmed | step only in `useState` (`DictationSteps.tsx:27`, `CorrectionSteps.tsx:20`); `RoundPage.tsx:36-38` does not restore it. Kickoff is tracked again (`:59`, may overwrite `started_at` – not verified). Gap, not a violated SR (SR-20 only says "same words"). |
| c | Card stats ignore the player's Klasse | partly: gallery and editor preview | `card.ts:37-38,53-54`, `CardFace.tsx:117-118`, `PlayerForm.tsx:107` pass all lists → violates SR-60. The start-page card filters at `PlayerCardPage.tsx:55`. |
| d | Klasse picker turns "2" into "2–4" | confirmed, as specified | `shared/subjects.ts:58-61`, default `WordListEditorPage.tsx:53`, test `subjects.test.ts:19-20`, SR-13. A usability trap: the younger child's list reached the older child. |
| e | Any trainer changes the PIN without the current one | confirmed | `api/team-pin.ts:29-39`: no role or current-PIN check. SR-08 says "any trainer", current PIN unspecified. |

## Findings

Severity: major = significantly hinders a task or hits several personas; minor = one persona or cosmetic.

### Major

| # | Finding | Personas | Component | Suggested fix | Effort |
|---|---|---|---|---|---|
| F1 | Reload, app switch or Back restarts the round at the preparation and word 1, also after Abpfiff; the Berichtigung restarts at its intro. | A, B | `DictationSteps.tsx`, `CorrectionSteps.tsx`, `RoundPage.tsx` | persist the step per round (sessionStorage or search param), skip the preparation once started, idempotent kickoff, handle Back | M |
| F2 | Double tap on "Weiter →" skips a word; numbering on the sheet no longer matches. | B | `DictationSteps.tsx`, `CorrectionSteps.tsx` | functional state update keyed on the source index; E2E test | S |
| F3 | The result looks like a red school correction ("+0" Tore, no encouragement); on the iPad the Berichtigung is below the fold and "Nächstes Training" competes with it (UR-14). | A, B | `RoundResult.tsx` | positive header, Berichtigung as primary action above the fold, no "+0" | M |
| F4 | Progress is hard to see: the list stays "Neu" after rounds, Liga progress only in its tab, the Berichtigung shows no visible effect. | A, B | `LeaguePanel.tsx`, `plan.ts`, start page | next-goal chip on the start page, reward preview, wording for "Neu" | M |
| F5 | Trainer gallery and editor preview show card stats of another Klasse's list (SR-60). | Trainer B | `card.ts`, `CardFace.tsx`, `PlayerForm.tsx` | filter by grade inside `cardStats`; unit test | S |
| F6 | Klasse picker trap: a new list starts with the device player's Klasse; tapping another gives a range. | Trainer B | `shared/subjects.ts`, `WordListEditorPage.tsx` | single select by default, explicit range toggle, readable hint; update SR-13 | S |
| F7 | An early reader has nothing to do until a parent creates a list; the child sees only parent text and parent buttons ("+ Neue Wörterliste"). | B, A | `PlayerCardPage.tsx` (Trainingsplan) | child-facing empty state, demote create actions | M |
| F8 | PIN: lock message shows no attempts left or lock time; a child can lock the parents out; any trainer changes the PIN without the current one. | B, Trainer B | `TrainerPages.tsx`, `api/team-pin.ts`, `src/lib/apiError.ts` | separate messages, current PIN (or admin) to change, reset via email code; update SR-08 | M |
| F9 | Siblings can edit each other's card (club, number, name) without owner, undo or history. | B, A | `PlayerForm.tsx`, `PlayerCardPage.tsx` | design decision: edit only the active card, or undo/history; SR-06 | M |

### Minor

| # | Finding | Personas | Component |
|---|---|---|---|
| F10 | Round reports are not reachable from the trainer area; the report has no "what to practise" summary. | Trainer B | `TrainerPages.tsx`, `TrainingPage.tsx` |
| F11 | Typed words count only after "Hinzufügen"; saving lands outside the trainer tabs; "Fortschritt zurücksetzen" sits close to the lists. | Trainer B | `WordListEditorPage.tsx` |
| F12 | The list editor is reachable by children without the PIN. | B | list editor route |
| F13 | Copy too hard for early readers (Aufstieg, Trefferquote, Schwerpunkt, Serie, Spielvorbereitung vs. Trainings-Vorbereitung, Tintenkiller, Nachspielzeit text); "Nomen mit Artikel" shown for a list without articles; technical voice names. | B, A, Trainer B | card stats, Liga tab, preparation, `VoicePicker.tsx`, `check.ts` |
| F14 | Sheet check is ticked through; disabled "Foto machen"/"Aus Fotos wählen" look active and give no feedback. | A, B | `PhotoCapture.tsx`, `check.ts` |
| F15 | Tapping a locked club gives no feedback; the Liga tab does not show the reward (new clubs). | A, B | `PlayerForm.tsx`, `LeaguePanel.tsx` |
| F16 | Card editor: number roll reacts to swipe only, faint ▲/▼; in iPad landscape the sheet hides number and pitch; "Spieler löschen" next to the save buttons. | A, B, Trainer B | `PlayerForm.tsx` |
| F17 | With two players a double tap on the card arrow returns to the same card. | B | card switcher |
| F18 | Berichtigung: no progress dots, no celebration at the end. | A | `CorrectionSteps.tsx` |
| F19 | The Spielvorbereitung lists all words right before the round (SR-64, intended – pedagogy decision). | A, B | `TrainingPage.tsx` |
| F20 | Phone: the card fills the first screen; "Anpfiff" far down; the checklist every round. | A | start page, preparation |
| F21 | Invitation names neither team nor inviter; "Konto erstellen" opens the login form; no welcome after joining; keypad needs "Weiter" after 4 digits. | Trainer B | `/trainer/join`, `LoginPage` |
| F22 | Konto: no privacy information, no way to leave the team or delete one's own account. | Trainer B | Konto tab |

### Enhancements

E1 name length that fits the card · E2 Liga ladder with clubs per league · E3 celebration after Berichtigung and Liga goals · E4 speaking indicator on the speaker button.

## What worked

- Card editor: picking a club repaints the card; number and position on the pitch were the favourite moment.
- Round word screen: big number, speaker button, progress dots; Abdecken/Vergleichen in the Berichtigung.
- Report with the sheet photo side by side on the tablet – the clearest trainer screen.
- Sign-up with email code; trainer area overview (admin vs. trainer).

## Manual checks with the real children

1. iPad with Polly: "Weiter" never hangs after speech; replay works; voice names are acceptable.
2. Fast and double taps on "Weiter →", "Nochmal hören", "Abpfiff".
3. App switch and Safari reload at word 5, at Abpfiff, in the Berichtigung.
4. Handwritten sheet: a crossed-out word, a skipped number, a missing number ticked in the check.
5. Reaction to a real middle result and to 0 or full marks: which button first, is the Berichtigung started?
6. Card editor on the iPad: number roll by tap and swipe, landscape sheet, locked club, Verein row drag, card swipe, PIN keypad.
7. Reading test with the younger child: which words can they read and explain?
8. One sibling opens the other's editor – reactions.
9. Is Liga progress noticed and does it motivate another round?
10. A non-admin trainer changes the PIN while 4 of 5 attempts are used – recovery path.
11. iPad camera: whole and partial page; Safari memory with OpenCV.js.
