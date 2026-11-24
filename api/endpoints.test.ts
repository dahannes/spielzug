// Server functions against the local Supabase stack, with AI_FAKE (no paid calls).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { POST as debugScan } from './debug-scan'
import { POST as deletePlayer } from './delete-player'
import { POST as deleteTeam } from './delete-team'
import { POST as deleteWordList } from './delete-word-list'
import { POST as prepareAudio } from './prepare-audio'
import { POST as readDictation } from './read-dictation'
import { POST as readVocabList } from './read-vocab-list'
import { POST as readWordList } from './read-word-list'
import { POST as acceptTeamInvitation } from './accept-team-invitation'
import { POST as createTeamInvitation } from './create-team-invitation'
import { POST as teamPin } from './team-pin'

const image = 'x'.repeat(200)
let admin: SupabaseClient
const users: string[] = []
const families: string[] = []

async function member(): Promise<{ token: string; familyId: string }> {
  const status = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))
  const email = `api-${randomUUID()}@example.test`
  const created = await admin.auth.admin.createUser({ email, password: 'test-password-1', email_confirm: true })
  users.push(created.data.user!.id)
  const client = createClient(status.API_URL, status.PUBLISHABLE_KEY, { auth: { persistSession: false } })
  const session = (await client.auth.signInWithPassword({ email, password: 'test-password-1' })).data.session!
  const familyId = (await client.rpc('ensure_family')).data as string
  families.push(familyId)
  return { token: session.access_token, familyId }
}

async function signedIn(email: string): Promise<{ token: string; userId: string }> {
  const status = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))
  const created = await admin.auth.admin.createUser({ email, password: 'test-password-1', email_confirm: true })
  users.push(created.data.user!.id)
  const client = createClient(status.API_URL, status.PUBLISHABLE_KEY, { auth: { persistSession: false } })
  const session = (await client.auth.signInWithPassword({ email, password: 'test-password-1' })).data.session!
  return { token: session.access_token, userId: created.data.user!.id }
}

const post = (fn: (r: Request) => Promise<Response>, body: unknown, token?: string) =>
  fn(
    new Request('http://localhost/api', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
      body: JSON.stringify(body),
    }),
  )

beforeAll(() => {
  const status = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))
  vi.stubEnv('SUPABASE_URL', status.API_URL)
  vi.stubEnv('SUPABASE_SECRET_KEY', status.SECRET_KEY)
  vi.stubEnv('PIN_PEPPER', 'test-pepper')
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', status.PUBLISHABLE_KEY)
  vi.stubEnv('AI_FAKE', '1')
  vi.stubEnv('DEBUG_OPEN', '1')
  admin = createClient(status.API_URL, status.SECRET_KEY, { auth: { persistSession: false } })
})

afterAll(async () => {
  // Families first: deleting a user only removes the membership, not the family.
  for (const id of families) await admin.from('families').delete().eq('id', id)
  for (const id of users) await admin.auth.admin.deleteUser(id)
  vi.unstubAllEnvs()
})

// Each test signs up several accounts against the local stack; on the CI runner that takes
// longer than vitest's default 5 s.
vi.setConfig({ testTimeout: 30_000 })

describe('families', () => {
  it('[SR-02] parallel first calls of ensure_family create exactly one family', async () => {
    const status = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))
    const email = `race-${randomUUID()}@example.test`
    const created = await admin.auth.admin.createUser({ email, password: 'test-password-1', email_confirm: true })
    users.push(created.data.user!.id)
    const client = createClient(status.API_URL, status.PUBLISHABLE_KEY, { auth: { persistSession: false } })
    await client.auth.signInWithPassword({ email, password: 'test-password-1' })
    const ids = await Promise.all(Array.from({ length: 5 }, async () => (await client.rpc('ensure_family')).data as string))
    families.push(...new Set(ids))
    expect(new Set(ids).size).toBe(1)
    const memberships = await admin.from('family_members').select('family_id').eq('user_id', created.data.user!.id)
    expect(memberships.data).toHaveLength(1)
  })
})

