import { describe, expect, it } from 'vitest'
import { insetQuad, isLargeEnough, orderCorners, quadArea, targetSize, type Quad } from './geometry'

const sheet: Quad = [
  { x: 100, y: 50 },
  { x: 900, y: 80 },
  { x: 880, y: 1200 },
  { x: 120, y: 1180 },
]

describe('scanner geometry', () => {
  it('[SR-30] orders corners regardless of input order', () => {
    expect(orderCorners([sheet[2], sheet[0], sheet[3], sheet[1]])).toEqual(sheet)
  })

  it('[SR-30] accepts only a quad that covers a good part of the frame', () => {
    expect(quadArea([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }])).toBe(100)
    expect(isLargeEnough(sheet, 1000, 1300)).toBe(true)
    expect(isLargeEnough(sheet, 4000, 4000)).toBe(false)
  })

  it('[SR-30] insets the corners towards the centre', () => {
    const [tl, , br] = insetQuad([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }], 0.1)
    expect(tl).toEqual({ x: 5, y: 5 })
    expect(br).toEqual({ x: 95, y: 95 })
  })

  it('[SR-30] straightened size keeps the aspect and fits the long side', () => {
    const { width, height } = targetSize(sheet, 1600)
    expect(height).toBeLessThanOrEqual(1600)
    expect(width / height).toBeCloseTo(800 / 1130, 1)
    expect(targetSize(sheet, 600).height).toBe(600)
  })
})
