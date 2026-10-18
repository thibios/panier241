import { useEffect, useState } from 'react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import StatusBadge from '../ui/StatusBadge'
import { supabase } from '../../lib/supabaseClient'
import { formatFCFA } from '../../lib/format'
import {
  ACTOR_ROLE_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  formatDateTime,
  translateDbError,
} from '../../lib/orderEngine'
import type { FulfillmentMode, OrderItem, OrderStatus, PaymentMethodCode } from '../../types'

const PAGE_SIZE = 20

const inputClass =
  'w-full rounded-2xl bg-brand-light px-3 py-2.5 text-sm text-brand-dark placeholder:text-muted focus:outline-none'

/** Ligne renvoyée par la fonction admin_orders (migration 022). */
interface AdminOrder {
  id: string
  created_at: string
  status: OrderStatus
  fulfillment_mode: FulfillmentMode
  merchant_name: string
  items: OrderItem[]
  subtotal: number
  initial_subtotal: number
  discount_amount: number
  service_fee: number
  delivery_fee: number
  total: number
  merchant_share: number
  courier_share: number
  platform_share: number
  deposit_amount: number
  deposit_status: string
  payment_method: PaymentMethodCode | null
  payment_status: string | null
  adjustment_status: string
  distance_km: number | null
  slot_label: string
  address_label: string
  cancel_reason: string | null
  client: { id: string; first_name: string | null; last_name: string | null; phone: string | null }
  merchant: { id: string; name: string; phone: string | null; status: string } | null
  livreur: { id: string; name: string; phone: string; status: string } | null
  delivery_details: { full_address: string; landmark: string | null; lat: number | null; lng: number | null } | null
  history: { id: number; old_status: string | null; new_status: OrderStatus; actor_role: string; event: string; reason: string | null; created_at: string }[]
  ledger: { id: number; entry_type: string; event: string; amount: number; beneficiary: string; state: string; payment_method: string | null; note: string | null; created_at: string }[]
  adjustments: { id: number; old_subtotal: number; new_subtotal: number; reason: string; decision: string; created_at: string }[]
  disputes: { id: string; reason: string; status: string; resolution: string | null; created_at: string }[]
}

interface Option {
  id: string
  name: string
}

const ALL_STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]

