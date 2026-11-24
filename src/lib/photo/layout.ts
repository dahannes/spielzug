// Pure helpers for photos of (parts of) a page: find the text angle and the written area.

/**
 * Sharpness of a row profile: straight text lines give tall peaks and empty gaps between them,
 * so the squared jumps between neighbouring rows are largest when the text is level.
 */
export function profileSharpness(rows: ArrayLike<number>): number {
  let sum = 0
  for (let i = 1; i < rows.length; i++) {
    const d = rows[i] - rows[i - 1]
    sum += d * d
  }
  return sum
}

/** Angle (degrees) with the best score: coarse steps over ±range, then fine steps around the best. */
export function searchAngle(score: (deg: number) => number, range = 15, step = 1, fine = 0.25): number {
  let best = 0
  let bestScore = score(0)
  for (let a = -range; a <= range; a += step) {
    const s = score(a)
    if (s > bestScore) [best, bestScore] = [a, s]
  }
  const coarse = best
  for (let a = coarse - step; a <= coarse + step; a += fine) {
    const s = score(a)
    if (s > bestScore) [best, bestScore] = [a, s]
  }
  return Math.round(best * 100) / 100
}

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

/**
 * The written area from ink per row and column, with a margin. Null when there is no ink or
 * the box would cover nearly everything anyway (nothing to gain by cropping).
 */
export function inkBounds(rows: ArrayLike<number>, cols: ArrayLike<number>, minInk: number, margin = 0.04): Box | null {
  const first = (a: ArrayLike<number>) => Array.prototype.findIndex.call(a, (v: number) => v > minInk) as number
  const last = (a: ArrayLike<number>) => {
    for (let i = a.length - 1; i >= 0; i--) if (a[i] > minInk) return i
    return -1
  }
  const top = first(rows)
  const left = first(cols)
  if (top < 0 || left < 0) return null
  const h = rows.length
  const w = cols.length
  const pad = Math.round(margin * Math.max(w, h))
  const x = Math.max(0, left - pad)
  const y = Math.max(0, top - pad)
  const box = { x, y, width: Math.min(w, last(cols) + 1 + pad) - x, height: Math.min(h, last(rows) + 1 + pad) - y }
  return box.width * box.height > 0.92 * w * h ? null : box
}
