import type { OrderStatus } from '../../types'

const statusMeta: Record<OrderStatus, { label: string; className: string }> = {
  en_preparation: { label: 'En préparation', className: 'bg-category-cereales/15 text-category-cereales' },
  en_livraison: { label: 'En livraison', className: 'bg-brand/10 text-brand' },
  livree: { label: 'Livrée', className: 'bg-category-legumes/15 text-category-legumes' },
}

export default function StatusBadge({ status }: { status: OrderStatus }) {
  const meta = statusMeta[status]
  return (
    <span className={`rounded-pill px-3 py-1 text-xs font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  )
}
