import { describe, expect, it } from 'vitest'
import { inkBounds, profileSharpness, searchAngle } from './layout'

describe('page layout', () => {
  it('[SR-30] level text lines give a sharper row profile than blurred ones', () => {
    expect(profileSharpness([0, 50, 0, 50, 0])).toBeGreaterThan(profileSharpness([20, 30, 20, 30, 20]))
  })

  it('[SR-30] finds the angle with the best score, to a quarter degree', () => {
    expect(searchAngle((a) => -Math.abs(a - 4.3))).toBeCloseTo(4.25, 2)
    expect(searchAngle((a) => -Math.abs(a + 7))).toBe(-7)
    expect(searchAngle(() => 1)).toBe(0)
  })

  it('[SR-30] crops to the written area with a margin; nothing to crop when ink fills the page', () => {
    const rows = [0, 0, 0, 0, 5, 9, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    const cols = [0, 0, 0, 0, 0, 0, 0, 0, 4, 8, 8, 3, 0, 0, 0, 0, 0, 0, 0, 0]
    expect(inkBounds(rows, cols, 1, 0.05)).toEqual({ x: 7, y: 3, width: 6, height: 6 })
    expect(inkBounds(new Array(10).fill(3), new Array(10).fill(3), 1)).toBeNull()
    expect(inkBounds(new Array(10).fill(0), new Array(10).fill(0), 1)).toBeNull()
  })
})
