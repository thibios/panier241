import type { OrderStatus } from '../../types'

const steps: { key: OrderStatus; label: string }[] = [
  { key: 'en_preparation', label: 'Préparation' },
  { key: 'en_livraison', label: 'Livraison' },
  { key: 'livree', label: 'Livrée' },
]

export default function OrderProgress({ status }: { status: OrderStatus }) {
  const currentIndex = steps.findIndex((s) => s.key === status)

  return (
    <div className="flex items-center">
      {steps.map((step, index) => {
        const isDone = index <= currentIndex
        return (
          <div key={step.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`h-2.5 w-2.5 rounded-full ${isDone ? 'bg-brand' : 'bg-brand-light'}`}
              />
              <span className={`text-[10px] font-medium ${isDone ? 'text-brand-dark' : 'text-brand-dark/40'}`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`mx-1 h-0.5 flex-1 rounded-full ${index < currentIndex ? 'bg-brand' : 'bg-brand-light'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
