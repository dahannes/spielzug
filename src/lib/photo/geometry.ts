// Pure geometry of the sheet detection: corner order, size check, output size.

export interface Point {
  x: number
  y: number
}
/** Corners in order top-left, top-right, bottom-right, bottom-left. */
export type Quad = [Point, Point, Point, Point]

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

/** Orders four corners: top-left has the smallest x+y, bottom-right the largest; y−x splits the rest. */
export function orderCorners(points: readonly Point[]): Quad {
  const bySum = [...points].sort((a, b) => a.x + a.y - (b.x + b.y))
  const byDiff = [...points].sort((a, b) => a.y - a.x - (b.y - b.x))
  return [bySum[0], byDiff[0], bySum[3], byDiff[3]]
}

/** Shoelace area of the quad. */
export function quadArea(q: Quad): number {
  let sum = 0
  for (let i = 0; i < 4; i++) {
    const a = q[i]
    const b = q[(i + 1) % 4]
    sum += a.x * b.y - b.x * a.y
  }
  return Math.abs(sum) / 2
}

/** The quad covers enough of the frame to be the sheet, not a box on it. */
export function isLargeEnough(q: Quad, width: number, height: number, minShare = 0.2): boolean {
  return quadArea(q) >= minShare * width * height
}

export function scaleQuad(q: Quad, factor: number): Quad {
  return q.map((p) => ({ x: p.x * factor, y: p.y * factor })) as Quad
}

/** Pulls the corners towards the centre: detected edges sit a few pixels outside the paper. */
export function insetQuad(q: Quad, share = 0.015): Quad {
  const cx = q.reduce((s, p) => s + p.x, 0) / 4
  const cy = q.reduce((s, p) => s + p.y, 0) / 4
  return q.map((p) => ({ x: p.x + (cx - p.x) * share, y: p.y + (cy - p.y) * share })) as Quad
}

/** Size of the straightened sheet: the longer opposite edges, scaled so the long side fits `maxSide`. */
export function targetSize(q: Quad, maxSide: number): { width: number; height: number } {
  const [tl, tr, br, bl] = q
  const width = Math.max(dist(tl, tr), dist(bl, br))
  const height = Math.max(dist(tl, bl), dist(tr, br))
  const scale = Math.min(1, maxSide / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}