describe('trainer access', () => {
  it('[SR-05] invitations are email-bound, one-time, and preserve one team per account', async () => {
    const owner = await member()
    const wrongAccount = await signedIn(`wrong-${randomUUID()}@example.test`)
    const email = `invitee-${randomUUID()}@example.test`
    const actualInvitee = await signedIn(email)
    const inviteResponse = await post(createTeamInvitation, { email }, owner.token)
    expect(inviteResponse.status).toBe(200)
    const { token } = await inviteResponse.json()

    const wrongEmail = await post(acceptTeamInvitation, { token }, wrongAccount.token)
    expect([wrongEmail.status, await wrongEmail.json()]).toEqual([400, { error: 'invitation_invalid' }])
    const accepted = await post(acceptTeamInvitation, { token }, actualInvitee.token)
    expect([accepted.status, await accepted.json()]).toEqual([200, { familyId: owner.familyId }])
    const membership = await admin.from('family_members').select('family_id, role').eq('user_id', actualInvitee.userId).single()
    expect(membership.data).toEqual({ family_id: owner.familyId, role: 'trainer' })

    const reused = await post(acceptTeamInvitation, { token }, actualInvitee.token)
    expect([reused.status, await reused.json()]).toEqual([400, { error: 'invitation_invalid' }])
    const trainerInvite = await post(createTeamInvitation, { email: `other-${randomUUID()}@example.test` }, actualInvitee.token)
    expect([trainerInvite.status, await trainerInvite.json()]).toEqual([403, { error: 'forbidden' }])
  })

  it('[SR-08] team PIN is verified and rate limited', async () => {
    const owner = await member()
    expect(await (await post(teamPin, { action: 'status' }, owner.token)).json()).toEqual({ configured: false })
    expect(await (await post(teamPin, { action: 'set', pin: '4821' }, owner.token)).json()).toEqual({ configured: true })
    expect(await (await post(teamPin, { action: 'status' }, owner.token)).json()).toEqual({ configured: true })
    expect(await (await post(teamPin, { action: 'check', pin: '1111' }, owner.token)).json()).toEqual({ error: 'pin_invalid', attemptsLeft: 4 })
    expect(await (await post(teamPin, { action: 'set', pin: '5678' }, owner.token)).json()).toEqual({ configured: true })
    expect(await (await post(teamPin, { action: 'check', pin: '4821' }, owner.token)).json()).toEqual({ error: 'pin_invalid', attemptsLeft: 4 })
    expect(await (await post(teamPin, { action: 'check', pin: '5678' }, owner.token)).json()).toEqual({ configured: true, verified: true })

    // each failure says how many tries are left; the fifth locks the gate and names its end
    for (const left of [4, 3, 2, 1]) {
      expect(await (await post(teamPin, { action: 'check', pin: '0000' }, owner.token)).json()).toEqual({ error: 'pin_invalid', attemptsLeft: left })
    }
    const locked = await post(teamPin, { action: 'check', pin: '0000' }, owner.token)
    const body = (await locked.json()) as { error: string; lockedUntil: string }
    expect([locked.status, body.error]).toEqual([429, 'pin_locked'])
    const minutes = (new Date(body.lockedUntil).getTime() - Date.now()) / 60_000
    expect(minutes).toBeGreaterThan(14)
    expect(minutes).toBeLessThanOrEqual(15)
    // locked: even the right PIN is refused
    expect(await (await post(teamPin, { action: 'check', pin: '5678' }, owner.token)).json()).toMatchObject({ error: 'pin_locked' })
  })
})

