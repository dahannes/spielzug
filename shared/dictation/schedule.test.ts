import { describe, expect, it } from 'vitest'
import { daysUntil } from './schedule.js'

describe('days until the test', () => {
  const today = new Date(2026, 10, 12, 21, 30) // 12 Nov, late evening

  it('[SR-23] counts whole calendar days, independent of the time of day', () => {
    expect(daysUntil('2026-11-12', today)).toBe(0)
    expect(daysUntil('2026-11-13', today)).toBe(1)
    expect(daysUntil('2026-12-01', today)).toBe(19)
    expect(daysUntil('2026-11-10', today)).toBe(-2)
    expect(daysUntil(null, today)).toBeNull()
  })

  it('[SR-23] is not thrown off by the switch to winter time', () => {
    expect(daysUntil('2026-10-26', new Date(2026, 9, 24, 12))).toBe(2)
  })
})
