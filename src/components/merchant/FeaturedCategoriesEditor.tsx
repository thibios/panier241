import { useState } from 'react'
import { ArrowDown, ArrowUp, X } from 'lucide-react'
import { useTaxonomy } from '../../context/TaxonomyContext'
import { supabase } from '../../lib/supabaseClient'

interface FeaturedCategoriesEditorProps {
  /** Une enseigne (administrateur seulement) ou une boutique (administrateur ou propriétaire). */
  scope: { marketId: string } | { merchantId: string }
  /** Familles proposées en priorité (catégories du commerce) ; toutes sinon. */
  suggestedFamilies?: string[]
}

/**
 * Catégories globales mises en avant par une enseigne ou une boutique (table storefront_categories, 023).
 * La sélection ordonne les filtres de la vitrine ; une catégorie sans produit n'y apparaît jamais.
 */
export default function FeaturedCategoriesEditor({ scope, suggestedFamilies }: FeaturedCategoriesEditorProps) {
  const { storefronts, families, subcategories, labelOf, refresh } = useTaxonomy()
  const [adding, setAdding] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const isMarket = 'marketId' in scope
  const rows = storefronts
    .filter((s) => (isMarket ? s.marketId === scope.marketId : s.merchantId === scope.merchantId))
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const taken = new Set(rows.map((r) => r.categoryId))
  const familyPool = suggestedFamilies && suggestedFamilies.length > 0 ? families.filter((f) => suggestedFamilies.includes(f.id)) : families
  const options = familyPool.flatMap((f) => [
    { id: f.id as string, label: f.label },
    ...subcategories.filter((s) => s.parentId === f.id).map((s) => ({ id: s.id, label: `${f.shortLabel ?? f.label} › ${s.label}` })),
  ]).filter((o) => !taken.has(o.id))

  async function run(action: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(true)
    setError(null)
    const { error: writeError } = await action()
    if (writeError) setError("La modification n'a pas pu être enregistrée. Réessaie.")
    await refresh()
    setBusy(false)
  }

  function add() {
    if (!adding) return
    const next = rows.length > 0 ? Math.max(...rows.map((r) => r.sortOrder)) + 10 : 0
    const base = isMarket ? { market_id: scope.marketId } : { merchant_id: scope.merchantId }
    run(() => supabase.from('storefront_categories').insert({ ...base, category_id: adding, sort_order: next }))
    setAdding('')
  }

  function move(index: number, delta: -1 | 1) {
    const other = rows[index + delta]
    const current = rows[index]
    if (!other) return
    run(async () => {
      const first = await supabase.from('storefront_categories').update({ sort_order: other.sortOrder }).eq('id', current.id)
      if (first.error) return first
      return supabase.from('storefront_categories').update({ sort_order: current.sortOrder }).eq('id', other.id)
    })
  }

  return (
    <div className="space-y-2">
      {rows.length === 0 && <p className="text-xs text-muted">Aucune catégorie choisie : la vitrine affiche les catégories de ses produits.</p>}
      {rows.map((row, i) => (
        <div key={row.id} className="flex items-center gap-2 rounded-xl bg-brand-light/60 px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-sm text-brand-dark">{labelOf(row.categoryId) ?? row.categoryId}</span>
          <button type="button" disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label="Monter" className="flex h-8 w-8 items-center justify-center rounded-lg text-brand disabled:opacity-30">
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" disabled={busy || i === rows.length - 1} onClick={() => move(i, 1)} aria-label="Descendre" className="flex h-8 w-8 items-center justify-center rounded-lg text-brand disabled:opacity-30">
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => supabase.from('storefront_categories').delete().eq('id', row.id))}
            aria-label={`Retirer ${labelOf(row.categoryId) ?? row.categoryId}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-danger disabled:opacity-30"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <select
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          aria-label="Catégorie à mettre en avant"
          className="min-w-0 flex-1 rounded-xl border border-line-strong bg-white px-3 py-2 text-sm text-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <option value="">Choisir une catégorie…</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
        <button type="button" disabled={!adding || busy} onClick={add} className="rounded-xl bg-brand px-4 text-sm font-semibold text-on-header disabled:opacity-50">
          Ajouter
        </button>
      </div>
      {error && <p role="alert" className="text-xs font-semibold text-danger">{error}</p>}
    </div>
  )
}
