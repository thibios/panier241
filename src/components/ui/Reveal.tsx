import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Section animée : le contenu apparaît (fondu + légère montée) quand il entre
 * dans l'écran. `index` décale légèrement les éléments d'une même liste
 * (stagger). L'observation est native (IntersectionObserver) : aucun calcul à
 * chaque image. Avec « réduire les animations », l'apparition est immédiate (CSS).
 */
export default function Reveal({
  children,
  index = 0,
  className = '',
}: {
  children: ReactNode
  index?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -6% 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={{ transitionDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      {children}
    </div>
  )
}
