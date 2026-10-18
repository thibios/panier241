import type { FulfillmentMode } from '../types'

/**
 * Barème d'ESTIMATION affiché avant la commande. La base de données (table app_settings,
 * fonction create_order de la migration 022) est la seule source de vérité : le montant
 * final est celui qu'elle renvoie à la création de la commande.
 * Valeurs alignées sur app_settings (confirmées par le propriétaire).
 */
export const BASE_DELIVERY_FEE = 2000
export const RATE_PER_KM = 300
/** Livraison sans position GPS (lieu de vente ou adresse) : forfait TOTAL. */
export const FALLBACK_DELIVERY_FEE = 1500
export const SERVICE_FEE_RATE = 0.05
/** Acompte dû quand le total dépasse ce seuil (F CFA). */
export const DEPOSIT_THRESHOLD = 100000
/** Acompte : part du total de la commande. */
export const DEPOSIT_RATE = 0.05

export type { FulfillmentMode }

export interface Coordinates {
  lat: number
  lng: number
}

/** Distance à vol d'oiseau entre deux points GPS, en kilomètres. */
export function haversineDistanceKm(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const earthRadiusKm = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return earthRadiusKm * c
}

export interface DeliveryComputation {
  serviceFee: number
  distanceKm: number | null
  deliveryFee: number
  total: number
  /** Acompte estimé (0 si le total ne dépasse pas le seuil). */
  deposit: number
}

/** Acompte estimé : DEPOSIT_RATE du total, au-delà de DEPOSIT_THRESHOLD. */
export function computeDeposit(total: number): number {
  return total > DEPOSIT_THRESHOLD ? Math.round(total * DEPOSIT_RATE) : 0
}

/**
 * Estimation de la tarification d'une commande :
 * total = sous-total + commission (5 %) + livraison.
 * Livraison avec GPS : 2 000 F + 300 F/km ; sans GPS : forfait total de 1 500 F ; retrait sur stand : 0 F.
 */
export function computeDelivery(
  subtotal: number,
  marketCoords: Coordinates | null,
  addressCoords: Coordinates | null,
  mode: FulfillmentMode = 'livraison',
): DeliveryComputation {
  const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE)

  let distanceKm: number | null = null
  let deliveryFee = 0
  if (mode === 'livraison') {
    if (marketCoords && addressCoords) {
      distanceKm = haversineDistanceKm(marketCoords, addressCoords)
      deliveryFee = BASE_DELIVERY_FEE + Math.round(distanceKm * RATE_PER_KM)
    } else {
      deliveryFee = FALLBACK_DELIVERY_FEE
    }
  }

  const total = subtotal + serviceFee + deliveryFee
  return { serviceFee, distanceKm, deliveryFee, total, deposit: computeDeposit(total) }
}
