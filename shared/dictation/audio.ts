// Spoken dictation audio (ADR-022): what is said per word and where the MP3 lives. Shared by
// api/prepare-audio (makes it) and the app (plays it).
import { expectedText, MAX_SENTENCE, type ListWord } from './words.js'

/** Neural, not generative: generative guessed English for short words like "die Bank" (ADR-022). */
export const VOICE = { id: 'Daniel', engine: 'neural' } as const
export const AUDIO_BUCKET = 'dictation-audio'

const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * What is said for a word. Wort-Diktat like in class: the word, a sentence, the word again.
 * Vokabeln: the German meaning twice; the child writes the English word.
 */
export function spokenParts(w: Pick<ListWord, 'article' | 'word' | 'sentence' | 'translation'>): string[] {
  if (w.translation) return [w.translation, w.translation]
  const word = expectedText(w)
  return w.sentence ? [word, w.sentence.slice(0, MAX_SENTENCE), word] : [word, word]
}

/** The spoken parts with pauses to listen. */
export function audioSsml(w: Pick<ListWord, 'article' | 'word' | 'sentence' | 'translation'>): string {
  return `<speak>${spokenParts(w).map(escapeXml).join('<break time="900ms"/>')}</speak>`
}

/** FNV-1a: short, stable hash so changed words or another voice get a new file. */
function hash(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

/** Storage keys allow only ASCII: "blühen" → "bluehen"; the hash keeps names unique. */
const asciiName = (id: string) =>
  id
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9-]/g, '_')

export function audioPath(familyId: string, listId: string, w: ListWord): string {
  return `${familyId}/${listId}/${asciiName(w.id)}-${hash(`${VOICE.id}:${VOICE.engine}:${audioSsml(w)}`)}.mp3`
}
