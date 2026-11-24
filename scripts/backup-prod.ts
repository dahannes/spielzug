// npm run backup:prod – read-only backup of the cloud project: database dumps (schema, data incl.
// accounts and Storage metadata, roles) via the Supabase CLI, plus every file of every Storage
// bucket, with a manifest (sizes, SHA-256) that is checked against the bucket listings.
//
// Target: $BACKUP_DIR or ~/Backups/spielzug, one folder per run, readable only by this user –
// it holds children's data and password hashes. Never inside the repo. Keys come from .env.local
// and are never printed.
import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { chmodSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')

function env(): Record<string, string> {
  const values: Record<string, string> = {}
  for (const line of readFileSync(join(root, '.env.local'), 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match) values[match[1]] = match[2].replace(/^"|"$/g, '')
  }
  return values
}

function dump(file: string, args: string[]): number {
  execFileSync('npx', ['supabase', 'db', 'dump', '--remote', '-f', file, ...args], { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] })
  chmodSync(file, 0o600)
  return statSync(file).size
}

type Storage = ReturnType<ReturnType<typeof createClient>['storage']['from']>

/** All file paths in a bucket below `prefix`; Storage lists one folder level at a time. */
async function filesBelow(storage: Storage, prefix: string): Promise<string[]> {
  const files: string[] = []
  for (let offset = 0; ; offset += 1000) {
    const page = await storage.list(prefix, { limit: 1000, offset })
    if (page.error) throw page.error
    for (const entry of page.data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.id === null) files.push(...(await filesBelow(storage, path)))
      else files.push(path)
    }
    if (page.data.length < 1000) return files
  }
}

const values = env()
const url = values.SUPABASE_URL || values.VITE_SUPABASE_URL
const secret = values.SUPABASE_SECRET_KEY
if (!url || !secret) throw new Error('.env.local needs SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SECRET_KEY of the cloud project')

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const target = join(process.env.BACKUP_DIR || join(homedir(), 'Backups', 'spielzug'), stamp)
if (resolve(target).startsWith(root)) throw new Error('The backup must not be written into the repository')
mkdirSync(target, { recursive: true, mode: 0o700 })
chmodSync(target, 0o700)
console.log(`Backup → ${target}`)

const database = {
  'schema.sql': dump(join(target, 'schema.sql'), []),
  'data.sql': dump(join(target, 'data.sql'), ['--data-only', '--schema', 'public,auth,storage']),
  'roles.sql': dump(join(target, 'roles.sql'), ['--role-only']),
}
console.log(`Database: ${Object.entries(database).map(([f, size]) => `${f} ${size} B`).join(', ')}`)

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })
const buckets = await admin.storage.listBuckets()
if (buckets.error) throw buckets.error
const files: { bucket: string; path: string; bytes: number; sha256: string }[] = []
for (const bucket of buckets.data) {
  const storage = admin.storage.from(bucket.id)
  const paths = await filesBelow(storage, '')
  for (const path of paths) {
    const download = await storage.download(path)
    if (download.error) throw new Error(`${bucket.id}/${path}: ${download.error.message}`)
    const bytes = Buffer.from(await download.data.arrayBuffer())
    const file = join(target, 'storage', bucket.id, path)
    mkdirSync(dirname(file), { recursive: true, mode: 0o700 })
    writeFileSync(file, bytes, { mode: 0o600 })
    files.push({ bucket: bucket.id, path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })
  }
  const got = files.filter((f) => f.bucket === bucket.id).length
  if (got !== paths.length) throw new Error(`${bucket.id}: listed ${paths.length} files, saved ${got}`)
  console.log(`Storage ${bucket.id}: ${got} files`)
}

writeFileSync(
  join(target, 'manifest.json'),
  JSON.stringify({ createdAt: new Date().toISOString(), project: url.replace(/^https:\/\/([^.]+)\..*$/, '$1'), database, buckets: buckets.data.map((b) => b.id), files }, null, 2),
  { mode: 0o600 },
)
console.log(`Done: ${files.length} files, ${files.reduce((sum, f) => sum + f.bytes, 0)} B in Storage. Keep this folder private.`)
