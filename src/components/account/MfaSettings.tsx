import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { MFA_CODE_LENGTH, mfaInputClass, sanitizeMfaCode, translateMfaError } from '../../lib/mfa'

/** Ancre de la section (lien depuis l'espace admin : /profil#double-authentification). */
export const MFA_SECTION_ID = 'double-authentification'

/** Enrôlement en cours : facteur TOTP créé, pas encore vérifié. */
interface PendingEnrollment {
  factorId: string
  /** QR code SVG (data URL) tel que renvoyé par Supabase Auth. */
  qrCode: string
  /** Clé à saisir à la main si le QR code ne peut pas être scanné. */
  secret: string
}

/**
 * Double authentification (TOTP, Supabase Auth MFA) : activation par QR code, état, désactivation.
 * Obligatoire pour accéder à l'administration (migration 027), proposée à tout compte connecté.
 */
export default function MfaSettings() {
  const { isAdminMember, refreshSecurity } = useAuth()
  const location = useLocation()
  const sectionRef = useRef<HTMLElement>(null)

  const [verifiedFactorId, setVerifiedFactorId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pending, setPending] = useState<PendingEnrollment | null>(null)
  const [code, setCode] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [confirmDisable, setConfirmDisable] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const loadFactors = useCallback(async () => {
    const { data, error: listError } = await supabase.auth.mfa.listFactors()
    setIsLoading(false)
    if (listError) {
      setError('Impossible de lire l’état de la double authentification. Réessayez plus tard.')
      return
    }
    setVerifiedFactorId(data.totp[0]?.id ?? null)
  }, [])

  useEffect(() => {
    loadFactors()
  }, [loadFactors])

  useEffect(() => {
    if (location.hash === `#${MFA_SECTION_ID}`) sectionRef.current?.scrollIntoView({ block: 'start' })
  }, [location.hash, isLoading])

  async function startEnrollment() {
    setError(null)
    setNotice(null)
    setIsBusy(true)
    // Un enrôlement abandonné laisse un facteur non vérifié : il est retiré avant d'en créer un nouveau.
    const { data: list, error: listError } = await supabase.auth.mfa.listFactors()
    if (listError) {
      setIsBusy(false)
      setError(translateMfaError(listError))
      return
    }
    for (const factor of list.all) {
      if (factor.status !== 'unverified') continue
      const { error: cleanupError } = await supabase.auth.mfa.unenroll({ factorId: factor.id })
      if (cleanupError) {
        setIsBusy(false)
        setError(translateMfaError(cleanupError))
        return
      }
    }
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    setIsBusy(false)
    if (enrollError || !data) {
      setError(translateMfaError(enrollError))
      return
    }
    setCode('')
    setPending({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret })
  }

  async function cancelEnrollment() {
    if (!pending) return
    setIsBusy(true)
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: pending.factorId })
    setIsBusy(false)
    if (unenrollError) {
      setError(translateMfaError(unenrollError))
      return
    }
    setPending(null)
    setCode('')
    setError(null)
  }

  async function confirmEnrollment(e: FormEvent) {
    e.preventDefault()
    if (!pending) return
    if (code.length !== MFA_CODE_LENGTH) {
      setError('Saisissez les 6 chiffres affichés par votre application.')
      return
    }
    setError(null)
    setIsBusy(true)
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: pending.factorId })
    if (challengeError || !challenge) {
      setIsBusy(false)
      setError(translateMfaError(challengeError))
      return
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: pending.factorId,
      challengeId: challenge.id,
      code,
    })
    setIsBusy(false)
    if (verifyError) {
      setCode('')
      setError(translateMfaError(verifyError))
      return
    }
    // La vérification fait passer la session en aal2.
    setPending(null)
    setCode('')
    setNotice('Double authentification activée. Le code vous sera demandé à chaque connexion.')
    await loadFactors()
    await refreshSecurity()
  }

  async function disable() {
    if (!verifiedFactorId) return
    setError(null)
    setNotice(null)
    setIsBusy(true)
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: verifiedFactorId })
    if (unenrollError) {
      setIsBusy(false)
      setError(translateMfaError(unenrollError))
      return
    }
    // Le jeton reste en aal2 jusqu'à son renouvellement : il est renouvelé tout de suite.
    const { error: refreshError } = await supabase.auth.refreshSession()
    setIsBusy(false)
    setConfirmDisable(false)
    if (refreshError) setError('Double authentification désactivée. Reconnectez-vous pour mettre à jour votre session.')
    else setNotice('Double authentification désactivée.')
    await loadFactors()
    await refreshSecurity()
  }

  return (
    <section id={MFA_SECTION_ID} ref={sectionRef} className="scroll-mt-4">
      <h2 className="mb-2 text-sm font-semibold text-brand-dark">Double authentification</h2>
      <Card className="space-y-3">
        {isLoading ? (
          <p className="text-xs text-muted">Chargement...</p>
        ) : verifiedFactorId ? (
          <>
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 shrink-0 text-accent-ink" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-brand-dark">Activée</p>
                <p className="text-xs text-muted">
                  Un code de votre application d'authentification est demandé à chaque connexion.
                </p>
              </div>
            </div>
            {confirmDisable ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-brand-dark">
                  Désactiver la double authentification ?
                  {isAdminMember && ' Vous n’aurez plus accès à l’administration tant qu’elle ne sera pas réactivée.'}
                </p>
                <div className="flex gap-2">
                  <Button variant="danger" onClick={disable} loading={isBusy}>
                    Désactiver
                  </Button>
                  <Button variant="secondary" onClick={() => setConfirmDisable(false)} disabled={isBusy}>
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="secondary" fullWidth onClick={() => setConfirmDisable(true)}>
                Désactiver la double authentification
              </Button>
            )}
          </>
        ) : pending ? (
          <form onSubmit={confirmEnrollment} className="space-y-3">
            <p className="text-xs text-muted">
              1. Scannez ce QR code avec votre application d'authentification (Google Authenticator, Microsoft
              Authenticator, 2FAS...).
            </p>
            <img src={pending.qrCode} alt="QR code d'activation de la double authentification" className="mx-auto h-44 w-44 bg-white" />
            <p className="text-xs text-muted">
              Scan impossible ? Saisissez cette clé dans l'application :{' '}
              <span className="break-all font-mono text-brand-dark">{pending.secret}</span>
            </p>
            <p className="text-xs text-muted">2. Saisissez le code à 6 chiffres affiché par l'application.</p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={MFA_CODE_LENGTH}
              value={code}
              onChange={(e) => setCode(sanitizeMfaCode(e.target.value))}
              placeholder="000000"
              aria-label="Code à 6 chiffres"
              className={mfaInputClass}
            />
            <div className="flex gap-2">
              <Button type="submit" loading={isBusy}>
                Activer
              </Button>
              <Button type="button" variant="secondary" onClick={cancelEnrollment} disabled={isBusy}>
                Annuler
              </Button>
            </div>
          </form>
        ) : (
          <>
            <p className="text-xs text-muted">
              Protégez votre compte : en plus du mot de passe, un code à 6 chiffres généré par une application
              d'authentification sera demandé à la connexion.
              {isAdminMember && ' Obligatoire pour accéder à l’administration.'}
            </p>
            <Button fullWidth onClick={startEnrollment} loading={isBusy}>
              Activer la double authentification
            </Button>
          </>
        )}
        {notice && <p className="text-xs font-semibold text-accent-ink">{notice}</p>}
        {error && (
          <p role="alert" className="text-xs font-semibold text-danger">
            {error}
          </p>
        )}
      </Card>
    </section>
  )
}
