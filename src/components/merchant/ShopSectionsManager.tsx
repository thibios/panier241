import { useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, Eye, EyeOff, Trash2 } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { supabase } from '../../lib/supabaseClient'
import { useMerchantSections } from '../../lib/merchantSections'
import { useTaxonomy } from '../../context/TaxonomyContext'
import { useCatalog } from '../../context/CatalogContext'
import { getProductDisplayName } from '../../lib/productDisplay'
import ProductCategoryFields, { categoryErrorMessage } from './ProductCategoryFields'
import FeaturedCategoriesEditor from './FeaturedCategoriesEditor'
import type { CategoryId, Merchant, Product } from '../../types'

const field =
  'w-full rounded-xl border border-line-strong bg-white px-3 py-2.5 text-sm text-brand-dark placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand'

/**
 * Espace marchand : rubriques propres au commerçant (« Promotions », « Nouveautés »...), association
 * des produits sans les dupliquer, classement de chaque produit dans la taxonomie globale et catégories
 * mises en avant par la boutique. La base garantit qu'un commerçant ne touche qu'à ses rubriques et
 * n'y lie que ses produits (RLS et clés étrangères de 023).
 */
export default function ShopSectionsManager({ merchant, products }: { merchant: Merchant; products: Product[] }) {
  const { sections, refresh, error: readError } = useMerchantSections(merchant.id)
  const { isFallback } = useTaxonomy()
  const [newName, setNewName] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (isFallback || readError) {
    return (
      <Card>
        <p className="text-sm font-semibold text-brand-dark">Rubriques de la boutique</p>
        <p className="mt-1 text-xs text-muted">Indisponible pour le moment. Vérifie ta connexion, puis réessaie.</p>
      </Card>
    )
  }

  async function write(action: () => PromiseLike<{ error: { message: string; code?: string } | null }>, failure: string) {
    setBusy(true)
    setError(null)
    const { error: writeError } = await action()
    if (writeError) setError(writeError.code === '23505' ? 'Une rubrique porte déjà ce nom.' : failure)
    await refresh()
    setBusy(false)
    return !writeError
  }

  async function createSection() {
    const name = newName.trim()
    if (name.length < 2) return
    const next = sections.length > 0 ? Math.max(...sections.map((s) => s.sortOrder)) + 10 : 0
    const ok = await write(
      () => supabase.from('merchant_sections').insert({ merchant_id: merchant.id, name, sort_order: next }),
      "La rubrique n'a pas pu être créée.",
    )
    if (ok) setNewName('')
  }

  function move(index: number, delta: -1 | 1) {
    const current = sections[index]
    const other = sections[index + delta]
    if (!other) return
    write(async () => {
      const first = await supabase.from('merchant_sections').update({ sort_order: other.sortOrder }).eq('id', current.id)
      if (first.error) return first
      return supabase.from('merchant_sections').update({ sort_order: current.sortOrder }).eq('id', other.id)
    }, "L'ordre n'a pas pu être enregistré.")
  }

  function toggleProduct(sectionId: string, productId: string, linked: boolean) {
    write(
      () =>
        linked
          ? supabase.from('merchant_section_products').delete().eq('section_id', sectionId).eq('product_id', productId)
          : supabase.from('merchant_section_products').insert({ section_id: sectionId, product_id: productId, merchant_id: merchant.id }),
      "Le produit n'a pas pu être ajouté ou retiré.",
    )
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-brand-dark">Rubriques de la boutique</p>
          <p className="text-xs text-muted">
            Regroupe tes produits (Promotions, Nouveautés…). Un produit peut être dans plusieurs rubriques ; sa catégorie ne change pas.
          </p>
        </div>
        <div className="flex gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={60} placeholder="Nom de la rubrique" aria-label="Nom de la nouvelle rubrique" className={field} />
          <Button disabled={busy || newName.trim().length < 2} onClick={createSection}>Créer</Button>
        </div>
        {sections.length === 0 && <p className="text-xs text-muted">Aucune rubrique pour l'instant.</p>}
        {sections.map((section, i) => {
          const isOpen = openId === section.id
          return (
            <div key={section.id} className="rounded-xl border border-line">
              <div className="flex items-center gap-1 px-3 py-2">
                <button type="button" onClick={() => setOpenId(isOpen ? null : section.id)} aria-expanded={isOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm font-semibold ${section.isVisible ? 'text-brand-dark' : 'text-muted'}`}>{section.name}</span>
                    <span className="block text-[11px] text-muted">
                      {section.productIds.length} produit{section.productIds.length > 1 ? 's' : ''}
                      {section.isVisible ? '' : ' · masquée aux clients'}
                    </span>
                  </span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                <button type="button" disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label={`Monter ${section.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-brand disabled:opacity-30">
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" disabled={busy || i === sections.length - 1} onClick={() => move(i, 1)} aria-label={`Descendre ${section.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-brand disabled:opacity-30">
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => write(() => supabase.from('merchant_sections').update({ is_visible: !section.isVisible }).eq('id', section.id), "La visibilité n'a pas pu être modifiée.")}
                  aria-label={section.isVisible ? `Masquer ${section.name}` : `Afficher ${section.name}`}
                  aria-pressed={!section.isVisible}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-brand disabled:opacity-30"
                >
                  {section.isVisible ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(`Supprimer la rubrique « ${section.name} » ? Les produits restent dans ta boutique.`)) {
                      write(() => supabase.from('merchant_sections').delete().eq('id', section.id), "La rubrique n'a pas pu être supprimée.")
                    }
                  }}
                  aria-label={`Supprimer la rubrique ${section.name}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-danger disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              {isOpen && (
                <div className="space-y-1 border-t border-line px-3 py-2">
                  {products.length === 0 && <p className="text-xs text-muted">Ajoute d'abord des produits.</p>}
                  {products.map((p) => {
                    const linked = section.productIds.includes(p.id)
                    return (
                      <label key={p.id} className="flex min-h-10 items-center gap-2 text-sm text-brand-dark">
                        <input type="checkbox" checked={linked} disabled={busy} onChange={() => toggleProduct(section.id, p.id, linked)} className="h-4 w-4 accent-brand" />
                        <span className="truncate">{getProductDisplayName(p)}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
        {error && <p role="alert" className="text-xs font-semibold text-danger">{error}</p>}
      </Card>

      <Card className="space-y-2">
        <div>
          <p className="text-sm font-semibold text-brand-dark">Catégories mises en avant</p>
          <p className="text-xs text-muted">Ordre des filtres de ta vitrine. Seules les catégories qui ont des produits s'affichent.</p>
        </div>
        <FeaturedCategoriesEditor scope={{ merchantId: merchant.id }} suggestedFamilies={merchant.categories} />
      </Card>

      <ProductClassification merchant={merchant} products={products} />
    </div>
  )
}

/** Classement des produits existants : changer la catégorie ne touche ni au prix, ni à l'unité, ni au propriétaire. */
function ProductClassification({ merchant, products }: { merchant: Merchant; products: Product[] }) {
  const { refresh } = useCatalog()
  const { getSubcategory } = useTaxonomy()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ category: CategoryId; subcategoryId: string | null }>({ category: 'epicerie', subcategoryId: null })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const unclassified = products.filter((p) => !p.subcategoryId).length

  async function save(productId: string) {
    setSaving(true)
    setError(null)
    const { error: writeError } = await supabase
      .from('products')
      .update({ category: draft.category, subcategory_id: draft.subcategoryId })
      .eq('id', productId)
    setSaving(false)
    if (writeError) {
      setError(categoryErrorMessage(writeError.message) ?? "Le classement n'a pas pu être enregistré. Réessaie.")
      return
    }
    setEditingId(null)
    await refresh()
  }

  return (
    <Card className="space-y-2">
      <div>
        <p className="text-sm font-semibold text-brand-dark">Classement de mes produits</p>
        <p className="text-xs text-muted">
          {unclassified > 0 ? `${unclassified} produit${unclassified > 1 ? 's' : ''} sans sous-catégorie.` : 'Tous tes produits ont une sous-catégorie.'}
        </p>
      </div>
      {products.map((p) => (
        <div key={p.id} className="border-t border-line pt-2">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-brand-dark">{getProductDisplayName(p)}</p>
              <p className="truncate text-[11px] text-muted">{getSubcategory(p.subcategoryId)?.label ?? 'Sans sous-catégorie'}</p>
            </div>
            {editingId !== p.id && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(p.id)
                  setError(null)
                  setDraft({ category: p.category, subcategoryId: p.subcategoryId ?? null })
                }}
                className="text-xs font-semibold text-brand"
              >
                Modifier
              </button>
            )}
          </div>
          {editingId === p.id && (
            <div className="mt-2 space-y-2">
              <ProductCategoryFields category={draft.category} subcategoryId={draft.subcategoryId} onChange={setDraft} allowedFamilies={merchant.categories} idPrefix={`cls-${p.id}`} />
              <div className="flex gap-2">
                <Button disabled={saving} onClick={() => save(p.id)}>Enregistrer</Button>
                <Button variant="secondary" onClick={() => setEditingId(null)}>Annuler</Button>
              </div>
              {error && <p role="alert" className="text-xs font-semibold text-danger">{error}</p>}
            </div>
          )}
        </div>
      ))}
    </Card>
  )
}
