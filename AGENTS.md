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

## Open threads

Current work, release log, prod to-dos and device checks are kept in the untracked `docs/operations.private.md` (section "Open threads", maintainer's machine only). Read it at the start of a session if it exists; update it there, never here – this file is public.
