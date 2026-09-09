export const PANIER241_WHATSAPP = '+241 7752 26 76'

/** Construit un lien wa.me à partir d'un numéro (formats variés acceptés) et d'un message optionnel. */
export function buildWhatsAppLink(phone: string, message?: string): string {
  const digits = phone.replace(/[^\d]/g, '')
  const base = `https://wa.me/${digits}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}
