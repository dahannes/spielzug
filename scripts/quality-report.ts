// npm run quality:report – code quality trends as Markdown: size, test share, duplication, unused
// code, commit mix and churn hotspots (files that change often and are large – where bugs and
// drift collect). Report only, no gate; the gates are in `npm run quality`. In CI the report is
// added to the job summary ($GITHUB_STEP_SUMMARY). See docs/verification.md#code-quality.
import { execFileSync } from 'node:child_process'
import { appendFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const DAYS = 30
const CODE = /^(src|shared|api)\/.*\.(ts|tsx)$/
const isTest = (file: string) => /\.test\.tsx?$/.test(file)
const isGenerated = (file: string) => file === 'shared/database.types.ts'

const run = (cmd: string, args: string[]) =>
  execFileSync(cmd, args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] })

const lines = (file: string) => readFileSync(join(root, file), 'utf8').split('\n').length

const files = run('git', ['ls-files']).split('\n').filter((f) => CODE.test(f) && !isGenerated(f))
const code = files.filter((f) => !isTest(f))
const codeLines = code.reduce((sum, f) => sum + lines(f), 0)
const testLines = files.filter(isTest).reduce((sum, f) => sum + lines(f), 0)
const e2eLines = run('git', ['ls-files', 'e2e']).split('\n').filter((f) => f.endsWith('.ts')).reduce((sum, f) => sum + lines(f), 0)

function duplication(): string {
  const out = mkdtempSync(join(tmpdir(), 'jscpd-'))
  try {
    run('npx', ['jscpd', '--reporters', 'json', '--output', out, '--threshold', '100'])
    const { percentage, clones } = JSON.parse(readFileSync(join(out, 'jscpd-report.json'), 'utf8')).statistics.total
    return `${Number(percentage).toFixed(2)}% (${clones} clones)`
  } finally {
    rmSync(out, { recursive: true, force: true })
  }
}

function unused(): number {
  try {
    run('npx', ['knip', '--reporter', 'json'])
    return 0
  } catch (error) {
    // knip exits 1 when it finds something; the JSON is still on stdout
    const { issues } = JSON.parse((error as { stdout: string }).stdout) as { issues: Record<string, unknown>[] }
    return issues.reduce((sum, issue) => sum + Object.values(issue).filter((v) => Array.isArray(v) || (v && typeof v === 'object')).reduce<number>((n, v) => n + (Array.isArray(v) ? v.length : Object.keys(v as object).length), 0), 0)
  }
}

const subjects = run('git', ['log', `--since=${DAYS}.days`, '--no-merges', '--format=%s']).split('\n').filter(Boolean)
const typeCount = (type: string) => subjects.filter((s) => s.startsWith(`${type}(`) || s.startsWith(`${type}:`) || s.startsWith(`${type}!`)).length
const feats = typeCount('feat')
const fixes = typeCount('fix')

const churn = new Map<string, number>()
for (const file of run('git', ['log', `--since=${DAYS}.days`, '--no-merges', '--name-only', '--format=']).split('\n')) {
  if (code.includes(file)) churn.set(file, (churn.get(file) ?? 0) + 1)
}
const hotspots = [...churn]
  .map(([file, changes]) => ({ file, changes, lines: lines(file), score: changes * lines(file) }))
  .sort((a, b) => b.score - a.score)
  .slice(0, 10)

const report = `## Code quality report

| Metric | Value |
|---|---|
| Code lines (src, shared, api; no tests) | ${codeLines} |
| Unit test lines / E2E lines | ${testLines} / ${e2eLines} (${Math.round(((testLines + e2eLines) / codeLines) * 100)}% of code) |
| Duplication | ${duplication()} |
| Unused files, exports, deps (knip) | ${unused()} |
| Commits last ${DAYS} days | ${subjects.length} (feat ${feats}, fix ${fixes}, fix/feat ${feats ? (fixes / feats).toFixed(2) : '–'}) |

### Hotspots (last ${DAYS} days: changes × lines)

| File | Changes | Lines | Score |
|---|---:|---:|---:|
${hotspots.map((h) => `| \`${h.file}\` | ${h.changes} | ${h.lines} | ${h.score} |`).join('\n')}
`

console.log(report)
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report)