describe('deleting', () => {
  const jpeg = () => new Blob([new Uint8Array([0xff, 0xd8])], { type: 'image/jpeg' })
  const png = () => new Blob([new Uint8Array([0x89, 0x50])], { type: 'image/png' })

  /** A team with one player, a list, one round with a sheet photo, audio and a player photo. */
  async function filledTeam() {
    const owner = await member()
    const list = await admin.from('word_lists').insert({ family_id: owner.familyId, title: 'A', words: [] }).select('id').single()
    const player = await admin.from('children').insert({ family_id: owner.familyId, name: 'Kind', grade: 3 }).select('id').single()
    const listId = list.data!.id as string
    const playerId = player.data!.id as string
    const round = await admin.from('dictation_rounds').insert({ family_id: owner.familyId, child_id: playerId, list_id: listId, word_ids: ['x'] }).select('id').single()
    const scan = `${owner.familyId}/${listId}/${round.data!.id}.jpg`
    const photo = `${owner.familyId}/${playerId}-1.png`
    await admin.storage.from('dictation-scans').upload(scan, jpeg())
    await admin.storage.from('player-photos').upload(photo, png())
    await admin.storage.from('dictation-audio').upload(`${owner.familyId}/${listId}/x-1.mp3`, new Blob([new Uint8Array([0xff, 0xfb])], { type: 'audio/mpeg' }))
    await admin.from('dictation_rounds').update({ scan_path: scan }).eq('id', round.data!.id)
    await admin.from('children').update({ photo_path: photo }).eq('id', playerId)
    return { owner, listId, playerId }
  }
  const filesOf = async (bucket: string, prefix: string) => (await admin.storage.from(bucket).list(prefix)).data ?? []

  it('[SR-09] deleting a player removes their rounds, sheet photos and photo – only in the own team', async () => {
    const { owner, listId, playerId } = await filledTeam()
    const stranger = await member()
    const asStranger = await post(deletePlayer, { playerId }, stranger.token)
    expect([asStranger.status, await asStranger.json()]).toEqual([404, { error: 'not_found' }])

    expect(await (await post(deletePlayer, { playerId }, owner.token)).json()).toEqual({ removedScans: 1, removedPhotos: 1 })
    expect((await admin.from('children').select('id').eq('id', playerId)).data).toHaveLength(0)
    expect((await admin.from('dictation_rounds').select('id').eq('child_id', playerId)).data).toHaveLength(0)
    expect(await filesOf('dictation-scans', `${owner.familyId}/${listId}`)).toHaveLength(0)
    expect(await filesOf('player-photos', owner.familyId)).toHaveLength(0)
    // the list and its audio are team material and stay
    expect((await admin.from('word_lists').select('id').eq('id', listId)).data).toHaveLength(1)
    expect(await filesOf('dictation-audio', `${owner.familyId}/${listId}`)).toHaveLength(1)
  })

  it('[SR-09] the admin deletes the whole team: rows, every file and the trainer accounts', async () => {
    const { owner, listId } = await filledTeam()
    const email = `co-${randomUUID()}@example.test`
    const coTrainer = await signedIn(email)
    const { token } = await (await post(createTeamInvitation, { email }, owner.token)).json()
    await post(acceptTeamInvitation, { token }, coTrainer.token)

    const asTrainer = await post(deleteTeam, { teamName: 'Familie' }, coTrainer.token)
    expect([asTrainer.status, await asTrainer.json()]).toEqual([403, { error: 'forbidden' }])
    const wrongName = await post(deleteTeam, { teamName: 'Falsch' }, owner.token)
    expect([wrongName.status, await wrongName.json()]).toEqual([400, { error: 'bad_request' }])

    expect(await (await post(deleteTeam, { teamName: 'Familie' }, owner.token)).json()).toEqual({ removedFiles: 3, removedAccounts: 2 })
    expect((await admin.from('families').select('id').eq('id', owner.familyId)).data).toHaveLength(0)
    expect((await admin.from('word_lists').select('id').eq('id', listId)).data).toHaveLength(0)
    expect((await admin.from('team_invitations').select('id').eq('family_id', owner.familyId)).data).toHaveLength(0)
    for (const bucket of ['dictation-audio', 'dictation-scans', 'player-photos']) expect(await filesOf(bucket, owner.familyId)).toHaveLength(0)
    expect((await admin.auth.admin.getUserById(coTrainer.userId)).data.user).toBeNull()
  })

  it('[SR-05] a new invitation clears used and expired ones of the team', async () => {
    const owner = await member()
    const first = `old-${randomUUID()}@example.test`
    await post(createTeamInvitation, { email: first }, owner.token)
    // expired: both timestamps in the past (the table requires expiry after creation)
    const past = (ms: number) => new Date(Date.now() - ms).toISOString()
    const aged = await admin.from('team_invitations').update({ created_at: past(9 * 864e5), expires_at: past(2 * 864e5) }).eq('family_id', owner.familyId)
    expect(aged.error).toBeNull()
    await post(createTeamInvitation, { email: `new-${randomUUID()}@example.test` }, owner.token)
    const left = (await admin.from('team_invitations').select('email').eq('family_id', owner.familyId)).data!
    expect(left.map((i) => i.email)).not.toContain(first)
    expect(left).toHaveLength(1)
  })
})

