export const BASE_DELIVERY_FEE = 2000
export const RATE_PER_KM = 300
export const FALLBACK_DISTANCE_FEE = 1500
export const SERVICE_FEE_RATE = 0.05

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
}

/**
 * Calcule la tarification d'une commande :
 * total = sous-total + commission (5%) + livraison (2000 F CFA de base + distance x 300 F CFA/km).
 * Sans coordonnées disponibles (marché ou adresse), la partie distance est remplacée par un
 * forfait fixe pour ne jamais bloquer la commande.
 */
export function computeDelivery(
  subtotal: number,
  marketCoords: Coordinates | null,
  addressCoords: Coordinates | null,
): DeliveryComputation {
  const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE)

  let distanceKm: number | null = null
  let distanceFee = FALLBACK_DISTANCE_FEE
  if (marketCoords && addressCoords) {
    distanceKm = haversineDistanceKm(marketCoords, addressCoords)
    distanceFee = Math.round(distanceKm * RATE_PER_KM)
  }

  const deliveryFee = BASE_DELIVERY_FEE + distanceFee
  const total = subtotal + serviceFee + deliveryFee

  return { serviceFee, distanceKm, deliveryFee, total }
}
