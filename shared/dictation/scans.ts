// Photos of checked dictation sheets (SR-34): the prepared JPEG the AI read, kept for the report.
// Shared by the app (upload, show, delete on reset) and api/delete-word-list (delete with the list).

export const SCAN_BUCKET = 'dictation-scans'

/** <family>/<list>/<round>.jpg: a list's photos share a folder, so deleting the list clears it. */
export const scanPath = (familyId: string, listId: string, roundId: string) => `${familyId}/${listId}/${roundId}.jpg`
