import { useEffect, useRef, useState } from 'react'
import { loadCv } from '../lib/photo/opencv'
import { preparePhotoFile, rotateQuarter, toJpeg } from '../lib/photo/prepare'
import { Button, Dialog, ErrorText } from './ui'

type Status = 'idle' | 'preparing' | 'failed'

/**
 * Photo of the sheet – whole page or part of it – with the device camera or from the photo
 * library. Straightened, contrast-fixed and cropped on the device, shown for a check, then
 * handed over as JPEG (ADR-018).
 */
export function PhotoCapture({ onPhoto, disabled, label = 'Foto machen' }: { onPhoto: (photo: Blob) => void; disabled?: boolean; label?: string }) {
  const camera = useRef<HTMLInputElement>(null)
  const library = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [review, setReview] = useState<HTMLCanvasElement | null>(null)
  const preview = usePreviewUrl(review)

  // Fetch the image tools early, they are large.
  useEffect(() => {
    loadCv().catch(() => undefined)
  }, [])

  async function onFile(file: File | undefined) {
    if (!file) return
    setStatus('preparing')
    try {
      setReview(await preparePhotoFile(file))
      setStatus('idle')
    } catch {
      setStatus('failed')
    }
  }

  async function accept() {
    if (!review) return
    try {
      const jpeg = await toJpeg(review)
      setReview(null)
      onPhoto(jpeg)
    } catch {
      setReview(null)
      setStatus('failed')
    }
  }

  const busy = disabled || status === 'preparing'
  const input = (ref: typeof camera, capture: boolean) => (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      capture={capture ? 'environment' : undefined}
      hidden
      onChange={(e) => {
        void onFile(e.target.files?.[0])
        e.target.value = ''
      }}
    />
  )

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        {/* disabled buttons let a tap through to the caller (e.g. "Erst alles abhaken") */}
        <Button disabled={busy} className="disabled:pointer-events-none" onClick={() => camera.current?.click()}>
          {status === 'preparing' ? 'Wird vorbereitet …' : `📷 ${label}`}
        </Button>
        <Button variant="link" disabled={busy} className="disabled:pointer-events-none" onClick={() => library.current?.click()}>
          Aus Fotos wählen
        </Button>
        {input(camera, true)}
        {input(library, false)}
      </div>
      <p className="mt-2 text-sm text-slate-500">Ganze Seite oder nur ein Ausschnitt – Hauptsache, alle Wörter sind drauf.</p>
      <div className="mt-2">
        <ErrorText>{status === 'failed' && 'Das Foto ließ sich nicht vorbereiten. Versuch es noch einmal.'}</ErrorText>
      </div>

      <Dialog
        open={!!review}
        onClose={() => setReview(null)}
        label="Foto prüfen"
        presentation="fullscreen"
      >
        <div className="flex h-full flex-col">
          <div className="min-h-0 flex-1 p-4">{preview && <img src={preview} alt="Vorbereitetes Foto" className="size-full object-contain" />}</div>
          <div className="flex flex-wrap items-center justify-between gap-3 bg-brand-900 p-4">
            <p className="text-lg">Ist alles gut lesbar?</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setReview(null)
                  camera.current?.click()
                }}
              >
                Nochmal
              </Button>
              <Button variant="secondary" onClick={() => review && setReview(rotateQuarter(review))}>
                ↻ Drehen
              </Button>
              <Button autoFocus onClick={() => void accept()}>
                Passt!
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

/** Object URL of a canvas for <img>, released when the canvas changes. */
function usePreviewUrl(canvas: HTMLCanvasElement | null): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!canvas) return
    let current: string | null = null
    let alive = true
    toJpeg(canvas)
      .then((blob) => {
        if (!alive) return
        current = URL.createObjectURL(blob)
        setUrl(current)
      })
      .catch(() => undefined)
    return () => {
      alive = false
      if (current) URL.revokeObjectURL(current)
      setUrl(null)
    }
  }, [canvas])
  return url
}
