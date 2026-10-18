import { Search, X } from 'lucide-react'
interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function SearchBar({ value, onChange, placeholder = 'Rechercher...' }: SearchBarProps) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-card">
      <Search className="h-5 w-5 shrink-0 text-muted" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-brand-dark placeholder:text-muted focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Effacer la recherche"
          className="text-muted"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
