interface StarPickerProps {
  value: number
  onChange: (value: number) => void
}

export default function StarPicker({ value, onChange }: StarPickerProps) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
          className="text-2xl leading-none"
        >
          {n <= value ? '★' : '☆'}
        </button>
      ))}
    </div>
  )
}
