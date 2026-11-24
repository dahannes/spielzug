import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { paths } from '../../app/paths'
import { BackLink, Button, ButtonLink, Card, ErrorText, Field, Loading, TextInput } from '../../components/ui'
import { focusClass } from '../../components/styles'
import type { Child } from '../children/queries'
import { useChildren } from '../children/queries'
import { useFamily } from '../family/useFamily'
import { useAuth } from '../auth/useAuth'
import { postApi } from '../../lib/api'
import { errorText } from '../../lib/apiError'
import { supabase } from '../../lib/supabase'
import { WordListsPage } from '../dictation/WordListsPage'
import { PlayerSticker } from '../player/CardFace'
import { PlayerDialog } from '../player/PlayerForm'
import { isGateMarked, markGate } from './gate'

export function TrainerPinPage() {
  const family = useFamily()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [pin, setPin] = useState('')
  const [storageError, setStorageError] = useState(false)
  const pinStatus = useQuery({
    queryKey: ['team-pin-status', family.data?.id],
    enabled: !!family.data?.id,
    queryFn: () => postApi('/api/team-pin', { action: 'status' }),
    staleTime: 0,
    refetchOnMount: 'always',
  })
  const enter = useMutation({
    mutationFn: (value: string) =>
      postApi('/api/team-pin', { action: pinStatus.data?.configured ? 'check' : 'set', pin: value }),
    onSuccess: () => {
      if (!family.data) return
      queryClient.setQueryData(['team-pin-status', family.data.id], { configured: true })
      if (!markGate(family.data.id)) {
        setStorageError(true)
        return
      }
      navigate(paths.trainerArea, { replace: true })
    },
    // a wrong PIN starts over with an empty field
    onError: () => setPin(''),
  })
  // the keypad sends the PIN with its fourth digit; typed PINs go with Enter or "Weiter"
  const tapDigits = (value: string) => {
    setPin(value)
    if (pinStatus.data?.configured && value.length === 4 && !enter.isPending) enter.mutate(value)
  }

  if (family.isPending || pinStatus.isPending || pinStatus.isFetching) return <Loading />

  return (
    <section className="mx-auto max-w-md space-y-5">
      <BackLink to={paths.home}>Zurück</BackLink>
      <Card>
        <h1 className="text-2xl font-bold">Trainer-Bereich</h1>
        <p className="mt-2 text-slate-600">
          {pinStatus.data?.configured ? 'Gib den vierstelligen Team-PIN ein.' : 'Lege einen vierstelligen Team-PIN fest.'}
        </p>
        <form
          className="mt-5 space-y-4"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const value = new FormData(event.currentTarget).get('pin')
            if (typeof value === 'string') enter.mutate(value)
          }}
        >
          <Field label={pinStatus.data?.configured ? 'Team-PIN' : 'Neuer Team-PIN'}>
            <TextInput
              type="password"
              name="pin"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{4}"
              maxLength={4}
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
              required
              autoFocus
              className="text-center text-3xl tracking-[0.5em]"
            />
          </Field>
          <PinPad value={pin} onChange={tapDigits} />
          <p className="text-sm text-slate-500">Der PIN ist eine zusätzliche Sperre auf diesem Gerät. Dein Konto schützt weiterhin die Teamdaten.</p>
          <ErrorText>
            {pinStatus.isError
              ? errorText(pinStatus.error)
              : enter.isError
                ? errorText(enter.error)
                : storageError
                  ? 'Der PIN-Schutz konnte auf diesem Gerät nicht aktiviert werden.'
                  : null}
          </ErrorText>
          <Button type="submit" disabled={enter.isPending || pinStatus.isError} className="w-full">
            {enter.isPending ? 'Prüfe …' : pinStatus.data?.configured ? 'Weiter' : 'PIN festlegen'}
          </Button>
        </form>
      </Card>
    </section>
  )
}

/**
 * On-screen digits for the tablet (wireframe T5/P5). The PIN field stays the source of truth, so a
 * hardware keyboard, screen readers and Tab/Enter/Space work as with any form.
 */
function PinPad({ value, onChange }: { value: string; onChange: (pin: string) => void }) {
  const key = `min-h-16 rounded-2xl text-2xl font-extrabold ring-1 ring-slate-300 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-40 ${focusClass}`
  const digit = (d: string) => (
    <button key={d} type="button" className={`bg-white ${key}`} disabled={value.length >= 4} onClick={() => onChange(value + d)}>
      {d}
    </button>
  )
  return (
    <div role="group" aria-label="Ziffernblock" className="grid grid-cols-3 gap-2.5">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit)}
      <span aria-hidden />
      {digit('0')}
      <button type="button" aria-label="Letzte Ziffer löschen" className={`bg-slate-100 ${key}`} disabled={value.length === 0} onClick={() => onChange(value.slice(0, -1))}>
        ⌫
      </button>
    </div>
  )
}

