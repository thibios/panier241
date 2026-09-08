interface QuantityStepperProps {
  quantity: number
  onIncrement: () => void
  onDecrement: () => void
}

export default function QuantityStepper({ quantity, onIncrement, onDecrement }: QuantityStepperProps) {
  return (
    <div className="flex items-center gap-3 rounded-pill bg-brand-light px-1 py-1">
      <button
        type="button"
        onClick={onDecrement}
        aria-label="Diminuer la quantité"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-brand shadow-sm active:scale-95"
      >
        −
      </button>
      <span className="min-w-4 text-center text-sm font-semibold text-brand-dark">{quantity}</span>
      <button
        type="button"
        onClick={onIncrement}
        aria-label="Augmenter la quantité"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white shadow-sm active:scale-95"
      >
        +
      </button>
    </div>
  )
}
