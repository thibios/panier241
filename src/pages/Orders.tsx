import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import StatusBadge from '../components/ui/StatusBadge'
import OrderProgress from '../components/ui/OrderProgress'
import StarPicker from '../components/ui/StarPicker'
import { useOrders } from '../context/OrdersContext'
import { useAuth } from '../context/AuthContext'
import { useCatalog } from '../context/CatalogContext'
import { supabase } from '../lib/supabaseClient'
import { formatFCFA } from '../lib/format'
import { buildWhatsAppLink } from '../lib/whatsapp'
import { markets } from '../data/markets'
import type { Order } from '../types'
import { Bike, Package, Archive, Star, Check, MessageCircle, Clock, XCircle, Scale } from 'lucide-react'

type Tab = 'en_cours' | 'historique'

const card = 'rounded-[1.75rem] border border-line bg-card p-4 shadow-card'
const box = 'rounded-card border border-line bg-white p-3'
const label = 'text-[10px] font-semibold uppercase tracking-[0.14em] text-muted'

function formatDate(iso: string) {
  const date = new Date(iso)
  return (
    date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) +
    ' à ' +
    date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  )
}

/** Référence courte et lisible d'une commande (fin de son identifiant). */
function orderRef(id: string) {
  return id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()
}

function ReviewForm({ order, onSubmitted }: { order: Order; onSubmitted: () => void }) {
  const { user } = useAuth()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!user || rating === 0) return
    setIsSubmitting(true)
    setError(null)
    const { error: insertError } = await supabase.from('reviews').insert({
      order_id: order.id,
      merchant_id: order.merchantId,
      user_id: user.id,
      rating,
      comment: comment.trim() || null,
    })
    setIsSubmitting(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    onSubmitted()
  }

  return (
    <div className="mt-4 space-y-2 border-t border-line pt-4">
      <StarPicker value={rating} onChange={setRating} />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Un commentaire (optionnel)"
        rows={2}
        className="w-full rounded-card border border-line bg-white px-3 py-2 text-sm text-brand-dark placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      <button
        type="button"
        disabled={rating === 0 || isSubmitting}
        onClick={handleSubmit}
        className="h-11 w-full rounded-full bg-brand text-sm font-semibold text-on-header disabled:opacity-50"
      >
        {isSubmitting ? 'Envoi…' : "Envoyer l'avis"}
      </button>
    </div>
  )
}

const CANCEL_REASONS = ['Le prix est trop élevé', "Je me suis trompé d'articles", 'Le délai est trop long', 'Autre raison']

/** Annulation d'une commande encore en préparation, avec confirmation et motif. */
function CancelOrder({ order }: { order: Order }) {
  const { cancelOrder } = useOrders()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState(CANCEL_REASONS[0])
  const [isCancelling, setIsCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setIsCancelling(true)
    setError(null)
    const result = await cancelOrder(order.id, reason)
    setIsCancelling(false)
    if (result.error) setError(result.error)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-line bg-card text-sm font-semibold text-danger"
      >
        <XCircle className="h-5 w-5" aria-hidden="true" />
        Annuler la commande
      </button>
    )
  }

  return (
    <div className="mt-4 space-y-3 rounded-card border border-danger/30 bg-danger/5 p-3">
      <p className="text-sm font-semibold text-brand-dark">Pourquoi annulez-vous cette commande ?</p>
      <div className="space-y-1.5" role="radiogroup" aria-label="Motif d'annulation">
        {CANCEL_REASONS.map((r) => (
          <label key={r} className="flex cursor-pointer items-center gap-2 text-sm text-brand-dark">
            <input type="radio" name={`cancel-${order.id}`} checked={reason === r} onChange={() => setReason(r)} className="h-4 w-4 accent-[rgb(var(--color-brand))]" />
            {r}
          </label>
        ))}
      </div>
      {reason === CANCEL_REASONS[0] && (
        <Link to="/prix-officiels" className="flex items-center gap-1.5 text-xs font-semibold text-brand underline">
          <Scale className="h-3.5 w-3.5" aria-hidden="true" />
          Comparer avec les prix officiels de la DGCCRF
        </Link>
      )}
      {error && <p role="alert" className="text-xs font-semibold text-danger">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setOpen(false)} disabled={isCancelling} className="h-11 rounded-full border border-line bg-card text-sm font-semibold text-brand-dark">
          Garder
        </button>
        <button type="button" onClick={confirm} disabled={isCancelling} className="h-11 rounded-full bg-danger text-sm font-semibold text-white disabled:opacity-50">
          {isCancelling ? 'Annulation…' : "Confirmer l'annulation"}
        </button>
      </div>
    </div>
  )
}

