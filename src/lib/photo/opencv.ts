// OpenCV.js (~10 MB) is loaded lazily as a separate asset, only where photos are taken, and cached by the browser.
import type * as OpenCv from '@techstark/opencv-js'
import opencvUrl from '@techstark/opencv-js/dist/opencv.js?url'
import { insetQuad, isLargeEnough, orderCorners, targetSize, type Quad } from './geometry'
import { inkBounds, profileSharpness, searchAngle } from './layout'

export type Cv = typeof OpenCv

let ready: Promise<{ cv: Cv }> | undefined

/**
 * Loads opencv.js as a classic script (it sets `window.cv`). Not via import(): the emscripten
 * module is a thenable whose `then` hands back itself, which hangs any promise that resolves to
 * it – including the module namespace of a dynamic import. So: wait via `then`, drop it, wrap.
 */
export function loadCv(): Promise<{ cv: Cv }> {
  ready ??= new Promise<{ cv: Cv }>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = opencvUrl
    script.async = true
    script.onerror = () => {
      ready = undefined
      reject(new Error('opencv.js failed to load'))
    }
    script.onload = () => {
      const cv = (window as unknown as { cv: Cv & { then?: (f: () => void) => void } }).cv
      const done = () => {
        delete cv.then
        resolve({ cv })
      }
      if (typeof cv.then === 'function') cv.then(done)
      else done()
    }
    document.head.append(script)
  })
  return ready
}

/** Long side used for detection: small is fast and robust enough for finding the sheet edges. */
export const DETECT_SIDE = 500

/** Finds the sheet (largest convex quadrilateral) in a canvas; corners in canvas pixels. */
export function findSheet(cv: Cv, source: HTMLCanvasElement): Quad | null {
  const src = cv.imread(source)
  const gray = new cv.Mat()
  const edges = new cv.Mat()
  const contours = new cv.MatVector()
  const hierarchy = new cv.Mat()
  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
    cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0)
    cv.Canny(gray, edges, 50, 150)
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3))
    cv.dilate(edges, edges, kernel)
    kernel.delete()
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    let best: Quad | null = null
    let bestArea = 0
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i)
      const approx = new cv.Mat()
      cv.approxPolyDP(contour, approx, 0.02 * cv.arcLength(contour, true), true)
      const area = cv.contourArea(approx)
      if (approx.rows === 4 && cv.isContourConvex(approx) && area > bestArea) {
        const d = approx.data32S
        const quad = orderCorners([0, 1, 2, 3].map((k) => ({ x: d[2 * k], y: d[2 * k + 1] })))
        if (isLargeEnough(quad, source.width, source.height, 0.35)) {
          best = quad
          bestArea = area
        }
      }
      approx.delete()
      contour.delete()
    }
    return best
  } finally {
    src.delete()
    gray.delete()
    edges.delete()
    contours.delete()
    hierarchy.delete()
  }
}

/** Grayscale copy of a canvas (caller deletes). */
function grayOf(cv: Cv, source: HTMLCanvasElement) {
  const src = cv.imread(source)
  const gray = new cv.Mat()
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
  src.delete()
  return gray
}

/** Perspective warp of the sheet to a straight rectangle, at most `maxSide` long. */
function warpSheet(cv: Cv, gray: OpenCv.Mat, quad: Quad, maxSide: number) {
  const q = insetQuad(quad)
  const { width, height } = targetSize(q, maxSide)
  const from = cv.matFromArray(4, 1, cv.CV_32FC2, q.flatMap((p) => [p.x, p.y]))
  const to = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, width, 0, width, height, 0, height])
  const m = cv.getPerspectiveTransform(from, to)
  const out = new cv.Mat()
  cv.warpPerspective(gray, out, m, new cv.Size(width, height), cv.INTER_LINEAR, cv.BORDER_REPLICATE)
  from.delete()
  to.delete()
  m.delete()
  return out
}

