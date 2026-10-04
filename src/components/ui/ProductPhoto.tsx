import type { Product } from '../../types'
import { categories } from '../../data/categories'
import { usePexelsPhotos } from '../../context/PexelsContext'
import { useProductNamePhoto } from '../../lib/pexels'
import { getProductDisplayName } from '../../lib/productDisplay'
import { CategoryIcon } from './icons'

/**
 * Vignette d'un produit. Priorité : photo uploadée par le marchand > photo
 * Pexels du produit lui-même (par son nom) > photo Pexels de sa catégorie >
 * icône de la catégorie. Le fond coloré sert de placeholder pendant le
 * chargement ; `data-fly-source` désigne l'élément qui « vole » vers le panier.
 */
export default function ProductPhoto({ product, className = 'h-12 w-12' }: { product: Product; className?: string }) {
  const categoryPhotos = usePexelsPhotos()
  const namePhoto = useProductNamePhoto(product.imageUrl ? null : product.name)
  const photo = product.imageUrl ?? namePhoto ?? categoryPhotos[product.category] ?? null
  const category = categories.find((c) => c.id === product.category)

  return (
    <div
      data-fly-source
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl text-white ${className} ${category?.colorClass}`}
    >
      {photo ? (
        <img
          src={photo}
          alt={getProductDisplayName(product)}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <CategoryIcon category={product.category} className="h-6 w-6" />
      )}
    </div>
  )
}
