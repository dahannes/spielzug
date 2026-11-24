import { useEffect, useState } from 'react'
import { Button } from '../../components/ui'
import { canSpeak, chooseVoice, currentVoice, primeVoices, speak } from '../../lib/speech'

/** German voice of the device, with a test button; explains how to install one if missing. */
export function VoicePicker() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[] | null>(null)
  const [uri, setUri] = useState<string | undefined>()

  useEffect(() => {
    void primeVoices().then((v) => {
      setVoices(v)
      setUri(currentVoice()?.voiceURI)
    })
  }, [])

  if (!canSpeak()) return <p className="mt-3 text-amber-800">Dieses Gerät kann nicht vorlesen. Lass dir die Wörter vorlesen.</p>
  if (voices === null) return null
  if (voices.length === 0) {
    return (
      <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
        <p className="font-semibold">Keine deutsche Stimme gefunden.</p>
        <p className="mt-1">
          iPad: Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen → Deutsch → eine Stimme laden (z. B. „Anna“, am besten
          „Erweitert“). Danach diese Seite neu laden.
        </p>
      </div>
    )
  }
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
      <label htmlFor="voice" className="text-slate-600">
        Stimme
      </label>
      <select
        id="voice"
        value={uri}
        onChange={(e) => {
          chooseVoice(e.target.value)
          setUri(e.target.value)
        }}
        className="rounded-lg border border-slate-300 px-2 py-2"
      >
        {voices.map((v) => (
          <option key={v.voiceURI} value={v.voiceURI}>
            {v.name} ({v.lang})
          </option>
        ))}
      </select>
      <Button variant="secondary" className="min-h-10 px-3 py-2" onClick={() => speak(['die Sonne', 'Die Sonne scheint.'])}>
        🔊 Probe
      </Button>
    </div>
  )
}
