import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import WovenHeader from '../components/layout/WovenHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import StatusBadge from '../components/ui/StatusBadge'
import OrderProgress from '../components/ui/OrderProgress'
import { useOrders } from '../context/OrdersContext'
import { formatFCFA } from '../lib/format'
import type { Order } from '../types'

type Tab = 'en_cours' | 'historique'

function formatDate(iso: string) {
  const date = new Date(iso)
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) +
    ' à ' +
    date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function OrderCard({ order }: { order: Order }) {
  const itemsSummary = order.items.map((i) => `${i.quantity} ${i.productName}`).join(', ')

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

      {order.status !== 'livree' && <OrderProgress status={order.status} />}

      <div className="flex items-center justify-between border-t border-brand-light pt-2 text-xs text-brand-dark/60">
        <span>{order.slotLabel}</span>
        <span className="font-semibold text-brand-dark">{formatFCFA(order.total)}</span>
      </div>
    </Card>
  )
}

export default function Orders() {
  const { orders } = useOrders()
  const [tab, setTab] = useState<Tab>('en_cours')

  const enCours = useMemo(() => orders.filter((o) => o.status !== 'livree'), [orders])
  const historique = useMemo(() => orders.filter((o) => o.status === 'livree'), [orders])
  const visibleOrders = tab === 'en_cours' ? enCours : historique

  return (
    <PageShell>
      <WovenHeader>
        <h1 className="text-xl font-bold">Mes commandes</h1>
      </WovenHeader>

      <div className="px-5 pt-5">
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
              <OrderCard key={order.id} order={order} />
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
