import { Check } from 'lucide-react'
import type { OrderStatus } from '../../types'

const steps: { key: OrderStatus; label: string }[] = [
  { key: 'en_preparation', label: 'Préparation' },
  { key: 'en_livraison', label: 'En route' },
  { key: 'livree', label: 'Livrée' },
]

/** Frise des trois statuts réels d'une commande ; `startedAt` s'affiche sous la première étape. */
export default function OrderProgress({ status, startedAt }: { status: OrderStatus; startedAt?: string }) {
  const currentIndex = steps.findIndex((s) => s.key === status)
  const fill = currentIndex <= 0 ? '0%' : currentIndex === 1 ? '50%' : '100%'

  return (
    <div className="relative flex items-start justify-between px-2">
      <div className="absolute left-9 right-9 top-2.5 h-0.5 bg-line" aria-hidden="true">
        <div className="h-full bg-accent transition-all duration-500" style={{ width: fill }} />
      </div>
      {steps.map((step, index) => {
        const isDone = index < currentIndex || status === 'livree'
        const isCurrent = index === currentIndex && status !== 'livree'
        return (
          <div key={step.key} className="relative flex w-16 flex-col items-center gap-1.5">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-card ${
                isDone || isCurrent ? 'bg-accent' : 'bg-line'
              }`}
            >
              {isDone && <Check className="h-3 w-3 text-brand-dark" strokeWidth={3} aria-hidden="true" />}
            </span>
            <span
              className={`text-center text-[9px] font-semibold uppercase tracking-[0.1em] ${
                isDone || isCurrent ? 'text-brand-dark' : 'text-muted'
              }`}
            >
              {step.label}
            </span>
            <span className="text-[9px] tabular-nums text-muted">
              {index === 0 && startedAt
                ? new Date(startedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                : '—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