/** Module « Commandes » de l'espace admin : recherche, filtres, pagination et dossier complet. */
export default function AdminOrders({ merchants, livreurs }: { merchants: Option[]; livreurs: Option[] }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [mode, setMode] = useState<FulfillmentMode | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [merchantId, setMerchantId] = useState('')
  const [livreurId, setLivreurId] = useState('')
  const [offset, setOffset] = useState(0)

  const [rows, setRows] = useState<AdminOrder[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const [fixStatus, setFixStatus] = useState<OrderStatus>('en_preparation')
  const [fixReason, setFixReason] = useState('')
  const [fixError, setFixError] = useState<string | null>(null)

  async function load(nextOffset = offset) {
    setLoading(true)
    setError(null)
    const { data, error: rpcError } = await supabase.rpc('admin_orders', {
      p_search: search.trim() || null,
      p_statuses: status ? [status] : null,
      p_mode: mode || null,
      p_from: from ? new Date(`${from}T00:00:00`).toISOString() : null,
      p_to: to ? new Date(`${to}T23:59:59`).toISOString() : null,
      p_merchant_id: merchantId || null,
      p_livreur_id: livreurId || null,
      p_limit: PAGE_SIZE,
      p_offset: nextOffset,
    })
    setLoading(false)
    if (rpcError || !data) {
      setError(translateDbError(rpcError))
      return
    }
    const result = data as { total: number; rows: AdminOrder[] }
    setRows(result.rows)
    setTotal(result.total)
    setOffset(nextOffset)
  }

  useEffect(() => {
    void load(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function correctStatus(order: AdminOrder) {
    if (!fixReason.trim()) {
      setFixError('Le motif est obligatoire pour une correction administrateur.')
      return
    }
    setFixError(null)
    const { error: rpcError } = await supabase.rpc('set_order_status', {
      p_order_id: order.id,
      p_new_status: fixStatus,
      p_reason: fixReason.trim(),
    })
    if (rpcError) {
      setFixError(translateDbError(rpcError))
      return
    }
    setFixReason('')
    await load(offset)
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.floor(offset / PAGE_SIZE) + 1

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-brand-dark">Commandes {total > 0 && `(${total})`}</h2>

      <Card className="space-y-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Référence, commerçant, livreur, téléphone ou nom du client"
          className={inputClass}
        />
        <div className="grid grid-cols-2 gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | '')} className={inputClass}>
            <option value="">Tous les statuts</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select value={mode} onChange={(e) => setMode(e.target.value as FulfillmentMode | '')} className={inputClass}>
            <option value="">Livraison et retrait</option>
            <option value="livraison">Livraison</option>
            <option value="retrait">Retrait sur stand</option>
          </select>
          <label className="text-[11px] text-muted">
            Du
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
          </label>
          <label className="text-[11px] text-muted">
            Au
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
          </label>
          <select value={merchantId} onChange={(e) => setMerchantId(e.target.value)} className={inputClass}>
            <option value="">Tous les commerçants</option>
            {merchants.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <select value={livreurId} onChange={(e) => setLivreurId(e.target.value)} className={inputClass}>
            <option value="">Tous les livreurs</option>
            {livreurs.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <Button fullWidth onClick={() => load(0)} disabled={loading}>
          {loading ? 'Recherche...' : 'Rechercher'}
        </Button>
      </Card>

      {error && (
        <p role="alert" className="text-xs font-semibold text-danger">
          {error}
        </p>
      )}

      {rows.length === 0 && !loading && !error && (
        <p className="text-center text-sm text-muted">Aucune commande pour ces critères.</p>
      )}

      {rows.map((o) => {
        const isOpen = openId === o.id
        const clientName = [o.client.first_name, o.client.last_name].filter(Boolean).join(' ') || 'Client'
        return (
          <Card key={o.id} className="space-y-2">
            <button
              type="button"
              onClick={() => {
                setOpenId(isOpen ? null : o.id)
                setFixError(null)
                setFixStatus(o.status)
              }}
              className="w-full text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                    #{o.id.slice(0, 8)} · {formatDateTime(o.created_at)}
                  </p>
                  <p className="truncate text-sm font-semibold text-brand-dark">{o.merchant_name}</p>
                  <p className="text-xs text-muted">
                    {clientName} · {o.fulfillment_mode === 'retrait' ? 'Retrait sur stand' : 'Livraison'}
                    {o.livreur ? ` · ${o.livreur.name}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge status={o.status} />
                  <span className="text-sm font-bold text-brand-dark">{formatFCFA(o.total)}</span>
                </div>
              </div>
            </button>

            {isOpen && (
              <div className="space-y-3 border-t border-brand-light pt-2 text-xs text-brand-dark/80">
                <div className="space-y-0.5">
                  <p className="font-semibold text-brand-dark">Acteurs</p>
                  <p>Client : {clientName} · {o.client.phone ?? 'téléphone non renseigné'}</p>
                  <p>
                    Commerçant : {o.merchant?.name ?? o.merchant_name}
                    {o.merchant?.phone ? ` · ${o.merchant.phone}` : ''}
                    {o.merchant ? ` · ${o.merchant.status}` : ' · fiche introuvable'}
                  </p>
                  <p>Livreur : {o.livreur ? `${o.livreur.name} · ${o.livreur.phone}` : 'aucun'}</p>
                </div>

                <div className="space-y-0.5">
                  <p className="font-semibold text-brand-dark">Montants</p>
                  <p>
                    Marchandises {formatFCFA(o.subtotal)}
                    {o.initial_subtotal !== o.subtotal ? ` (initial ${formatFCFA(o.initial_subtotal)})` : ''}
                    {o.discount_amount > 0 ? ` · réduction ${formatFCFA(o.discount_amount)}` : ''}
                  </p>
                  <p>
                    Commission {formatFCFA(o.service_fee)} · Livraison {formatFCFA(o.delivery_fee)}
                    {o.distance_km != null ? ` (${Number(o.distance_km).toFixed(1)} km)` : ''} · Total {formatFCFA(o.total)}
                  </p>
                  <p>
                    Parts : commerçant {formatFCFA(o.merchant_share)} · livreur {formatFCFA(o.courier_share)} · plateforme{' '}
                    {formatFCFA(o.platform_share)}
                  </p>
                  <p>
                    Acompte {formatFCFA(o.deposit_amount)} ({o.deposit_status}) · Paiement{' '}
                    {o.payment_method ? PAYMENT_METHOD_LABELS[o.payment_method] : 'non renseigné'} (
                    {o.payment_status ?? 'non renseigné'}) · Ajustement : {o.adjustment_status}
                  </p>
                  <p>{o.items.map((i) => `${i.quantity} × ${i.productName}`).join(', ')}</p>
                </div>

                <div className="space-y-0.5">
                  <p className="font-semibold text-brand-dark">Livraison</p>
                  <p>{o.slot_label}</p>
                  <p>{o.delivery_details?.full_address ?? o.address_label}</p>
                  {o.delivery_details?.landmark && <p>Repère : {o.delivery_details.landmark}</p>}
                  {o.delivery_details?.lat != null && o.delivery_details?.lng != null && (
                    <p>
                      GPS : {o.delivery_details.lat}, {o.delivery_details.lng}
                    </p>
                  )}
                  {o.cancel_reason && <p>Motif d'annulation : {o.cancel_reason}</p>}
                </div>

                <div className="space-y-0.5">
                  <p className="font-semibold text-brand-dark">Historique</p>
                  {o.history.map((h) => (
                    <p key={h.id}>
                      {formatDateTime(h.created_at)} · {ORDER_STATUS_LABELS[h.new_status] ?? h.new_status} ·{' '}
                      {ACTOR_ROLE_LABELS[h.actor_role] ?? h.actor_role} · {h.event}
                      {h.reason ? ` · ${h.reason}` : ''}
                    </p>
                  ))}
                </div>

                <div className="space-y-0.5">
                  <p className="font-semibold text-brand-dark">Journal financier</p>
                  {o.ledger.map((l) => (
                    <p key={l.id}>
                      {formatDateTime(l.created_at)} · {l.entry_type} · {l.event} · {formatFCFA(l.amount)} →{' '}
                      {l.beneficiary} · {l.state}
                      {l.payment_method ? ` · ${l.payment_method}` : ''}
                    </p>
                  ))}
                </div>

                {o.adjustments.length > 0 && (
                  <div className="space-y-0.5">
                    <p className="font-semibold text-brand-dark">Ajustements</p>
                    {o.adjustments.map((a) => (
                      <p key={a.id}>
                        {formatDateTime(a.created_at)} · {formatFCFA(a.old_subtotal)} → {formatFCFA(a.new_subtotal)} ·{' '}
                        {a.decision} · {a.reason}
                      </p>
                    ))}
                  </div>
                )}

                <div className="space-y-0.5">
                  <p className="font-semibold text-brand-dark">Litiges</p>
                  {o.disputes.length > 0 ? (
                    o.disputes.map((d) => (
                      <p key={d.id}>
                        {formatDateTime(d.created_at)} · {d.status} · {d.reason}
                        {d.resolution ? ` · ${d.resolution}` : ''}
                      </p>
                    ))
                  ) : (
                    <p>Aucun litige.</p>
                  )}
                </div>

                <div className="space-y-2 border-t border-brand-light pt-2">
                  <p className="font-semibold text-brand-dark">Corriger le statut</p>
                  <select value={fixStatus} onChange={(e) => setFixStatus(e.target.value as OrderStatus)} className={inputClass}>
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {ORDER_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    maxLength={300}
                    value={fixReason}
                    onChange={(e) => setFixReason(e.target.value)}
                    placeholder="Motif (obligatoire)"
                    className={inputClass}
                  />
                  {fixError && (
                    <p role="alert" className="font-semibold text-danger">
                      {fixError}
                    </p>
                  )}
                  <Button variant="secondary" onClick={() => correctStatus(o)}>
                    Appliquer la correction
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )
      })}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            disabled={offset === 0 || loading}
            onClick={() => load(Math.max(0, offset - PAGE_SIZE))}
            className="font-semibold text-brand disabled:opacity-40"
          >
            Précédent
          </button>
          <span className="text-muted">
            Page {page} sur {pageCount}
          </span>
          <button
            type="button"
            disabled={offset + PAGE_SIZE >= total || loading}
            onClick={() => load(offset + PAGE_SIZE)}
            className="font-semibold text-brand disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      )}
    </section>
  )
}
