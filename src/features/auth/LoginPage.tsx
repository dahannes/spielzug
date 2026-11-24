import { useState, type FormEvent, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useSearchParams } from 'react-router'
import { useAuth } from './useAuth'
import { Logo } from '../../components/Logo'
import { Button, ErrorText, Field, TextInput } from '../../components/ui'
import { paths } from '../../app/paths'
import { supabase } from '../../lib/supabase'
import { postApi } from '../../lib/api'
import { errorText } from '../../lib/apiError'

const MIN_PASSWORD = 8

type Mode = 'sign-in' | 'sign-up' | 'confirm' | 'forgot' | 'reset'

/**
 * Parents sign in with email and password (ADR-015). Emails only carry 6-digit codes: to confirm
 * the address at sign-up and to reset a forgotten password – links would leave the installed app.
 */
export function LoginPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const invitationToken = search.get('invite')
  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  // The reset code signs the user in before the new password is set, so stay on the reset form.
  if (session && mode !== 'reset' && !invitationToken) return <Navigate to={paths.home} replace />

  async function finishAuthentication(): Promise<string | void> {
    if (invitationToken) {
      try {
        await postApi('/api/accept-team-invitation', { token: invitationToken })
      } catch (error) {
        return errorText(error)
      }
    }
    navigate(paths.home, { replace: true })
  }

  const go = (next: Mode) => {
    setMode(next)
    setError('')
    setInfo('')
    setCode('')
  }

  async function run(e: FormEvent, action: () => Promise<string | void>) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const message = await action()
      if (message) setError(message)
    } finally {
      setBusy(false)
    }
  }

  const signIn = (e: FormEvent) =>
    run(e, async () => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (!error) return finishAuthentication()
      if (error.code === 'email_not_confirmed') {
        await supabase.auth.resend({ type: 'signup', email: email.trim() })
        go('confirm')
        setInfo('Bitte bestätige zuerst deine E-Mail-Adresse. Wir haben dir einen neuen Code geschickt.')
        return
      }
      return 'E-Mail oder Passwort stimmt nicht.'
    })

  const signUp = (e: FormEvent) =>
    run(e, async () => {
      if (password.length < MIN_PASSWORD) return `Das Passwort braucht mindestens ${MIN_PASSWORD} Zeichen.`
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
      if (error) return error.code === 'user_already_exists' ? 'Für diese E-Mail gibt es schon ein Konto.' : 'Das Konto konnte nicht angelegt werden.'
      if (data.session) return finishAuthentication()
      go('confirm')
    })

  const confirm = (e: FormEvent) =>
    run(e, async () => {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'signup' })
      if (error) return 'Der Code stimmt nicht oder ist abgelaufen.'
      return finishAuthentication()
    })

  const forgot = (e: FormEvent) =>
    run(e, async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
      if (error) return 'Der Code konnte nicht gesendet werden. Bitte später noch einmal versuchen.'
      go('reset')
    })

  const reset = (e: FormEvent) =>
    run(e, async () => {
      if (password.length < MIN_PASSWORD) return `Das Passwort braucht mindestens ${MIN_PASSWORD} Zeichen.`
      const verified = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'recovery' })
      if (verified.error) return 'Der Code stimmt nicht oder ist abgelaufen.'
      const updated = await supabase.auth.updateUser({ password })
      if (updated.error) return 'Das neue Passwort konnte nicht gespeichert werden.'
      navigate(paths.home, { replace: true })
    })

  const emailField = (
    <Field label="E-Mail-Adresse">
      <TextInput type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
    </Field>
  )
  const passwordField = (label: string, autoComplete: 'current-password' | 'new-password') => (
    <Field label={label} hint={autoComplete === 'new-password' ? `Mindestens ${MIN_PASSWORD} Zeichen.` : undefined}>
      <TextInput
        type="password"
        autoComplete={autoComplete}
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
    </Field>
  )
  const codeField = (
    <Field label="Code aus der E-Mail" hint={`Gesendet an ${email}`}>
      <TextInput
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="text-center text-2xl tracking-[0.4em]"
      />
    </Field>
  )

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <h1 className="flex items-center gap-3 font-display text-4xl font-extrabold tracking-wide uppercase">
        <Logo className="size-12" />
        Spielzug
      </h1>
      <p className="mt-1 text-slate-600">{TITLES[mode]}</p>
      {info && (
        <p role="status" className="mt-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900">
          {info}
        </p>
      )}

      {mode === 'sign-in' && (
        <Form onSubmit={signIn} error={error} busy={busy} submit="Anmelden">
          {emailField}
          {passwordField('Passwort', 'current-password')}
        </Form>
      )}
      {mode === 'sign-up' && (
        <Form onSubmit={signUp} error={error} busy={busy} submit="Konto erstellen">
          {emailField}
          {passwordField('Passwort', 'new-password')}
        </Form>
      )}
      {mode === 'confirm' && (
        <Form onSubmit={confirm} error={error} busy={busy} submit="Bestätigen">
          {codeField}
        </Form>
      )}
      {mode === 'forgot' && (
        <Form onSubmit={forgot} error={error} busy={busy} submit="Code senden">
          {emailField}
        </Form>
      )}
      {mode === 'reset' && (
        <Form onSubmit={reset} error={error} busy={busy} submit="Passwort speichern">
          {codeField}
          {passwordField('Neues Passwort', 'new-password')}
        </Form>
      )}

      <nav className="mt-6 flex flex-col items-center gap-2 text-sm">
        {mode !== 'sign-in' && <LinkButton onClick={() => go('sign-in')}>Zur Anmeldung</LinkButton>}
        {mode === 'sign-in' && <LinkButton onClick={() => go('sign-up')}>Noch kein Konto? Konto erstellen</LinkButton>}
        {mode === 'sign-in' && <LinkButton onClick={() => go('forgot')}>Passwort vergessen?</LinkButton>}
      </nav>
    </main>
  )
}

const TITLES: Record<Mode, string> = {
  'sign-in': 'Anmeldung für Eltern',
  'sign-up': 'Neues Konto für Eltern',
  confirm: 'Wir haben dir einen Code geschickt. Gib ihn ein, um deine E-Mail zu bestätigen.',
  forgot: 'Passwort vergessen? Wir schicken dir einen Code.',
  reset: 'Code eingeben und neues Passwort wählen.',
}

function Form(props: { onSubmit: (e: FormEvent) => void; error: string; busy: boolean; submit: string; children: ReactNode }) {
  return (
    <form onSubmit={props.onSubmit} className="mt-8 space-y-4">
      {props.children}
      <ErrorText>{props.error}</ErrorText>
      <Button type="submit" disabled={props.busy} className="w-full">
        {props.submit}
      </Button>
    </form>
  )
}

function LinkButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="text-brand-700 underline">
      {children}
    </button>
  )
}
