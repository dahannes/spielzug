// Local Supabase sends auth mails to Mailpit (npx supabase start).
const MAILPIT = 'http://127.0.0.1:54324'

/** Code from the newest mail to `email`; waits until at least `minMessages` mails arrived. */
export async function readLoginCode(email: string, minMessages = 1, timeoutMs = 10_000): Promise<string> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`)
    const { messages } = (await res.json()) as { messages: { ID: string }[] }
    if (messages.length >= minMessages) {
      const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${messages[0].ID}`)).json()) as { Text: string }
      const code = msg.Text.match(/\b\d{6}\b/)?.[0]
      if (code) return code
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`No login code for ${email}`)
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`
}
