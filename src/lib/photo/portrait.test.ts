import { describe, expect, it } from 'vitest'
import { celShade, personBox } from './portrait'

/** A w×h mask with the rectangle [x0,x1)×[y0,y1) set to 1. */
function mask(w: number, h: number, x0: number, y0: number, x1: number, y1: number) {
  const m = new Float32Array(w * h)
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) m[y * w + x] = 1
  return m
}

describe('player photo', () => {
  it('[SR-06] finds the person with a margin and keeps the box inside the image', () => {
    expect(personBox(mask(100, 100, 20, 30, 60, 100), 100, 100, 0.03, 0.1)).toEqual({ x: 16, y: 23, w: 48, h: 77 })
  })

  it('[SR-06] reports nobody when the person is missing or tiny', () => {
    expect(personBox(new Float32Array(100), 10, 10)).toBeNull()
    expect(personBox(mask(100, 100, 0, 0, 3, 3), 100, 100)).toBeNull()
  })

  it('[SR-06] draws only the person: background transparent, a dark line on a hard edge', () => {
    const w = 6
    const h = 3
    const rgba = new Uint8ClampedArray(w * h * 4)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const v = x < 3 ? 30 : 230 // dark left half, light right half
        rgba.set([v, v, v, 255], (y * w + x) * 4)
      }
    }
    const alpha = mask(w, h, 1, 0, 6, 3) // column 0 is background
    const out = celShade(rgba, w, h, alpha)
    const px = (x: number, y: number) => Array.from(out.slice((y * w + x) * 4, (y * w + x) * 4 + 4))
    expect(px(0, 1)[3]).toBe(0)
    expect(px(2, 1)).toEqual([25, 25, 25, 255]) // the edge between dark and light
    expect(px(5, 1)[3]).toBe(255)
    expect(px(5, 1)[0]).toBeGreaterThan(200)
  })
})
