import type { Order, OrderStatus, PaymentMethodCode } from '../types'

/**
 * Contrat avec le moteur de commande de la base (migration 022) : colonnes lues, conversion des
 * lignes, libellés de statut et traduction des erreurs. Toutes les écritures passent par des
 * fonctions RPC (create_order, set_order_status, adjust_order_amount, respond_to_adjustment...).
 */

export const ORDER_COLUMNS =
  'id, merchant_id, merchant_name, items, subtotal, service_fee, delivery_fee, distance_km, total, status, slot_label, address_label, created_at, livreur_id, livreur_name, livreur_phone, shopping_video_url, client_phone, cancelled_at, cancel_reason, fulfillment_mode, discount_amount, deposit_amount, deposit_status, payment_method, payment_status, initial_subtotal, adjustment_status, proposed_subtotal, accepted_at'

export interface OrderRow {
  id: string
  merchant_id: string
  merchant_name: string
  items: Order['items']
  subtotal: number
  service_fee: number
  delivery_fee: number
  distance_km: number | null
  total: number
  status: OrderStatus
  slot_label: string
  address_label: string
  created_at: string
  livreur_id: string | null
  livreur_name: string | null
  livreur_phone: string | null
  shopping_video_url: string | null
  client_phone: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  fulfillment_mode: Order['fulfillmentMode']
  discount_amount: number
  deposit_amount: number
  deposit_status: Order['depositStatus']
  payment_method: PaymentMethodCode | null
  payment_status: Order['paymentStatus']
  initial_subtotal: number
  adjustment_status: Order['adjustmentStatus']
  proposed_subtotal: number | null
  accepted_at: string | null
}

export function orderFromRow(row: OrderRow): Order {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    merchantName: row.merchant_name,
    items: row.items,
    subtotal: row.subtotal,
    serviceFee: row.service_fee,
    deliveryFee: row.delivery_fee,
    distanceKm: row.distance_km,
    total: row.total,
    status: row.status,
    createdAt: row.created_at,
    slotLabel: row.slot_label,
    addressLabel: row.address_label,
    livreurId: row.livreur_id,
    livreurName: row.livreur_name,
    livreurPhone: row.livreur_phone,
    shoppingVideoUrl: row.shopping_video_url,
    clientPhone: row.client_phone,
    cancelledAt: row.cancelled_at,
    cancelReason: row.cancel_reason,
    fulfillmentMode: row.fulfillment_mode ?? 'livraison',
    discountAmount: row.discount_amount ?? 0,
    depositAmount: row.deposit_amount ?? 0,
    depositStatus: row.deposit_status ?? 'non_requis',
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    initialSubtotal: row.initial_subtotal ?? row.subtotal,
    adjustmentStatus: row.adjustment_status ?? 'aucun',
    proposedSubtotal: row.proposed_subtotal,
    acceptedAt: row.accepted_at,
  }
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  en_preparation: 'En préparation',
  prete_a_livrer: 'Prête, en attente de livreur',
  en_livraison: 'En cours de livraison',
  livree: 'Livrée',
  prete_a_retirer: 'Prête à retirer',
  retiree: 'Retirée',
  annulee: 'Annulée',
}

/** Commande encore active (ni livrée, ni retirée, ni annulée). */
export function isActiveStatus(status: OrderStatus): boolean {
  return status !== 'livree' && status !== 'retiree' && status !== 'annulee'
}

/** Montant encore modifiable par le commerçant (avant départ en livraison ou avant retrait). */
export function isBeforeDeparture(status: OrderStatus): boolean {
  return status === 'en_preparation' || status === 'prete_a_livrer' || status === 'prete_a_retirer'
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodCode, string> = {
  airtel_money: 'Airtel Money',
  moov_money: 'Moov Money',
  especes: 'Espèces',
}

/** Identifiants du panier (src/data/addresses.ts) vers les codes attendus par la base. */
export function paymentCodeFromId(id: string): PaymentMethodCode {
  if (id === 'pay-2') return 'moov_money'
  if (id === 'pay-3') return 'especes'
  return 'airtel_money'
}

/** Identifiant unique d'une tentative de commande (idempotence de create_order). */
export function newRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // Repli RFC 4122 v4 pour les navigateurs anciens.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16)
    return (c === 'x' ? r : (r % 4) + 8).toString(16)
  })
}

interface DbErrorLike {
  message?: string
  code?: string
}

/**
 * Message en français à afficher pour une erreur renvoyée par Supabase. Les fonctions du moteur
 * lèvent déjà des messages en français ; les erreurs techniques sont reformulées.
 */
export function translateDbError(error: DbErrorLike | null | undefined): string {
  if (!error) return "Une erreur inconnue s'est produite."
  const message = error.message ?? ''
  if (/failed to fetch|network|load failed/i.test(message)) {
    return 'Connexion impossible. Vérifiez votre réseau puis réessayez.'
  }
  if (error.code === '42501' && /permission denied/i.test(message)) {
    return "Action non autorisée pour votre compte."
  }
  if (/row-level security/i.test(message)) return 'Action non autorisée pour votre compte.'
  if (error.code === 'PGRST202' || /could not find the function/i.test(message)) {
    return 'Le service de commande n’est pas encore disponible. Réessayez plus tard.'
  }
  if (/JWT|not authenticated/i.test(message)) return 'Session expirée. Reconnectez-vous.'
  return message || "Une erreur inconnue s'est produite."
}

export interface OrderHistoryEntry {
  id: number
  oldStatus: OrderStatus | null
  newStatus: OrderStatus
  actorRole: string
  event: string
  reason: string | null
  createdAt: string
}

export interface OrderHistoryRow {
  id: number
  old_status: OrderStatus | null
  new_status: OrderStatus
  actor_role: string
  event: string
  reason: string | null
  created_at: string
}

export function historyFromRow(row: OrderHistoryRow): OrderHistoryEntry {
  return {
    id: row.id,
    oldStatus: row.old_status,
    newStatus: row.new_status,
    actorRole: row.actor_role,
    event: row.event,
    reason: row.reason,
    createdAt: row.created_at,
  }
}

export const ACTOR_ROLE_LABELS: Record<string, string> = {
  client: 'Client',
  commercant: 'Commerçant',
  livreur: 'Livreur',
  admin: 'Administrateur',
  systeme: 'Système',
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  return (
    date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) +
    ' à ' +
    date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  )
}
