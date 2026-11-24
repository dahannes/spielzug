import { afterEach, describe, expect, it, vi } from 'vitest'
import { mayDebug } from './auth'

describe('debug access', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('[SR-42] is open for every account only with DEBUG_OPEN=1 (the Vite dev server)', () => {
    vi.stubEnv('DEBUG_OPEN', '1')
    vi.stubEnv('DEBUG_USERS', '')
    expect(mayDebug({ email: 'anyone@example.test' })).toBe(true)
  })

  it('[SR-42] is closed by default, also off Vercel (self-hosted)', () => {
    vi.stubEnv('DEBUG_OPEN', '')
    vi.stubEnv('VERCEL_ENV', '')
    vi.stubEnv('DEBUG_USERS', '')
    expect(mayDebug({ email: 'anyone@example.test' })).toBe(false)
  })

  it('[SR-42] otherwise only for allowlisted accounts, case-insensitive', () => {
    vi.stubEnv('DEBUG_OPEN', '')
    vi.stubEnv('DEBUG_USERS', 'a@example.test, B@Example.test')
    expect(mayDebug({ email: 'b@example.test' })).toBe(true)
    expect(mayDebug({ email: 'c@example.test' })).toBe(false)
    expect(mayDebug({ email: undefined })).toBe(false)
  })

  it('[SR-42] on a deployment closed when no allowlist is set', () => {
    vi.stubEnv('DEBUG_OPEN', '')
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('DEBUG_USERS', '')
    expect(mayDebug({ email: 'a@example.test' })).toBe(false)
  })
})
