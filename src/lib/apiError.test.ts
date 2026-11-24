import { describe, expect, it } from 'vitest'
import { ApiError, apiJson, errorText } from './apiError'

describe('api errors', () => {
  it('[SR-40] turns server codes into German text, never raw messages', async () => {
    const res = Response.json({ error: 'read_failed' }, { status: 502 })
    const error = await apiJson(res).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(errorText(error)).toBe('Das Foto konnte nicht gelesen werden. Versuch es noch einmal.')
    expect(errorText(new ApiError('something_new', 500))).toBe('Da ist etwas schiefgegangen. Versuch es noch einmal.')
    expect(errorText(new TypeError('Load failed'))).toContain('Keine Verbindung')
  })

  it('[SR-08][SR-40] the team PIN says how many tries are left and until when it is locked', async () => {
    const wrong = await apiJson(Response.json({ error: 'pin_invalid', attemptsLeft: 3 }, { status: 400 })).catch((e: unknown) => e)
    expect(errorText(wrong)).toBe('Der PIN stimmt nicht. Noch 3 Versuche.')
    expect(errorText(new ApiError('pin_invalid', 400, { attemptsLeft: 1 }))).toBe('Der PIN stimmt nicht. Noch 1 Versuch, dann ist der Trainer-Bereich 15 Minuten gesperrt.')
    expect(errorText(new ApiError('pin_invalid', 400))).toBe('Der PIN stimmt nicht.')
    const until = new Date(2026, 10, 15, 14, 35).toISOString()
    expect(errorText(new ApiError('pin_locked', 429, { lockedUntil: until }))).toBe('Zu viele falsche Versuche. Der Trainer-Bereich ist bis 14:35 Uhr gesperrt.')
    expect(errorText(new ApiError('pin_locked', 429))).toBe('Zu viele falsche Versuche. Der Trainer-Bereich ist vorübergehend gesperrt.')
  })

  it('[SR-40][SR-44] the daily quota says when it goes on, the global cap that it is not the family', () => {
    expect(errorText(new ApiError('quota_exceeded', 429, { scope: 'account' }))).toBe('Für heute ist das Limit erreicht. Morgen geht es weiter.')
    expect(errorText(new ApiError('quota_exceeded', 429, { scope: 'global' }))).toBe('Spielzug macht heute Pause. Morgen geht es weiter.')
  })
})
