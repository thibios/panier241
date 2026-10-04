import { useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CategoryId } from '../../types'
import { categories } from '../../data/categories'
import { usePexelsPhotos } from '../../context/PexelsContext'
import { CategoryIcon } from './icons'

/**
 * Onglets de catégories (photo ronde + libellé). L'onglet actif grossit
 * légèrement et un indicateur glisse sous lui d'une catégorie à l'autre.
 */
export default function CategoryTabs({ activeId }: { activeId?: CategoryId }) {
  const photos = usePexelsPhotos()
  const tabRefs = useRef(new Map<CategoryId, HTMLAnchorElement>())
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null)

  useLayoutEffect(() => {
    const el = activeId ? tabRefs.current.get(activeId) : undefined
    if (!el) {
      setIndicator(null)
      return
    }
    setIndicator({ left: el.offsetLeft + el.offsetWidth * 0.25, width: el.offsetWidth * 0.5 })
    el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [activeId])

  return (
    <nav aria-label="Catégories" className="relative flex gap-3 overflow-x-auto pb-3">
      {categories.map((cat) => {
        const photo = photos[cat.id]
        const isActive = cat.id === activeId
        return (
          <Link
            key={cat.id}
            to={`/categorie/${cat.id}`}
            ref={(el) => {
              if (el) tabRefs.current.set(cat.id, el)
              else tabRefs.current.delete(cat.id)
            }}
            aria-current={isActive ? 'page' : undefined}
            className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
          >
            <span
              className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-full text-white shadow-card transition-transform duration-300 ease-spring active:scale-95 ${
                cat.colorClass
              } ${isActive ? 'scale-110 ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''}`}
            >
              {photo ? (
                <img src={photo} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              ) : (
                <CategoryIcon category={cat.id} className="h-6 w-6" />
              )}
            </span>
            <span
              className={`text-center text-xs leading-tight transition-colors ${
                isActive ? 'font-semibold text-brand-dark' : 'font-medium text-brand-dark/70'
              }`}
            >
              {cat.label}
            </span>
          </Link>
        )
      })}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 h-1 rounded-full bg-accent transition-all duration-300 ease-spring"
        style={indicator ? { left: indicator.left, width: indicator.width, opacity: 1 } : { left: 0, width: 0, opacity: 0 }}
      />
    </nav>
  )
}
