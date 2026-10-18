import { useTaxonomy } from '../../context/TaxonomyContext'
import type { CategoryId } from '../../types'

interface ProductCategoryFieldsProps {
  category: CategoryId
  subcategoryId: string | null
  onChange: (value: { category: CategoryId; subcategoryId: string | null }) => void
  /** Familles proposées (catégories du commerce) ; toutes les familles actives par défaut. */
  allowedFamilies?: CategoryId[]
  className?: string
  idPrefix?: string
}

/**
 * Choix de la catégorie globale d'un produit : famille obligatoire, sous-catégorie facultative et
 * toujours cohérente avec la famille (la base refuse une sous-catégorie d'une autre famille, 023).
 */
export default function ProductCategoryFields({
  category,
  subcategoryId,
  onChange,
  allowedFamilies,
  className = '',
  idPrefix = 'pc',
}: ProductCategoryFieldsProps) {
  const { families, subcategoriesOf } = useTaxonomy()
  const options = allowedFamilies && allowedFamilies.length > 0 ? families.filter((f) => allowedFamilies.includes(f.id)) : families
  // La famille actuelle reste proposée même si elle n'est plus dans la sélection (pas de perte de classement).
  const familyOptions = options.some((f) => f.id === category) ? options : [...options, ...families.filter((f) => f.id === category)]
  const subs = subcategoriesOf(category)

  return (
    <div className={`flex gap-2 ${className}`}>
      <select
        id={`${idPrefix}-family`}
        aria-label="Catégorie"
        value={category}
        onChange={(e) => onChange({ category: e.target.value as CategoryId, subcategoryId: null })}
        className="min-w-0 flex-1 rounded-xl border border-line-strong bg-white px-3 py-2.5 text-sm text-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        {familyOptions.map((f) => (
          <option key={f.id} value={f.id}>
            {f.shortLabel ?? f.label}
          </option>
        ))}
      </select>
      {subs.length > 0 && (
        <select
          id={`${idPrefix}-sub`}
          aria-label="Sous-catégorie"
          value={subcategoryId ?? ''}
          onChange={(e) => onChange({ category, subcategoryId: e.target.value || null })}
          className="min-w-0 flex-1 rounded-xl border border-line-strong bg-white px-3 py-2.5 text-sm text-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <option value="">Sous-catégorie (facultatif)</option>
          {subs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}

/** Message français pour une erreur d'écriture de produit liée au classement (trigger 023) ; null sinon. */
export function categoryErrorMessage(message: string | undefined): string | null {
  if (!message) return null
  if (/désactivée/i.test(message)) return "Cette catégorie n'est plus proposée. Choisis-en une autre."
  if (/n'appartient pas|sous-catégorie|inconnue/i.test(message)) return 'Catégorie invalide : choisis la famille puis une sous-catégorie de cette famille.'
  return null
}
