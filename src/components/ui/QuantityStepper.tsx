import { Minus, Plus } from 'lucide-react'

interface QuantityStepperProps {
  quantity: number
  onIncrement: () => void
  onDecrement: () => void
}

export default function QuantityStepper({ quantity, onIncrement, onDecrement }: QuantityStepperProps) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-line bg-white px-1 py-1">
      <button
        type="button"
        onClick={onDecrement}
        aria-label="Diminuer la quantité"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-card text-brand-dark active:scale-95"
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={2.6} aria-hidden="true" />
      </button>
      <span className="w-4 text-center text-sm font-semibold tabular-nums text-brand-dark">{quantity}</span>
      <button
        type="button"
        onClick={onIncrement}
        aria-label="Augmenter la quantité"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-brand-dark active:scale-95"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.6} aria-hidden="true" />
      </button>
    </div>
  )
}