type TrainerSection = 'team' | 'lists' | 'account'

export function TrainerAreaPage() {
  const family = useFamily()
  // the tab is in the URL, so the list editor comes back to "Wörterlisten"
  const [params, setParams] = useSearchParams()
  const asked = params.get('section')
  const section: TrainerSection = asked === 'lists' || asked === 'account' ? asked : 'team'
  const setSection = (id: TrainerSection) => setParams(id === 'team' ? {} : { section: id }, { replace: true })

  if (family.isPending) return <Loading />
  if (!family.data || !isGateMarked(family.data.id)) return <Navigate to={paths.trainer} replace />

  return (
    <section className="space-y-5">
      <BackLink to={paths.home}>Spielerkarte</BackLink>
      <h1 className="text-3xl font-bold">Trainer-Bereich</h1>
      <nav className="flex flex-wrap gap-2" aria-label="Trainer-Bereich">
        {([
          ['team', 'Team'],
          ['lists', 'Wörterlisten'],
          ['account', 'Konto'],
        ] as const).map(([id, label]) => (
          <Button key={id} variant={section === id ? 'primary' : 'secondary'} aria-pressed={section === id} onClick={() => setSection(id)}>
            {label}
          </Button>
        ))}
      </nav>
      {section === 'team' && <TeamSection familyId={family.data.id} role={family.data.role} name={family.data.name} />}
      {section === 'lists' && <WordListsPage />}
      {section === 'account' && <AccountSection familyId={family.data.id} role={family.data.role} teamName={family.data.name} />}
    </section>
  )
}

/** The team's players as cards (wireframe T7); a card opens the edit modal, the last tile creates one. */
function PlayerGallery({ familyId, team }: { familyId: string; team: string }) {
  const children = useChildren(familyId)
  const [editing, setEditing] = useState<{ child?: Child } | null>(null)

  return (
    <section className="space-y-3 lg:col-span-2" aria-labelledby="players-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="players-heading" className="text-xl font-bold">
          Spieler
        </h2>
        <p className="text-sm text-slate-500">Karte antippen zum Bearbeiten</p>
      </div>
      {children.isPending ? (
        <p className="text-slate-600">Lädt …</p>
      ) : children.isError ? (
        <ErrorText>Die Spieler konnten nicht geladen werden.</ErrorText>
      ) : (
        <ul className="flex flex-wrap gap-4">
          {children.data.map((child) => (
            <li key={child.id} className="relative transition-transform hover:-translate-y-0.5">
              <PlayerSticker team={team} familyId={familyId} child={child} />
              {/* stretched over the card: the card stays valid markup, the whole card is the target */}
              <button type="button" aria-label={`Spielerkarte ${child.name} bearbeiten`} onClick={() => setEditing({ child })} className={`absolute inset-0 rounded-xl ${focusClass}`} />
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setEditing({})}
              className={`flex aspect-5/7 w-44 flex-col items-center justify-center gap-1 rounded-2xl border-[2.5px] border-dashed border-slate-400 font-extrabold text-slate-500 hover:bg-white ${focusClass}`}
            >
              <span className="text-4xl leading-none" aria-hidden>
                +
              </span>
              Spieler anlegen
            </button>
          </li>
        </ul>
      )}
      <p className="text-sm text-slate-500">Spieler haben kein Konto: sie üben auf dem Gerät eines Trainers.</p>
      <PlayerDialog open={!!editing} onClose={() => setEditing(null)} familyId={familyId} team={team} child={editing?.child} trainer />
    </section>
  )
}

function TeamSection({ familyId, role, name }: { familyId: string; role: string; name: string }) {
  const auth = useAuth()
  const trainers = useQuery({
    queryKey: ['team-trainers', familyId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_team_trainers')
      if (error) throw error
      return data
    },
  })

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <PlayerGallery familyId={familyId} team={name} />
      <TeamNameForm key={name} familyId={familyId} name={name} />
      <Card>
        <h2 className="text-xl font-bold">Trainer</h2>
        {trainers.isPending ? <p className="mt-3 text-slate-600">Lädt …</p> : trainers.isError ? (
          <ErrorText>Die Trainer konnten nicht geladen werden.</ErrorText>
        ) : (
          <ul className="mt-3 divide-y divide-slate-200">
            {trainers.data.map((trainer) => (
              <li key={trainer.user_id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span>{trainer.email ?? 'E-Mail unbekannt'}{trainer.email === auth.session?.user.email ? ' (Du)' : ''}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">{trainer.role === 'admin' ? 'Admin' : 'Trainer'}</span>
              </li>
            ))}
          </ul>
        )}
        {role === 'admin' && <InviteTrainerForm />}
        {role !== 'admin' && <p className="mt-4 text-sm text-slate-500">Nur der Team-Admin kann Trainer einladen.</p>}
      </Card>

    </div>
  )
}

/** The team's name, shown on every player card. */
function TeamNameForm({ familyId, name }: { familyId: string; name: string }) {
  const queryClient = useQueryClient()
  const [value, setValue] = useState(name)
  const rename = useMutation({
    mutationFn: async (next: string) => {
      const { error } = await supabase.from('families').update({ name: next.trim() }).eq('id', familyId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['family'] }),
  })

  return (
    <Card className="lg:col-span-2">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault()
          rename.mutate(value)
        }}
      >
        <div className="min-w-48 flex-1">
          <Field label="Teamname" hint="Steht oben auf jeder Spielerkarte.">
            <TextInput value={value} onChange={(event) => setValue(event.target.value)} maxLength={40} required />
          </Field>
        </div>
        <Button type="submit" disabled={!value.trim() || value.trim() === name || rename.isPending}>
          Teamname speichern
        </Button>
      </form>
      <ErrorText>{rename.isError && 'Der Teamname konnte nicht gespeichert werden.'}</ErrorText>
    </Card>
  )
}

