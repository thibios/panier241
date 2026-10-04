import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import WovenHeader from '../components/layout/WovenHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

type Mode = 'signin' | 'signup' | 'forgot'

const inputClass =
  'w-full rounded-2xl bg-brand-light px-3 py-2.5 text-sm text-brand-dark placeholder:text-brand-dark/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50'

export default function Auth() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
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

    const result =
      mode === 'signin'
        ? await signIn(email, password)
        : await signUp({ email, password, firstName, lastName, phone })

    setIsSubmitting(false)
    if (result.error) setError(result.error)
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto min-h-screen max-w-md">
        <WovenHeader>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Panier<span className="text-accent">241</span>
          </h1>
          <p className="mt-1 text-sm text-white/85">
            Vos courses dans les marchés et magasins de Libreville, livrées chez vous.
          </p>
        </WovenHeader>

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
              <form onSubmit={handleSubmit} className="space-y-3">
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  aria-label="Email"
                  autoComplete="email"
                  required
                  className={inputClass}
                />
                {mode !== 'forgot' && (
                  <input
                    type="password"
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
