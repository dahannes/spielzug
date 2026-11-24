import { useState } from 'react'
import { focusClass } from '../../components/styles'
import { Button, Dialog, ErrorText } from '../../components/ui'
import { useScanUrl } from './queries'

/** The photo the AI read (SR-34), with a full-screen view to zoom in. Older rounds have none. */
export function ScanPanel({ scanPath, className = '' }: { scanPath: string | null; className?: string }) {
  const url = useScanUrl(scanPath)
  const [open, setOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const close = () => {
    setOpen(false)
    setZoom(1)
  }

  if (!scanPath) return <p className={`text-sm text-slate-500 ${className}`}>Für diese Runde wurde kein Foto gespeichert.</p>

  return (
    <section aria-labelledby="scan-heading" className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 id="scan-heading" className="text-lg font-bold">
          Foto vom Blatt
        </h2>
        <Button variant="secondary" className="min-h-10 rounded-full px-4 py-1 text-sm" disabled={!url.data} onClick={() => setOpen(true)}>
          ⤢ Vollbild
        </Button>
      </div>
      {url.isError ? (
        <ErrorText>Das Foto konnte nicht geladen werden.</ErrorText>
      ) : (
        <button
          type="button"
          aria-label="Foto im Vollbild öffnen"
          onClick={() => setOpen(true)}
          disabled={!url.data}
          className={`block w-full cursor-zoom-in overflow-hidden rounded-lg bg-slate-800 ring-1 ring-slate-300 ${focusClass}`}
        >
          {url.data ? <img src={url.data} alt="Foto des Diktatblatts" className="max-h-[60dvh] w-full object-contain" /> : <span className="block aspect-[3/4]" />}
        </button>
      )}
      <p className="text-xs text-slate-500">So hat die KI das Blatt gesehen (begradigt).</p>

      <Dialog open={open} onClose={close} label="Foto vom Blatt" presentation="fullscreen">
        <div className="flex h-full flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3">
            <p className="font-bold">Foto vom Blatt</p>
            <div className="flex gap-2">
              <Button variant="secondary" aria-label="Verkleinern" disabled={zoom <= 1} onClick={() => setZoom(zoom - 0.5)}>
                −
              </Button>
              <Button variant="secondary" aria-label="Vergrößern" disabled={zoom >= 3} onClick={() => setZoom(zoom + 0.5)}>
                +
              </Button>
              <Button variant="secondary" onClick={close}>
                Schließen
              </Button>
            </div>
          </div>
          {/* zoomed: wider than the screen and scrollable; pinch-zoom works on top on touch devices */}
          <div className="min-h-0 flex-1 overflow-auto">
            {url.data && (
              <img
                src={url.data}
                alt="Foto des Diktatblatts, vergrößert"
                style={{ width: `${zoom * 100}%` }}
                className={`mx-auto max-w-none ${zoom === 1 ? 'h-full object-contain' : ''}`}
              />
            )}
          </div>
        </div>
      </Dialog>
    </section>
  )
}
