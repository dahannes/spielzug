import { scaleQuad, type Quad } from './geometry'
import { DETECT_SIDE, findSheet, loadCv, preparePhoto, type Cv } from './opencv'

/** Largest side kept from camera photos before processing (memory on tablets). */
const MAX_INPUT_SIDE = 3200

export function toJpeg(canvas: HTMLCanvasElement, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('JPEG encoding failed'))), 'image/jpeg', quality),
  )
}

/** Draws an image source scaled so its long side is at most `maxSide`. */
function drawScaled(source: CanvasImageSource, width: number, height: number, maxSide: number): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

/** Finds the sheet on a small copy and returns the corners in `full` pixels. */
function detectSheet(cv: Cv, full: HTMLCanvasElement): Quad | null {
  const small = drawScaled(full, full.width, full.height, DETECT_SIDE)
  const quad = findSheet(cv, small)
  return quad && scaleQuad(quad, full.width / small.width)
}

/** Prepares a photo (whole page or part of it) locally: straighten, contrast, crop (ADR-018). */
export async function preparePhotoFile(file: Blob): Promise<HTMLCanvasElement> {
  const { cv } = await loadCv()
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const full = drawScaled(bitmap, bitmap.width, bitmap.height, MAX_INPUT_SIDE)
    return preparePhoto(cv, full, detectSheet(cv, full))
  } finally {
    bitmap.close()
  }
}

/** Turns a canvas by 90° clockwise (photo taken sideways). */
export function rotateQuarter(source: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = source.height
  out.height = source.width
  const ctx = out.getContext('2d')!
  ctx.translate(out.width, 0)
  ctx.rotate(Math.PI / 2)
  ctx.drawImage(source, 0, 0)
  return out
}
