// Pixel work for player photos (ADR-032): find the person in the segmentation mask and redraw the
// cut-out in a cel style (flat brightness steps, stronger colour, dark outlines). Pure functions
// on raw pixels, so they run in tests without a browser.

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** Mask values above this count as person. */
const PERSON = 0.5

/**
 * The person's bounding box in the mask, grown by `margin` (share of the box) and kept inside the
 * image; null when the person covers less than `minShare` of the image (nobody, or far away).
 */
export function personBox(mask: Float32Array, w: number, h: number, minShare = 0.03, margin = 0.06): Box | null {
  let x0 = w
  let y0 = h
  let x1 = -1
  let y1 = -1
  let count = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x] <= PERSON) continue
      count++
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  if (count < minShare * w * h) return null
  const mx = Math.round((x1 - x0 + 1) * margin)
  const my = Math.round((y1 - y0 + 1) * margin)
  const x = Math.max(0, x0 - mx)
  const y = Math.max(0, y0 - my)
  return { x, y, w: Math.min(w, x1 + 1 + mx) - x, h: Math.min(h, y1 + 1 + my) - y }
}

const lum = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b
const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v)

/** Edge strength (Sobel on brightness) at which a pixel becomes an outline. */
const OUTLINE = 210

/**
 * Cel style: brightness in five steps with the hue kept, saturation raised, dark lines on strong
 * edges; transparent where the mask says background (`alpha` 0–1, soft at the border).
 */
export function celShade(rgba: Uint8ClampedArray, w: number, h: number, alpha: Float32Array): Uint8ClampedArray<ArrayBuffer> {
  const L = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) L[i] = lum(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2])
  const out = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const j = i * 4
      const a = alpha[i]
      if (a <= 0.02) continue
      let r = rgba[j]
      let g = rgba[j + 1]
      let b = rgba[j + 2]
      const l = L[i]
      const step = (Math.round((l / 255) * 4) / 4) * 255 + 20
      const k = step / Math.max(1, l)
      const m = (r + g + b) / 3
      r = (m + (r - m) * 1.35) * k
      g = (m + (g - m) * 1.35) * k
      b = (m + (b - m) * 1.35) * k
      if (x > 0 && y > 0 && x < w - 1 && y < h - 1) {
        const gx = -L[i - w - 1] - 2 * L[i - 1] - L[i + w - 1] + L[i - w + 1] + 2 * L[i + 1] + L[i + w + 1]
        const gy = -L[i - w - 1] - 2 * L[i - w] - L[i - w + 1] + L[i + w - 1] + 2 * L[i + w] + L[i + w + 1]
        if (Math.hypot(gx, gy) > OUTLINE) r = g = b = 25
      }
      out[j] = clamp(r)
      out[j + 1] = clamp(g)
      out[j + 2] = clamp(b)
      out[j + 3] = Math.round(a * 255)
    }
  }
  return out
}
