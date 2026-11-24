import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { fail, handler, parseBody } from './http.js'

const flushTraces = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('./tracing.js', () => ({ initTracing: () => {}, flushTraces }))

const post = (body: string) => new Request('http://localhost/api/x', { method: 'POST', body })

describe('server function wrapper', () => {
  afterEach(() => vi.restoreAllMocks())

  it('[SR-40] answers fixed codes with their status and nothing else', async () => {
    const res = fail('account_already_on_team')
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'account_already_on_team' })
    expect(fail('read_failed').status).toBe(502)
    expect(fail('unauthorized').status).toBe(401)
  })

  it('[SR-40] a body is accepted only when it matches the schema; broken JSON is no body', async () => {
    const schema = z.object({ listId: z.string() })
    expect(await parseBody(post('{"listId":"l1"}'), schema)).toEqual({ listId: 'l1' })
    expect(await parseBody(post('{"listId":1}'), schema)).toBeNull()
    expect(await parseBody(post('{not json'), schema)).toBeNull()
  })

  it('[SR-40] unexpected errors become the fixed code, never the message; traces are flushed either way', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const broken = handler('delete_failed', async () => {
      throw new Error('secret detail from the database')
    })
    const res = await broken(post('{}'))
    expect(res.status).toBe(502)
    expect(await res.text()).toBe('{"error":"delete_failed"}')
    expect(log).toHaveBeenCalledOnce()
    expect(flushTraces).toHaveBeenCalledOnce()

    const ok = handler('delete_failed', async () => Response.json({ ok: true }))
    expect((await ok(post('{}'))).status).toBe(200)
    expect(flushTraces).toHaveBeenCalledTimes(2)
  })
})
