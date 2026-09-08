interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function SearchBar({ value, onChange, placeholder = 'Rechercher...' }: SearchBarProps) {
  return (
    <div className="flex items-center gap-2 rounded-pill bg-white px-4 py-3 shadow-card">
      <span className="text-lg leading-none text-brand-dark/40">🔍</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-brand-dark placeholder:text-brand-dark/40 focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Effacer la recherche"
          className="text-brand-dark/40"
        >
          ✕
        </button>
      )}
    </div>
  )
}
