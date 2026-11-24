// Handler wrapper and fixed error codes for the browser; details go to the server log only.
import type { ZodType } from 'zod'
import { flushTraces, initTracing } from './tracing.js'

export type ErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'bad_request'
  | 'not_found'
  | 'not_configured'
  | 'read_failed'
  | 'audio_failed'
  | 'delete_failed'
  | 'invitation_invalid'
  | 'account_already_on_team'
  | 'pin_invalid'
  | 'pin_locked'
  | 'quota_exceeded'
  | 'trainer_bad_request'
  | 'trainer_failed'

const STATUS: Record<ErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  bad_request: 400,
  not_found: 404,
  not_configured: 500,
  read_failed: 502,
  audio_failed: 502,
  delete_failed: 502,
  invitation_invalid: 400,
  account_already_on_team: 409,
  pin_invalid: 400,
  pin_locked: 429,
  quota_exceeded: 429,
  trainer_bad_request: 400,
  trainer_failed: 502,
}

/** A fixed error code; `details` are only for codes whose text needs them (no internals). */
export function fail(code: ErrorCode, details?: Record<string, string | number>): Response {
  return Response.json({ error: code, ...details }, { status: STATUS[code] })
}

/** The request body if it matches the schema, otherwise null. */
export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T | null> {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  return parsed.success ? parsed.data : null
}

/**
 * A POST handler with tracing (flushed before returning – serverless functions end right after)
 * and one error policy: unexpected errors are logged and answered with `onError`.
 */
export function handler(onError: ErrorCode, fn: (request: Request) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    initTracing()
    try {
      return await fn(request)
    } catch (error) {
      console.error(`[${onError}]`, error)
      return fail(onError)
    } finally {
      await flushTraces()
    }
  }
}
