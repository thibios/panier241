import { useId, useMemo, useState } from 'react'
import { Search, Check, MapPin } from 'lucide-react'
import { allNeighborhoods } from '../../data/neighborhoods'

function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Choix du quartier avec recherche par nom : on tape quelques lettres (« nz »,
 * « akebe ») et la liste se filtre, sans tenir compte des accents ni des tirets.
 * Si le quartier n'existe pas dans la liste, le nom tapé est gardé tel quel.
 */
export default function NeighborhoodPicker({
  value,
  onChange,
  inputClassName,
  inputId = 'm-area',
}: {
  value: string
  onChange: (name: string) => void
  inputClassName: string
  inputId?: string
}) {
  const listId = useId()
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)

  const q = normalize(query)
  const matches = useMemo(() => {
    if (!q) return allNeighborhoods.slice(0, 8)
    return allNeighborhoods.filter((n) => normalize(n.name).includes(q)).slice(0, 8)
  }, [q])
  const exact = allNeighborhoods.some((n) => normalize(n.name) === q)

  function choose(name: string) {
    setQuery(name)
    onChange(name)
    setOpen(false)
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          maxLength={80}
          placeholder="Tapez le nom du quartier (ex. : Nzeng-Ayong)"
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => {
            setQuery(e.target.value)
            onChange(e.target.value.trim())
            setOpen(true)
          }}
          className={`${inputClassName} pl-9`}
        />
      </div>

      {open && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-card border border-line bg-white py-1 shadow-float">
          {matches.map((n) => (
            <li key={n.name} role="option" aria-selected={value === n.name}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(n.name)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-brand-light/60"
              >
                <MapPin className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-brand-dark">{n.name}</span>
                  <span className="block truncate text-[11px] text-muted">{n.zone}</span>
                </span>
                {value === n.name && <Check className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />}
              </button>
            </li>
          ))}
          {q && !exact && (
            <li role="option" aria-selected={false}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(query.trim())} className="w-full px-3 py-2 text-left text-xs font-semibold text-brand hover:bg-brand-light/60">
                Utiliser « {query.trim()} » (quartier absent de la liste)
              </button>
            </li>
          )}
          {matches.length === 0 && !q && <li className="px-3 py-2 text-xs text-muted">Aucun quartier.</li>}
        </ul>
      )}
    </div>
  )
}
