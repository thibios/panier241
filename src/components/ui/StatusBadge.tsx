import type { OrderStatus } from '../../types'
import { ORDER_STATUS_LABELS } from '../../lib/orderEngine'

const statusClass: Record<OrderStatus, string> = {
  en_preparation: 'text-warn-ink',
  prete_a_livrer: 'text-warn-ink',
  en_livraison: 'text-brand',
  livree: 'text-brand',
  prete_a_retirer: 'text-brand',
  retiree: 'text-brand',
  annulee: 'text-danger',
}

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`shrink-0 rounded-md bg-brand-light px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusClass[status]}`}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  )
}
