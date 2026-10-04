import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import WovenHeader from '../components/layout/WovenHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

const inputClass =
  'w-full rounded-2xl bg-brand-light px-3 py-2.5 text-sm text-brand-dark placeholder:text-brand-dark/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50'

/**
 * Écran d'arrivée du lien « mot de passe oublié » reçu par email. Le lien
 * ouvre une session temporaire ; l'utilisateur choisit alors un nouveau mot de passe.
 */
export default function ResetPassword() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirmation) {
      setError('Les deux mots de passe ne sont pas identiques.')
      return
    }
    setError(null)
    setIsSubmitting(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setIsSubmitting(false)
    if (updateError) {
      setError("Le mot de passe n'a pas pu être modifié. Redemande un lien et réessaie.")
      return
    }
    setDone(true)
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto min-h-screen max-w-md">
        <WovenHeader>
          <h1 className="text-xl font-bold">Nouveau mot de passe</h1>
        </WovenHeader>

        <div className="px-5 pt-6">
          {done ? (
            <Card className="space-y-3 text-center">
              <p className="text-sm font-medium text-brand-dark">Ton mot de passe a été modifié.</p>
              <Button fullWidth onClick={() => navigate('/')}>
                Continuer
              </Button>
            </Card>
          ) : !session ? (
            <Card className="space-y-3 text-center">
              <p className="text-sm font-medium text-brand-dark">Ce lien n'est plus valide.</p>
              <p className="text-xs text-brand-dark/60">
                Les liens de réinitialisation expirent et ne servent qu'une fois. Demande-en un nouveau depuis
                l'écran de connexion.
              </p>
              <Link to="/" className="inline-block text-sm font-semibold text-brand underline">
                Retour à la connexion
              </Link>
            </Card>
          ) : (
            <Card>
              <form onSubmit={handleSubmit} className="space-y-3">
                <p className="text-xs text-brand-dark/60">Choisis un nouveau mot de passe d'au moins 6 caractères.</p>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nouveau mot de passe"
                  aria-label="Nouveau mot de passe"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className={inputClass}
                />
                <input
                  type="password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder="Confirme le mot de passe"
                  aria-label="Confirmation du mot de passe"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className={inputClass}
                />
                {error && (
                  <p className="text-xs text-category-poisson" role="alert">
                    {error}
                  </p>
                )}
                <Button type="submit" fullWidth loading={isSubmitting}>
                  Enregistrer
                </Button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
