// Reads words aloud with a German voice of the device (Web Speech API: the voices installed in
// iOS / the OS – free, offline, nothing leaves the device).
// Safari fills the voice list late, and iOS only plays speech started directly in a tap, so the
// voices are loaded ahead (primeVoices) and speak() stays synchronous.

const STORAGE_KEY = 'spielzug.voice'
let voices: SpeechSynthesisVoice[] = []

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window

const isGerman = (v: SpeechSynthesisVoice) => v.lang.replace('_', '-').toLowerCase().startsWith('de')

/**
 * Better voices first: Chrome's "Google Deutsch" (the clearest in tests), then enhanced/premium
 * device voices, de-DE before de-AT/de-CH, on-device.
 */
function rank(v: SpeechSynthesisVoice): number {
  let score = 0
  if (/^google deutsch/i.test(v.name)) score -= 8
  if (/premium|enhanced|erweitert|verbessert|natural/i.test(v.name)) score -= 4
  if (v.lang.replace('_', '-') === 'de-DE') score -= 2
  if (v.localService) score -= 1
  return score
}

function germanVoices(): SpeechSynthesisVoice[] {
  return voices.filter(isGerman).sort((a, b) => rank(a) - rank(b))
}

/** Loads the voice list (async in Safari); resolves with the German voices. */
export function primeVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!canSpeak()) return Promise.resolve([])
  return new Promise((resolve) => {
    const read = () => {
      voices = speechSynthesis.getVoices()
      return voices.length > 0
    }
    if (read()) return resolve(germanVoices())
    const done = () => {
      read()
      resolve(germanVoices())
    }
    speechSynthesis.addEventListener('voiceschanged', done, { once: true })
    setTimeout(done, 2000)
  })
}

function storedVoiceUri(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

let chosen = storedVoiceUri()

export function chooseVoice(uri: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, uri)
  } catch {
    // private mode: the choice lasts for this page only
  }
  chosen = uri
}


export function currentVoice(): SpeechSynthesisVoice | null {
  const german = germanVoices()
  return german.find((v) => v.voiceURI === chosen) ?? german[0] ?? null
}

/** Speaks the parts one after another. Call directly from a tap (iOS). */
export function speak(parts: readonly string[], rate = 0.8): void {
  if (!canSpeak()) return
  speechSynthesis.cancel()
  const voice = currentVoice()
  for (const text of parts) {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = voice?.lang ?? 'de-DE'
    if (voice) u.voice = voice
    u.rate = rate
    speechSynthesis.speak(u)
  }
}

let player: HTMLAudioElement | undefined

/** Plays a prepared recording (Polly MP3). Call directly from a tap (iOS). */
export function playAudio(url: string): void {
  stopSpeaking()
  player ??= new Audio()
  player.src = url
  void player.play().catch(() => undefined)
}

export function stopSpeaking(): void {
  if (canSpeak()) speechSynthesis.cancel()
  player?.pause()
}
