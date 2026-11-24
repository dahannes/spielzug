// Error codes from api/ (api/_lib/http.ts) and the German text the app shows for them.

export class ApiError extends Error {
  readonly code: string
  readonly status: number
  /** Extra fields some codes carry (e.g. `attemptsLeft`, `lockedUntil` for the team PIN). */
  readonly details: Record<string, unknown>

  constructor(code: string, status: number, details: Record<string, unknown> = {}) {
    super(code)
    this.code = code
    this.status = status
    this.details = details
  }
}

const TEXT: Record<string, string> = {
  unauthorized: 'Du bist nicht mehr angemeldet. Melde dich bitte neu an.',
  forbidden: 'Dafür hast du keine Berechtigung.',
  bad_request: 'Das Foto ist zu groß oder ungültig. Versuch ein anderes Foto.',
  not_found: 'Das gibt es hier nicht.',
  not_configured: 'Der Server ist noch nicht fertig eingerichtet.',
  read_failed: 'Das Foto konnte nicht gelesen werden. Versuch es noch einmal.',
  audio_failed: 'Die Stimme konnte nicht vorbereitet werden.',
  delete_failed: 'Löschen hat nicht geklappt. Versuch es noch einmal.',
  invitation_invalid: 'Die Einladung ist ungültig oder abgelaufen.',
  account_already_on_team: 'Dieses Konto gehört bereits zu einem anderen Team.',
  pin_invalid: 'Der PIN stimmt nicht.',
  pin_locked: 'Zu viele falsche Versuche. Der Trainer-Bereich ist vorübergehend gesperrt.',
  quota_exceeded: 'Für heute ist das Limit erreicht. Morgen geht es weiter.',
  trainer_bad_request: 'Die Eingabe ist ungültig. Bitte prüfe deine Angaben.',
  trainer_failed: 'Die Trainer-Einstellung konnte nicht gespeichert werden. Versuch es noch einmal.',
}

/** German message for any error from a call to api/ (also network errors). */
export function errorText(error: unknown): string {
  if (error instanceof ApiError) return pinText(error) ?? quotaText(error) ?? TEXT[error.code] ?? 'Da ist etwas schiefgegangen. Versuch es noch einmal.'
  return 'Keine Verbindung. Prüf das Internet und versuch es noch einmal.'
}

/** Team PIN (SR-08): tries left, or the time the lock ends. */
function pinText({ code, details }: ApiError): string | null {
  const { attemptsLeft, lockedUntil } = details
  if (code === 'pin_invalid' && typeof attemptsLeft === 'number') {
    if (attemptsLeft === 1) return 'Der PIN stimmt nicht. Noch 1 Versuch, dann ist der Trainer-Bereich 15 Minuten gesperrt.'
    if (attemptsLeft > 1) return `Der PIN stimmt nicht. Noch ${attemptsLeft} Versuche.`
  }
  if (code === 'pin_locked' && typeof lockedUntil === 'string') {
    const until = new Date(lockedUntil)
    if (!Number.isNaN(until.getTime())) {
      const time = until.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
      return `Zu viele falsche Versuche. Der Trainer-Bereich ist bis ${time} Uhr gesperrt.`
    }
  }
  return null
}

/** Daily quota (SR-44): the cap over all accounts is not the family's doing. */
function quotaText({ code, details }: ApiError): string | null {
  return code === 'quota_exceeded' && details.scope === 'global' ? 'Spielzug macht heute Pause. Morgen geht es weiter.' : null
}

/** Reads a JSON response from api/; throws ApiError with the server's code on failure. */
export async function apiJson<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) {
    const { error, ...details } = body as { error?: string } & Record<string, unknown>
    throw new ApiError(error ?? 'unknown', res.status, details)
  }
  return body
}