function InviteTrainerForm() {
  const [email, setEmail] = useState('')
  const [inviteUrl, setInviteUrl] = useState('')
  const [notice, setNotice] = useState('')
  const invite = useMutation({
    mutationFn: (value: string) => postApi('/api/create-team-invitation', { email: value }),
    onSuccess: ({ token }) => {
      setInviteUrl(`${window.location.origin}${paths.trainerJoin}?token=${encodeURIComponent(token)}`)
      setNotice('Link erstellt. Teile ihn sicher mit der eingeladenen Person.')
    },
  })

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setNotice('Einladungslink kopiert.')
    } catch {
      setNotice('Kopieren nicht möglich. Markiere den Link und kopiere ihn manuell.')
    }
  }

  return (
    <form
      className="mt-5 space-y-3 border-t border-slate-200 pt-4"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setInviteUrl('')
        setNotice('')
        invite.mutate(email.trim())
      }}
    >
      <h3 className="font-semibold">Trainer einladen</h3>
      <Field label="E-Mail-Adresse">
        <TextInput type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} />
      </Field>
      <ErrorText>{invite.isError ? errorText(invite.error) : null}</ErrorText>
      <Button type="submit" disabled={invite.isPending || !email.trim()}>
        {invite.isPending ? 'Erstelle Link …' : 'Einladungslink erstellen'}
      </Button>
      {inviteUrl && (
        <div className="space-y-2">
          <Field label="Einladungslink" hint="Einmal verwendbar, 7 Tage gültig. Die eingeladene Person muss sich mit dieser E-Mail anmelden.">
            <TextInput value={inviteUrl} readOnly onFocus={(event) => event.currentTarget.select()} />
          </Field>
          <Button variant="secondary" onClick={() => void copyLink()}>Link kopieren</Button>
        </div>
      )}
      {notice && <p role="status" className="text-sm text-slate-600">{notice}</p>}
    </form>
  )
}