function OrderCard({
  order,
  hasReview,
  onReviewSubmitted,
}: {
  order: Order
  hasReview: boolean
  onReviewSubmitted: () => void
}) {
  const { merchants } = useCatalog()
  const [isReviewing, setIsReviewing] = useState(false)
  const merchant = merchants.find((m) => m.id === order.merchantId)
  const market = merchant ? markets.find((m) => m.id === merchant.marketId) : undefined
  const itemsSummary = order.items.map((i) => `${i.quantity} × ${i.productName}`).join(', ')

  return (
    <div className={card}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Commande #{orderRef(order.id)}</p>
          <p className="mt-0.5 truncate font-display text-base font-bold text-brand-dark">{order.merchantName}</p>
          <p className="text-[11px] text-muted">{formatDate(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {order.status === 'annulee' ? (
        <p className="mt-4 rounded-card bg-danger/5 p-3 text-xs text-danger">
          Annulée{order.cancelledAt ? ` le ${formatDate(order.cancelledAt)}` : ''}
          {order.cancelReason ? ` · ${order.cancelReason}` : ''}
        </p>
      ) : (
        <div className="mt-5">
          <OrderProgress status={order.status} startedAt={order.createdAt} />
        </div>
      )}

      <p className="mt-4 rounded-card bg-muted-bg p-3 text-xs text-brand-dark/80">{itemsSummary}</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className={box}>
          <p className={label}>Commerçant</p>
          <p className="mt-1 truncate text-sm font-semibold text-brand-dark">{order.merchantName}</p>
          <p className="truncate text-[11px] text-muted">{market?.neighborhood ?? '—'}</p>
        </div>
        <div className={`${box} flex items-center gap-2`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-light">
            <Bike className="h-5 w-5 text-brand" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className={label}>Livreur</p>
            <p className="truncate text-sm font-semibold text-brand-dark">{order.livreurName ?? 'Pas encore attribué'}</p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        {order.slotLabel}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted">{order.status === 'annulee' ? 'Total (non dû)' : 'Total à régler'}</p>
        <p className="font-display text-lg font-bold tabular-nums text-brand-dark">{formatFCFA(order.total)}</p>
      </div>

      {order.status === 'en_preparation' && <CancelOrder order={order} />}

      {order.livreurPhone && order.status !== 'livree' && order.status !== 'annulee' && (
        <a
          href={buildWhatsAppLink(order.livreurPhone, 'Bonjour, je vous contacte au sujet de ma livraison Panier 241. ')}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-on-header"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          Contacter le livreur sur WhatsApp
        </a>
      )}

      {order.status === 'livree' && !hasReview && !isReviewing && (
        <button
          type="button"
          onClick={() => setIsReviewing(true)}
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-line bg-card text-sm font-semibold text-brand-dark"
        >
          <Star className="h-4 w-4 text-warn" aria-hidden="true" />
          Laisser un avis
        </button>
      )}

      {order.status === 'livree' && hasReview && (
        <p className="mt-4 flex items-center justify-center gap-1 text-xs font-semibold text-brand">
          Merci pour votre avis <Check className="h-3.5 w-3.5" aria-hidden="true" />
        </p>
      )}

      {isReviewing && <ReviewForm order={order} onSubmitted={onReviewSubmitted} />}
    </div>
  )
}

export default function Orders() {
  const { orders, loading, unseenCount, markAllSeen } = useOrders()
  const { user } = useAuth()
  const { refresh: refreshCatalog } = useCatalog()
  const [tab, setTab] = useState<Tab>('en_cours')
  const [reviewedOrderIds, setReviewedOrderIds] = useState<Set<string>>(new Set())
  const [hadUnseenOnArrival, setHadUnseenOnArrival] = useState(false)
  const hasMarkedSeen = useRef(false)

  useEffect(() => {
    if (loading || hasMarkedSeen.current) return
    hasMarkedSeen.current = true
    setHadUnseenOnArrival(unseenCount > 0)
    markAllSeen()
  }, [loading, unseenCount, markAllSeen])

  useEffect(() => {
    if (!user) return
    supabase
      .from('reviews')
      .select('order_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setReviewedOrderIds(new Set(data.map((r) => r.order_id)))
      })
  }, [user])

  function handleReviewSubmitted(orderId: string) {
    setReviewedOrderIds((prev) => new Set(prev).add(orderId))
    refreshCatalog()
  }

  const enCours = useMemo(() => orders.filter((o) => o.status === 'en_preparation' || o.status === 'en_livraison'), [orders])
  const historique = useMemo(() => orders.filter((o) => o.status === 'livree' || o.status === 'annulee'), [orders])
  const visibleOrders = tab === 'en_cours' ? enCours : historique

  const tabClass = (active: boolean) =>
    `h-10 rounded-full text-sm font-semibold transition ${active ? 'bg-brand text-on-header' : 'text-muted'}`

  return (
    <PageShell>
      <header className="px-5 pb-2 pt-6">
        <h1 className="font-display text-2xl font-bold text-brand-dark">Mes commandes</h1>
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-full bg-brand-light p-1" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'en_cours'} onClick={() => setTab('en_cours')} className={tabClass(tab === 'en_cours')}>
            En cours{enCours.length > 0 ? ` (${enCours.length})` : ''}
          </button>
          <button type="button" role="tab" aria-selected={tab === 'historique'} onClick={() => setTab('historique')} className={tabClass(tab === 'historique')}>
            Passées{historique.length > 0 ? ` (${historique.length})` : ''}
          </button>
        </div>
      </header>

      <div className="px-5 pt-5">
        {hadUnseenOnArrival && (
          <div className="mb-4 rounded-card bg-brand-light p-3 text-sm font-semibold text-brand">
            Une ou plusieurs commandes ont été mises à jour depuis votre dernière visite.
          </div>
        )}

        {visibleOrders.length > 0 ? (
          <div className="space-y-5 pb-4">
            {visibleOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                hasReview={reviewedOrderIds.has(order.id)}
                onReviewSubmitted={() => handleReviewSubmitted(order.id)}
              />
            ))}
          </div>
        ) : (
          <div className={`${card} p-6 text-center`}>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-light">
              {tab === 'en_cours' ? (
                <Package className="h-6 w-6 text-brand" aria-hidden="true" />
              ) : (
                <Archive className="h-6 w-6 text-brand" aria-hidden="true" />
              )}
            </span>
            <p className="mt-3 font-display text-base font-bold text-brand-dark">
              {tab === 'en_cours' ? 'Aucune commande en cours' : 'Aucune commande livrée pour le moment'}
            </p>
            <p className="mt-1 text-xs text-muted">
              {tab === 'en_cours'
                ? 'Passez commande chez un commerçant pour suivre ici sa préparation et sa livraison.'
                : 'Vos commandes livrées apparaîtront ici.'}
            </p>
            {tab === 'en_cours' && (
              <Link
                to="/"
                className="mt-4 inline-flex h-10 items-center rounded-full bg-brand px-5 text-xs font-semibold text-on-header"
              >
                Découvrir les commerçants
              </Link>
            )}
          </div>
        )}
      </div>
    </PageShell>
  )
}