describe('server functions', () => {
  it('[SR-40] need a valid login and a valid body, and answer with fixed codes', async () => {
    expect(await (await post(readDictation, { image, count: 3 })).json()).toEqual({ error: 'unauthorized' })
    expect(await (await post(readDictation, { image, count: 3 }, 'not-a-jwt')).json()).toEqual({ error: 'unauthorized' })
    const { token } = await member()
    const bad = await post(readDictation, { image, count: 0 }, token)
    expect([bad.status, await bad.json()]).toEqual([400, { error: 'bad_request' }])
    const ok = await (await post(readDictation, { image, count: 3 }, token)).json()
    expect(ok.output.lines).toHaveLength(3)
  })

  it('[SR-15] reads English vocabulary lists and sheets with the same rules', async () => {
    expect(await (await post(readVocabList, { image })).json()).toEqual({ error: 'unauthorized' })
    const { token } = await member()
    const list = await (await post(readVocabList, { image }, token)).json()
    expect(list.output.words[0]).toEqual({ english: 'dog', german: 'der Hund' })
    const bad = await post(readDictation, { image, count: 3, language: 'fr' }, token)
    expect([bad.status, await bad.json()]).toEqual([400, { error: 'bad_request' }])
    const sheet = await (await post(readDictation, { image, count: 2, language: 'en' }, token)).json()
    expect(sheet.output.lines).toHaveLength(2)
  })

  it('[SR-03][SR-21] prepare-audio reads lists as the user: other families get not found', async () => {
    const a = await member()
    const b = await member()
    const list = await admin.from('word_lists').insert({ family_id: a.familyId, title: 'A', words: [] }).select('id').single()
    const asA = await post(prepareAudio, { listId: list.data!.id }, a.token)
    expect(await asA.json()).toEqual({ made: 0, removed: 0, total: 0 })
    const asB = await post(prepareAudio, { listId: list.data!.id }, b.token)
    expect([asB.status, await asB.json()]).toEqual([404, { error: 'not_found' }])
  })

  it('[SR-03][SR-12][SR-34] delete-word-list removes the list, its rounds, audio and photos – only for the own family', async () => {
    const a = await member()
    const b = await member()
    const list = await admin.from('word_lists').insert({ family_id: a.familyId, title: 'A', words: [] }).select('id').single()
    const listId = list.data!.id
    const child = await admin.from('children').insert({ family_id: a.familyId, name: 'Kind', grade: 3 }).select('id').single()
    await admin.from('dictation_rounds').insert({ family_id: a.familyId, child_id: child.data!.id, list_id: listId, word_ids: ['x'] })
    const path = `${a.familyId}/${listId}/x-1.mp3`
    await admin.storage.from('dictation-audio').upload(path, new Blob([new Uint8Array([0xff, 0xfb])], { type: 'audio/mpeg' }))
    await admin.storage.from('dictation-scans').upload(`${a.familyId}/${listId}/r.jpg`, new Blob([new Uint8Array([0xff, 0xd8])], { type: 'image/jpeg' }))

    const asB = await post(deleteWordList, { listId }, b.token)
    expect([asB.status, await asB.json()]).toEqual([404, { error: 'not_found' }])
    expect((await admin.from('word_lists').select('id').eq('id', listId)).data).toHaveLength(1)

    expect(await (await post(deleteWordList, { listId }, a.token)).json()).toEqual({ removedAudio: 1, removedScans: 1 })
    expect((await admin.from('word_lists').select('id').eq('id', listId)).data).toHaveLength(0)
    expect((await admin.from('dictation_rounds').select('id').eq('list_id', listId)).data).toHaveLength(0)
    expect((await admin.storage.from('dictation-audio').list(`${a.familyId}/${listId}`)).data).toHaveLength(0)
    expect((await admin.storage.from('dictation-scans').list(`${a.familyId}/${listId}`)).data).toHaveLength(0)
  })

  it('[SR-42] debug-scan is closed outside the dev server for accounts not on the list', async () => {
    const { token } = await member()
    vi.stubEnv('DEBUG_OPEN', '')
    vi.stubEnv('DEBUG_USERS', 'someone-else@example.test')
    expect((await post(debugScan, { image }, token)).status).toBe(404)
    vi.stubEnv('DEBUG_OPEN', '1')
    expect((await post(debugScan, { image }, token)).status).toBe(200)
  })

  it('[SR-44] paid reads stop at the daily quota of the account, with a fixed code', async () => {
    const a = await member()
    const b = await member()
    // read_list: 10 per account and day (api/_lib/quota.ts), shared by word and vocabulary lists
    for (let i = 0; i < 9; i++) expect((await post(readVocabList, { image }, a.token)).status).toBe(200)
    expect((await post(readWordList, { image }, a.token)).status).toBe(200)
    const over = await post(readWordList, { image }, a.token)
    expect([over.status, await over.json()]).toEqual([429, { error: 'quota_exceeded', scope: 'account' }])
    expect((await post(readVocabList, { image }, a.token)).status).toBe(429)
    // another account has its own quota; bad requests are not counted
    expect((await post(readDictation, { image, count: 0 }, b.token)).status).toBe(400)
    expect((await post(readWordList, { image }, b.token)).status).toBe(200)
    const used = await admin.from('ai_usage').select('kind, count, fake').eq('user_id', (await admin.auth.getUser(b.token)).data.user!.id)
    expect(used.data).toEqual([{ kind: 'read_list', count: 1, fake: true }])
  })

  it('[SR-44] prepare-audio counts only runs that make recordings', async () => {
    const a = await member()
    const words = [{ id: 'w1', word: 'Hund', article: 'der', form: null, sentence: 'Der Hund bellt.' }]
    const list = await admin.from('word_lists').insert({ family_id: a.familyId, title: 'A', words }).select('id').single()
    const empty = await admin.from('word_lists').insert({ family_id: a.familyId, title: 'B', words: [] }).select('id').single()
    const userId = (await admin.auth.getUser(a.token)).data.user!.id
    expect((await post(prepareAudio, { listId: empty.data!.id }, a.token)).status).toBe(200)
    expect((await admin.from('ai_usage').select('count').eq('user_id', userId)).data).toEqual([])
    expect((await post(prepareAudio, { listId: list.data!.id }, a.token)).status).toBe(200)
    expect((await admin.from('ai_usage').select('kind, count').eq('user_id', userId)).data).toEqual([{ kind: 'prepare_audio', count: 1 }])
  })
})
