import { WifiOff } from 'lucide-react'
import { useCatalog } from '../../context/CatalogContext'
import Button from './Button'

/** Bloc de chargement : même gabarit qu'une carte de commerçant ou de produit. */
export function CardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-card bg-white p-3 shadow-card" aria-hidden="true">
      <div className="skeleton h-12 w-12 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3 w-2/3" />
        <div className="skeleton h-3 w-1/3" />
      </div>
    </div>
  )
}

/**
 * État du catalogue quand il n'y a encore rien à afficher : squelettes pendant
 * le chargement, message et bouton « Réessayer » en cas d'échec. Renvoie null
 * quand le catalogue est prêt.
 */
export default function CatalogState() {
  const { loading, error, refresh } = useCatalog()

  if (loading) {
    return (
      <div className="space-y-3" role="status" aria-label="Chargement du catalogue">
        {[0, 1, 2].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-card bg-white p-5 text-center shadow-card" role="alert">
        <WifiOff className="mx-auto h-9 w-9 text-brand-dark/30" aria-hidden="true" />
        <p className="mt-2 text-sm font-medium text-brand-dark">Impossible de charger le catalogue</p>
        <p className="mt-1 text-xs text-brand-dark/60">Vérifie ta connexion, puis réessaie.</p>
        <Button className="mt-4" onClick={() => refresh()}>
          Réessayer
        </Button>
      </div>
    )
  }

  return null
}
