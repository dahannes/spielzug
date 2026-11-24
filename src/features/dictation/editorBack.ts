import { paths } from '../../app/paths'

// Links into the word list editor pass `{ back }` as router state: saving or deleting returns there
// (the trainer's Wörterlisten tab, the start page). Without it: the list overview.

export const editorState = (back: string) => ({ back })

export function backOf(state: unknown): string {
  const back = (state as { back?: unknown } | null)?.back
  return typeof back === 'string' && back.startsWith('/') ? back : paths.wordLists
}
