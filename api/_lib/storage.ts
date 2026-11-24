// Removing a family's files from Storage with the secret key (members may not delete audio, and
// whole folders are only reachable by listing them).
import type { SupabaseClient } from '@supabase/supabase-js'

/** All file paths below `prefix` (folders are walked; Storage lists one level at a time). */
async function filesBelow(storage: ReturnType<SupabaseClient['storage']['from']>, prefix: string): Promise<string[]> {
  const files: string[] = []
  for (let offset = 0; ; offset += 1000) {
    const page = await storage.list(prefix, { limit: 1000, offset })
    if (page.error) throw page.error
    for (const entry of page.data) {
      const path = `${prefix}/${entry.name}`
      // folders come back without an id
      if (entry.id === null) files.push(...(await filesBelow(storage, path)))
      else files.push(path)
    }
    if (page.data.length < 1000) return files
  }
}

/** Deletes every file below `prefix` in `bucket`; returns how many were removed. */
export async function removeFolder(admin: SupabaseClient, bucket: string, prefix: string): Promise<number> {
  const storage = admin.storage.from(bucket)
  const files = await filesBelow(storage, prefix)
  for (let i = 0; i < files.length; i += 100) {
    const removed = await storage.remove(files.slice(i, i + 100))
    if (removed.error) throw removed.error
  }
  return files.length
}

/** Deletes the given files (missing ones are fine); returns how many were asked for. */
export async function removeFiles(admin: SupabaseClient, bucket: string, paths: string[]): Promise<number> {
  if (paths.length === 0) return 0
  const removed = await admin.storage.from(bucket).remove(paths)
  if (removed.error) throw removed.error
  return paths.length
}