/** Scanner look: shadows evened out by dividing through the blurred background, contrast stretched. */
function evenOut(cv: Cv, gray: OpenCv.Mat) {
  const background = new cv.Mat()
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(15, 15))
  cv.morphologyEx(gray, background, cv.MORPH_CLOSE, kernel)
  kernel.delete()
  cv.medianBlur(background, background, 21)
  cv.divide(gray, background, gray, 255)
  cv.normalize(gray, gray, 0, 255, cv.NORM_MINMAX)
  background.delete()
}

/** Ink as white on black (Otsu), small specks removed (caller deletes). */
function inkOf(cv: Cv, gray: OpenCv.Mat) {
  const ink = new cv.Mat()
  cv.threshold(gray, ink, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU)
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(2, 2))
  cv.morphologyEx(ink, ink, cv.MORPH_OPEN, kernel)
  kernel.delete()
  return ink
}

/** Ink per row (dim 1) or per column (dim 0) of an 8-bit single-channel image. */
function sums(ink: OpenCv.Mat, dim: 0 | 1): Float32Array {
  const { rows, cols } = ink
  const data = ink.data
  const out = new Float32Array(dim === 1 ? rows : cols)
  for (let y = 0; y < rows; y++) {
    const row = y * cols
    for (let x = 0; x < cols; x++) {
      const v = data[row + x]
      if (v) out[dim === 1 ? y : x] += v
    }
  }
  return out
}

function rotate(cv: Cv, mat: OpenCv.Mat, deg: number, border: number) {
  const out = new cv.Mat()
  const m = cv.getRotationMatrix2D(new cv.Point(mat.cols / 2, mat.rows / 2), deg, 1)
  cv.warpAffine(mat, out, m, new cv.Size(mat.cols, mat.rows), cv.INTER_LINEAR, border, new cv.Scalar(0))
  m.delete()
  return out
}

/** Angle (degrees, OpenCV sign) that levels the text lines, measured on a small ink image. */
function textAngle(cv: Cv, ink: OpenCv.Mat): number {
  const small = new cv.Mat()
  const scale = Math.min(1, 700 / Math.max(ink.cols, ink.rows))
  cv.resize(ink, small, new cv.Size(Math.round(ink.cols * scale), Math.round(ink.rows * scale)), 0, 0, cv.INTER_AREA)
  try {
    return searchAngle((deg) => {
      const turned = rotate(cv, small, deg, cv.BORDER_CONSTANT)
      const score = profileSharpness(sums(turned, 1))
      turned.delete()
      return score
    })
  } finally {
    small.delete()
  }
}

/**
 * Prepares a photo of a whole page or a part of it for the model: a clearly visible sheet is
 * warped straight; otherwise the text lines are levelled. Then shadows out, contrast up, cropped
 * to the writing, grayscale, at most `maxSide` long. Pencil stays gray, not thresholded.
 */
export function preparePhoto(cv: Cv, source: HTMLCanvasElement, quad: Quad | null, maxSide = 1600): HTMLCanvasElement {
  let page = grayOf(cv, source)
  const mats: OpenCv.Mat[] = []
  try {
    if (quad) {
      const warped = warpSheet(cv, page, quad, maxSide)
      page.delete()
      page = warped
    } else {
      const scale = Math.min(1, maxSide / Math.max(page.cols, page.rows))
      cv.resize(page, page, new cv.Size(Math.round(page.cols * scale), Math.round(page.rows * scale)), 0, 0, cv.INTER_AREA)
    }
    evenOut(cv, page)

    if (!quad) {
      const ink = inkOf(cv, page)
      mats.push(ink)
      const deg = textAngle(cv, ink)
      if (Math.abs(deg) >= 0.3) {
        const level = rotate(cv, page, deg, cv.BORDER_REPLICATE)
        page.delete()
        page = level
      }
    }

    const ink = inkOf(cv, page)
    mats.push(ink)
    const box = inkBounds(sums(ink, 1), sums(ink, 0), 255 * 3)
    if (box) {
      const cropped = page.roi(new cv.Rect(box.x, box.y, box.width, box.height)).clone()
      page.delete()
      page = cropped
    }

    const out = document.createElement('canvas')
    cv.imshow(out, page)
    return out
  } finally {
    page.delete()
    mats.forEach((m) => m.delete())
  }
}
