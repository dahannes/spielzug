# Working agreements

Binding for everyone working on the project – people and agents.

## Language

- **Project language is English:** code, identifiers, comments, commits, docs.
- **UI text is German**, child-friendly, short sentences. Conversation with the maintainer may be German.

## Privacy and anonymity

- **No personal data of children in the repo:** no names, grades, real mistakes, dates or photos. Tests use fictional data.
- **No class material in the repo:** word lists and worksheets live only in the family's database.
- Child data only in the EU (Supabase Frankfurt, Langfuse EU, Polly eu-central-1).
- Photos: of paper only (word lists, dictation sheets). Of the child only a portrait that trainers set; it is cut out and redrawn on the device, and only the drawing is stored (ADR-032). Test photos are licensed stock photos of adults, never children.
- No images to Langfuse – only image size and the request.
- What is stored where and for how long: [data map](data-map.md).

## Secrets

- Never print or commit values from `.env*`.
- Never prefix server secrets with `VITE_`. Secret key, AI and AWS keys only in `api/`.
- No live operational values in tracked files (account IDs, project ref, Vercel team, IAM user names, personal addresses, the release log; the production URL is public in the README): they go into the untracked `docs/operations.private.md`; tracked docs use placeholders like `<project-ref>`. The repo is being prepared for open-sourcing ([plan](open-source-plan.md)).

## AI

- Dictations are read **blind** – the model never sees the expected words. A reading below confidence 0.3 that does not match counts as a mistake ("unleserlich"); above that, the letter-by-letter comparison decides (ADR-021).
- E2E and server tests never call an LLM or Polly (`AI_FAKE=1`).
- Check the current SDK documentation before writing LLM SDK code (agents: load an API skill if available). Langfuse: `NodeTracerProvider` + `LangfuseSpanProcessor`, `forceFlush()` before returning, token field `usageDetails`.

## Database

- Schema only via migrations; RLS on every table, explicit grants, `anon` gets nothing.
- The cloud database is live: pushed migrations are never changed; every schema change is a new migration, shown to the maintainer before `db push --remote`.
- **Ask before `npm run db:reset`** once someone uses the local app – it deletes accounts and word lists.
- Anything that changes the cloud or GitHub (`supabase db push`, `git push`, deploys, env vars, AWS) only with explicit approval. Procedure: [operations](operations.md#release-procedure).

## Requirements and tests

- Every change that adds or changes behaviour updates [requirements](requirements.md) (SR status, verification) in the same commit.
- Test titles carry the SR ids (`[SR-32] …`); never renumber an id. See [verification](verification.md).

## Git

- Repository: https://github.com/dahannes/spielzug (private until the maintainer makes it public, [PolyForm Noncommercial](../LICENSE.md); the history before 1.6.0 is in the private `spielzug-archive`), branch `main`. CI runs on every push and pull request (`.github/workflows/ci.yml`: commit messages, secret scan, quality report and mutation tests, `npm run check`). A `pre-push` hook runs `npm run check:fast`.
- Small, meaningful commits in **Conventional Commits** form: `type(scope)!: subject`. Types: `feat`, `fix`, `perf`, `refactor`, `style`, `test`, `docs`, `build`, `ci`, `chore`, `revert`. Scopes are optional, e.g. `db`, `api`, `ui`, `dictation`, `player`, `trainer`, `deploy`. A commit hook (`commitlint`) rejects other messages.
- `npm run check` before each commit. No attribution lines in commits.
- Quality gates (import rules, knip, jscpd, mutation score; see [code quality](verification.md#code-quality)): fix the finding, never loosen the threshold or add an ignore without the maintainer's go.
- **Semantic versioning**, derived from the commits by `npm run release`: `fix`/`perf` → patch, `feat` → minor, `!` or `BREAKING CHANGE:` → major. It updates `package.json` and `CHANGELOG.md` and tags `vX.Y.Z`; production only ever runs a tagged version.
- Pushed history is never rewritten (no force-push on `main`).
- Alpha phase: finished work goes straight into `main` (small branch → `npm run check` → rebase-merge right away); no open PRs waiting, PR descriptions short.
- Uncommitted changes in the maintainer's checkout (often docs) are the maintainer's: ask before committing them.

## Effort

- Alpha phase: choose the lightest adequate path; keep replies and status updates short. Be thorough where it lasts: data model, security model.
- Ask about open decisions instead of guessing; where a convention has a clear standard, use it and say so.
