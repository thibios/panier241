import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { supabase, getRememberMe, setRememberMe } from '../lib/supabaseClient'

type Mode = 'signin' | 'signup' | 'forgot'

const LAST_EMAIL_KEY = 'panier241:last-email'

function readLastEmail(): string {
  try {
    return getRememberMe() ? localStorage.getItem(LAST_EMAIL_KEY) ?? '' : ''
  } catch {
    return ''
  }
}

/**
 * Propose au gestionnaire de mots de passe du navigateur (Chrome, Edge, Android)
 * d'enregistrer l'email et le mot de passe. L'application elle-même ne les stocke jamais.
 */
async function offerToSaveCredentials(email: string, password: string) {
  const w = window as unknown as { PasswordCredential?: new (data: { id: string; password: string; name?: string }) => Credential }
  if (!w.PasswordCredential || !navigator.credentials?.store) return
  try {
    await navigator.credentials.store(new w.PasswordCredential({ id: email, password, name: email }))
  } catch {
    // Refusé ou non pris en charge : la saisie automatique classique prend le relais.
  }
}

const inputClass =
  'w-full rounded-2xl bg-brand-light px-3 py-2.5 text-sm text-brand-dark placeholder:text-brand-dark/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50'

export default function Auth() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState(readLastEmail)
  const [rememberMe, setRemember] = useState(getRememberMe)
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setResetSent(false)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    if (mode === 'forgot') {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/nouveau-mot-de-passe`,
      })
      setIsSubmitting(false)
      // Même message qu'un compte existe ou non : on ne révèle pas quelles adresses sont inscrites.
      if (resetError) setError("L'email n'a pas pu être envoyé. Réessaie dans quelques minutes.")
      else setResetSent(true)
      return
    }

    // Le choix est appliqué avant la connexion : la session est rangée au bon endroit dès sa création.
    setRememberMe(rememberMe)
    const result =
      mode === 'signin'
        ? await signIn(email, password)
        : await signUp({ email, password, firstName, lastName, phone })

    setIsSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    try {
      if (rememberMe) localStorage.setItem(LAST_EMAIL_KEY, email.trim())
      else localStorage.removeItem(LAST_EMAIL_KEY)
    } catch {
      // Stockage indisponible : l'email ne sera simplement pas prérempli.
    }
    if (rememberMe) await offerToSaveCredentials(email.trim(), password)
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto min-h-screen max-w-md">
        <header className="px-5 pt-6 text-center">
          <h1>
            <img src="/logos/le-panier-241.webp" alt="Le Panier 241, marketplace : tout le Gabon à portée de main" className="mx-auto w-64 max-w-full" />
          </h1>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
            Vos courses dans les marchés et magasins de Libreville, livrées chez vous.
          </p>
        </header>

        <div className="px-5 pt-6">
          {mode !== 'forgot' && (
            <div className="mb-4 flex gap-2 rounded-xl bg-brand-light p-1">
              {(['signin', 'signup'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => switchMode(tab)}
                  aria-pressed={mode === tab}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                    mode === tab ? 'bg-white text-brand shadow-card' : 'text-brand-dark/60'
                  }`}
                >
                  {tab === 'signin' ? 'Connexion' : 'Créer un compte'}
                </button>
              ))}
            </div>
          )}

          <Card>
            {mode === 'forgot' && resetSent ? (
              <div className="space-y-3 text-center">
                <p className="text-sm font-medium text-brand-dark">Vérifie ta boîte mail</p>
                <p className="text-xs text-brand-dark/60">
                  Si un compte existe pour {email.trim()}, un lien pour choisir un nouveau mot de passe vient d'y
                  être envoyé. Pense à regarder dans les courriers indésirables.
                </p>
                <Button variant="secondary" fullWidth onClick={() => switchMode('signin')}>
                  Retour à la connexion
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} method="post" action="#" autoComplete="on" className="space-y-3">
                {mode === 'forgot' && (
                  <div>
                    <h2 className="text-base font-semibold text-brand-dark">Mot de passe oublié</h2>
                    <p className="mt-1 text-xs text-brand-dark/60">
                      Saisis l'adresse email de ton compte : nous t'envoyons un lien pour choisir un nouveau mot de
                      passe.
                    </p>
                  </div>
                )}
                {mode === 'signup' && (
                  <>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Prénom"
                      aria-label="Prénom"
                      autoComplete="given-name"
                      required
                      className={inputClass}
                    />
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Nom"
                      aria-label="Nom"
                      autoComplete="family-name"
                      required
                      className={inputClass}
                    />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Téléphone (ex: +241 074 12 34 56)"
                      aria-label="Téléphone"
                      autoComplete="tel"
                      className={inputClass}
                    />
                  </>
                )}
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  aria-label="Email"
                  autoComplete={mode === 'signin' ? 'username' : 'email'}
                  required
                  className={inputClass}
                />
                {mode !== 'forgot' && (
                  <input
                    type="password"
                    id={mode === 'signin' ? 'current-password' : 'new-password'}
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mot de passe"
                    aria-label="Mot de passe"
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    required
                    minLength={6}
                    className={inputClass}
                  />
                )}

                {mode !== 'forgot' && (
                  <label className="flex cursor-pointer items-center gap-2 py-1 text-xs font-semibold text-brand-dark">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 accent-[rgb(var(--color-brand))]"
                    />
                    Rester connecté et se souvenir de mon email
                  </label>
                )}

                {error && (
                  <p className="text-xs text-category-poisson" role="alert">
                    {error}
                  </p>
                )}

                <Button type="submit" fullWidth loading={isSubmitting}>
                  {mode === 'signin' ? 'Se connecter' : mode === 'signup' ? 'Créer mon compte' : 'Envoyer le lien'}
                </Button>

                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="block w-full py-1 text-center text-xs font-semibold text-brand underline"
                  >
                    Mot de passe oublié ?
                  </button>
                )}
                {mode === 'forgot' && (
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="block w-full py-1 text-center text-xs font-semibold text-brand underline"
                  >
                    Retour à la connexion
                  </button>
                )}
              </form>
            )}
          </Card>

          <p className="mt-4 text-center text-xs text-brand-dark/60">
            En créant un compte, vous acceptez nos{' '}
            <Link to="/cgu" className="font-medium text-brand underline">
              conditions générales
            </Link>{' '}
            et notre{' '}
            <Link to="/confidentialite" className="font-medium text-brand underline">
              politique de confidentialité
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
