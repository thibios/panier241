import { PanierMark } from './CartIcon'

/**
 * Logo Le Panier 241 : le panier tressé, le mot « Panier » et le « 241 » aux
 * couleurs du drapeau gabonais (2 vert, 4 jaune, 1 bleu), posé sur une plaque
 * claire pour rester lisible sur fond ivoire comme sur fond vert.
 */
export default function BrandLogo({ size = 'md', onDark = false }: { size?: 'md' | 'lg'; onDark?: boolean }) {
  const text = size === 'lg' ? 'text-[1.75rem]' : 'text-[1.4rem]'
  const mark = size === 'lg' ? 'h-10 w-10' : 'h-9 w-9'

  return (
    <span className="inline-flex items-center gap-2" aria-label="Le Panier 241">
      <span
        aria-hidden="true"
        className={`flex ${mark} shrink-0 items-center justify-center rounded-[0.9rem] ${onDark ? 'bg-white text-brand' : 'bg-brand text-on-header ring-1 ring-inset ring-white/15'} shadow-[0_6px_14px_-6px_rgb(var(--color-brand)/0.6)]`}
      >
        <PanierMark className="h-[62%] w-[62%]" />
      </span>
      <span aria-hidden="true" className={`flex items-baseline gap-1.5 font-display ${text} font-bold leading-none tracking-[-0.03em]`}>
        <span className={onDark ? 'text-on-header' : 'text-brand-dark'}>Panier</span>
        <span className="rounded-[0.55rem] bg-white px-1.5 py-0.5 text-[0.82em] font-extrabold tracking-[-0.02em] shadow-[0_2px_8px_-3px_rgb(var(--color-ink)/0.25)] ring-1 ring-inset ring-black/5">
          <span className="text-[#009E60]">2</span>
          <span className="text-[#F2B705] [text-shadow:0_0_0.5px_rgb(0_0_0/0.35)]">4</span>
          <span className="text-[#3A75C4]">1</span>
        </span>
      </span>
    </span>
  )
}
