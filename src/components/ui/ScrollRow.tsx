import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Rangée horizontale navigable : glisser au doigt sur mobile, flèches précédent /
 * suivant (souris, clavier) et points de position. Les flèches n'apparaissent que
 * s'il reste du contenu de ce côté.
 */
export default function ScrollRow({
  children,
  label,
  dots = false,
  className = '',
  arrowTop = 'top-1/2',
}: {
  children: ReactNode
  label: string
  dots?: boolean
  className?: string
  /** Position verticale des flèches (classe Tailwind), pour ne pas masquer le texte des cartes. */
  arrowTop?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)
  const [pages, setPages] = useState({ count: 0, index: 0 })

  const update = useCallback(() => {
    const el = ref.current
    if (!el) return
    setCanPrev(el.scrollLeft > 4)
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    const items = Array.from(el.children) as HTMLElement[]
    const index = items.reduce(
      (best, item, i) =>
        Math.abs(item.offsetLeft - el.offsetLeft - el.scrollLeft - 20) <
        Math.abs(items[best].offsetLeft - el.offsetLeft - el.scrollLeft - 20)
          ? i
          : best,
      0,
    )
    setPages({ count: items.length, index })
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    update()
    el.addEventListener('scroll', update, { passive: true })
    const resize = new ResizeObserver(update)
    resize.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      resize.disconnect()
    }
  }, [update, children])

  function scrollByCard(direction: 1 | -1) {
    const el = ref.current
    if (!el) return
    const first = el.children[0] as HTMLElement | undefined
    const step = first ? first.offsetWidth + 12 : el.clientWidth * 0.8
    el.scrollBy({ left: direction * step, behavior: 'smooth' })
  }

  function goTo(i: number) {
    const el = ref.current
    const item = el?.children[i] as HTMLElement | undefined
    if (el && item) el.scrollTo({ left: item.offsetLeft - el.offsetLeft - 20, behavior: 'smooth' })
  }

  const arrow =
    `absolute ${arrowTop} z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-card/95 text-brand-dark shadow-float backdrop-blur transition hover:bg-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand`

  return (
    <div className={`relative ${className}`} role="region" aria-label={label}>
      <div ref={ref} className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-5 pb-1">
        {children}
      </div>
      {canPrev && (
        <button type="button" onClick={() => scrollByCard(-1)} aria-label={`${label} : précédent`} className={`${arrow} left-1.5`}>
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
      {canNext && (
        <button type="button" onClick={() => scrollByCard(1)} aria-label={`${label} : suivant`} className={`${arrow} right-1.5`}>
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
      {dots && pages.count > 1 && (
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden="true">
          {Array.from({ length: pages.count }).map((_, i) => (
            <button
              key={i}
              type="button"
              tabIndex={-1}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === pages.index ? 'w-5 bg-brand' : 'w-1.5 bg-line'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
