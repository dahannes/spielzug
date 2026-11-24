// Conventional Commits (docs/working-agreements.md): type(scope)!: subject – checked on every
// commit (simple-git-hooks) and in CI. The type decides the next version (npm run release).
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'perf', 'refactor', 'style', 'test', 'docs', 'build', 'ci', 'chore', 'revert']],
    // German UI words, ids and file names may start a subject
    'subject-case': [0],
    'body-max-line-length': [2, 'always', 100],
  },
}
