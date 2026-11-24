// Player photo on the device (ADR-032): cut the person out with MediaPipe's selfie segmenter and
// redraw it in a cel style. The original never leaves the browser; only the PNG result is stored.
// MediaPipe (~10 MB WASM) and the 250 KB model ship with the app and load only when needed.
import type { ImageSegmenter } from '@mediapipe/tasks-vision'
import wasmBinaryPath from '../../../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm?url'
import wasmLoaderPath from '../../../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.js?url'
import { celShade, personBox } from './portrait'

/** The photo shows no person large enough to cut out. */
export class NoPersonError extends Error {
  override name = 'NoPersonError'
}

/** Long side the photo is reduced to before segmenting and drawing. */
const WORK_SIDE = 1024
/** Width of the stored result. */
const OUT_WIDTH = 600

let segmenter: Promise<ImageSegmenter> | undefined

function loadSegmenter(): Promise<ImageSegmenter> {
  segmenter ??= (async () => {
    const { ImageSegmenter } = await import('@mediapipe/tasks-vision')
    return ImageSegmenter.createFromOptions(
      { wasmLoaderPath, wasmBinaryPath },
      {
        // CPU: the same result on every device and in headless tests
        baseOptions: { modelAssetPath: '/models/selfie_segmenter.tflite', delegate: 'CPU' },
        runningMode: 'IMAGE',
        outputConfidenceMasks: true,
        outputCategoryMask: false,
      },
    )
  })().catch((error) => {
    segmenter = undefined
    throw error
  })
  return segmenter
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

/** Photo file → stylised, cut-out PNG of the person (transparent background). */
export async function stylizePortrait(photo: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(photo, { imageOrientation: 'from-image' })
  const scale = Math.min(1, WORK_SIDE / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const work = canvas(w, h)
  const g = work.getContext('2d', { willReadFrequently: true })!
  g.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  const result = (await loadSegmenter()).segment(work)
  const confidence = result.confidenceMasks![0]
  // the mask comes in the model's resolution: scale it to the work image
  const maskCanvas = canvas(confidence.width, confidence.height)
  const values = confidence.getAsFloat32Array()
  const maskImage = new ImageData(confidence.width, confidence.height)
  for (let i = 0; i < values.length; i++) maskImage.data.set([255, 255, 255, Math.round(values[i] * 255)], i * 4)
  result.close()
  maskCanvas.getContext('2d')!.putImageData(maskImage, 0, 0)
  const scaled = canvas(w, h)
  const sg = scaled.getContext('2d', { willReadFrequently: true })!
  sg.drawImage(maskCanvas, 0, 0, w, h)
  const scaledAlpha = sg.getImageData(0, 0, w, h).data
  const mask = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) mask[i] = scaledAlpha[i * 4 + 3] / 255

  const box = personBox(mask, w, h)
  if (!box) throw new NoPersonError('no person in the photo')

  const pixels = g.getImageData(box.x, box.y, box.w, box.h)
  const alpha = new Float32Array(box.w * box.h)
  for (let y = 0; y < box.h; y++) for (let x = 0; x < box.w; x++) alpha[y * box.w + x] = mask[(box.y + y) * w + box.x + x]
  const drawn = canvas(box.w, box.h)
  drawn.getContext('2d')!.putImageData(new ImageData(celShade(pixels.data, box.w, box.h, alpha), box.w, box.h), 0, 0)

  const outW = Math.min(OUT_WIDTH, box.w)
  const out = canvas(outW, Math.round((box.h / box.w) * outW))
  out.getContext('2d')!.drawImage(drawn, 0, 0, out.width, out.height)
  return new Promise((resolve, reject) => out.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encoding failed'))), 'image/png'))
}