function AccountSection({ familyId, role, teamName }: { familyId: string; role: string; teamName: string }) {
  const queryClient = useQueryClient()
  const [pin, setPin] = useState('')
  const [saved, setSaved] = useState(false)
  const pinStatus = useQuery({
    queryKey: ['team-pin-status', familyId],
    queryFn: () => postApi('/api/team-pin', { action: 'status' }),
  })
  const setTeamPin = useMutation({
    mutationFn: (value: string) => postApi('/api/team-pin', { action: 'set', pin: value }),
    onSuccess: () => {
      setPin('')
      setSaved(true)
      queryClient.setQueryData(['team-pin-status', familyId], { configured: true })
    },
  })

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card>
        <h2 className="text-xl font-bold">Team-PIN ändern</h2>
        <p className="mt-2 text-slate-600">{pinStatus.data?.configured ? 'Lege einen neuen vierstelligen PIN fest.' : 'Für den Trainer-Bereich ist noch kein PIN eingerichtet.'}</p>
        <form
          className="mt-4 space-y-3"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            setSaved(false)
            setTeamPin.mutate(pin)
          }}
        >
          <Field label="Neuer Team-PIN">
            <TextInput
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
              required
            />
          </Field>
          <ErrorText>{setTeamPin.isError ? errorText(setTeamPin.error) : null}</ErrorText>
          {saved && <p role="status">Team-PIN gespeichert.</p>}
          <Button type="submit" disabled={pin.length !== 4 || setTeamPin.isPending}>PIN speichern</Button>
        </form>
      </Card>
      <Card>
        <h2 className="text-xl font-bold">Konto</h2>
        <p className="mt-2 text-slate-600">Trainerkonten werden mit ihrer E-Mail-Adresse verwaltet.</p>
        <p className="mt-3 text-sm text-slate-500" data-testid="app-version">
          Version {__APP_VERSION__} · {__APP_COMMIT__} · {new Date(__APP_BUILT__).toLocaleDateString('de-DE')}
        </p>
        <Button
          className="mt-4"
          variant="secondary"
          onClick={() => void supabase.auth.signOut()}
        >
          Abmelden
        </Button>
      </Card>
      {role === 'admin' && <DeleteTeam teamName={teamName} />}
    </div>
  )
}

/**
 * Deletes the team with all its data and the accounts of all its trainers (SR-09). Typing the
 * team name is the confirmation; afterwards the session is gone, so the app returns to sign-in.
 */
function DeleteTeam({ teamName }: { teamName: string }) {
  const [typed, setTyped] = useState('')
  const remove = useMutation({
    mutationFn: () => postApi('/api/delete-team', { teamName: typed }),
    onSuccess: () => supabase.auth.signOut({ scope: 'local' }),
  })
  return (
    <Card className="ring-red-200 md:col-span-2">
      <h2 className="text-xl font-bold text-red-800">Team löschen</h2>
      <p className="mt-2 text-slate-700">
        Löscht das Team mit allen Spielern, Wörterlisten, Runden, Fotos und Aufnahmen – und die Konten aller Trainer dieses Teams. Das lässt sich nicht
        rückgängig machen.
      </p>
      <form
        className="mt-4 flex flex-wrap items-end gap-3"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault()
          remove.mutate()
        }}
      >
        <div className="min-w-48 flex-1">
          <Field label={`Zur Bestätigung den Teamnamen „${teamName}“ eingeben`}>
            <TextInput value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" />
          </Field>
        </div>
        <Button type="submit" className="bg-red-700 hover:bg-red-800" disabled={typed.trim() !== teamName.trim() || remove.isPending}>
          {remove.isPending ? 'Lösche …' : 'Team endgültig löschen'}
        </Button>
      </form>
      <ErrorText>{remove.isError && errorText(remove.error)}</ErrorText>
    </Card>
  )
}

export function JoinTeamPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const token = search.get('token') ?? ''
  const [error, setError] = useState('')

  useEffect(() => {
    if (!auth.session || !token) return
    let active = true
    postApi('/api/accept-team-invitation', { token })
      .then(() => {
        if (active) navigate(paths.trainer, { replace: true })
      })
      .catch((reason: unknown) => {
        if (active) setError(errorText(reason))
      })
    return () => {
      active = false
    }
  }, [auth.session, navigate, token])

  const signIn = `${paths.login}?invite=${encodeURIComponent(token)}`
  if (auth.loading || (auth.session && token && !error)) return <Loading />
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <Card>
        <h1 className="text-2xl font-bold">Einladung zum Team</h1>
        {!token ? (
          <ErrorText>Der Einladungslink ist unvollständig.</ErrorText>
        ) : auth.session ? (
          <ErrorText>{error || 'Die Einladung konnte nicht angenommen werden.'}</ErrorText>
        ) : (
          <>
            <p className="mt-3 text-slate-600">Melde dich mit der eingeladenen E-Mail-Adresse an oder erstelle damit ein Konto.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <ButtonLink to={signIn}>Anmelden</ButtonLink>
              <ButtonLink variant="secondary" to={signIn}>Konto erstellen</ButtonLink>
            </div>
          </>
        )}
        <Link className="mt-5 inline-block text-sm text-brand-700 underline" to={paths.home}>Zurück</Link>
      </Card>
    </main>
  )
}
