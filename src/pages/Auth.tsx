import { useState, type FormEvent } from 'react'
import WovenHeader from '../components/layout/WovenHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'

type Mode = 'signin' | 'signup'

export default function Auth() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const inputClass =
    'w-full rounded-2xl bg-brand-light px-3 py-2.5 text-sm text-brand-dark placeholder:text-brand-dark/40 focus:outline-none'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

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
          <h1 className="text-2xl font-bold">Panier 241</h1>
          <p className="mt-1 text-sm text-white/80">
            Vos marchés et commerçants préférés, livrés chez vous.
          </p>
        </WovenHeader>

        <div className="px-5 pt-6">
          <div className="mb-4 flex gap-2 rounded-pill bg-brand-light p-1">
            <button
              type="button"
              onClick={() => {
                setMode('signin')
                setError(null)
              }}
              className={`flex-1 rounded-pill py-2 text-sm font-semibold transition ${
                mode === 'signin' ? 'bg-white text-brand shadow-card' : 'text-brand-dark/60'
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup')
                setError(null)
              }}
              className={`flex-1 rounded-pill py-2 text-sm font-semibold transition ${
                mode === 'signup' ? 'bg-white text-brand shadow-card' : 'text-brand-dark/60'
              }`}
            >
              Créer un compte
            </button>
          </div>

          <Card>
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'signup' && (
                <>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Prénom"
                    required
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Nom"
                    required
                    className={inputClass}
                  />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Téléphone (ex: +241 074 12 34 56)"
                    className={inputClass}
                  />
                </>
              )}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className={inputClass}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                required
                minLength={6}
                className={inputClass}
              />

              {error && <p className="text-xs text-category-poisson">{error}</p>}

              <Button type="submit" fullWidth disabled={isSubmitting}>
                {isSubmitting
                  ? 'Un instant...'
                  : mode === 'signin'
                    ? 'Se connecter'
                    : 'Créer mon compte'}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}
