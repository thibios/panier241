import { useState, type FormEvent } from 'react'
import { ShieldCheck } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { MFA_CODE_LENGTH, mfaInputClass, sanitizeMfaCode, translateMfaError } from '../../lib/mfa'

/**
 * Étape de connexion pour un compte qui a activé la double authentification :
 * la session reste en aal1 tant que le code à 6 chiffres de l'application d'authentification n'est pas vérifié.
 */
export default function MfaChallenge() {
  const { signOut, refreshSecurity } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (code.length !== MFA_CODE_LENGTH) {
      setError('Saisissez les 6 chiffres affichés par votre application.')
      return
    }
    setError(null)
    setIsVerifying(true)
    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors()
    const factor = factors?.totp[0]
    if (listError || !factor) {
      setIsVerifying(false)
      setError('Impossible de retrouver votre double authentification. Reconnectez-vous.')
      return
    }
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id })
    if (challengeError || !challenge) {
      setIsVerifying(false)
      setError(translateMfaError(challengeError))
      return
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.id,
      code,
    })
    if (verifyError) {
      setIsVerifying(false)
      setCode('')
      setError(translateMfaError(verifyError))
      return
    }
    // La session passe en aal2 : l'application s'affiche dès que les droits sont relus.
    await refreshSecurity()
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto min-h-screen max-w-md px-5 pt-10">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-3">
            <ShieldCheck className="h-8 w-8 text-brand" aria-hidden="true" />
            <h1 className="text-base font-semibold text-brand-dark">Double authentification</h1>
            <p className="text-xs text-muted">
              Ouvrez votre application d'authentification et saisissez le code à 6 chiffres affiché pour Le Panier 241.
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={MFA_CODE_LENGTH}
              value={code}
              onChange={(e) => setCode(sanitizeMfaCode(e.target.value))}
              placeholder="000000"
              aria-label="Code à 6 chiffres"
              autoFocus
              className={mfaInputClass}
            />
            {error && (
              <p role="alert" className="text-xs font-semibold text-danger">
                {error}
              </p>
            )}
            <Button type="submit" fullWidth loading={isVerifying}>
              Valider le code
            </Button>
            <Button type="button" variant="ghost" fullWidth onClick={() => signOut()}>
              Se déconnecter
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
