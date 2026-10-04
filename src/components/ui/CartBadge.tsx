/** Compteur du panier ou des notifications : rebondit (spring) à chaque changement de valeur. */
export default function CartBadge({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null
  return (
    <span
      // La clé change avec la valeur : l'animation d'entrée rejoue à chaque mise à jour.
      key={count}
      aria-label={`${count} ${label}`}
      className="badge-pop absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-brand-dark"
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
