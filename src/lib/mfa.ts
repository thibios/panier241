/** Longueur du code TOTP affiché par les applications d'authentification. */
export const MFA_CODE_LENGTH = 6

/** Champ de saisie du code : mêmes jetons que les champs de connexion (Auth.tsx). */
export const mfaInputClass =
  'w-full rounded-2xl bg-brand-light px-3 py-2.5 text-center text-lg font-semibold tracking-[0.4em] text-brand-dark placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand'

/** Garde uniquement les chiffres saisis, dans la limite de 6. */
export function sanitizeMfaCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, MFA_CODE_LENGTH)
}

/** Message français pour une erreur Supabase Auth MFA (code d'erreur sinon message brut). */
export function translateMfaError(error: { code?: string; message?: string } | null | undefined): string {
  const code = error?.code ?? ''
  const message = error?.message ?? ''
  if (code === 'mfa_verification_failed' || /invalid totp|invalid code/i.test(message)) {
    return 'Code incorrect ou expiré. Saisissez le nouveau code affiché par votre application.'
  }
  if (code === 'mfa_challenge_expired') return 'Le délai est dépassé. Saisissez un nouveau code.'
  if (code === 'insufficient_aal') {
    return 'Validez d’abord votre code de double authentification (reconnectez-vous si besoin).'
  }
  if (code === 'too_many_enrolled_mfa_factors') {
    return 'Trop de tentatives d’activation en cours. Réessayez dans quelques minutes.'
  }
  if (code === 'over_request_rate_limit') return 'Trop de tentatives. Patientez une minute avant de réessayer.'
  if (code === 'mfa_totp_enroll_not_enabled' || code === 'mfa_totp_verify_not_enabled') {
    return 'La double authentification n’est pas disponible pour le moment.'
  }
  return 'La double authentification n’a pas pu être vérifiée. Réessayez.'
}
