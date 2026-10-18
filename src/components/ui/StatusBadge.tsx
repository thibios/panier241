import type { OrderStatus } from '../../types'

const statusMeta: Record<OrderStatus, { label: string; className: string }> = {
  en_preparation: { label: 'En préparation', className: 'text-warn' },
  en_livraison: { label: 'En cours de livraison', className: 'text-brand' },
  livree: { label: 'Livrée', className: 'text-brand' },
  annulee: { label: 'Annulée', className: 'text-danger' },
}

export default function StatusBadge({ status }: { status: OrderStatus }) {
  const meta = statusMeta[status]
  return (
    <span
      className={`shrink-0 rounded-full bg-brand-light px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${meta.className}`}
    >
      {meta.label}
    </span>
  )
}
