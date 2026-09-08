import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import WovenHeader from '../components/layout/WovenHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import StatusBadge from '../components/ui/StatusBadge'
import OrderProgress from '../components/ui/OrderProgress'
import StarPicker from '../components/ui/StarPicker'
import { useOrders } from '../context/OrdersContext'
import { useAuth } from '../context/AuthContext'
import { useCatalog } from '../context/CatalogContext'
import { supabase } from '../lib/supabaseClient'
import { formatFCFA } from '../lib/format'
import type { Order } from '../types'

type Tab = 'en_cours' | 'historique'

function formatDate(iso: string) {
  const date = new Date(iso)
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) +
    ' à ' +
    date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
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
    <div className="space-y-2 border-t border-brand-light pt-3">
      <StarPicker value={rating} onChange={setRating} />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Un commentaire (optionnel)"
        rows={2}
        className="w-full rounded-2xl bg-brand-light px-3 py-2 text-sm text-brand-dark placeholder:text-brand-dark/40 focus:outline-none"
      />
      {error && <p className="text-xs text-category-poisson">{error}</p>}
      <Button fullWidth disabled={rating === 0 || isSubmitting} onClick={handleSubmit}>
        {isSubmitting ? 'Envoi...' : "Envoyer l'avis"}
      </Button>
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
  const itemsSummary = order.items.map((i) => `${i.quantity} ${i.productName}`).join(', ')
  const [isReviewing, setIsReviewing] = useState(false)

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-brand-dark">{order.merchantName}</p>
          <p className="text-xs text-brand-dark/50">{formatDate(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <p className="truncate text-xs text-brand-dark/60">{itemsSummary}</p>

      {order.livreurName && (
        <p className="text-xs text-brand-dark/60">🛵 Livreur : {order.livreurName}</p>
      )}

      {order.status !== 'livree' && <OrderProgress status={order.status} />}

      <div className="flex items-center justify-between border-t border-brand-light pt-2 text-xs text-brand-dark/60">
        <span>{order.slotLabel}</span>
        <span className="font-semibold text-brand-dark">{formatFCFA(order.total)}</span>
      </div>

      {order.status === 'livree' && !hasReview && !isReviewing && (
        <button
          type="button"
          onClick={() => setIsReviewing(true)}
          className="text-xs font-semibold text-brand"
        >
          Laisser un avis ⭐
        </button>
      )}

      {order.status === 'livree' && hasReview && (
        <p className="text-xs text-category-legumes">Merci pour ton avis ✓</p>
      )}

      {isReviewing && <ReviewForm order={order} onSubmitted={onReviewSubmitted} />}
    </Card>
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

  const enCours = useMemo(() => orders.filter((o) => o.status !== 'livree'), [orders])
  const historique = useMemo(() => orders.filter((o) => o.status === 'livree'), [orders])
  const visibleOrders = tab === 'en_cours' ? enCours : historique

  return (
    <PageShell>
      <WovenHeader>
        <h1 className="text-xl font-bold">Mes commandes</h1>
      </WovenHeader>

      <div className="px-5 pt-5">
        {hadUnseenOnArrival && (
          <div className="mb-4 rounded-card bg-brand-light p-3 text-sm text-brand">
            Une ou plusieurs commandes ont été mises à jour depuis ta dernière visite.
          </div>
        )}

        <div className="mb-4 flex gap-2 rounded-pill bg-brand-light p-1">
          <button
            type="button"
            onClick={() => setTab('en_cours')}
            className={`flex-1 rounded-pill py-2 text-sm font-semibold transition ${
              tab === 'en_cours' ? 'bg-white text-brand shadow-card' : 'text-brand-dark/60'
            }`}
          >
            En cours {enCours.length > 0 && `(${enCours.length})`}
          </button>
          <button
            type="button"
            onClick={() => setTab('historique')}
            className={`flex-1 rounded-pill py-2 text-sm font-semibold transition ${
              tab === 'historique' ? 'bg-white text-brand shadow-card' : 'text-brand-dark/60'
            }`}
          >
            Historique {historique.length > 0 && `(${historique.length})`}
          </button>
        </div>

        {visibleOrders.length > 0 ? (
          <div className="space-y-3 pb-4">
            {visibleOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                hasReview={reviewedOrderIds.has(order.id)}
                onReviewSubmitted={() => handleReviewSubmitted(order.id)}
              />
            ))}
          </div>
        ) : tab === 'en_cours' ? (
          <div className="rounded-card bg-white p-5 text-center shadow-card">
            <p className="text-2xl">📦</p>
            <p className="mt-2 text-sm font-medium text-brand-dark">Aucune commande en cours</p>
            <p className="mt-1 text-xs text-brand-dark/50">
              Passe commande chez un marchand pour la suivre ici en temps réel.
            </p>
            <Link to="/" className="mt-4 inline-block">
              <Button>Découvrir les marchands</Button>
            </Link>
          </div>
        ) : (
          <div className="rounded-card bg-white p-5 text-center shadow-card">
            <p className="text-2xl">🗂️</p>
            <p className="mt-2 text-sm font-medium text-brand-dark">Aucune commande livrée pour l'instant</p>
            <p className="mt-1 text-xs text-brand-dark/50">
              Ton historique de commandes apparaîtra ici une fois livré.
            </p>
          </div>
        )}
      </div>
    </PageShell>
  )
}
